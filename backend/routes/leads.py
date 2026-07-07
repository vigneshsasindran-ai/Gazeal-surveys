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
import secrets
import uuid
from datetime import datetime, timezone
from typing import List, Optional

import resend
from fastapi import APIRouter, Request
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel, ConfigDict, EmailStr, Field

from webhooks import fan_out
from slack_notify import notify_order_submitted

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
    brand: str = Field(default="gazeal", pattern="^(gazeal|balgores)$")


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
    listing_url: Optional[str] = Field(default="", max_length=600)
    asking_price: Optional[str] = ""
    confirmation: bool = False
    # Branding — which product surface the lead was captured from.
    # Defaults to "gazeal" for backwards-compat with any existing clients.
    brand: str = Field(default="gazeal", pattern="^(gazeal|balgores)$")


# ---------------------------------------------------------------------------
# Email helpers
# ---------------------------------------------------------------------------
_LOGO_URL = (
    "https://customer-assets.emergentagent.com/job_survey-pro-10/"
    "artifacts/k9mairc3_Gazeal%20surveys%20logo.png"
)

_BALGORES_LOGO_URL = (
    "https://customer-assets.emergentagent.com/job_survey-pro-10/"
    "artifacts/mtuv9mso_download%20%281%29.webp"
)

# Per-brand palette for HTML emails. Keep the shape identical so template
# blocks can just `.format(**BRAND_TOKENS[brand])`.
#
# `hero_bg_image` — value for the hero band's `background-image` CSS.
#   Set to `none` for flat brands (Balgores) so the `primary_dark` base
#   colour shows through unaltered.
# `cta_bg` — value for the reply-CTA button `background`.
#   Balgores uses solid gold — no gradient with the purple.
BRAND_TOKENS = {
    "gazeal": {
        "primary":        "#4FB6FF",
        "primary_dark":   "#025eba",
        "hero_bg_image":  "linear-gradient(135deg,#4FB6FF 0%,#025eba 100%)",
        "cta_bg":         "#025eba",
        "cta_bg_image":   "linear-gradient(135deg,#4FB6FF 0%,#025eba 100%)",
        "route_prefix":   "",
        "brand_label":    "Gazeal Surveys",
        "partner_logo":   "",
    },
    "balgores": {
        "primary":        "#B8AB84",
        "primary_dark":   "#1A1434",
        "hero_bg_image":  "none",
        "cta_bg":         "#B8AB84",
        "cta_bg_image":   "none",
        "route_prefix":   "/balgores",
        "brand_label":    "Gazeal Surveys × Balgores",
        "partner_logo":   _BALGORES_LOGO_URL,
    },
}


def _tokens(brand: str) -> dict:
    """Safe lookup — unknown brand strings collapse to gazeal."""
    return BRAND_TOKENS.get(brand or "gazeal", BRAND_TOKENS["gazeal"])


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
            <td style="background:{primary_dark};
                       background-image:{hero_bg_image};
                       padding:32px 36px;color:#ffffff;">
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td valign="middle">
                    <table cellpadding="0" cellspacing="0" border="0"><tr>
                      <td valign="middle">
                        <img src="{logo}" alt="Gazeal Surveys"
                             width="150" height="auto"
                             style="display:block;border:0;outline:none;
                                    text-decoration:none;height:auto;">
                      </td>
                      {partner_logo_html}
                    </tr></table>
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
                  <td style="background:{cta_bg};
                             background-image:{cta_bg_image};
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
              <strong style="color:#0B1220;font-weight:700;">{brand_label}</strong>
              &nbsp;·&nbsp; Upfront surveys for sale-ready homes.
              <br>
              Captured by gazeal.co.uk &nbsp;·&nbsp; sent {timestamp}.
            </td>
          </tr>
        </table>

        <div style="margin-top:18px;font-size:11px;color:#6B7280;
                    font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',
                    Helvetica,Arial,sans-serif;">
          This is an automated notification from the {brand_label} landing page.
        </div>
      </td>
    </tr>
  </table>
</body>
</html>
"""


def _partner_logo_html(tokens: dict) -> str:
    """Render a small divider + partner logo cell when a co-brand is set."""
    if not tokens.get("partner_logo"):
        return ""
    return (
        '<td valign="middle" style="padding-left:14px;">'
        '  <table cellpadding="0" cellspacing="0" border="0"><tr>'
        '    <td style="width:1px;background:rgba(255,255,255,0.35);height:28px;"></td>'
        '    <td style="padding-left:14px;" valign="middle">'
        f'      <img src="{tokens["partner_logo"]}" alt="Partner"'
        '           width="36" height="36"'
        '           style="display:block;border:0;outline:none;text-decoration:none;'
        '                  border-radius:4px;">'
        '    </td>'
        '  </tr></table>'
        '</td>'
    )


def _row(label: str, value: str, link: Optional[str] = None,
         primary_dark: str = "#025eba") -> str:
    safe = (value or "").replace("<", "&lt;").replace(">", "&gt;") or "—"
    rendered = safe
    if link:
        # Extract rgb triple from the brand's primary_dark for the underline.
        # Keeping this simple: use rgba() around the hex via inline computation
        # is overkill for email; ship a solid underline that reads on both
        # palettes.
        rendered = (
            f'<a href="{link}" style="color:{primary_dark};text-decoration:none;'
            f'border-bottom:1px solid {primary_dark}55;">{safe}</a>'
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


def _section_title(text: str, primary_dark: str = "#025eba") -> str:
    return (
        '<div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;'
        f'color:{primary_dark};font-weight:700;margin:22px 0 4px;">' + text + '</div>'
    )


def _render_learn_more(lead: LearnMoreLead) -> str:
    tokens = _tokens(lead.brand)
    body = (
        '<p style="margin:0 0 8px;font-size:14px;color:#0B1220;">'
        'An agent has just asked to learn more about Gazeal Seller Surveys. '
        'Their details are below.'
        '</p>'
        + _section_title("Lead details", tokens["primary_dark"])
        + '<table cellpadding="0" cellspacing="0" border="0" width="100%">'
        + _row("Full name", lead.full_name, primary_dark=tokens["primary_dark"])
        + _row("Agency", lead.agency, primary_dark=tokens["primary_dark"])
        + _row("Email", lead.email, link=f"mailto:{lead.email}",
               primary_dark=tokens["primary_dark"])
        + _row("Brand", tokens["brand_label"], primary_dark=tokens["primary_dark"])
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
        primary=tokens["primary"],
        primary_dark=tokens["primary_dark"],
        hero_bg_image=tokens["hero_bg_image"],
        cta_bg=tokens["cta_bg"],
        cta_bg_image=tokens["cta_bg_image"],
        brand_label=tokens["brand_label"],
        partner_logo_html=_partner_logo_html(tokens),
    )


def _render_seller_invite(lead: OrderSurveyLead, agreement_url: str) -> str:
    """Branded, application-style email to the seller with the agreement link.

    Layout principles: clear sender, factual subject line, a single primary
    action, an unmistakable explanation of why the email arrived. No icons,
    no decorative emoji, no marketing fluff.
    """
    tokens = _tokens(lead.brand)
    reference = agreement_url.rstrip("/").split("/")[-1] if agreement_url else ""
    address = lead.address_line_1
    if lead.postcode:
        address = f"{address}, {lead.postcode}"

    # Partner logo rendered as a small divider + swatch next to the main
    # Gazeal Surveys mark. When there's no partner (Gazeal-only send),
    # both cells collapse to empty strings.
    partner_cell = ""
    if tokens.get("partner_logo"):
        partner_cell = (
            '<td valign="middle" style="padding-left:12px;">'
            '  <table cellpadding="0" cellspacing="0" border="0"><tr>'
            '    <td style="width:1px;background:rgba(255,255,255,0.35);height:24px;"></td>'
            '    <td style="padding-left:12px;" valign="middle">'
            f'      <img src="{tokens["partner_logo"]}" alt="Partner"'
            '           width="30" height="30"'
            '           style="display:block;border:0;outline:none;'
            '                  text-decoration:none;border-radius:3px;">'
            '    </td>'
            '  </tr></table>'
            '</td>'
        )

    return f"""\
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Re: The Sale of {address}</title>
</head>
<body style="margin:0;padding:0;background:#F2EFE8;
             font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;
             color:#0B1220;line-height:1.6;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0"
         width="100%" style="background:#F2EFE8;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0"
             width="600" style="max-width:600px;background:#ffffff;
             border-radius:14px;overflow:hidden;
             box-shadow:0 1px 0 rgba(11,18,32,0.04);">

        <!-- App-style header bar -->
        <tr>
          <td style="background:{tokens['primary_dark']};padding:18px 28px;">
            <table cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr>
                <td valign="middle">
                  <table cellpadding="0" cellspacing="0" border="0"><tr>
                    <td valign="middle">
                      <img src="{_LOGO_URL}" alt="Gazeal Surveys" width="140"
                           style="display:block;border:0;outline:none;
                                  text-decoration:none;height:auto;">
                    </td>
                    {partner_cell}
                  </tr></table>
                </td>
                <td align="right" valign="middle"
                    style="font-size:11px;letter-spacing:2px;
                           text-transform:uppercase;color:rgba(255,255,255,0.85);
                           font-weight:600;">
                  Seller agreement
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Greeting -->
        <tr>
          <td style="padding:32px 36px 4px;">
            <p style="margin:0 0 6px;font-size:13px;color:#6B7280;
                      letter-spacing:1.6px;text-transform:uppercase;
                      font-weight:600;">For your action</p>
            <h1 style="margin:0 0 14px;font-size:22px;line-height:1.3;
                       font-weight:700;letter-spacing:-0.3px;color:#0B1220;">
              Re: The Sale of {address}
            </h1>
            <p style="margin:0;font-size:15px;color:#0B1220;">
              Hi {lead.seller_name.split(' ')[0] if lead.seller_name else 'there'},
            </p>
          </td>
        </tr>

        <!-- Why this email -->
        <tr>
          <td style="padding:18px 36px 4px;font-size:15px;color:#0B1220;">
            <p style="margin:0;">
              To get started, the next step is to read the terms and agree
              to them by clicking the button below.
            </p>
          </td>
        </tr>

        <!-- Order panel — calm, application-style -->
        <tr>
          <td style="padding:22px 36px 6px;">
            <table cellpadding="0" cellspacing="0" border="0" width="100%"
                   style="background:#F7F4EE;border:1px solid rgba(11,18,32,0.08);
                          border-radius:12px;">
              <tr>
                <td style="padding:18px 20px;">
                  <p style="margin:0 0 10px;font-size:11px;color:#6B7280;
                            letter-spacing:1.6px;text-transform:uppercase;
                            font-weight:600;">Order details</p>
                  <table cellpadding="0" cellspacing="0" border="0" width="100%">
                    <tr>
                      <td style="padding:4px 0;font-size:12px;color:#6B7280;
                                 width:120px;letter-spacing:0.5px;">Agent</td>
                      <td style="padding:4px 0;font-size:14px;color:#0B1220;">
                        {lead.agent_name} &middot; {lead.agency_name}
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:4px 0;font-size:12px;color:#6B7280;
                                 width:120px;letter-spacing:0.5px;">Property</td>
                      <td style="padding:4px 0;font-size:14px;color:#0B1220;">
                        {address}
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- CTA -->
        <tr>
          <td style="padding:24px 36px 8px;">
            <table cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="background:{tokens['cta_bg']};border-radius:8px;">
                  <a href="{agreement_url}"
                     style="display:inline-block;padding:14px 26px;
                            font-size:15px;font-weight:600;color:#ffffff;
                            text-decoration:none;letter-spacing:0.2px;">
                    Review &amp; sign agreement
                  </a>
                </td>
              </tr>
            </table>
            <p style="margin:14px 0 0;font-size:12px;color:#6B7280;">
              If the button does not work, paste this link into your browser:<br>
              <span style="font-size:12px;color:{tokens['primary_dark']};word-break:break-all;">
                {agreement_url}
              </span>
            </p>
          </td>
        </tr>

        <!-- What happens next -->
        <tr>
          <td style="padding:24px 36px 4px;">
            <p style="margin:0 0 10px;font-size:11px;color:#6B7280;
                      letter-spacing:1.6px;text-transform:uppercase;
                      font-weight:600;">What happens after</p>
            <ol style="margin:0;padding-left:18px;font-size:14px;color:#0B1220;
                       line-height:1.65;">
              <li style="margin-bottom:6px;">
                RPSA receives your request and contacts you directly.
              </li>
              <li style="margin-bottom:6px;">
                An accredited surveyor visits the property and completes
                the survey.
              </li>
              <li>
                The completed report is shared with you and your agent,
                ready to share with serious buyers.
              </li>
            </ol>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:24px 36px 28px;background:#F7F4EE;
                     border-top:1px solid rgba(11,18,32,0.08);">
            <p style="margin:0 0 6px;font-size:12px;color:#0B1220;
                      font-weight:600;">
              {tokens['brand_label']}
            </p>
            <p style="margin:0;font-size:12px;color:#6B7280;line-height:1.6;">
              Survey provided by RPSA (Residential Property Surveyors
              Association) in partnership with Gazeal.<br>
              Questions? Reply to this email and we will be in touch.
            </p>
            <p style="margin:10px 0 0;font-size:11px;color:#6B7280;">
              Reference: <code style="font-size:11px;color:#0B1220;">{reference}</code>
            </p>
          </td>
        </tr>
      </table>

      <p style="margin:18px 0 0;font-size:11px;color:#6B7280;
                font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',
                Helvetica,Arial,sans-serif;">
        This email was sent because your agent ordered a Gazeal seller
        survey on the property listed above.
      </p>
    </td></tr>
  </table>
</body>
</html>
"""


def _render_order_survey(lead: OrderSurveyLead, agreement_url: str = "") -> str:
    tokens = _tokens(lead.brand)
    pd = tokens["primary_dark"]
    reference = agreement_url.rstrip("/").split("/")[-1] if agreement_url else ""
    contact_pieces = [
        f"{lead.agent_name}",
        f"{lead.agency_name}",
    ]
    if lead.branch:
        contact_pieces.append(lead.branch)
    contact_line = " · ".join(contact_pieces)

    body = (
        '<p style="margin:0 0 8px;font-size:14px;color:#0B1220;">'
        f'An agent has submitted a new survey order request via '
        f'<strong>{tokens["brand_label"]}</strong>. RPSA needs to '
        'invite the seller and arrange the visit.'
        '</p>'
        + _section_title("The agent", pd)
        + '<table cellpadding="0" cellspacing="0" border="0" width="100%">'
        + _row("Agent", contact_line, primary_dark=pd)
        + _row("Email", lead.email, link=f"mailto:{lead.email}", primary_dark=pd)
        + _row("Phone", lead.phone, link=f"tel:{lead.phone}", primary_dark=pd)
        + '</table>'
        + _section_title("The seller", pd)
        + '<table cellpadding="0" cellspacing="0" border="0" width="100%">'
        + _row("Name", lead.seller_name, primary_dark=pd)
        + _row("Email", lead.seller_email,
               link=f"mailto:{lead.seller_email}", primary_dark=pd)
        + _row("Phone", lead.seller_phone or "",
               link=(f"tel:{lead.seller_phone}" if lead.seller_phone else None),
               primary_dark=pd)
        + '</table>'
        + _section_title("The property", pd)
        + '<table cellpadding="0" cellspacing="0" border="0" width="100%">'
        + _row("Address", f"{lead.address_line_1}", primary_dark=pd)
        + _row("Postcode", lead.postcode, primary_dark=pd)
        + _row("Asking price", lead.asking_price or "", primary_dark=pd)
        + _row("Listing", lead.listing_url, link=lead.listing_url, primary_dark=pd)
        + '</table>'
        + _section_title("Confirmation", pd)
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
        + (
            _section_title("Sale room", pd)
            + '<p style="margin:6px 0 0;font-size:13px;color:#0B1220;line-height:1.6;">'
              'A unique transaction room (also the seller agreement link) has been generated. '
              'Use this link to track the case and access future Gazeal features for this sale.'
              '</p>'
              f'<p style="margin:10px 0 0;font-size:13px;line-height:1.6;">'
              f'<a href="{agreement_url}" style="color:{pd};text-decoration:none;font-weight:600;">{agreement_url}</a></p>'
              f'<p style="margin:8px 0 0;font-size:12px;color:#6B7280;">Reference: <code>{reference}</code></p>'
            if agreement_url else ""
        )
    )
    return _EMAIL_WRAPPER.format(
        title="New survey order from an agent",
        eyebrow=f"{tokens['brand_label']} · Order",
        kicker=(
            f"{lead.agency_name} would like RPSA to invite "
            f"{lead.seller_name} to book a survey."
        ),
        body=body,
        cta_href=f"mailto:{lead.email}?subject=Gazeal%20Survey%20Order",
        cta_label="Reply to the agent",
        logo=_LOGO_URL,
        timestamp=datetime.now(timezone.utc).strftime("%d %b %Y, %H:%M UTC"),
        primary=tokens["primary"],
        primary_dark=tokens["primary_dark"],
        hero_bg_image=tokens["hero_bg_image"],
        cta_bg=tokens["cta_bg"],
        cta_bg_image=tokens["cta_bg_image"],
        brand_label=tokens["brand_label"],
        partner_logo_html=_partner_logo_html(tokens),
    )


async def _send_email(subject: str, html: str, to: Optional[List[str]] = None) -> Optional[str]:
    params = {
        "from": SENDER_EMAIL,
        "to": to if to else [NOTIFY_EMAIL],
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
        await fan_out(db, "learn_more.created", doc)
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
    async def submit_order_survey(lead: OrderSurveyLead, request: Request):
        # Mint the unique reference up front so it lives on both the lead
        # and the agreement (single value, shared across systems).
        agreement_token = secrets.token_urlsafe(8)

        doc = {
            "id": str(uuid.uuid4()),
            "kind": "order_survey",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "reference_number": agreement_token,
            **lead.model_dump(),
        }
        await db.leads.insert_one(doc)
        await fan_out(db, "order_survey.created", doc)

        # Persist the agreement record so the seller can accept the terms
        # via a branded, permanent link. Derive the public base URL from the
        # request (Origin / Referer) so the email link always matches the
        # domain the agent used — whether that's the preview URL, the
        # emergent.host deployment, or the custom survey.gazeal.co.uk
        # domain. Falls back to the configured FRONTEND_BASE_URL env if
        # neither header is present.
        origin = request.headers.get("origin") or ""
        if not origin:
            referer = request.headers.get("referer") or ""
            if referer:
                # Strip path from referer → scheme://host
                from urllib.parse import urlparse
                p = urlparse(referer)
                if p.scheme and p.netloc:
                    origin = f"{p.scheme}://{p.netloc}"
        base_url = origin or os.environ.get("FRONTEND_BASE_URL", "")
        # Route prefix depends on brand: "/balgores/agreement/{tok}" for
        # Balgores, "/agreement/{tok}" for Gazeal.
        route_prefix = _tokens(lead.brand)["route_prefix"]
        agreement_url = f"{base_url.rstrip('/')}{route_prefix}/agreement/{agreement_token}"
        await db.agreements.insert_one(
            {
                "token": agreement_token,
                "reference_number": agreement_token,
                "agreement_url": agreement_url,
                "lead_id": doc["id"],
                "status": "pending",
                "created_at": doc["created_at"],
                "brand": lead.brand,
                "agent_name": lead.agent_name,
                "agency_name": lead.agency_name,
                "branch": lead.branch,
                "agent_email": lead.email,
                "agent_phone": lead.phone,
                "seller_name": lead.seller_name,
                "seller_email": lead.seller_email,
                "address_line_1": lead.address_line_1,
                "postcode": lead.postcode,
            }
        )
        # Reference already stamped on the lead at insert; agreement now
        # carries it too for cross-collection lookup.

        email_id = None
        email_error = None
        try:
            email_id = await _send_email(
                subject=f"New Seller Survey order — {lead.agency_name} ({lead.seller_name})",
                html=_render_order_survey(lead, agreement_url),
            )
        except Exception as exc:
            email_error = str(exc)

        # Second email: send the seller their agreement link
        seller_email_id = None
        seller_email_error = None
        try:
            seller_email_id = await _send_email(
                subject=f"Re: The Sale of {lead.address_line_1}, {lead.postcode}",
                html=_render_seller_invite(lead, agreement_url),
                to=[lead.seller_email],
            )
        except Exception as exc:
            seller_email_error = str(exc)

        # Fire the Slack ping AFTER both email attempts so we can surface
        # delivery status (quota / domain errors land visibly in Slack).
        notify_order_submitted(
            doc,
            agent_email_id=email_id,
            agent_email_error=email_error,
            seller_email_id=seller_email_id,
            seller_email_error=seller_email_error,
        )

        return {
            "id": doc["id"],
            "reference_number": agreement_token,
            "agreement_token": agreement_token,
            "agreement_url": agreement_url,
            "email_id": email_id,
            "email_error": email_error,
            "seller_email_id": seller_email_id,
            "seller_email_error": seller_email_error,
            "status": "ok",
        }

    return router
