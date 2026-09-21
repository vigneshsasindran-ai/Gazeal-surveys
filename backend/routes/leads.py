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
from fastapi import APIRouter, HTTPException, Request
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel, ConfigDict, EmailStr, Field

from webhooks import fan_out

_TITLES = {"mr", "mrs", "ms", "miss", "dr", "prof", "professor", "sir",
           "dame", "mx", "rev", "lady", "lord", "capt", "captain", "major"}


def _first_name(full_name, fallback: str = "there") -> str:
    """First name skipping honorifics: 'Mr Vignesh Sasindran' -> 'Vignesh'."""
    parts = [p for p in (full_name or "").replace(".", " ").split() if p]
    for p in parts:
        if p.lower() not in _TITLES:
            return p
    return fallback
from slack_notify import notify_order_submitted

logger = logging.getLogger(__name__)

resend.api_key = os.environ["RESEND_API_KEY"]
SENDER_EMAIL = os.environ["SENDER_EMAIL"]
NOTIFY_EMAIL = os.environ["NOTIFY_EMAIL"]
NOTIFY_CC = [e.strip() for e in os.environ.get("NOTIFY_CC", "").split(",") if e.strip()]


# ---------------------------------------------------------------------------
# Pydantic schemas
# ---------------------------------------------------------------------------
class LearnMoreLead(BaseModel):
    model_config = ConfigDict(extra="ignore")
    full_name: str = Field(..., min_length=1, max_length=120)
    agency: str = Field(..., min_length=1, max_length=160)
    email: EmailStr
    brand: str = Field(default="gazeal", pattern="^(gazeal|balgores|exp|davidastburys|harrisonshomes)$")


class IntroEmailLead(BaseModel):
    model_config = ConfigDict(extra="ignore")
    email: EmailStr


class OrderSurveyLead(BaseModel):
    model_config = ConfigDict(extra="ignore")
    # Agent — optional when flow == "seller_direct" (Balgores seller flow)
    agent_name: Optional[str] = Field(default="", max_length=120)
    agency_name: Optional[str] = Field(default="", max_length=160)
    branch: Optional[str] = ""
    phone: Optional[str] = Field(default="", max_length=40)
    email: Optional[EmailStr] = None
    # Seller
    seller_name: str = Field(..., min_length=1, max_length=120)
    seller_email: EmailStr
    seller_phone: Optional[str] = ""
    # Property
    address_line_1: str = Field(..., min_length=1, max_length=200)
    postcode: str = Field(..., min_length=1, max_length=20)
    listing_url: Optional[str] = Field(default="", max_length=600)
    asking_price: Optional[str] = ""
    bedrooms: Optional[str] = Field(default="", max_length=20)
    listed_status: Optional[str] = Field(default="", max_length=30)
    confirmation: bool = False
    # Branding — which product surface the lead was captured from.
    # Defaults to "gazeal" for backwards-compat with any existing clients.
    brand: str = Field(default="gazeal", pattern="^(gazeal|balgores|exp|davidastburys|harrisonshomes)$")
    # "agent" = agent orders + seller receives invite email (default).
    # "seller_direct" = seller orders for themselves and signs on-page.
    flow: str = Field(default="agent", pattern="^(agent|seller_direct)$")


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

# White eXp UK wordmark — reads on the navy #0C0F25 band only.
_EXP_LOGO_URL = (
    "https://customer-assets.emergentagent.com/job_survey-pro-10/"
    "artifacts/4lb77dpb_Gazeal%20Linkedin%20Post%20%2863%29.png"
)

# David Astburys brand assets live in the frontend build, so the email
# templates reference them through the public site URL.
_SITE_BASE = os.environ.get("FRONTEND_BASE_URL", "").rstrip("/")
_DA_LOGO_URL = f"{_SITE_BASE}/brand-assets/da-logo.png"
_DA_LOGO_WHITE_URL = f"{_SITE_BASE}/brand-assets/da-logo-white.png"

# White Harrisons Homes wordmark, for the navy #0E1748 band.
_HH_LOGO_WHITE_URL = f"{_SITE_BASE}/brand-assets/hh-logo-white.png"

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
    "exp": {
        "primary":        "#B9BFD6",
        "primary_dark":   "#0C0F25",
        "hero_bg_image":  "none",
        "cta_bg":         "#0C0F25",
        "cta_bg_image":   "none",
        "route_prefix":   "/exp",
        "brand_label":    "Gazeal Surveys × eXp UK",
        "partner_logo":   _EXP_LOGO_URL,
        "partner_logo_wide": True,
    },
    "harrisonshomes": {
        "primary":        "#DEA39D",
        "primary_dark":   "#0E1748",
        "hero_bg_image":  "none",
        "cta_bg":         "#0E1748",
        "cta_bg_image":   "none",
        "route_prefix":   "/harrisonshomes",
        "brand_label":    "Gazeal Surveys × Harrisons Homes",
        "partner_logo":   _HH_LOGO_WHITE_URL,
        "partner_logo_wide": True,
    },
    "davidastburys": {
        "primary":        "#9B2743",
        "primary_dark":   "#9B2743",
        "hero_bg_image":  "none",
        "cta_bg":         "#9B2743",
        "cta_bg_image":   "none",
        "route_prefix":   "/davidastburys",
        "brand_label":    "Gazeal Surveys × David Astburys",
        "partner_logo":   _DA_LOGO_WHITE_URL,
        "partner_logo_wide": True,
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
    wide = tokens.get("partner_logo_wide")
    size_attrs = (
        'width="96" style="display:block;border:0;outline:none;'
        'text-decoration:none;height:auto;"'
        if wide else
        'width="36" height="36" style="display:block;border:0;outline:none;'
        'text-decoration:none;border-radius:4px;"'
    )
    return (
        '<td valign="middle" style="padding-left:14px;">'
        '  <table cellpadding="0" cellspacing="0" border="0"><tr>'
        '    <td style="width:1px;background:rgba(255,255,255,0.35);height:28px;"></td>'
        '    <td style="padding-left:14px;" valign="middle">'
        f'      <img src="{tokens["partner_logo"]}" alt="Partner" {size_attrs}>'
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
              Hi {_first_name(lead.seller_name)},
            </p>
          </td>
        </tr>

        <!-- Why this email -->
        <tr>
          <td style="padding:18px 36px 4px;font-size:15px;color:#0B1220;">
            <p style="margin:0;">
              Your agent, <strong>{lead.agency_name}</strong>, has ordered a
              Home Insight Survey powered by Gazeal for your property. To
              move things forward, please review and accept the terms of the
              agreement. Everything you need is on the page linked below.
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
                    Get started
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
        f'<div style="background:#F0F6FD;border:1px solid {pd}44;border-radius:10px;'
        'padding:14px 18px;margin:0 0 12px;">'
        '<p style="margin:0;font-size:14px;color:#0B1220;line-height:1.65;">'
        '<strong>The agent has ordered the survey.</strong> An email with the '
        'terms of the Seller Survey Agreement has been sent to the seller. '
        'Only after the seller agrees to the terms will these details be sent '
        'to RPSA.'
        '</p>'
        '</div>'
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
            _section_title("Seller survey agreement", pd)
            + '<p style="margin:6px 0 0;font-size:13px;color:#0B1220;line-height:1.6;">'
              'A unique seller survey agreement link has been generated. '
              'Use this link to track the status of the agreement for this sale.'
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


def _render_balgores_direct_order(lead: OrderSurveyLead, agreement_url: str) -> str:
    """White-labelled Balgores internal notification — solid #1A1434 header
    with the Balgores mark, flat gold CTA, no Gazeal chrome. Sent when a
    seller orders directly through the /balgores funnel."""
    pd = "#1A1434"
    gold = "#B8AB84"
    reference = agreement_url.rstrip("/").split("/")[-1] if agreement_url else ""
    address = lead.address_line_1
    if lead.postcode:
        address = f"{address}, {lead.postcode}"

    agent_rows = ""
    if lead.agent_name or lead.email:
        agent_rows = (
            _row("Agent name", lead.agent_name or "", primary_dark=pd)
            + _row("Agent email", lead.email or "",
                   link=(f"mailto:{lead.email}" if lead.email else None),
                   primary_dark=pd)
        )

    body = (
        f'<div style="background:#F5F3EC;border:1px solid {gold};border-radius:10px;'
        'padding:14px 18px;margin:0 0 12px;">'
        '<p style="margin:0;font-size:14px;color:#0B1220;line-height:1.65;">'
        '<strong>A seller has ordered their survey directly through the '
        'Balgores funnel.</strong> They were taken straight to the agreement '
        'to sign online. The acceptance notification will follow separately. '
        'Details go to RPSA only after the seller accepts the terms.'
        '</p>'
        '</div>'
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
        + _row("Address", lead.address_line_1, primary_dark=pd)
        + _row("Postcode", lead.postcode, primary_dark=pd)
        + _row("Asking price", lead.asking_price or "", primary_dark=pd)
        + _row("Listing", lead.listing_url or "",
               link=lead.listing_url or None, primary_dark=pd)
        + '</table>'
        + _section_title("Balgores", pd)
        + '<table cellpadding="0" cellspacing="0" border="0" width="100%">'
        + _row("Branch", lead.branch or "", primary_dark=pd)
        + agent_rows
        + '</table>'
        + _section_title("Confirmation", pd)
        + '<p style="margin:6px 0 0;font-size:13px;color:#0B1220;line-height:1.6;">'
        + (
            'The seller has confirmed they are happy for RPSA to contact '
            'them about arranging their survey.'
            if lead.confirmation
            else
            '<span style="color:#B23A3A;font-weight:600;">The seller '
            'confirmation checkbox was not ticked.</span>'
        )
        + '</p>'
        + _section_title("Seller survey agreement", pd)
        + '<p style="margin:6px 0 0;font-size:13px;color:#0B1220;line-height:1.6;">'
          'Use this link to track the status of the agreement for this sale.'
          '</p>'
          f'<p style="margin:10px 0 0;font-size:13px;line-height:1.6;">'
          f'<a href="{agreement_url}" style="color:{pd};text-decoration:none;'
          f'font-weight:600;word-break:break-all;">{agreement_url}</a></p>'
          f'<p style="margin:8px 0 0;font-size:12px;color:#6B7280;">'
          f'Reference: <code>{reference}</code></p>'
    )

    return f"""\
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>New Balgores seller survey order</title>
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
          <!-- Hero band — flat Balgores purple -->
          <tr>
            <td style="background:{pd};padding:32px 36px;color:#ffffff;">
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td valign="middle">
                    <table cellpadding="0" cellspacing="0" border="0"><tr>
                      <td valign="middle">
                        <img src="{_BALGORES_LOGO_URL}" alt="Balgores"
                             width="44" height="44"
                             style="display:block;border:0;outline:none;
                                    text-decoration:none;border-radius:5px;">
                      </td>
                      <td valign="middle" style="padding-left:14px;font-size:17px;
                                                 color:{gold};letter-spacing:0.4px;">
                        Balgores Property Group
                      </td>
                    </tr></table>
                  </td>
                  <td align="right" valign="middle"
                      style="font-size:11px;letter-spacing:2.4px;
                             text-transform:uppercase;color:rgba(255,255,255,0.8);
                             font-weight:600;">
                    Seller order
                  </td>
                </tr>
              </table>
              <div style="margin-top:22px;font-size:24px;line-height:1.2;
                          font-weight:700;letter-spacing:-0.5px;
                          color:#ffffff;max-width:480px;">
                New seller survey order
              </div>
              <div style="margin-top:10px;font-size:14px;line-height:1.6;
                          color:rgba(255,255,255,0.85);max-width:480px;">
                {lead.seller_name} has ordered a Home Insight Survey for
                {address} via the Balgores {lead.branch or ''} funnel.
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

          <!-- CTA -->
          <tr>
            <td style="padding:8px 36px 32px 36px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="background:{gold};border-radius:999px;">
                    <a href="{agreement_url}"
                       style="display:inline-block;padding:12px 22px;
                              font-size:14px;font-weight:600;color:#ffffff;
                              text-decoration:none;letter-spacing:0.2px;">
                      View the agreement
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer — flat Balgores purple -->
          <tr>
            <td style="padding:20px 36px 26px 36px;background:{pd};
                       font-size:11px;color:rgba(255,255,255,0.7);line-height:1.6;">
              <strong style="color:{gold};font-weight:700;">Balgores Property Group</strong>
              &nbsp;·&nbsp; Home Insights powered by Gazeal.
              <br>
              Captured by the Balgores seller funnel &nbsp;·&nbsp; sent {datetime.now(timezone.utc).strftime("%d %b %Y, %H:%M UTC")}.
            </td>
          </tr>
        </table>

        <div style="margin-top:18px;font-size:11px;color:#6B7280;
                    font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',
                    Helvetica,Arial,sans-serif;">
          This is an automated notification from the Balgores seller survey funnel.
        </div>
      </td>
    </tr>
  </table>
</body>
</html>
"""


def _render_exp_direct_order(lead: OrderSurveyLead, agreement_url: str) -> str:
    """White-labelled eXp UK internal notification. Clean navy #0C0F25 band
    with the white eXp UK wordmark, white CTA, no Gazeal chrome. Sent when a
    seller orders directly through the /exp funnel."""
    pd = "#0C0F25"
    mist = "#B9BFD6"
    reference = agreement_url.rstrip("/").split("/")[-1] if agreement_url else ""
    address = lead.address_line_1
    if lead.postcode:
        address = f"{address}, {lead.postcode}"

    body = (
        f'<div style="background:#F4F5F9;border:1px solid rgba(12,15,37,0.14);'
        'border-radius:10px;padding:14px 18px;margin:0 0 12px;">'
        '<p style="margin:0;font-size:14px;color:#0B1220;line-height:1.65;">'
        '<strong>A seller has ordered their survey directly through the '
        'eXp UK funnel.</strong> They were taken straight to the agreement '
        'to sign online. The acceptance notification will follow separately. '
        'Details go to RPSA only after the seller accepts the terms.'
        '</p>'
        '</div>'
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
        + _row("Address", lead.address_line_1, primary_dark=pd)
        + _row("Postcode", lead.postcode, primary_dark=pd)
        + _row("Asking price", lead.asking_price or "", primary_dark=pd)
        + _row("Bedrooms", lead.bedrooms or "", primary_dark=pd)
        + _row("Listed building", lead.listed_status or "", primary_dark=pd)
        + _row("Listing", lead.listing_url or "",
               link=lead.listing_url or None, primary_dark=pd)
        + '</table>'
        + _section_title("The eXp UK agent", pd)
        + '<table cellpadding="0" cellspacing="0" border="0" width="100%">'
        + _row("Agent name", lead.agent_name or "", primary_dark=pd)
        + _row("Agent email", lead.email or "",
               link=(f"mailto:{lead.email}" if lead.email else None),
               primary_dark=pd)
        + _row("Agent phone", lead.phone or "",
               link=(f"tel:{lead.phone}" if lead.phone else None),
               primary_dark=pd)
        + '</table>'
        + _section_title("Confirmation", pd)
        + '<p style="margin:6px 0 0;font-size:13px;color:#0B1220;line-height:1.6;">'
        + (
            'The seller has confirmed they are happy for RPSA to contact '
            'them about arranging their survey.'
            if lead.confirmation
            else
            '<span style="color:#B23A3A;font-weight:600;">The seller '
            'confirmation checkbox was not ticked.</span>'
        )
        + '</p>'
        + _section_title("Seller survey agreement", pd)
        + '<p style="margin:6px 0 0;font-size:13px;color:#0B1220;line-height:1.6;">'
          'Use this link to track the status of the agreement for this sale.'
          '</p>'
          f'<p style="margin:10px 0 0;font-size:13px;line-height:1.6;">'
          f'<a href="{agreement_url}" style="color:{pd};text-decoration:none;'
          f'font-weight:600;word-break:break-all;">{agreement_url}</a></p>'
          f'<p style="margin:8px 0 0;font-size:12px;color:#6B7280;">'
          f'Reference: <code>{reference}</code></p>'
    )

    return f"""\
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>New eXp UK seller survey order</title>
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
          <!-- Hero band, flat eXp navy -->
          <tr>
            <td style="background:{pd};padding:32px 36px;color:#ffffff;">
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td valign="middle">
                    <img src="{_EXP_LOGO_URL}" alt="eXp UK" width="110"
                         style="display:block;border:0;outline:none;
                                text-decoration:none;height:auto;">
                  </td>
                  <td align="right" valign="middle"
                      style="font-size:11px;letter-spacing:2.4px;
                             text-transform:uppercase;color:rgba(255,255,255,0.75);
                             font-weight:600;">
                    Seller order
                  </td>
                </tr>
              </table>
              <div style="margin-top:24px;font-size:24px;line-height:1.2;
                          font-weight:700;letter-spacing:-0.5px;
                          color:#ffffff;max-width:480px;">
                New seller survey order
              </div>
              <div style="margin-top:10px;font-size:14px;line-height:1.6;
                          color:rgba(255,255,255,0.85);max-width:480px;">
                {lead.seller_name} has ordered a Home Insight Survey for
                {address} through the eXp UK funnel.
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

          <!-- CTA -->
          <tr>
            <td style="padding:8px 36px 32px 36px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="background:{pd};border-radius:999px;">
                    <a href="{agreement_url}"
                       style="display:inline-block;padding:12px 24px;
                              font-size:14px;font-weight:600;color:#ffffff;
                              text-decoration:none;letter-spacing:0.2px;">
                      View the agreement
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer, flat eXp navy -->
          <tr>
            <td style="padding:20px 36px 26px 36px;background:{pd};
                       font-size:11px;color:rgba(255,255,255,0.7);line-height:1.6;">
              <strong style="color:{mist};font-weight:700;">eXp UK</strong>
              &nbsp;·&nbsp; Home Insights powered by Gazeal.
              <br>
              Captured by the eXp UK seller funnel &nbsp;·&nbsp; sent {datetime.now(timezone.utc).strftime("%d %b %Y, %H:%M UTC")}.
            </td>
          </tr>
        </table>

        <div style="margin-top:18px;font-size:11px;color:#6B7280;
                    font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',
                    Helvetica,Arial,sans-serif;">
          This is an automated notification from the eXp UK seller survey funnel.
        </div>
      </td>
    </tr>
  </table>
</body>
</html>
"""


def _render_da_direct_order(lead: OrderSurveyLead, agreement_url: str) -> str:
    """White-labelled David Astburys internal notification. Plain white card
    (their secondary colour) with the burgundy #9B2743 used for the logo lock-up,
    section labels and the single button. Sent when a seller orders directly
    through the /davidastburys funnel."""
    pd = "#9B2743"
    reference = agreement_url.rstrip("/").split("/")[-1] if agreement_url else ""
    address = lead.address_line_1
    if lead.postcode:
        address = f"{address}, {lead.postcode}"

    agent_rows = ""
    if lead.agent_name or lead.email:
        agent_rows = (
            _row("Agent name", lead.agent_name or "", primary_dark=pd)
            + _row("Agent email", lead.email or "",
                   link=(f"mailto:{lead.email}" if lead.email else None),
                   primary_dark=pd)
        )

    body = (
        f'<div style="border:1px solid rgba(155,39,67,0.25);border-left:3px solid {pd};'
        'border-radius:8px;padding:14px 18px;margin:0 0 12px;background:#FFFFFF;">'
        '<p style="margin:0;font-size:14px;color:#2B1B20;line-height:1.65;">'
        '<strong>A seller has ordered their survey directly through the '
        'David Astburys funnel.</strong> They were taken straight to the '
        'agreement to sign online. The acceptance notification will follow '
        'separately. Details go to RPSA only after the seller accepts the terms.'
        '</p>'
        '</div>'
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
        + _row("Address", lead.address_line_1, primary_dark=pd)
        + _row("Postcode", lead.postcode, primary_dark=pd)
        + _row("Asking price", lead.asking_price or "", primary_dark=pd)
        + _row("Bedrooms", lead.bedrooms or "", primary_dark=pd)
        + _row("Listed building", lead.listed_status or "", primary_dark=pd)
        + _row("Listing", lead.listing_url or "",
               link=lead.listing_url or None, primary_dark=pd)
        + '</table>'
        + _section_title("David Astburys", pd)
        + '<table cellpadding="0" cellspacing="0" border="0" width="100%">'
        + _row("Branch", lead.branch or "", primary_dark=pd)
        + agent_rows
        + '</table>'
        + _section_title("Confirmation", pd)
        + '<p style="margin:6px 0 0;font-size:13px;color:#2B1B20;line-height:1.6;">'
        + (
            'The seller has confirmed they are happy for RPSA to contact '
            'them about arranging their survey.'
            if lead.confirmation
            else
            '<span style="color:#B23A3A;font-weight:600;">The seller '
            'confirmation checkbox was not ticked.</span>'
        )
        + '</p>'
        + _section_title("Seller survey agreement", pd)
        + '<p style="margin:6px 0 0;font-size:13px;color:#2B1B20;line-height:1.6;">'
          'Use this link to track the status of the agreement for this sale.'
          '</p>'
          f'<p style="margin:10px 0 0;font-size:13px;line-height:1.6;">'
          f'<a href="{agreement_url}" style="color:{pd};text-decoration:none;'
          f'font-weight:600;word-break:break-all;">{agreement_url}</a></p>'
          f'<p style="margin:8px 0 0;font-size:12px;color:#7A6B6F;">'
          f'Reference: <code>{reference}</code></p>'
    )

    return f"""\
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>New David Astburys seller survey order</title>
</head>
<body style="margin:0;padding:0;background:#F4EFED;font-family:-apple-system,
             BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;
             color:#2B1B20;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"
         style="background:#F4EFED;padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600"
               style="max-width:600px;background:#ffffff;border-radius:14px;
                      overflow:hidden;border:1px solid rgba(155,39,67,0.15);">
          <!-- Header, plain white with the David Astburys mark -->
          <tr>
            <td style="padding:28px 36px 20px;background:#ffffff;
                       border-bottom:1px solid rgba(155,39,67,0.15);">
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td valign="middle">
                    <img src="{_DA_LOGO_URL}" alt="David Astburys" width="180"
                         style="display:block;border:0;outline:none;
                                text-decoration:none;height:auto;">
                  </td>
                  <td align="right" valign="middle"
                      style="font-size:11px;letter-spacing:2.2px;
                             text-transform:uppercase;color:{pd};font-weight:700;">
                    Seller order
                  </td>
                </tr>
              </table>
              <div style="margin-top:22px;font-size:23px;line-height:1.25;
                          font-weight:700;letter-spacing:-0.4px;color:{pd};">
                New seller survey order
              </div>
              <div style="margin-top:8px;font-size:14px;line-height:1.6;
                          color:#5C4A4E;">
                {lead.seller_name} has ordered a Home Insight Survey for
                {address}.
              </div>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:26px 36px 8px 36px;font-size:14px;
                       line-height:1.65;color:#2B1B20;">
              {body}
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td style="padding:8px 36px 30px 36px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="background:{pd};border-radius:999px;">
                    <a href="{agreement_url}"
                       style="display:inline-block;padding:12px 24px;
                              font-size:14px;font-weight:600;color:#ffffff;
                              text-decoration:none;letter-spacing:0.2px;">
                      View the agreement
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:18px 36px 24px 36px;background:#ffffff;
                       border-top:1px solid rgba(155,39,67,0.15);
                       font-size:11px;color:#7A6B6F;line-height:1.6;">
              <strong style="color:{pd};font-weight:700;">David Astburys</strong>
              &nbsp;·&nbsp; Home Insights powered by Gazeal.
              <br>
              Captured by the David Astburys seller funnel &nbsp;·&nbsp; sent {datetime.now(timezone.utc).strftime("%d %b %Y, %H:%M UTC")}.
            </td>
          </tr>
        </table>

        <div style="margin-top:16px;font-size:11px;color:#7A6B6F;
                    font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',
                    Helvetica,Arial,sans-serif;">
          This is an automated notification from the David Astburys seller survey funnel.
        </div>
      </td>
    </tr>
  </table>
</body>
</html>
"""


def _render_hh_direct_order(lead: OrderSurveyLead, agreement_url: str) -> str:
    """Harrisons Homes internal notification. Navy #0E1748 header band with the
    white wordmark, #DEA39D accents, kept deliberately simple. Harrisons Homes
    pays the survey fee, so there is no seller payment wording."""
    pd = "#0E1748"
    acc = "#DEA39D"
    reference = agreement_url.rstrip("/").split("/")[-1] if agreement_url else ""
    address = lead.address_line_1
    if lead.postcode:
        address = f"{address}, {lead.postcode}"

    body = (
        f'<div style="border:1px solid rgba(14,23,72,0.18);border-left:3px solid {acc};'
        'border-radius:8px;padding:14px 18px;margin:0 0 12px;background:#FFFFFF;">'
        '<p style="margin:0;font-size:14px;color:#0E1748;line-height:1.65;">'
        '<strong>A seller has ordered their survey through the Harrisons Homes '
        'funnel.</strong> They were taken straight to the agreement to sign online. '
        '<strong>Harrisons Homes pays the survey fee</strong>, so the seller has '
        'nothing to pay at any point. Details go to RPSA only after the seller '
        'accepts the terms.'
        '</p>'
        '</div>'
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
        + _row("Address", lead.address_line_1, primary_dark=pd)
        + _row("Postcode", lead.postcode, primary_dark=pd)
        + _row("Asking price", lead.asking_price or "", primary_dark=pd)
        + _row("Bedrooms", lead.bedrooms or "", primary_dark=pd)
        + _row("Listed building", lead.listed_status or "", primary_dark=pd)
        + '</table>'
        + _section_title("Harrisons Homes", pd)
        + '<table cellpadding="0" cellspacing="0" border="0" width="100%">'
        + _row("Agent name", lead.agent_name or "", primary_dark=pd)
        + _row("Agent email", lead.email or "",
               link=(f"mailto:{lead.email}" if lead.email else None),
               primary_dark=pd)
        + _row("Agent phone", lead.phone or "",
               link=(f"tel:{lead.phone}" if lead.phone else None),
               primary_dark=pd)
        + _row("Survey fee", "Invoiced to Harrisons Homes", primary_dark=pd)
        + '</table>'
        + _section_title("Seller survey agreement", pd)
        + '<p style="margin:6px 0 0;font-size:13px;color:#0E1748;line-height:1.6;">'
          'Use this link to track the status of the agreement for this sale.'
          '</p>'
          f'<p style="margin:10px 0 0;font-size:13px;line-height:1.6;">'
          f'<a href="{agreement_url}" style="color:{pd};text-decoration:none;'
          f'font-weight:600;word-break:break-all;">{agreement_url}</a></p>'
          f'<p style="margin:8px 0 0;font-size:12px;color:#6B7280;">'
          f'Reference: <code>{reference}</code></p>'
    )

    return f"""\
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>New Harrisons Homes seller survey order</title>
</head>
<body style="margin:0;padding:0;background:#F3F4F8;font-family:-apple-system,
             BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#0E1748;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"
         style="background:#F3F4F8;padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600"
               style="max-width:600px;background:#ffffff;border-radius:14px;
                      overflow:hidden;border:1px solid rgba(14,23,72,0.12);">
          <tr>
            <td style="background:{pd};padding:28px 36px;color:#ffffff;">
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td valign="middle">
                    <img src="{_HH_LOGO_WHITE_URL}" alt="Harrisons Homes" width="150"
                         style="display:block;border:0;outline:none;
                                text-decoration:none;height:auto;">
                  </td>
                  <td align="right" valign="middle"
                      style="font-size:11px;letter-spacing:2.2px;text-transform:uppercase;
                             color:{acc};font-weight:700;">
                    Seller order
                  </td>
                </tr>
              </table>
              <div style="margin-top:22px;font-size:23px;line-height:1.25;font-weight:700;
                          letter-spacing:-0.4px;color:#ffffff;">
                New seller survey order
              </div>
              <div style="margin-top:8px;font-size:14px;line-height:1.6;
                          color:rgba(255,255,255,0.85);">
                {lead.seller_name} has ordered a Home Insight Survey for {address}.
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:26px 36px 8px 36px;font-size:14px;line-height:1.65;
                       color:#0E1748;">
              {body}
            </td>
          </tr>
          <tr>
            <td style="padding:8px 36px 30px 36px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="background:{pd};border-radius:999px;">
                    <a href="{agreement_url}"
                       style="display:inline-block;padding:12px 24px;font-size:14px;
                              font-weight:600;color:#ffffff;text-decoration:none;">
                      View the agreement
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 36px 24px 36px;background:#ffffff;
                       border-top:1px solid rgba(14,23,72,0.12);font-size:11px;
                       color:#6B7280;line-height:1.6;">
              <strong style="color:{pd};font-weight:700;">Harrisons Homes</strong>
              &nbsp;·&nbsp; Home Insights powered by Gazeal.
              <br>
              Captured by the Harrisons Homes seller funnel &nbsp;·&nbsp; sent {datetime.now(timezone.utc).strftime("%d %b %Y, %H:%M UTC")}.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""


async def _dispatch_order_emails(lead: OrderSurveyLead, agreement_url: str) -> tuple:
    """Send the order emails for either flow.
    Returns (email_id, email_error, seller_email_id, seller_email_error)."""
    email_id = email_error = seller_email_id = seller_email_error = None

    if lead.flow == "seller_direct":
        # Seller-direct funnels (Balgores, eXp UK): the seller signs the
        # agreement on-page immediately after submitting — no invite email
        # loop. Internal team gets a white-labelled partner notification.
        if lead.brand == "exp":
            subject = (
                f"New eXp UK seller survey order — {lead.seller_name}"
                f"{f' ({lead.agent_name})' if lead.agent_name else ''}"
            )
            html = _render_exp_direct_order(lead, agreement_url)
        elif lead.brand == "harrisonshomes":
            subject = (
                f"New Harrisons Homes seller survey order — {lead.seller_name}"
                f"{f' ({lead.agent_name})' if lead.agent_name else ''}"
            )
            html = _render_hh_direct_order(lead, agreement_url)
        elif lead.brand == "davidastburys":
            subject = (
                f"New David Astburys seller survey order — "
                f"{lead.seller_name} ({lead.branch or 'branch not set'})"
            )
            html = _render_da_direct_order(lead, agreement_url)
        else:
            subject = (
                f"New Balgores seller survey order — "
                f"{lead.seller_name} ({lead.branch or 'branch not set'})"
            )
            html = _render_balgores_direct_order(lead, agreement_url)
        try:
            email_id = await _send_email(subject=subject, html=html)
        except Exception as exc:
            email_error = str(exc)
        return email_id, email_error, seller_email_id, seller_email_error

    try:
        email_id = await _send_email(
            subject=f"New Seller Survey order — {lead.agency_name} ({lead.seller_name})",
            html=_render_order_survey(lead, agreement_url),
            cc=NOTIFY_CC,
        )
    except Exception as exc:
        email_error = str(exc)

    # Second email: send the seller their agreement link
    try:
        seller_email_id = await _send_email(
            subject=f"Re: The Sale of {lead.address_line_1}, {lead.postcode}",
            html=_render_seller_invite(lead, agreement_url),
            to=[lead.seller_email],
        )
    except Exception as exc:
        seller_email_error = str(exc)
    return email_id, email_error, seller_email_id, seller_email_error


async def _send_email(subject: str, html: str, to: Optional[List[str]] = None,
                      cc: Optional[List[str]] = None) -> Optional[str]:
    params = {
        "from": SENDER_EMAIL,
        "to": to if to else [NOTIFY_EMAIL],
        "subject": subject,
        "html": html,
    }
    if cc:
        params["cc"] = cc
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

    @router.post("/intro-email")
    async def submit_intro_email(lead: IntroEmailLead):
        doc = {
            "id": str(uuid.uuid4()),
            "kind": "intro_email",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "brand": "gazeal",
            "source": "intro_page",
            **lead.model_dump(),
        }
        await db.leads.insert_one(doc)
        await fan_out(db, "intro_email.created", doc)
        email_id = None
        email_error = None
        try:
            email_id = await _send_email(
                subject=f"New intro-page signup — {lead.email}",
                html=(
                    "<div style=\"font-family:Arial,Helvetica,sans-serif;max-width:520px;"
                    "margin:0 auto;padding:24px;\">"
                    "<h2 style=\"color:#025eba;margin:0 0 12px;\">New intro page signup</h2>"
                    "<p style=\"color:#333;font-size:15px;line-height:1.6;margin:0 0 8px;\">"
                    "Someone left their email on the Gazeal Surveys video intro page "
                    "(<strong>/intro</strong>):</p>"
                    f"<p style=\"font-size:16px;margin:0;\"><a href=\"mailto:{lead.email}\" "
                    f"style=\"color:#025eba;\">{lead.email}</a></p>"
                    "</div>"
                ),
                cc=NOTIFY_CC,
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
        if lead.flow == "agent" and not (
            lead.agent_name and lead.agency_name and lead.email
        ):
            raise HTTPException(422, "Agent details are required")

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
        for k in ("agent_name", "agency_name", "branch", "phone", "email"):
            doc[k] = doc.get(k) or ""
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
                "flow": lead.flow,
                "agent_name": doc["agent_name"],
                "agency_name": doc["agency_name"],
                "branch": doc["branch"],
                "agent_email": doc["email"],
                "agent_phone": doc["phone"],
                "seller_name": lead.seller_name,
                "seller_email": lead.seller_email,
                "address_line_1": lead.address_line_1,
                "postcode": lead.postcode,
            }
        )
        # Reference already stamped on the lead at insert; agreement now
        # carries it too for cross-collection lookup.

        email_id, email_error, seller_email_id, seller_email_error = (
            await _dispatch_order_emails(lead, agreement_url)
        )

        # Persist the email audit on the agreement so every record carries
        # proof of what was sent at order time.
        order_audit = {
            "email_audit_order": {
                "internal": {"id": email_id, "error": email_error},
                "seller_invite": {"id": seller_email_id, "error": seller_email_error},
            }
        }
        if seller_email_id:
            order_audit["seller_invite_sent_at"] = doc["created_at"]
        await db.agreements.update_one({"token": agreement_token}, {"$set": order_audit})

        # Fire the Slack ping AFTER the email attempts so we can surface
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
