from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user
from ..models.crm import Customer, Lead, OpportunityHistory
from ..models.user import User
from ..schemas.engine import (
    CsvAnalyzeIn,
    CsvImportIn,
    CsvPreviewOut,
    ImportResultOut,
)
from ..services.engine_client import engine_client

router = APIRouter(prefix="/api/import", tags=["imports"])

# Source header (normalized) -> Customer/Lead attribute
CUSTOMER_ALIASES = {
    "customer_name": "customer_name",
    "name": "customer_name",
    "customer": "customer_name",
    "account": "account_name",
    "account_name": "account_name",
    "email": "email",
    "emails": "email",
    "phone": "phone",
    "contact": "phone",
    "city": "city",
    "cloud": "cloud",
    "cloud_operator": "cloud",
    "segment": "segment",
    "deal_status": "deal_status",
    "status": "deal_status",
    "aws_id": "aws_id",
    "aws": "aws_id",
    "opportunity_id": "opportunity_id",
    "opp_id": "opportunity_id",
    "comment": "comment",
    "notes": "comment",
    "main_page": "main_page_address",
    "website": "main_page_address",
    "billing": "billing",
}

LEAD_ALIASES = {
    "lead_name": "lead_name",
    "name": "lead_name",
    "lead": "lead_name",
    "email": "email",
    "phone": "phone",
    "company": "company",
    "city": "city",
    "source": "source",
    "tags": "tags",
    "notes": "notes",
    "status": "lead_status",
}


def csv_rows_to_records(
    headers: list[str], rows: list[list[str]], aliases: dict[str, str], column_map: dict[str, str]
) -> list[dict]:
    """Convert CSV output into a list of entity dicts for known fields."""
    records: list[dict] = []
    for row in rows:
        attrs: dict[str, str] = {}
        for idx, header in enumerate(headers):
            norm = header.strip().lower().replace(" ", "_").replace("-", "_")
            target = column_map.get(header, aliases.get(norm))
            if not target:
                continue
            if idx < len(row):
                val = row[idx].strip()
                if val and val.lower() not in ("n/a", "null", "na"):
                    attrs[target] = val
        records.append(attrs)
    return records


def now() -> datetime:
    return datetime.now(timezone.utc)


@router.post("/csv-analyze", response_model=CsvPreviewOut)
def analyze_csv(
    payload: CsvAnalyzeIn,
    _user: User = Depends(get_current_user),
):
    """Send raw CSV to the Rust engine and return a preview (headers + rows)."""
    try:
        result = engine_client.parse_csv(payload.content, payload.contains_header)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"Engine CSV parse failed: {exc}") from exc
    return CsvPreviewOut(
        headers=result.get("headers", []),
        rows=result.get("rows", []),
        row_count=result.get("row_count", 0),
    )


@router.post("/customers", response_model=ImportResultOut, status_code=status.HTTP_201_CREATED)
def import_customers(
    payload: CsvImportIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if payload.entity != "customers":
        raise HTTPException(status_code=422, detail="Use /api/import/leads for leads")
    try:
        parsed = engine_client.parse_csv(payload.content, payload.contains_header)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"Engine CSV parse failed: {exc}") from exc

    headers = parsed.get("headers", [])
    if not headers:
        raise HTTPException(status_code=422, detail="CSV has no headers; provide them or set contains_header")

    records = csv_rows_to_records(headers, parsed.get("rows", []), CUSTOMER_ALIASES, payload.column_map)
    created_ids: list[int] = []
    errors: list[str] = []
    created = skipped = 0
    for idx, rec in enumerate(records, start=1):
        if not rec.get("customer_name"):
            errors.append(f"row {idx}: missing customer name")
            continue
        email = (rec.get("email") or "").lower().strip()
        exists = None
        if email:
            exists = (
                db.query(Customer)
                .filter(or_(Customer.email == email, Customer.customer_name == rec["customer_name"]))
                .first()
            )
        else:
            exists = (
                db.query(Customer)
                .filter(Customer.customer_name == rec["customer_name"])
                .first()
            )
        if exists:
            skipped += 1
            continue
        customer = Customer(customer_name=rec["customer_name"], **{k: v for k, v in rec.items() if k != "customer_name"})
        db.add(customer)
        db.flush()
        hist = OpportunityHistory()
        hist.customer_id = customer.id
        hist.action = "created"
        hist.changes_summary = f"Imported from CSV (row {idx})"
        hist.changed_by = current_user.username
        hist.created_at = now()
        db.add(hist)
        created += 1
        created_ids.append(customer.id)

    db.commit()
    return ImportResultOut(entity="customers", created=created, created_ids=created_ids, skipped=skipped, errors=errors)


@router.post("/leads", response_model=ImportResultOut, status_code=status.HTTP_201_CREATED)
def import_leads(
    payload: CsvImportIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if payload.entity != "leads":
        raise HTTPException(status_code=422, detail="Use /api/import/customers for customers")
    try:
        parsed = engine_client.parse_csv(payload.content, payload.contains_header)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"Engine CSV parse failed: {exc}") from exc

    headers = parsed.get("headers", [])
    if not headers:
        raise HTTPException(status_code=422, detail="CSV has no headers; provide them or set contains_header")

    records = csv_rows_to_records(headers, parsed.get("rows", []), LEAD_ALIASES, payload.column_map)
    created_ids: list[int] = []
    errors: list[str] = []
    created = skipped = 0
    for idx, rec in enumerate(records, start=1):
        if not rec.get("lead_name") and not rec.get("email"):
            errors.append(f"row {idx}: missing name and email")
            continue
        email = (rec.get("email") or "").lower().strip()
        exists = None
        if email:
            exists = db.query(Lead).filter(Lead.email == email).first()
        if exists:
            skipped += 1
            continue
        lead = Lead(**{k: (v.lower() if k == "lead_status" else v) for k, v in rec.items()})
        db.add(lead)
        db.flush()
        created += 1
        created_ids.append(lead.id)

    db.commit()
    return ImportResultOut(entity="leads", created=created, created_ids=created_ids, skipped=skipped, errors=errors)