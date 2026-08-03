"""Internal admin panel API — powers the /admin dashboard.

Single-admin credential auth (env-driven), JWT bearer sessions,
lead listing with process timestamps, double-confirmed deletion,
and an Excel export. Every response carries X-Robots-Tag: noindex.
"""

from __future__ import annotations

import io
import logging
import os
from datetime import datetime, timezone, timedelta

import bcrypt
import jwt
from fastapi import APIRouter, HTTPException, Request, Response, Depends
from fastapi.responses import StreamingResponse
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel

logger = logging.getLogger("panel")

JWT_ALGORITHM = "HS256"
TOKEN_HOURS = 12
MAX_ATTEMPTS = 5
LOCKOUT_MINUTES = 15


def _secret() -> str:
    return os.environ["JWT_SECRET"]


def _password_hash() -> bytes:
    # Hash the env credential once per process
    global _CACHED_HASH
    try:
        return _CACHED_HASH
    except NameError:
        pw = os.environ["ADMIN_PANEL_PASSWORD"].encode("utf-8")
        _CACHED_HASH = bcrypt.hashpw(pw, bcrypt.gensalt())
        return _CACHED_HASH


def _make_token() -> str:
    payload = {
        "sub": "admin-panel",
        "type": "panel",
        "exp": datetime.now(timezone.utc) + timedelta(hours=TOKEN_HOURS),
    }
    return jwt.encode(payload, _secret(), algorithm=JWT_ALGORITHM)


def require_panel_auth(request: Request) -> None:
    auth = request.headers.get("Authorization", "")
    token = auth[7:] if auth.startswith("Bearer ") else None
    if not token:
        raise HTTPException(401, "Not authenticated")
    try:
        payload = jwt.decode(token, _secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "panel":
            raise HTTPException(401, "Invalid token type")
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Session expired — please log in again")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid token")


class LoginBody(BaseModel):
    username: str
    password: str


class ReservationBody(BaseModel):
    reservation: str = ""


def _fee_due_date(accepted_iso: str | None) -> datetime | None:
    """Fee falls due 6 calendar months after signing."""
    if not accepted_iso:
        return None
    try:
        d = datetime.fromisoformat(accepted_iso)
    except Exception:
        return None
    import calendar
    m = d.month + 6
    y = d.year + (m - 1) // 12
    m = (m - 1) % 12 + 1
    return d.replace(year=y, month=m, day=min(d.day, calendar.monthrange(y, m)[1]))


def _stage_timestamps(lead: dict, ag: dict | None) -> dict:
    ag = ag or {}
    return {
        "ordered_at": lead.get("created_at"),
        "seller_invite_sent_at": ag.get("seller_invite_sent_at"),
        "accepted_at": ag.get("accepted_at"),
        "declined_at": ag.get("declined_at"),
        "reopened_at": ag.get("reopened_at"),
        "previously_declined_at": ag.get("previously_declined_at"),
        "rpsa_instructed_at": ag.get("rpsa_instructed_at"),
    }


def build_panel_router(db: AsyncIOMotorDatabase) -> APIRouter:
    router = APIRouter(prefix="/panel", tags=["panel"])

    @router.post("/auth/login")
    async def login(body: LoginBody, request: Request, response: Response):
        response.headers["X-Robots-Tag"] = "noindex, nofollow"
        ip = request.headers.get("x-forwarded-for", "").split(",")[0].strip() or (
            request.client.host if request.client else "unknown"
        )
        identifier = f"{ip}:{body.username.lower()}"
        now = datetime.now(timezone.utc)

        attempt = await db.panel_login_attempts.find_one({"identifier": identifier})
        if attempt and attempt.get("count", 0) >= MAX_ATTEMPTS:
            locked_until = datetime.fromisoformat(attempt["locked_until"])
            if now < locked_until:
                raise HTTPException(429, "Too many failed attempts. Try again in 15 minutes.")
            await db.panel_login_attempts.delete_one({"identifier": identifier})

        user_ok = body.username.strip().lower() == os.environ["ADMIN_PANEL_USERNAME"].lower()
        pass_ok = bcrypt.checkpw(body.password.encode("utf-8"), _password_hash())
        if not (user_ok and pass_ok):
            await db.panel_login_attempts.update_one(
                {"identifier": identifier},
                {
                    "$inc": {"count": 1},
                    "$set": {"locked_until": (now + timedelta(minutes=LOCKOUT_MINUTES)).isoformat()},
                },
                upsert=True,
            )
            raise HTTPException(401, "Incorrect username or password")

        await db.panel_login_attempts.delete_one({"identifier": identifier})
        return {"token": _make_token(), "expires_in_hours": TOKEN_HOURS}

    @router.get("/leads")
    async def list_leads(response: Response, _: None = Depends(require_panel_auth)):
        response.headers["X-Robots-Tag"] = "noindex, nofollow"
        agreements = {}
        async for ag in db.agreements.find({}, {"_id": 0}):
            if ag.get("lead_id"):
                agreements[ag["lead_id"]] = ag

        orders, enquiries = [], []
        async for lead in db.leads.find({}, {"_id": 0}).sort("created_at", -1):
            kind = lead.get("kind")
            if kind == "order_survey":
                ag = agreements.get(lead.get("id"))
                orders.append(
                    {
                        "id": lead.get("id"),
                        "reference": lead.get("reference_number") or (ag or {}).get("token"),
                        "brand": lead.get("brand") or "gazeal",
                        "flow": lead.get("flow") or "agent",
                        "status": (ag or {}).get("status") or "pending",
                        "agent_name": lead.get("agent_name") or "",
                        "agency_name": lead.get("agency_name") or "",
                        "branch": lead.get("branch") or "",
                        "agent_email": lead.get("email") or "",
                        "seller_name": lead.get("seller_name") or "",
                        "seller_email": lead.get("seller_email") or "",
                        "seller_phone": lead.get("seller_phone") or "",
                        "address": lead.get("address_line_1") or "",
                        "postcode": lead.get("postcode") or "",
                        "asking_price": lead.get("asking_price") or "",
                        "listing_url": lead.get("listing_url") or "",
                        "agreement_url": (ag or {}).get("agreement_url") or "",
                        "reservation": lead.get("reservation_status") or "",
                        "stages": _stage_timestamps(lead, ag),
                    }
                )
            elif kind == "learn_more":
                enquiries.append(
                    {
                        "id": lead.get("id"),
                        "created_at": lead.get("created_at"),
                        "name": lead.get("name") or lead.get("agent_name") or "",
                        "agency": lead.get("agency") or lead.get("agency_name") or "",
                        "email": lead.get("email") or "",
                        "brand": lead.get("brand") or "gazeal",
                    }
                )
        return {"orders": orders, "enquiries": enquiries}

    @router.patch("/leads/{lead_id}/reservation")
    async def set_reservation(lead_id: str, body: ReservationBody, response: Response, _: None = Depends(require_panel_auth)):
        response.headers["X-Robots-Tag"] = "noindex, nofollow"
        if body.reservation not in ("", "yes", "no"):
            raise HTTPException(422, "reservation must be '', 'yes' or 'no'")
        r = await db.leads.update_one({"id": lead_id}, {"$set": {"reservation_status": body.reservation}})
        if r.matched_count == 0:
            raise HTTPException(404, "Lead not found")
        return {"id": lead_id, "reservation": body.reservation}

    @router.delete("/leads/{lead_id}")
    async def delete_lead(lead_id: str, response: Response, _: None = Depends(require_panel_auth)):
        response.headers["X-Robots-Tag"] = "noindex, nofollow"
        lead = await db.leads.find_one({"id": lead_id}, {"_id": 0})
        if not lead:
            raise HTTPException(404, "Lead not found")
        await db.leads.delete_one({"id": lead_id})
        ag_result = await db.agreements.delete_many({"lead_id": lead_id})
        logger.info("PANEL DELETE lead=%s agreements_removed=%s", lead_id, ag_result.deleted_count)
        return {"deleted": lead_id, "agreements_removed": ag_result.deleted_count}

    @router.get("/export")
    async def export_xlsx(_: None = Depends(require_panel_auth)):
        from openpyxl import Workbook
        from openpyxl.styles import Font, PatternFill
        from openpyxl.utils import get_column_letter

        data = None  # rows are built fresh below
        agreements = {}
        async for ag in db.agreements.find({}, {"_id": 0}):
            if ag.get("lead_id"):
                agreements[ag["lead_id"]] = ag

        wb = Workbook()
        ws = wb.active
        ws.title = "Survey Orders"
        headers = ["Submitted", "Reference", "Brand", "Status", "Agent", "Agency", "Branch",
                   "Agent Email", "Seller", "Seller Email", "Seller Phone", "Address",
                   "Postcode", "Asking Price", "Agreement Emailed", "Accepted", "Declined",
                   "RPSA Instructed", "Reservation", "Fee Due By", "Agreement Link"]
        ws.append(headers)
        def _d(iso):
            try:
                return datetime.fromisoformat(iso).strftime("%d %b %Y, %H:%M")
            except Exception:
                return iso or ""
        async for lead in db.leads.find({"kind": "order_survey"}, {"_id": 0}).sort("created_at", -1):
            ag = agreements.get(lead.get("id")) or {}
            ws.append([
                _d(lead.get("created_at")), lead.get("reference_number") or ag.get("token") or "",
                lead.get("brand") or "gazeal", ag.get("status") or "pending",
                lead.get("agent_name") or "", lead.get("agency_name") or "", lead.get("branch") or "",
                lead.get("email") or "", lead.get("seller_name") or "", lead.get("seller_email") or "",
                lead.get("seller_phone") or "", lead.get("address_line_1") or "", lead.get("postcode") or "",
                lead.get("asking_price") or "", _d(ag.get("seller_invite_sent_at")),
                _d(ag.get("accepted_at")), _d(ag.get("declined_at")), _d(ag.get("rpsa_instructed_at")),
                (lead.get("reservation_status") or "").capitalize(),
                (lambda due: due.strftime("%d %b %Y") if due else "")(_fee_due_date(ag.get("accepted_at"))),
                ag.get("agreement_url") or "",
            ])
        ws2 = wb.create_sheet("Learn More Enquiries")
        ws2.append(["Submitted", "Name", "Agency", "Email", "Brand"])
        async for lead in db.leads.find({"kind": "learn_more"}, {"_id": 0}).sort("created_at", -1):
            ws2.append([_d(lead.get("created_at")), lead.get("name") or lead.get("agent_name") or "",
                        lead.get("agency") or lead.get("agency_name") or "",
                        lead.get("email") or "", lead.get("brand") or "gazeal"])
        for sheet, widths in ((ws, [18, 14, 10, 10, 16, 20, 14, 26, 16, 26, 14, 28, 10, 12, 18, 18, 18, 18, 12, 14, 40]),
                              (ws2, [18, 18, 24, 28, 10])):
            for i, w in enumerate(widths, 1):
                sheet.column_dimensions[get_column_letter(i)].width = w
            for cell in sheet[1]:
                cell.fill = PatternFill("solid", fgColor="025EBA")
                cell.font = Font(bold=True, color="FFFFFF")
            sheet.freeze_panes = "A2"
            sheet.auto_filter.ref = sheet.dimensions

        buf = io.BytesIO()
        wb.save(buf)
        buf.seek(0)
        fname = f"Gazeal_Surveys_Leads_{datetime.now(timezone.utc).strftime('%Y-%m-%d')}.xlsx"
        return StreamingResponse(
            buf,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={
                "Content-Disposition": f'attachment; filename="{fname}"',
                "X-Robots-Tag": "noindex, nofollow",
            },
        )

    return router
