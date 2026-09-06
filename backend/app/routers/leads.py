from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user
from ..models.crm import Customer, Lead
from ..models.user import User
from ..schemas.crm import CustomerCreate, LeadCreate, LeadOut, LeadUpdate

router = APIRouter(prefix="/api/leads", tags=["leads"])


@router.get("", response_model=list[LeadOut])
def list_leads(
    search: str | None = Query(default=None),
    lead_status: str | None = Query(default=None),
    limit: int = Query(default=200, le=1000),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    q = db.query(Lead).filter(Lead.is_active.is_(True))
    if search:
        like = f"%{search}%"
        q = q.filter(
            or_(
                Lead.lead_name.ilike(like),
                Lead.email.ilike(like),
                Lead.company.ilike(like),
                Lead.phone.ilike(like),
            )
        )
    if lead_status:
        q = q.filter(Lead.lead_status == lead_status)
    q = q.order_by(Lead.created_at.desc()).limit(limit).offset(offset)
    return q.all()


@router.post("", response_model=LeadOut, status_code=status.HTTP_201_CREATED)
def create_lead(
    payload: LeadCreate,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    if payload.email:
        exists = db.query(Lead).filter(Lead.email == payload.email).first()
        if exists:
            raise HTTPException(status_code=409, detail="Lead with this email already exists")
    lead = Lead(**payload.model_dump(exclude_unset=True))
    db.add(lead)
    db.commit()
    db.refresh(lead)
    return lead


@router.get("/stats")
def leads_stats(
    search: str | None = Query(default=None),
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    q = db.query(Lead).filter(Lead.is_active.is_(True))
    if search:
        like = f"%{search}%"
        q = q.filter(
            or_(
                Lead.lead_name.ilike(like),
                Lead.email.ilike(like),
                Lead.company.ilike(like),
                Lead.phone.ilike(like),
            )
        )
    total = q.count()
    grouped = dict(
        q.with_entities(Lead.lead_status, func.count()).group_by(Lead.lead_status).all()
    )
    return {
        "total": total,
        "new": grouped.get("new", 0),
        "contacted": grouped.get("contacted", 0),
        "qualified": grouped.get("qualified", 0),
        "converted": grouped.get("converted", 0),
        "lost": grouped.get("lost", 0),
    }


@router.get("/{lead_id}", response_model=LeadOut)
def get_lead(
    lead_id: int,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    lead = db.get(Lead, lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return lead


@router.put("/{lead_id}", response_model=LeadOut)
def update_lead(
    lead_id: int,
    payload: LeadUpdate,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    lead = db.get(Lead, lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(lead, field, value)
    db.commit()
    db.refresh(lead)
    return lead


@router.delete("/{lead_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_lead(
    lead_id: int,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    lead = db.get(Lead, lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    lead.is_active = False
    db.commit()


@router.post("/{lead_id}/convert", response_model=CustomerCreate)
def convert_lead(
    lead_id: int,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    lead = db.get(Lead, lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    if lead.converted_customer_id:
        raise HTTPException(status_code=409, detail="Lead already converted")
    customer = Customer(
        customer_name=lead.lead_name or (lead.company or "Customer"),
        account_name=lead.company,
        email=lead.email or f"lead{lead.id}@pending.invalid",
        phone=lead.phone,
        city=lead.city,
        comment=lead.notes,
    )
    db.add(customer)
    db.flush()
    lead.converted_customer_id = customer.id
    lead.converted_at = datetime.now(timezone.utc)
    lead.lead_status = "converted"
    db.commit()
    db.refresh(customer)

    _maybe_send_welcome_email(db, customer)
    return CustomerCreate(**{
        "customer_name": customer.customer_name,
        "account_name": customer.account_name,
        "email": customer.email,
        "phone": customer.phone,
        "city": customer.city,
        "comment": customer.comment,
    })


def _maybe_send_welcome_email(db: Session, customer: Customer) -> None:
    """Enqueue welcome email to a customer converted from a lead."""
    from ..routers.email import get_system_template
    from ..services.messaging import enqueue_email

    template = get_system_template(db, "System - Welcome Email")
    if not template:
        return

    ctx = {
        "customer_name": customer.customer_name or customer.account_name or customer.email,
        "account_name": customer.account_name or "",
        "cloud": customer.cloud or "",
        "aws_calculator_link": customer.aws_calculator_link or "",
        "today": datetime.now(timezone.utc).strftime("%B %d, %Y"),
    }
    enqueue_email(
        customer.email,
        template.subject_template,
        template.body_template,
        context=ctx,
        email_type="welcome",
        customer_id=customer.id,
        template_id=template.id,
    )