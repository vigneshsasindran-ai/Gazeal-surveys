"""
Gazeal Surveys lead capture endpoints.

Two routes:
  POST /api/leads/learn-more    - the "Learn More" modal lead
  POST /api/leads/order-survey  - the multi-step order survey form

Both endpoints:
  1. Persist the submission to MongoDB (leads collection).
  2. Send an HTML email notification via Resend to NOTIFY_EMAIL.

Resend SDK is synchronous, so we offload it onto asyncio.to_thread to keep
the FastAPI event loop non-blocking.
"""
from __future__ import annotations

import asyncio
import logging
import os
import uuid
from datetime import datetime, timezone
from typing import Optional

import resend
from fastapi import APIRouter
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel, ConfigDict, EmailStr, Field

logger = logging.getLogger(__name__)

resend.api_key = os.environ["RESEND_API_KEY"]
SENDER_EMAIL = os.environ["SENDER_EMAIL"]
NOTIFY_EMAIL = os.environ["NOTIFY_EMAIL"]


# ---------------------------------------------------------------------------
# Pydantic schemas
# ---------------------------------------------------------------------------
class LearnMoreLead(BaseModel):
    model_config = ConfigDict(extra="ignore")
    full_name: str = Field(..., min_length=1, max_length=120)
    agency: str = Field(..., min_length=1, max_length=160)
    email: EmailStr


class OrderSurveyLead(BaseModel):
    model_config = ConfigDict(extra="ignore")
    # Agent
    agent_name: str = Field(..., min_length=1, max_length=120)
    agency_name: str = Field(..., min_length=1, max_length=160)
    branch: Optional[str] = ""
    phone: str = Field(..., min_length=1, max_length=40)
    email: EmailStr
    # Seller
    seller_name: str = Field(..., min_length=1, max_length=120)
    seller_email: EmailStr
    seller_phone: Optional[str] = ""
    # Property
    address_line_1: str = Field(..., min_length=1, max_length=200)
    postcode: str = Field(..., min_length=1, max_length=20)
    listing_url: str = Field(..., min_length=1, max_length=400)
    asking_price: Optional[str] = ""
    confirmation: bool = False


# ---------------------------------------------------------------------------
# Email helpers
# ---------------------------------------------------------------------------
_EMAIL_WRAPPER = """\
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"
       style="background:#050505;padding:32px 0;font-family:Arial,Helvetica,sans-serif;color:#0B1220;">
  <tr><td align="center">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="560"
           style="background:#ffffff;border-radius:16px;overflow:hidden;">
      <tr>
        <td style="background:linear-gradient(135deg,#4FB6FF 0%,#025eba 100%);
                   padding:22px 28px;color:#ffffff;">
          <div style="font-size:11px;letter-spacing:2.4px;text-transform:uppercase;opacity:.85;">
            Gazeal Surveys
          </div>
          <div style="font-size:20px;font-weight:700;margin-top:4px;">{title}</div>
        </td>
      </tr>
      <tr>
        <td style="padding:28px;font-size:14px;line-height:1.6;color:#0B1220;">
          {body}
        </td>
      </tr>
      <tr>
        <td style="padding:16px 28px;background:#F7F4EE;font-size:11px;color:#6B7280;">
          Captured by the Gazeal Surveys landing page.
        </td>
      </tr>
    </table>
  </td></tr>
</table>
"""


def _row(label: str, value: str) -> str:
    safe = (value or "").replace("<", "&lt;").replace(">", "&gt;") or "—"
    return (
        '<tr>'
        f'<td style="padding:6px 0;color:#6B7280;font-size:12px;'
        f'text-transform:uppercase;letter-spacing:1.5px;width:170px;'
        f'vertical-align:top;">{label}</td>'
        f'<td style="padding:6px 0;color:#0B1220;font-size:14px;">{safe}</td>'
        '</tr>'
    )


def _render_learn_more(lead: LearnMoreLead) -> str:
    body = (
        "<p style='margin:0 0 16px;'>A new Learn More request has just come in.</p>"
        "<table cellpadding='0' cellspacing='0' border='0' width='100%'>"
        + _row("Full name", lead.full_name)
        + _row("Agency", lead.agency)
        + _row("Email", lead.email)
        + "</table>"
        "<p style='margin:18px 0 0;color:#6B7280;font-size:12px;'>"
        "They will be handed to the HubSpot booking page next."
        "</p>"
    )
    return _EMAIL_WRAPPER.format(title="New Learn More lead", body=body)


def _render_order_survey(lead: OrderSurveyLead) -> str:
    body = (
        "<p style='margin:0 0 16px;'>An agent has just submitted a new survey order.</p>"
        "<table cellpadding='0' cellspacing='0' border='0' width='100%'>"
        + _row("Agent", f"{lead.agent_name} · {lead.agency_name}"
               + (f" ({lead.branch})" if lead.branch else ""))
        + _row("Agent email", lead.email)
        + _row("Agent phone", lead.phone)
        + _row("Seller", lead.seller_name)
        + _row("Seller email", lead.seller_email)
        + _row("Seller phone", lead.seller_phone or "")
        + _row("Property", f"{lead.address_line_1}, {lead.postcode}")
        + _row("Listing", lead.listing_url)
        + _row("Asking price", lead.asking_price or "")
        + _row("Confirmation", "Yes" if lead.confirmation else "No")
        + "</table>"
    )
    return _EMAIL_WRAPPER.format(title="New Order Survey request", body=body)


async def _send_email(subject: str, html: str) -> Optional[str]:
    params = {
        "from": SENDER_EMAIL,
        "to": [NOTIFY_EMAIL],
        "subject": subject,
        "html": html,
    }
    try:
        email = await asyncio.to_thread(resend.Emails.send, params)
        return email.get("id") if isinstance(email, dict) else None
    except Exception as exc:  # pragma: no cover - log and surface
        logger.exception("Resend send failed: %s", exc)
        raise


# ---------------------------------------------------------------------------
# Router factory — keeps the db handle out of import-time globals
# ---------------------------------------------------------------------------
def build_router(db: AsyncIOMotorDatabase) -> APIRouter:
    router = APIRouter(prefix="/leads", tags=["leads"])

    @router.post("/learn-more")
    async def submit_learn_more(lead: LearnMoreLead):
        doc = {
            "id": str(uuid.uuid4()),
            "kind": "learn_more",
            "created_at": datetime.now(timezone.utc).isoformat(),
            **lead.model_dump(),
        }
        await db.leads.insert_one(doc)
        email_id = None
        email_error = None
        try:
            email_id = await _send_email(
                subject=f"[Gazeal Surveys] Learn More — {lead.full_name}",
                html=_render_learn_more(lead),
            )
        except Exception as exc:
            email_error = str(exc)
        return {
            "id": doc["id"],
            "email_id": email_id,
            "email_error": email_error,
            "status": "ok",
        }

    @router.post("/order-survey")
    async def submit_order_survey(lead: OrderSurveyLead):
        doc = {
            "id": str(uuid.uuid4()),
            "kind": "order_survey",
            "created_at": datetime.now(timezone.utc).isoformat(),
            **lead.model_dump(),
        }
        await db.leads.insert_one(doc)
        email_id = None
        email_error = None
        try:
            email_id = await _send_email(
                subject=f"[Gazeal Surveys] Order Survey — {lead.agency_name}",
                html=_render_order_survey(lead),
            )
        except Exception as exc:
            email_error = str(exc)
        return {
            "id": doc["id"],
            "email_id": email_id,
            "email_error": email_error,
            "status": "ok",
        }

    return router
