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
_LOGO_URL = (
    "https://customer-assets.emergentagent.com/job_survey-pro-10/"
    "artifacts/k9mairc3_Gazeal%20surveys%20logo.png"
)


_EMAIL_WRAPPER = """\
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>{title}</title>
</head>
<body style="margin:0;padding:0;background:#050505;font-family:-apple-system,
             BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;
             color:#0B1220;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"
         style="background:#050505;padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600"
               style="max-width:600px;background:#ffffff;border-radius:20px;
                      overflow:hidden;box-shadow:0 12px 40px rgba(0,0,0,0.4);">
          <!-- Hero band -->
          <tr>
            <td style="background:#025eba;
                       background-image:linear-gradient(135deg,#4FB6FF 0%,#025eba 100%);
                       padding:32px 36px;color:#ffffff;">
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td valign="middle">
                    <img src="{logo}" alt="Gazeal Surveys"
                         width="150" height="auto"
                         style="display:block;border:0;outline:none;
                                text-decoration:none;height:auto;">
                  </td>
                  <td align="right" valign="middle"
                      style="font-size:11px;letter-spacing:2.4px;
                             text-transform:uppercase;color:rgba(255,255,255,0.85);
                             font-weight:600;">
                    {eyebrow}
                  </td>
                </tr>
              </table>
              <div style="margin-top:22px;font-size:24px;line-height:1.2;
                          font-weight:700;letter-spacing:-0.5px;
                          color:#ffffff;max-width:480px;">
                {title}
              </div>
              <div style="margin-top:10px;font-size:14px;line-height:1.6;
                          color:rgba(255,255,255,0.85);max-width:480px;">
                {kicker}
              </div>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px 36px 8px 36px;font-size:14px;
                       line-height:1.65;color:#0B1220;">
              {body}
            </td>
          </tr>

          <!-- Reply CTA -->
          <tr>
            <td style="padding:8px 36px 32px 36px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="background:#025eba;
                             background-image:linear-gradient(135deg,#4FB6FF 0%,#025eba 100%);
                             border-radius:999px;">
                    <a href="{cta_href}"
                       style="display:inline-block;padding:12px 22px;
                              font-size:14px;font-weight:600;color:#ffffff;
                              text-decoration:none;letter-spacing:0.2px;">
                      {cta_label}
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 36px 26px 36px;background:#F7F4EE;
                       font-size:11px;color:#6B7280;line-height:1.6;">
              <strong style="color:#0B1220;font-weight:700;">Gazeal Surveys</strong>
              &nbsp;·&nbsp; Upfront surveys for sale-ready homes.
              <br>
              Captured by gazeal.co.uk &nbsp;·&nbsp; sent {timestamp}.
            </td>
          </tr>
        </table>

        <div style="margin-top:18px;font-size:11px;color:#6B7280;
                    font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',
                    Helvetica,Arial,sans-serif;">
          This is an automated notification from the Gazeal Surveys landing page.
        </div>
      </td>
    </tr>
  </table>
</body>
</html>
"""


def _row(label: str, value: str, link: Optional[str] = None) -> str:
    safe = (value or "").replace("<", "&lt;").replace(">", "&gt;") or "—"
    rendered = safe
    if link:
        rendered = (
            f'<a href="{link}" style="color:#025eba;text-decoration:none;'
            f'border-bottom:1px solid rgba(2,94,186,0.25);">{safe}</a>'
        )
    return (
        '<tr>'
        f'<td style="padding:10px 0;color:#6B7280;font-size:11px;'
        f'text-transform:uppercase;letter-spacing:1.6px;width:160px;'
        f'vertical-align:top;font-weight:600;">{label}</td>'
        f'<td style="padding:10px 0;color:#0B1220;font-size:14px;'
        f'border-bottom:1px solid rgba(11,18,32,0.06);">{rendered}</td>'
        '</tr>'
    )


def _section_title(text: str) -> str:
    return (
        '<div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;'
        'color:#025eba;font-weight:700;margin:22px 0 4px;">' + text + '</div>'
    )


def _render_learn_more(lead: LearnMoreLead) -> str:
    body = (
        '<p style="margin:0 0 8px;font-size:14px;color:#0B1220;">'
        'An agent has just asked to learn more about Gazeal Seller Surveys. '
        'Their details are below.'
        '</p>'
        + _section_title("Lead details")
        + '<table cellpadding="0" cellspacing="0" border="0" width="100%">'
        + _row("Full name", lead.full_name)
        + _row("Agency", lead.agency)
        + _row("Email", lead.email, link=f"mailto:{lead.email}")
        + '</table>'
        + '<p style="margin:22px 0 0;font-size:13px;color:#6B7280;'
          'line-height:1.6;">They will be handed to the HubSpot booking '
          'page next, but it is worth a personal reply too.</p>'
    )
    return _EMAIL_WRAPPER.format(
        title="Agent interested to know more about Seller Surveys",
        eyebrow="New Learn More lead",
        kicker=(
            f"{lead.full_name} from {lead.agency} just opened the door."
        ),
        body=body,
        cta_href=f"mailto:{lead.email}?subject=Gazeal%20Seller%20Surveys",
        cta_label="Reply to the agent",
        logo=_LOGO_URL,
        timestamp=datetime.now(timezone.utc).strftime("%d %b %Y, %H:%M UTC"),
    )


def _render_order_survey(lead: OrderSurveyLead) -> str:
    contact_pieces = [
        f"{lead.agent_name}",
        f"{lead.agency_name}",
    ]
    if lead.branch:
        contact_pieces.append(lead.branch)
    contact_line = " · ".join(contact_pieces)

    body = (
        '<p style="margin:0 0 8px;font-size:14px;color:#0B1220;">'
        'An agent has submitted a new survey order request. RPSA needs to '
        'invite the seller and arrange the visit.'
        '</p>'
        + _section_title("The agent")
        + '<table cellpadding="0" cellspacing="0" border="0" width="100%">'
        + _row("Agent", contact_line)
        + _row("Email", lead.email, link=f"mailto:{lead.email}")
        + _row("Phone", lead.phone, link=f"tel:{lead.phone}")
        + '</table>'
        + _section_title("The seller")
        + '<table cellpadding="0" cellspacing="0" border="0" width="100%">'
        + _row("Name", lead.seller_name)
        + _row(
            "Email",
            lead.seller_email,
            link=f"mailto:{lead.seller_email}",
        )
        + _row(
            "Phone",
            lead.seller_phone or "",
            link=(f"tel:{lead.seller_phone}" if lead.seller_phone else None),
        )
        + '</table>'
        + _section_title("The property")
        + '<table cellpadding="0" cellspacing="0" border="0" width="100%">'
        + _row("Address", f"{lead.address_line_1}")
        + _row("Postcode", lead.postcode)
        + _row("Asking price", lead.asking_price or "")
        + _row("Listing", lead.listing_url, link=lead.listing_url)
        + '</table>'
        + _section_title("Confirmation")
        + '<p style="margin:6px 0 0;font-size:13px;color:#0B1220;'
          'line-height:1.6;">'
        + (
            'The agent has confirmed the seller is happy for RPSA to contact '
            'them about arranging their survey.'
            if lead.confirmation
            else
            '<span style="color:#B23A3A;font-weight:600;">The seller '
            'confirmation checkbox was not ticked.</span>'
        )
        + '</p>'
    )
    return _EMAIL_WRAPPER.format(
        title="New survey order from an agent",
        eyebrow="Order Survey request",
        kicker=(
            f"{lead.agency_name} would like RPSA to invite "
            f"{lead.seller_name} to book a survey."
        ),
        body=body,
        cta_href=f"mailto:{lead.email}?subject=Gazeal%20Survey%20Order",
        cta_label="Reply to the agent",
        logo=_LOGO_URL,
        timestamp=datetime.now(timezone.utc).strftime("%d %b %Y, %H:%M UTC"),
    )


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
                subject=f"Agent interested to know more about Seller Surveys — {lead.full_name}",
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
