import os
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from fastapi.responses import FileResponse, HTMLResponse
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user
from ..models.crm import Customer, OpportunityHistory
from ..models.documents import CustomerDocument, CustomerSOW
from ..models.user import User
from ..schemas.engine import CustomerDocumentOut, SowGenerateIn, SowOut
from ..services.engine_client import engine_client

router = APIRouter(prefix="/api/documents", tags=["documents"])

DOC_STORAGE_DIR = "storage/documents"


def now() -> datetime:
    return datetime.now(timezone.utc)


def ensure_storage_dir() -> str:
    path = os.path.abspath(DOC_STORAGE_DIR)
    os.makedirs(path, exist_ok=True)
    return path


@router.post("/sow/generate", response_model=SowOut, status_code=status.HTTP_201_CREATED)
def generate_sow(
    payload: SowGenerateIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    customer = db.get(Customer, payload.customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    sow_title = payload.sow_title or f"Statement of Work — {customer.customer_name}"
    sections = [
        {"title": s.title, "body": s.body}
        for s in payload.sections or []
    ]
    if payload.company:
        sections.append({"title": "Company", "body": payload.company})
    if not sections:
        sections = [
            {"title": "Overview", "body": f"Statement of Work for {customer.customer_name}."},
            {"title": "Scope of Work", "body": "Cloud consultation, migration and optimization services."},
            {"title": "Commercials", "body": f"Commercial terms as agreed with {customer.customer_name}."},
            {"title": "Signatures", "body": "Both parties accept the terms of this SOW."},
        ]

    request_body = {
        "company": payload.company or customer.account_name or customer.customer_name,
        "project_name": customer.customer_name,
        "sow_title": sow_title,
        "sections": sections,
    }
    try:
        doc = engine_client.generate_sow(request_body)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"Engine document generation failed: {exc}") from exc

    dirpath = ensure_storage_dir()
    safe_name = sow_title.replace(" ", "_").replace("/", "_").replace("\\", "_")[:120]
    filename = f"{customer.id}_{safe_name}_{uuid.uuid4().hex[:6]}.html"
    file_path = os.path.join(dirpath, filename)
    with open(file_path, "w", encoding="utf-8") as fh:
        fh.write(doc.get("content", ""))

    sow = CustomerSOW(
        customer_id=customer.id,
        sow_title=sow_title,
        version=_next_sow_version(db, customer.id),
        status="draft",
        content_html=doc.get("content", ""),
        created_by=current_user.username,
    )
    db.add(sow)
    db.flush()

    hist = OpportunityHistory()
    hist.customer_id = customer.id
    hist.action = "document"
    hist.changes_summary = f"SOW '{sow_title}' generated (v1.0)"
    hist.tag_name = "sow"
    hist.changed_by = current_user.username
    hist.created_at = now()
    db.add(hist)
    db.commit()
    db.refresh(sow)
    return sow


@router.get("/sows", response_model=list[SowOut])
def list_sows(
    customer_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    q = db.query(CustomerSOW)
    if customer_id:
        q = q.filter(CustomerSOW.customer_id == customer_id)
    return q.order_by(CustomerSOW.updated_at.desc()).limit(100).all()


@router.get("/sows/{sow_id}", response_model=SowOut)
def get_sow(
    sow_id: int,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    sow = db.get(CustomerSOW, sow_id)
    if not sow:
        raise HTTPException(status_code=404, detail="SOW not found")
    return sow


# ------------------------------------------------------------- general documents
@router.post("", response_model=CustomerDocumentOut, status_code=status.HTTP_201_CREATED)
async def upload_document(
    customer_id: int = Query(...),
    description: str | None = Query(default=None),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not db.get(Customer, customer_id):
        raise HTTPException(status_code=404, detail="Customer not found")

    content = await file.read()
    if not content:
        raise HTTPException(status_code=422, detail="Empty file")

    dirpath = ensure_storage_dir()
    prefix = uuid.uuid4().hex[:8]
    stored_name = f"{customer_id}_{prefix}_{file.filename or 'file'}"
    file_path = os.path.join(dirpath, stored_name)
    with open(file_path, "wb") as fh:
        fh.write(content)

    doc = CustomerDocument(
        customer_id=customer_id,
        original_filename=file.filename or "file",
        stored_filename=stored_name,
        file_path=file_path,
        storage_backend="local",
        file_size_bytes=len(content),
        mime_type=file.content_type,
        description=description,
        uploaded_by=current_user.username,
        created_at=now(),
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return doc


@router.get("", response_model=list[CustomerDocumentOut])
def list_documents(
    customer_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    q = db.query(CustomerDocument)
    if customer_id:
        q = q.filter(CustomerDocument.customer_id == customer_id)
    return q.order_by(CustomerDocument.created_at.desc()).limit(200).all()


@router.get("/{document_id}")
def download_document(
    document_id: int,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    doc = db.get(CustomerDocument, document_id)
    if not doc or not doc.file_path:
        raise HTTPException(status_code=404, detail="Document not found")
    if not os.path.exists(doc.file_path):
        raise HTTPException(status_code=404, detail="Document file missing on disk")
    return FileResponse(doc.file_path, filename=doc.original_filename, media_type=doc.mime_type or "application/octet-stream")


@router.delete("/sows/{sow_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_sow(
    sow_id: int,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    sow = db.get(CustomerSOW, sow_id)
    if not sow:
        raise HTTPException(status_code=404, detail="SOW not found")
    db.delete(sow)
    db.commit()


@router.get("/sows/{sow_id}/download")
def download_sow(
    sow_id: int,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    sow = db.get(CustomerSOW, sow_id)
    if not sow:
        raise HTTPException(status_code=404, detail="SOW not found")
    if not sow.content_html:
        raise HTTPException(status_code=404, detail="SOW content not available")
    filename = (sow.sow_title or "SOW").replace(" ", "_").replace("/", "_")[:80]
    return HTMLResponse(
        content=sow.content_html,
        headers={"Content-Disposition": f'attachment; filename="{filename}.html"'},
    )


@router.post("/sows/{sow_id}/send", status_code=status.HTTP_201_CREATED)
def send_sow_email(
    sow_id: int,
    recipient_email: str | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    sow = db.get(CustomerSOW, sow_id)
    if not sow:
        raise HTTPException(status_code=404, detail="SOW not found")

    customer = db.get(Customer, sow.customer_id)
    to_email = recipient_email or (customer.email if customer else None)
    if not to_email:
        raise HTTPException(status_code=400, detail="No recipient email available")

    from ..routers.email import get_system_template, render_template
    from ..services.messaging import enqueue_email

    template = get_system_template(db, "System - SOW Document Email")
    if not template:
        raise HTTPException(status_code=500, detail="SOW email template not configured")

    ctx = {
        "customer_name": customer.customer_name if customer else "",
        "sow_title": sow.sow_title or "Statement of Work",
        "today": now().strftime("%B %d, %Y"),
    }
    enqueue_email(
        to_email,
        template.subject_template,
        template.body_template,
        context=ctx,
        email_type="sow",
        customer_id=sow.customer_id,
        template_id=template.id,
    )

    sow.status = "sent"
    db.commit()
    db.refresh(sow)
    return sow


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_document(
    document_id: int,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    doc = db.get(CustomerDocument, document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if doc.file_path and os.path.exists(doc.file_path):
        os.remove(doc.file_path)
    db.delete(doc)
    db.commit()


def _next_sow_version(db: Session, customer_id: int) -> str:
    """Increment SOW version for a customer (1.0 → 1.1 → 2.0, etc.)."""
    latest = (
        db.query(CustomerSOW)
        .filter(CustomerSOW.customer_id == customer_id)
        .order_by(CustomerSOW.id.desc())
        .first()
    )
    if not latest or not latest.version:
        return "1.0"
    try:
        major, minor = latest.version.split(".")
        return f"{major}.{int(minor) + 1}"
    except (ValueError, AttributeError):
        return "1.0"