"""Hosted seller agreement — token issue, fetch, accept/decline.

Each Order Survey submission gets a unique short token (~10 chars). The
seller receives a branded link `{FRONTEND_BASE_URL}/agreement/<token>` in
their invite email. The page renders the full agreement in our brand
language, captures Accept / Decline, and fans the result out to Slack,
Resend (Gazeal + seller) and the webhook delivery system (RPSA).
"""
from __future__ import annotations

import asyncio
import json
import logging
import os
import secrets
from datetime import datetime, timezone
from typing import Optional

import httpx
import resend
import base64
from fastapi import APIRouter, HTTPException, Request, Response
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel

import terms as terms_mod
from pdf_terms import build_agreement_pdf

from webhooks import fan_out
from slack_notify import notify_agreement_accepted, notify_reservation_interest
from routes.leads import (
    _EMAIL_WRAPPER,
    _LOGO_URL,
    _first_name,
    _partner_logo_html,
    _row,
    _section_title,
    _tokens,
)

logger = logging.getLogger(__name__)

SENDER_EMAIL = os.environ["SENDER_EMAIL"]
NOTIFY_EMAIL = os.environ["NOTIFY_EMAIL"]
NOTIFY_CC = [e.strip() for e in os.environ.get("NOTIFY_CC", "").split(",") if e.strip()]
RPSA_EMAIL = os.environ.get("RPSA_EMAIL", NOTIFY_EMAIL)
# Gazeal's own cc on the seller confirmation and the RPSA instruction.
# Env-driven (blank = no cc) so preview can be kept off the real inbox.
GAZEAL_CC = [e.strip() for e in os.environ.get("GAZEAL_CC_EMAIL", "").split(",") if e.strip()]
# Live endpoint: https://www.rpsapanel.co.uk/rpsagazealwebhook.php
# Left unset in dev/test so we never commission real surveys by accident.
RPSA_WEBHOOK_URL = os.environ.get("RPSA_WEBHOOK_URL", "")
# ProcessMaker endpoint that keeps a copy of each signed order and the id
# RPSA gave it. Live:
# https://reservation.gazeal.co.uk/api/1.0/workflow/extraRest/rpsa/saveRpsaEntry/
# Left unset in dev/test so nothing is written to the live PM database.
PM_RPSA_SAVE_URL = os.environ.get("PM_RPSA_SAVE_URL", "")


# --------------------------- helpers ---------------------------
def generate_token() -> str:
    return secrets.token_urlsafe(8)  # ~11 chars, url-safe


def public_context(agreement: dict, lead: dict | None = None) -> dict:
    """Personalised data that the public agreement page needs to render."""
    lead = lead or {}
    return {
        "token": agreement["token"],
        "reference_number": agreement.get("reference_number") or agreement["token"],
        "status": agreement.get("status", "pending"),
        "seller": {
            "first_name": _first_name(agreement.get("seller_name"))
            or "there",
            "full_name": agreement.get("seller_name"),
        },
        "agent": {
            "name": agreement.get("agent_name"),
            "agency": agreement.get("agency_name"),
            "branch": agreement.get("branch"),
        },
        "property": {
            "address_line_1": agreement.get("address_line_1"),
            "postcode": agreement.get("postcode"),
            "asking_price": lead.get("asking_price") or "",
            "bedrooms": lead.get("bedrooms") or "",
            "listed_status": lead.get("listed_status") or "",
        },
        "accepted_at": agreement.get("accepted_at"),
        "accepted_ip": agreement.get("accepted_ip"),
        "declined_at": agreement.get("declined_at"),
        "previously_declined_at": agreement.get("previously_declined_at"),
        "created_at": agreement.get("created_at"),
        "flow": agreement.get("flow") or "agent",
        "seller_invite_sent_at": agreement.get("seller_invite_sent_at"),
        "rpsa_instructed_at": agreement.get("rpsa_instructed_at"),
        "reservation_interest": bool(agreement.get("reservation_interest")),
        "reservation_interest_at": agreement.get("reservation_interest_at"),
        "pricing_snapshot": agreement.get("pricing_snapshot"),
        "brand": agreement.get("brand") or "gazeal",
        "fee_due_at": agreement.get("fee_due_at"),
        "terms_version": agreement.get("terms_version"),
        "terms_sha256": agreement.get("terms_sha256"),
        "payment_acknowledged": bool(agreement.get("payment_acknowledged")),
        "terms_pdf_available": bool(agreement.get("terms_text")),
    }


async def _send(subject: str, html: str, to: list[str],
                cc: Optional[list[str]] = None,
                attachments: Optional[list[dict]] = None) -> Optional[str]:
    params = {
        "from": SENDER_EMAIL,
        "to": to,
        "subject": subject,
        "html": html,
    }
    if cc:
        params["cc"] = cc
    if attachments:
        params["attachments"] = attachments
    email = await asyncio.to_thread(resend.Emails.send, params)
    return email.get("id") if isinstance(email, dict) else None


def _fmt_dt(iso: str) -> str:
    try:
        return datetime.fromisoformat(iso).strftime("%d %b %Y, %H:%M UTC")
    except Exception:
        return iso


def _fmt_date(iso: str) -> str:
    try:
        return datetime.fromisoformat(iso).strftime("%d %B %Y")
    except Exception:
        return iso


def _plus_six_months(iso: str) -> str:
    """Six calendar months from the acceptance date, clamped to month end."""
    try:
        d = datetime.fromisoformat(iso)
    except Exception:
        return ""
    month = d.month + 6
    year = d.year + (month - 1) // 12
    month = (month - 1) % 12 + 1
    day = d.day
    while True:
        try:
            return d.replace(year=year, month=month, day=day).isoformat()
        except ValueError:
            day -= 1


def _wrapped(brand: str, title: str, eyebrow: str, kicker: str, body: str,
             cta_href: str, cta_label: str) -> str:
    tokens = _tokens(brand)
    return _EMAIL_WRAPPER.format(
        title=title,
        eyebrow=eyebrow,
        kicker=kicker,
        body=body,
        cta_href=cta_href,
        cta_label=cta_label,
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


def _agreement_link_html(agreement_url: str, pd: str) -> str:
    return (
        _section_title("Seller survey agreement", pd)
        + f'<p style="margin:6px 0 0;font-size:13px;line-height:1.6;">'
          f'<a href="{agreement_url}" style="color:{pd};text-decoration:none;'
          f'font-weight:600;word-break:break-all;">{agreement_url}</a></p>'
          '<p style="margin:8px 0 0;font-size:12px;color:#6B7280;">'
          'Return to this link at any time to revisit the signed agreement.</p>'
    )


# ---------------- acceptance email / payload builders ----------------
def _build_accept_ctx(doc: dict, lead_doc, token: str,
                      now: str, ip: str, ua: str) -> dict:
    """Shared values used by the acceptance emails and payloads."""
    brand = doc.get("brand") or "gazeal"
    tokens = _tokens(brand)
    pd = tokens["primary_dark"]
    accepted_label = _fmt_dt(now)
    agency_paid = (doc.get("brand") or "gazeal") in terms_mod.AGENCY_PAID_BRANDS
    fee_due_at = "" if agency_paid else (doc.get("fee_due_at") or _plus_six_months(now))
    fee_due_label = _fmt_date(fee_due_at) if fee_due_at else ""
    acceptance_rows = (
        '<table cellpadding="0" cellspacing="0" border="0" width="100%">'
        + _row("Accepted", accepted_label, primary_dark=pd)
        + _row("IP address", ip or "unknown", primary_dark=pd)
        + _row("Reference", token, primary_dark=pd)
        + (_row("Survey fee", "Paid by the estate agency", primary_dark=pd)
           if agency_paid else
           _row("Fee payable by", fee_due_label, primary_dark=pd))
        + "</table>"
    )
    return {
        "doc": doc,
        "lead": lead_doc or {},
        "token": token,
        "now": now,
        "ip": ip,
        "ua": ua,
        "brand": brand,
        "tokens": tokens,
        "pd": pd,
        "address": f"{doc.get('address_line_1','')}, {doc.get('postcode','')}",
        "seller_name": doc.get("seller_name") or "the seller",
        "agent_label": " · ".join(
            x for x in (doc.get("agent_name"), doc.get("agency_name"), doc.get("branch")) if x
        ) or "—",
        "agreement_url": doc.get("agreement_url")
        or f"{os.environ.get('FRONTEND_BASE_URL','')}/agreement/{token}",
        "accepted_label": accepted_label,
        "acceptance_rows": acceptance_rows,
        "fee_due_at": fee_due_at,
        "fee_due_label": fee_due_label,
        "agency_paid": agency_paid,
        "terms_label": doc.get("terms_version") or terms_mod.TERMS_LABEL,
        "terms_sha256": doc.get("terms_sha256") or "",
        "previously_declined_at": doc.get("previously_declined_at"),
    }


def _payment_block(ctx: dict) -> str:
    """The payment term, restated in the emails with the exact due date."""
    pd = ctx["pd"]
    if ctx.get("agency_paid"):
        agency = ctx["doc"].get("agency_name") or "the estate agency"
        return (
            f'<div style="border:1px solid rgba(17,24,39,0.18);border-left:3px solid {pd};'
            'border-radius:8px;padding:14px 16px;margin:14px 0 4px;background:#FAFAFA;">'
            '<p style="margin:0 0 6px;font-size:11px;letter-spacing:1.6px;'
            f'text-transform:uppercase;font-weight:700;color:{pd};">'
            'Who pays for the survey</p>'
            '<p style="margin:0;font-size:14px;color:#111827;line-height:1.65;">'
            f'<strong>{agency} pays the survey fee.</strong> There is nothing for the '
            'seller to pay, now or at any point, and no fee becomes due from the seller '
            'if the sale does not complete. Gazeal invoices the agency directly.'
            '</p>'
            '</div>'
        )
    return (
        f'<div style="border:1px solid rgba(17,24,39,0.18);border-left:3px solid {pd};'
        'border-radius:8px;padding:14px 16px;margin:14px 0 4px;background:#FAFAFA;">'
        '<p style="margin:0 0 6px;font-size:11px;letter-spacing:1.6px;'
        f'text-transform:uppercase;font-weight:700;color:{pd};">'
        'When the survey fee is payable</p>'
        '<p style="margin:0 0 8px;font-size:14px;color:#111827;line-height:1.65;">'
        '<strong>Nothing is payable today.</strong> The fee is payable to Gazeal on '
        'completion of the sale of the Property, or by '
        f'<strong>{ctx["fee_due_label"]}</strong> (six months from the date the terms '
        'were accepted), whichever comes first. If the sale completes before that date, '
        'the fee becomes payable on completion.'
        '</p>'
        '<p style="margin:0;font-size:13px;color:#4B5563;line-height:1.6;">'
        'The fee remains payable if the sale does not complete, unless a Gazeal '
        'Reservation Agreement applies and the sale falls through no fault of the '
        'seller, as per the terms set in the Gazeal Reservation Agreement. '
        'All prices include VAT.'
        '</p>'
        '</div>'
    )


def _terms_pdf_attachment(ctx: dict) -> list[dict]:
    """Sealed PDF of the agreed terms, ready for Resend."""
    pdf = ctx.get("terms_pdf")
    if not pdf:
        return []
    return [{
        "filename": f"Signed-Survey-Terms-{ctx['token']}.pdf",
        "content": base64.b64encode(pdf).decode("ascii"),
        "content_type": "application/pdf",
    }]


def _prev_declined_note(ctx: dict) -> str:
    prev = ctx.get("previously_declined_at")
    if not prev:
        return ""
    return (
        '<p style="margin:0 0 8px;font-size:13px;color:#6B7280;line-height:1.6;">'
        f'Note: the seller previously declined these terms on {_fmt_dt(prev)} '
        'and has since reconsidered and accepted.</p>'
    )


def _next_steps_block(ctx: dict) -> str:
    """What the agent should expect now the seller has signed."""
    pd = ctx["pd"]
    # Harrisons Homes has its own wording for step 3.
    step_three = (
        "Because of Gazeal's exclusive relationship with RPSA, the full "
        "condition of the property is disclosed to the Buyer, who can rely on "
        "the Surveyors Professional Indemnity Insurance, which means fewer "
        "late surprises, less renegotiation and a stronger chance of completing."
        if ctx.get("brand") == "harrisonshomes"
        else "Buyers see the condition before they offer, which means fewer late "
             "surprises, less renegotiation and a stronger chance of completing."
    )
    steps = [
        ("RPSA contacts your seller",
         "An accredited RPSA surveyor calls the seller directly to book a "
         "convenient visit. Nothing is needed from you."),
        ("The survey is carried out and the report issued",
         "The Home Insight Survey report goes to the seller, and to you, so it "
         "can be shared with interested buyers."),
        ("Share the report with buyers", step_three),
    ]
    rows = ""
    for i, (title, text) in enumerate(steps, start=1):
        rows += (
            '<tr>'
            '<td valign="top" width="34" style="padding:8px 0;">'
            f'<div style="width:22px;height:22px;border-radius:999px;background:{pd};'
            'color:#ffffff;font-size:11px;font-weight:700;line-height:22px;'
            f'text-align:center;">{i}</div>'
            '</td>'
            '<td valign="top" style="padding:8px 0;">'
            f'<div style="font-size:14px;font-weight:600;color:#0B1220;">{title}</div>'
            f'<div style="margin-top:2px;font-size:13px;color:#4B5563;line-height:1.6;">{text}</div>'
            '</td>'
            '</tr>'
        )
    return (
        _section_title("What happens next", pd)
        + '<table cellpadding="0" cellspacing="0" border="0" width="100%">'
        + rows
        + '</table>'
    )


def _agent_signed_email(ctx: dict) -> tuple:
    """Notify the listing agent (or the internal team). Returns (subject, to, cc, html)."""
    doc, pd = ctx["doc"], ctx["pd"]
    agent_first = _first_name(doc.get("agent_name"))
    body = (
        f'<p style="margin:0 0 8px;font-size:14px;color:#0B1220;">Hi {agent_first},</p>'
        '<p style="margin:0 0 8px;font-size:14px;color:#0B1220;line-height:1.65;">'
        f'<strong>{ctx["seller_name"]}</strong> has accepted the Seller Survey Agreement '
        f'for <strong>{ctx["address"]}</strong>. RPSA has been instructed and will '
        'contact the seller directly to arrange the survey visit.'
        '</p>'
        + _prev_declined_note(ctx)
        + _payment_block(ctx)
        + _next_steps_block(ctx)
        + _section_title("Acceptance record", pd)
        + ctx["acceptance_rows"]
        + '<p style="margin:10px 0 0;font-size:13px;color:#4B5563;line-height:1.6;">'
          'The sealed PDF of the terms the seller agreed to is attached for the file.'
          '</p>'
        + _agreement_link_html(ctx["agreement_url"], pd)
    )
    html = _wrapped(
        ctx["brand"],
        title="The seller has signed",
        eyebrow=f"{ctx['tokens']['brand_label']} · Agreement",
        kicker=(
            f"{ctx['seller_name']} accepted the Seller Survey Agreement "
            f"for {ctx['address']}."
        ),
        body=body,
        cta_href=ctx["agreement_url"],
        cta_label="View the signed agreement",
    )
    agent_email_addr = doc.get("agent_email")
    return (
        f"Seller has signed — {ctx['seller_name']} ({ctx['address']})",
        [agent_email_addr] if agent_email_addr else [NOTIFY_EMAIL],
        NOTIFY_CC,
        html,
    )


def _seller_confirmed_email(ctx: dict) -> tuple:
    """Confirmation to the seller. Returns (subject, to, cc, html)."""
    doc, pd = ctx["doc"], ctx["pd"]
    seller_first = _first_name(ctx["seller_name"])
    body = (
        f'<p style="margin:0 0 8px;font-size:14px;color:#0B1220;">Hi {seller_first},</p>'
        '<p style="margin:0 0 8px;font-size:14px;color:#0B1220;line-height:1.65;">'
        'Thank you. Your acceptance of the Home Insight Survey Service Terms '
        f'({ctx["terms_label"]}) for '
        f'<strong>{ctx["address"]}</strong> has been recorded. RPSA will be in '
        'touch shortly to arrange your survey.'
        '</p>'
        + _payment_block(ctx)
        + _section_title("For your records", pd)
        + ctx["acceptance_rows"]
        + '<p style="margin:10px 0 0;font-size:13px;color:#4B5563;line-height:1.6;">'
          'A PDF copy of the exact terms you agreed to is attached to this email '
          'for your records.'
          '</p>'
        + _agreement_link_html(ctx["agreement_url"], pd)
    )
    html = _wrapped(
        ctx["brand"],
        title="Your agreement is accepted",
        eyebrow=f"{ctx['tokens']['brand_label']} · Agreement",
        kicker=(
            f"Thank you {seller_first}. Your acceptance for {ctx['address']} "
            "has been recorded."
        ),
        body=body,
        cta_href=ctx["agreement_url"],
        cta_label="View your agreement",
    )
    return (
        "Your Home Insight Survey agreement is confirmed",
        [doc.get("seller_email")],
        GAZEAL_CC,
        html,
    )


def _rpsa_instruction_email(ctx: dict) -> tuple:
    """Survey instruction to RPSA with full case details. Returns (subject, to, cc, html)."""
    doc, ld, pd = ctx["doc"], ctx["lead"], ctx["pd"]
    body = (
        '<p style="margin:0 0 8px;font-size:14px;color:#0B1220;line-height:1.65;">'
        f'<strong>{ctx["seller_name"]}</strong> has accepted the Gazeal Seller Survey '
        f'Agreement for <strong>{ctx["address"]}</strong>. Please contact the seller '
        'directly to book the Home Insight Survey.'
        '</p>'
        + _prev_declined_note(ctx)
        + _section_title("The seller", pd)
        + '<table cellpadding="0" cellspacing="0" border="0" width="100%">'
        + _row("Name", ctx["seller_name"], primary_dark=pd)
        + _row("Email", doc.get("seller_email") or "",
               link=f"mailto:{doc.get('seller_email','')}", primary_dark=pd)
        + _row("Phone", ld.get("seller_phone") or "",
               link=(f"tel:{ld.get('seller_phone')}" if ld.get("seller_phone") else None),
               primary_dark=pd)
        + '</table>'
        + _section_title("The property", pd)
        + '<table cellpadding="0" cellspacing="0" border="0" width="100%">'
        + _row("Address", doc.get("address_line_1") or "", primary_dark=pd)
        + _row("Postcode", doc.get("postcode") or "", primary_dark=pd)
        + _row("Asking price", ld.get("asking_price") or "", primary_dark=pd)
        + _row("Listing", ld.get("listing_url") or "",
               link=ld.get("listing_url") or None, primary_dark=pd)
        + '</table>'
        + _section_title("The listing agent", pd)
        + '<table cellpadding="0" cellspacing="0" border="0" width="100%">'
        + _row("Agent", ctx["agent_label"], primary_dark=pd)
        + _row("Email", doc.get("agent_email") or "",
               link=f"mailto:{doc.get('agent_email','')}", primary_dark=pd)
        + _row("Phone", ld.get("phone") or "",
               link=(f"tel:{ld.get('phone')}" if ld.get("phone") else None),
               primary_dark=pd)
        + '</table>'
        + _section_title("Acceptance record", pd)
        + '<table cellpadding="0" cellspacing="0" border="0" width="100%">'
        + _row("Accepted", ctx["accepted_label"], primary_dark=pd)
        + _row("IP address", ctx["ip"] or "unknown", primary_dark=pd)
        + _row("Device", ctx["ua"] or "", primary_dark=pd)
        + _row("Reference", ctx["token"], primary_dark=pd)
        + '</table>'
        + _agreement_link_html(ctx["agreement_url"], pd)
    )
    html = _wrapped(
        "gazeal",
        title="New survey instruction",
        eyebrow="Gazeal Surveys · Instruction",
        kicker=(
            f"The seller of {ctx['address']} has accepted the survey "
            "agreement and is ready to be contacted."
        ),
        body=body,
        cta_href=f"mailto:{doc.get('seller_email','')}",
        cta_label="Contact the seller",
    )
    return (
        f"Survey instruction — {ctx['seller_name']}, {ctx['address']} (Ref {ctx['token']})",
        [RPSA_EMAIL],
        GAZEAL_CC + [NOTIFY_EMAIL],
        html,
    )


def _sale_room_package(ctx: dict, pricing_snapshot) -> dict:
    doc, ld = ctx["doc"], ctx["lead"]
    return {
        "reference_number": doc.get("reference_number") or ctx["token"],
        "sale_room_url": ctx["agreement_url"],
        "status": "seller_signed",
        "created_at": doc.get("created_at"),
        "signed_at": ctx["now"],
        "agent": {
            "name": doc.get("agent_name"),
            "agency": doc.get("agency_name"),
            "branch": doc.get("branch"),
            "email": doc.get("agent_email"),
            "phone": ld.get("phone"),
        },
        "seller": {
            "name": doc.get("seller_name"),
            "email": doc.get("seller_email"),
            "phone": ld.get("seller_phone"),
        },
        "property": {
            "address_line_1": doc.get("address_line_1"),
            "postcode": doc.get("postcode"),
            "listing_url": ld.get("listing_url"),
            "asking_price": ld.get("asking_price"),
        },
        "agreement": {
            "reference_number": doc.get("reference_number") or ctx["token"],
            "url": ctx["agreement_url"],
            "accepted_at": ctx["now"],
            "accepted_ip": ctx["ip"],
            "accepted_user_agent": ctx["ua"],
        },
        "pricing_snapshot": pricing_snapshot,
        "reservation_interest": bool(doc.get("reservation_interest")),
    }


def _digits_only(value) -> str:
    return "".join(ch for ch in str(value or "") if ch.isdigit())


def _rpsa_webhook_payload(package: dict) -> dict:
    """Payload for the RPSA panel: the flat fields their endpoint expects,
    plus the full sale-room package so they have everything from the form."""
    seller = package.get("seller") or {}
    prop = package.get("property") or {}
    snap = package.get("pricing_snapshot") or {}
    price = _digits_only(prop.get("asking_price")) or _digits_only(
        snap.get("property_value")
    )
    return {
        "ClientName": seller.get("name") or "",
        "ClientLandline": "",
        "ClientMobile": seller.get("phone") or "",
        "ClientEmail": seller.get("email") or "",
        "PropertyAddress": prop.get("address_line_1") or "",
        "PropertyPostcode": prop.get("postcode") or "",
        "PropertyPrice": price,
        "GazealReference": package.get("reference_number") or "",
        **package,
    }


def _parse_rpsa_response(text: str):
    """RPSA's reply wraps a JSON object in debug text
    ("Webhook received<br>...{...json...}"), so dig the JSON out."""
    if not text:
        return None
    for candidate in (text, text[text.find("{"): text.rfind("}") + 1]):
        try:
            parsed = json.loads(candidate)
        except Exception:
            continue
        if isinstance(parsed, (dict, list)):
            return parsed
    return None


def _extract_rpsa_id(data) -> Optional[str]:
    """RPSA's record id from their response. They call it `rpsaref`;
    the other keys are fallbacks in case the format changes.
    (`reference` is our own reference echoed back, so it doesn't count.)"""
    if not isinstance(data, dict):
        return None
    for key in (
        "rpsaref", "RPSARef", "rpsa_ref",
        "RPSAReference", "rpsa_reference",
        "SurveyId", "SurveyID", "survey_id",
        "id", "Id", "ID",
    ):
        value = data.get(key)
        if value not in (None, ""):
            return str(value)
    return None


def _pm_rpsa_entry(payload: dict, response_json, rpsa_id) -> dict:
    """Row for the RPSA_ENTRY table in ProcessMaker."""
    return {
        "gazealref": payload.get("GazealReference") or "",
        "rpsaref": rpsa_id or "",
        "clientname": payload.get("ClientName") or "",
        "clientemail": payload.get("ClientEmail") or "",
        "clientmobile": payload.get("ClientMobile") or "",
        "propertyaddress": payload.get("PropertyAddress") or "",
        "propertypostcode": payload.get("PropertyPostcode") or "",
        "propertyprice": payload.get("PropertyPrice") or "",
        "rpsaresponse": (
            json.dumps(response_json) if response_json is not None else ""
        ),
        # The exact JSON we sent to RPSA, so the request and the reply sit
        # side by side in the same row.
        "rpsarequest": json.dumps(payload, default=str),
    }


async def _save_rpsa_entry_in_pm(
    db: AsyncIOMotorDatabase, token: str, entry: dict
) -> None:
    """Save our reference and RPSA's id into ProcessMaker.

    Three attempts (immediately, +30s, +120s); the outcome is recorded on
    the agreement under `rpsa_webhook.pm_save`.
    """
    last_error = None
    for n, delay in enumerate([0, 30, 120], start=1):
        if delay:
            await asyncio.sleep(delay)
        at = datetime.now(timezone.utc).isoformat()
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(PM_RPSA_SAVE_URL, json=entry)
            if 200 <= resp.status_code < 300:
                await db.agreements.update_one(
                    {"token": token},
                    {
                        "$set": {
                            "rpsa_webhook.pm_save": {
                                "status": "saved",
                                "at": at,
                                "attempts": n,
                                "response": resp.text[:500],
                            }
                        }
                    },
                )
                return
            last_error = f"HTTP {resp.status_code}: {resp.text[:200]}"
        except Exception as exc:  # noqa: BLE001
            last_error = str(exc)[:500]
        await db.agreements.update_one(
            {"token": token},
            {
                "$set": {
                    "rpsa_webhook.pm_save": {
                        "status": "retrying" if n < 3 else "failed",
                        "at": at,
                        "attempts": n,
                        "error": last_error,
                    }
                }
            },
        )
    logger.error(
        "ProcessMaker save failed after 3 attempts for %s: %s", token, last_error
    )


async def _deliver_rpsa_webhook(
    db: AsyncIOMotorDatabase, token: str, payload: dict
) -> None:
    """POST the signed order to the RPSA panel.

    Three attempts (immediately, +60s, +300s). Every attempt is recorded on
    the agreement under `rpsa_webhook` so the outcome is auditable, and on
    success RPSA's response (and their id, if we can spot one) is kept too.
    If all three attempts fail we email NOTIFY_EMAIL so someone can chase it.
    """
    last_error = None
    for n, delay in enumerate([0, 60, 300], start=1):
        if delay:
            await asyncio.sleep(delay)
        attempt = {
            "n": n,
            "at": datetime.now(timezone.utc).isoformat(),
            "ok": False,
            "status_code": None,
            "error": None,
        }
        response_json = None
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.post(RPSA_WEBHOOK_URL, json=payload)
            attempt["status_code"] = resp.status_code
            attempt["response"] = resp.text[:1000]
            attempt["ok"] = 200 <= resp.status_code < 300
            response_json = _parse_rpsa_response(resp.text)
        except Exception as exc:  # noqa: BLE001
            attempt["error"] = str(exc)[:500]
        if attempt["ok"]:
            delivered_set = {
                "rpsa_webhook.status": "delivered",
                "rpsa_webhook.delivered_at": attempt["at"],
                "rpsa_webhook.response": attempt.get("response"),
            }
            if response_json is not None:
                delivered_set["rpsa_webhook.response_json"] = response_json
            rpsa_id = _extract_rpsa_id(response_json)
            if rpsa_id:
                delivered_set["rpsa_webhook.rpsa_id"] = rpsa_id
            await db.agreements.update_one(
                {"token": token},
                {
                    "$push": {"rpsa_webhook.attempts": attempt},
                    "$set": delivered_set,
                },
            )
            if PM_RPSA_SAVE_URL:
                await _save_rpsa_entry_in_pm(
                    db, token, _pm_rpsa_entry(payload, response_json, rpsa_id)
                )
            return
        last_error = attempt["error"] or f"HTTP {attempt['status_code']}"
        await db.agreements.update_one(
            {"token": token},
            {
                "$push": {"rpsa_webhook.attempts": attempt},
                "$set": {
                    "rpsa_webhook.status": "retrying",
                    "rpsa_webhook.last_error": last_error,
                },
            },
        )

    await db.agreements.update_one(
        {"token": token},
        {
            "$set": {
                "rpsa_webhook.status": "failed",
                "rpsa_webhook.last_error": last_error,
            }
        },
    )
    logger.error(
        "RPSA webhook failed after 3 attempts for %s: %s", token, last_error
    )
    try:
        ref = payload.get("GazealReference") or token
        await _send(
            subject=f"[Gazeal Surveys] RPSA webhook failed — {ref}",
            to=[NOTIFY_EMAIL],
            html=(
                f"<p>The signed order <strong>{ref}</strong> could not be "
                "delivered to the RPSA panel after 3 attempts.</p>"
                f"<p>Endpoint: {RPSA_WEBHOOK_URL}</p>"
                f"<p>Last error: {last_error}</p>"
                "<p>RPSA has still received the instruction email, but the "
                "panel entry will need to be created manually or the order "
                "re-sent.</p>"
            ),
        )
    except Exception:
        logger.exception("RPSA webhook failure alert email failed")


def _fanout_payload(ctx: dict) -> dict:
    doc = ctx["doc"]
    return {
        "id": doc.get("lead_id") or ctx["token"],
        "kind": "agreement_signed",
        "created_at": ctx["now"],
        "submission_id": doc.get("lead_id"),
        "agent_name": doc.get("agent_name"),
        "agency_name": doc.get("agency_name"),
        "branch": doc.get("branch"),
        "email": doc.get("agent_email"),
        "seller_name": doc.get("seller_name"),
        "seller_email": doc.get("seller_email"),
        "address_line_1": doc.get("address_line_1"),
        "postcode": doc.get("postcode"),
        "agreement_token": ctx["token"],
        "agreement_url": ctx["agreement_url"],
        "accepted_at": ctx["now"],
    }


# --------------------------- router ---------------------------
class _Empty(BaseModel):
    pass


def build_agreements_router(db: AsyncIOMotorDatabase) -> APIRouter:
    router = APIRouter(prefix="/agreements", tags=["agreements"])

    @router.get("/{token}")
    async def get_agreement(token: str):
        doc = await db.agreements.find_one({"token": token})
        if not doc:
            raise HTTPException(404, "Agreement not found")
        lead = None
        if doc.get("lead_id"):
            lead = await db.leads.find_one({"id": doc["lead_id"]}, {"_id": 0})
        return public_context(doc, lead)

    @router.get("/{token}/terms.pdf")
    async def terms_pdf(token: str):
        """Re-issue the sealed PDF from the terms text stored at acceptance."""
        doc = await db.agreements.find_one({"token": token})
        if not doc:
            raise HTTPException(404, "Agreement not found")
        if doc.get("status") != "accepted":
            raise HTTPException(409, "The terms have not been accepted yet")
        sealed = doc.get("terms_text")
        if not sealed or doc.get("terms_sha256") != terms_mod.terms_sha256(sealed):  # noqa: E501
            raise HTTPException(
                409,
                "No sealed copy is available for this agreement. The PDF issued at "
                "the time of acceptance is attached to the confirmation email.",
            )
        if doc.get("terms_sha256") != terms_mod.terms_sha256(brand=doc.get("brand")):
            raise HTTPException(
                409,
                "This agreement was signed against an earlier version of the terms. "
                "Use the PDF attached to the confirmation email for that version.",
            )

        lead = None
        if doc.get("lead_id"):
            lead = await db.leads.find_one({"id": doc["lead_id"]}, {"_id": 0})
        ctx = _build_accept_ctx(doc, lead, token, doc.get("accepted_at") or "",
                                doc.get("accepted_ip") or "", doc.get("accepted_ua") or "")
        snap = doc.get("pricing_snapshot") or {}
        fee_summary = []
        if snap.get("property_value"):
            fee_summary.append(("Property value", f"£{int(snap['property_value']):,}"))
        if snap.get("bedrooms"):
            fee_summary.append(("Bedrooms", str(snap["bedrooms"])))
        if snap.get("listed_status"):
            fee_summary.append(("Registered listed building", str(snap["listed_status"])))
        # Agency-paid funnels never show the seller a survey fee figure.
        if ctx.get("agency_paid"):
            fee_summary.append(("Survey fee", "Paid by the estate agency"))
        elif snap.get("quote"):
            fee_summary.append(("Survey fee", "Bespoke quote"))
        elif snap.get("price"):
            fee_summary.append(("Survey fee", f"£{round(float(snap['price'])):,} including VAT"))

        pdf = build_agreement_pdf(
            brand_label=ctx["tokens"]["brand_label"],
            seller_name=ctx["seller_name"],
            seller_email=doc.get("seller_email") or "",
            address=ctx["address"],
            agent_label=ctx["agent_label"],
            reference=doc.get("reference_number") or token,
            accepted_label=ctx["accepted_label"],
            ip=doc.get("accepted_ip") or "",
            device=doc.get("accepted_ua") or "",
            fee_due_label=ctx["fee_due_label"] or "Paid by the estate agency",
            fee_summary=fee_summary,
            terms_label=doc.get("terms_version") or terms_mod.TERMS_LABEL,
            clauses=terms_mod.CLAUSES,
            payment_section=terms_mod.payment_section(doc.get("brand")),
            terms_sha256=doc.get("terms_sha256") or terms_mod.terms_sha256(),
        )
        return Response(
            content=pdf,
            media_type="application/pdf",
            headers={
                "Content-Disposition":
                    f'inline; filename="Signed-Survey-Terms-{token}.pdf"',
                "X-Robots-Tag": "noindex, nofollow",
            },
        )

    @router.post("/{token}/accept")
    async def accept(token: str, request: Request):
        doc = await db.agreements.find_one({"token": token})
        if not doc:
            raise HTTPException(404, "Agreement not found")
        if doc.get("status") == "accepted":
            return {"status": "already_accepted"}
        if doc.get("status") == "declined":
            raise HTTPException(409, "Agreement already declined")

        # Optional pricing snapshot captured from the calculator on the page.
        pricing_snapshot: Optional[dict] = None
        risk_ack = False
        payment_ack = False
        try:
            body = await request.json()
            if isinstance(body, dict):
                risk_ack = bool(body.get("risk_ack"))
                payment_ack = bool(body.get("payment_ack"))
            snap = body.get("pricing_snapshot") if isinstance(body, dict) else None
            if isinstance(snap, dict):
                pricing_snapshot = {
                    "property_value": snap.get("property_value"),
                    "bedrooms": snap.get("bedrooms"),
                    "listed_status": snap.get("listed_status"),
                    "band": snap.get("band"),
                    "price": snap.get("price"),
                    "quote": bool(snap.get("quote")),
                    "details_confirmed": bool(snap.get("details_confirmed")),
                }
        except Exception:
            pricing_snapshot = None

        if not risk_ack:
            raise HTTPException(
                422,
                "Please confirm you understand the risk of proceeding without a "
                "Gazeal Reservation Agreement before agreeing to the terms.",
            )
        brand = doc.get("brand") or "gazeal"
        agency_paid = brand in terms_mod.AGENCY_PAID_BRANDS
        if not agency_paid and not payment_ack:
            raise HTTPException(
                422,
                "Please confirm you understand when the survey fee becomes payable "
                "before agreeing to the terms.",
            )

        now = datetime.now(timezone.utc).isoformat()
        fee_due_at = "" if agency_paid else _plus_six_months(now)
        terms_text = terms_mod.terms_plain_text(brand)
        terms_hash = terms_mod.terms_sha256(terms_text)
        ip = (
            request.headers.get("x-forwarded-for", "").split(",")[0].strip()
            or (request.client.host if request.client else "")
        )
        ua = request.headers.get("user-agent", "")
        update_set = {
            "status": "accepted",
            "accepted_at": now,
            "accepted_ip": ip,
            "accepted_ua": ua,
            "terms_version": terms_mod.TERMS_LABEL,
            "terms_text": terms_text,
            "terms_sha256": terms_hash,
            "risk_acknowledged": risk_ack,
            "payment_acknowledged": payment_ack,
            "fee_due_at": fee_due_at,
            "fee_paid_by_agency": agency_paid,
        }
        if pricing_snapshot is not None:
            update_set["pricing_snapshot"] = pricing_snapshot
        await db.agreements.update_one({"token": token}, {"$set": update_set})

        lead_doc = None
        if doc.get("lead_id"):
            lead_doc = await db.leads.find_one({"id": doc["lead_id"]}, {"_id": 0})
        ctx = _build_accept_ctx(doc, lead_doc, token, now, ip, ua)

        # Seal the terms into a PDF so the seller and the file both keep an
        # immutable copy of exactly what was agreed.
        snap = pricing_snapshot or {}
        fee_summary = []
        if snap.get("property_value"):
            fee_summary.append(("Property value", f"£{int(snap['property_value']):,}"))
        if snap.get("bedrooms"):
            fee_summary.append(("Bedrooms", str(snap["bedrooms"])))
        if snap.get("listed_status"):
            fee_summary.append(("Registered listed building", str(snap["listed_status"])))
        # Agency-paid funnels never show the seller a survey fee figure.
        if ctx.get("agency_paid"):
            fee_summary.append(("Survey fee", "Paid by the estate agency"))
        elif snap.get("quote"):
            fee_summary.append(("Survey fee", "Bespoke quote"))
        elif snap.get("price"):
            fee_summary.append(("Survey fee", f"£{round(float(snap['price'])):,} including VAT"))
        try:
            ctx["terms_pdf"] = build_agreement_pdf(
                brand_label=ctx["tokens"]["brand_label"],
                seller_name=ctx["seller_name"],
                seller_email=doc.get("seller_email") or "",
                address=ctx["address"],
                agent_label=ctx["agent_label"],
                reference=doc.get("reference_number") or token,
                accepted_label=ctx["accepted_label"],
                ip=ip,
                device=ua,
                fee_due_label=ctx["fee_due_label"] or "Paid by the estate agency",
                fee_summary=fee_summary,
                terms_label=terms_mod.TERMS_LABEL,
                clauses=terms_mod.CLAUSES,
                payment_section=terms_mod.payment_section(doc.get("brand")),
                terms_sha256=terms_hash,
            )
        except Exception:
            logger.exception("Sealed terms PDF could not be generated")
            ctx["terms_pdf"] = None
        attachments = _terms_pdf_attachment(ctx)

        # Notify the listing agent — internal team CC'd on the same email
        agent_email_id: Optional[str] = None
        agent_email_error: Optional[str] = None
        try:
            subject, to, cc, html = _agent_signed_email(ctx)
            agent_email_id = await _send(subject=subject, to=to, cc=cc, html=html,
                                         attachments=attachments)
        except Exception as exc:
            agent_email_error = str(exc)
            logger.exception("Agent notify email failed")

        # Confirmation to the seller
        seller_email_id: Optional[str] = None
        seller_email_error: Optional[str] = None
        try:
            subject, to, cc, html = _seller_confirmed_email(ctx)
            seller_email_id = await _send(subject=subject, to=to, cc=cc, html=html,
                                          attachments=attachments)
        except Exception as exc:
            seller_email_error = str(exc)
            logger.exception("Seller confirmation email failed")

        # Survey instruction to RPSA — full case details so they can contact
        # the seller and book the survey. RPSA_EMAIL is env-driven so tests
        # never hit the real RPSA inbox.
        rpsa_email_id: Optional[str] = None
        rpsa_email_error: Optional[str] = None
        try:
            subject, to, cc, html = _rpsa_instruction_email(ctx)
            rpsa_email_id = await _send(subject=subject, to=to, cc=cc, html=html)
        except Exception as exc:
            rpsa_email_error = str(exc)
            logger.exception("RPSA instruction email failed")

        # Sale-room JSON package — single source of truth combining the
        # order, the acceptance, and the pricing snapshot. Persisted on the
        # agreement doc and emitted to the backend log.
        sale_room_package = _sale_room_package(ctx, pricing_snapshot)
        audit_set = {
            "sale_room_package": sale_room_package,
            "email_audit_acceptance": {
                "agent_notify": {"id": agent_email_id, "error": agent_email_error},
                "seller_confirmation": {"id": seller_email_id, "error": seller_email_error},
                "rpsa_instruction": {"id": rpsa_email_id, "error": rpsa_email_error},
            },
        }
        if rpsa_email_id:
            audit_set["rpsa_instructed_at"] = now
        await db.agreements.update_one({"token": token}, {"$set": audit_set})
        try:
            import json as _json
            logger.info("SALE_ROOM_PACKAGE %s", _json.dumps(sale_room_package))
        except Exception:
            pass

        # Push the signed order to the RPSA panel so the survey is
        # commissioned. Fires only here — never at order time.
        if RPSA_WEBHOOK_URL:
            rpsa_payload = _rpsa_webhook_payload(sale_room_package)
            await db.agreements.update_one(
                {"token": token},
                {
                    "$set": {
                        "rpsa_webhook": {
                            "status": "pending",
                            "url": RPSA_WEBHOOK_URL,
                            # Exactly what goes to RPSA, kept for the record.
                            "payload": rpsa_payload,
                            "attempts": [],
                        }
                    }
                },
            )
            asyncio.create_task(_deliver_rpsa_webhook(db, token, rpsa_payload))
        else:
            logger.warning(
                "RPSA_WEBHOOK_URL not set — signed order %s was not pushed "
                "to the RPSA panel",
                token,
            )

        # Webhook fan-out to RPSA
        await fan_out(db, "agreement.signed", _fanout_payload(ctx))
        notify_agreement_accepted(
            {**doc, "token": token, "accepted_ip": ip, "accepted_at": now},
            gazeal_email_id=rpsa_email_id,
            gazeal_email_error=rpsa_email_error,
            agent_email_id=agent_email_id,
            agent_email_error=agent_email_error,
            seller_email_id=seller_email_id,
            seller_email_error=seller_email_error,
        )

        return {"status": "accepted", "accepted_at": now}

    @router.post("/{token}/decline")
    async def decline(token: str, request: Request):
        doc = await db.agreements.find_one({"token": token})
        if not doc:
            raise HTTPException(404, "Agreement not found")
        if doc.get("status") == "accepted":
            raise HTTPException(409, "Agreement already accepted")
        if doc.get("status") == "declined":
            return {"status": "already_declined"}

        now = datetime.now(timezone.utc).isoformat()
        await db.agreements.update_one(
            {"token": token},
            {
                "$set": {"status": "declined", "declined_at": now},
                "$push": {"status_history": {"action": "declined", "at": now}},
            },
        )
        seller_name = doc.get("seller_name") or "the seller"
        address = f"{doc.get('address_line_1','')}, {doc.get('postcode','')}"
        try:
            await _send(
                subject=f"Seller agreement DECLINED — {seller_name} ({address})",
                to=[NOTIFY_EMAIL],
                html=f"""
                <h2 style="font-family:Arial,sans-serif;color:#B23A3A;">Seller declined the agreement</h2>
                <p style="font-family:Arial,sans-serif;font-size:14px;color:#0B1220;">
                  <strong>{seller_name}</strong> declined to sign the Seller Survey Agreement
                  for <strong>{address}</strong>. You may want to follow up with the agent
                  ({doc.get('agent_name','')} · {doc.get('agency_name','')}).
                </p>
                """,
            )
        except Exception:
            logger.exception("Decline notify failed")

        return {"status": "declined", "declined_at": now}

    @router.post("/{token}/reopen")
    async def reopen(token: str):
        """A seller who declined can re-open the agreement and accept it —
        the decline stays on record via status_history."""
        doc = await db.agreements.find_one({"token": token})
        if not doc:
            raise HTTPException(404, "Agreement not found")
        if doc.get("status") == "accepted":
            raise HTTPException(409, "Agreement already accepted")
        if doc.get("status") != "declined":
            return {"status": doc.get("status", "pending")}

        now = datetime.now(timezone.utc).isoformat()
        prior_declined = doc.get("declined_at")
        await db.agreements.update_one(
            {"token": token},
            {
                "$set": {
                    "status": "pending",
                    "previously_declined_at": prior_declined,
                    "reopened_at": now,
                },
                "$unset": {"declined_at": ""},
                "$push": {
                    "status_history": {
                        "action": "reopened",
                        "at": now,
                        "prior_declined_at": prior_declined,
                    }
                },
            },
        )
        seller_name = doc.get("seller_name") or "the seller"
        address = f"{doc.get('address_line_1','')}, {doc.get('postcode','')}"
        try:
            await _send(
                subject=f"Seller re-opened a declined agreement — {seller_name} ({address})",
                to=[NOTIFY_EMAIL],
                html=f"""
                <h2 style="font-family:Arial,sans-serif;color:#025eba;">Seller is reconsidering</h2>
                <p style="font-family:Arial,sans-serif;font-size:14px;color:#0B1220;">
                  <strong>{seller_name}</strong> re-opened the Seller Survey Agreement
                  for <strong>{address}</strong> after declining it on {_fmt_dt(prior_declined) if prior_declined else 'an earlier date'}.
                  They are reviewing the terms again now — you'll be notified if they accept.
                </p>
                """,
            )
        except Exception:
            logger.exception("Reopen notify failed")

        return {"status": "pending", "reopened_at": now}

    @router.post("/{token}/express-interest")
    async def express_interest(token: str):
        """Seller indicates interest in learning more about Gazeal Reservation
        Agreements from the agreement page. Idempotent — sets a flag on the
        agreement doc and emails Gazeal so an agent can follow up."""
        doc = await db.agreements.find_one({"token": token})
        if not doc:
            raise HTTPException(404, "Agreement not found")
        if doc.get("reservation_interest"):
            return {"status": "already_expressed"}

        now = datetime.now(timezone.utc).isoformat()
        await db.agreements.update_one(
            {"token": token},
            {"$set": {"reservation_interest": True, "reservation_interest_at": now}},
        )
        seller_name = doc.get("seller_name") or "the seller"
        seller_email = doc.get("seller_email") or "(no email)"
        address = f"{doc.get('address_line_1','')}, {doc.get('postcode','')}"
        agreement_url = doc.get("agreement_url") or f"{os.environ.get('FRONTEND_BASE_URL','')}/agreement/{token}"
        gazeal_email_id: Optional[str] = None
        gazeal_email_error: Optional[str] = None
        try:
            gazeal_email_id = await _send(
                subject=f"Reservation Agreement interest — {seller_name} ({address})",
                to=[NOTIFY_EMAIL],
                cc=NOTIFY_CC,
                html=f"""
                <h2 style="font-family:Arial,sans-serif;color:#025eba;">Seller is interested in a Reservation Agreement</h2>
                <p style="font-family:Arial,sans-serif;font-size:14px;color:#0B1220;line-height:1.6;">
                  <strong>{seller_name}</strong> ({seller_email}) — selling <strong>{address}</strong> —
                  has asked to learn more about how a Gazeal Reservation Agreement could protect their sale.
                </p>
                <p style="font-family:Arial,sans-serif;font-size:14px;color:#0B1220;line-height:1.6;">
                  Listing agent: <strong>{doc.get('agent_name','')}</strong> &middot;
                  {doc.get('agency_name','')} &middot;
                  <a href="mailto:{doc.get('agent_email','')}">{doc.get('agent_email','')}</a>
                </p>
                <p style="font-family:Arial,sans-serif;font-size:13px;color:#0B1220;line-height:1.6;margin-top:18px;">
                  <strong>Seller survey agreement link:</strong><br/>
                  <a href="{agreement_url}" style="color:#025eba;text-decoration:none;font-weight:600;">{agreement_url}</a>
                </p>
                <p style="font-family:Arial,sans-serif;font-size:11px;color:#6B7280;">Reference: <code>{token}</code></p>
                <p style="font-family:Arial,sans-serif;font-size:13px;color:#4A5260;">
                  Please follow up directly with the seller and brief the agent.
                </p>
                """,
            )
        except Exception as exc:
            gazeal_email_error = str(exc)
            logger.exception("Reservation interest notify failed")

        notify_reservation_interest(
            {**doc, "token": token},
            gazeal_email_id=gazeal_email_id,
            gazeal_email_error=gazeal_email_error,
        )

        return {"status": "expressed", "reservation_interest_at": now}

    @router.get("/{token}/package")
    async def get_sale_room_package(token: str, request: Request):
        """Admin-guarded fetch of the sale-room JSON package."""
        admin_token = os.environ.get("ADMIN_TOKEN", "")
        provided = request.headers.get("x-admin-token", "")
        if not admin_token or provided != admin_token:
            raise HTTPException(401, "Unauthorized")
        doc = await db.agreements.find_one({"token": token}, {"_id": 0})
        if not doc:
            raise HTTPException(404, "Agreement not found")
        return doc.get("sale_room_package") or {"status": "not_yet_signed", "token": token}

    return router
