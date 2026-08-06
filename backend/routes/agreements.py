"""Hosted seller agreement — token issue, fetch, accept/decline.

Each Order Survey submission gets a unique short token (~10 chars). The
seller receives a branded link `{FRONTEND_BASE_URL}/agreement/<token>` in
their invite email. The page renders the full agreement in our brand
language, captures Accept / Decline, and fans the result out to Slack,
Resend (Gazeal + seller) and the webhook delivery system (RPSA).
"""
from __future__ import annotations

import asyncio
import logging
import os
import secrets
from datetime import datetime, timezone
from typing import Optional

import httpx
import resend
from fastapi import APIRouter, HTTPException, Request
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel

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
    }


async def _send(subject: str, html: str, to: list[str],
                cc: Optional[list[str]] = None) -> Optional[str]:
    params = {
        "from": SENDER_EMAIL,
        "to": to,
        "subject": subject,
        "html": html,
    }
    if cc:
        params["cc"] = cc
    email = await asyncio.to_thread(resend.Emails.send, params)
    return email.get("id") if isinstance(email, dict) else None


def _fmt_dt(iso: str) -> str:
    try:
        return datetime.fromisoformat(iso).strftime("%d %b %Y, %H:%M UTC")
    except Exception:
        return iso


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
    acceptance_rows = (
        '<table cellpadding="0" cellspacing="0" border="0" width="100%">'
        + _row("Accepted", accepted_label, primary_dark=pd)
        + _row("IP address", ip or "unknown", primary_dark=pd)
        + _row("Reference", token, primary_dark=pd)
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
        "previously_declined_at": doc.get("previously_declined_at"),
    }


def _prev_declined_note(ctx: dict) -> str:
    prev = ctx.get("previously_declined_at")
    if not prev:
        return ""
    return (
        '<p style="margin:0 0 8px;font-size:13px;color:#6B7280;line-height:1.6;">'
        f'Note: the seller previously declined these terms on {_fmt_dt(prev)} '
        'and has since reconsidered and accepted.</p>'
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
        + _section_title("Acceptance record", pd)
        + ctx["acceptance_rows"]
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
        '(Version 1.0, dated 14 July 2026) for '
        f'<strong>{ctx["address"]}</strong> has been recorded. RPSA will be in '
        'touch shortly to arrange your survey.'
        '</p>'
        + _section_title("For your records", pd)
        + ctx["acceptance_rows"]
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
        ["survey@gazeal.co.uk"],
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
        ["vignesh.sasindran@gazeal.co.uk", NOTIFY_EMAIL],
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
        try:
            body = await request.json()
            if isinstance(body, dict):
                risk_ack = bool(body.get("risk_ack"))
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

        now = datetime.now(timezone.utc).isoformat()
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
            "terms_version": "1.0 (14 July 2026)",
            "risk_acknowledged": risk_ack,
        }
        if pricing_snapshot is not None:
            update_set["pricing_snapshot"] = pricing_snapshot
        await db.agreements.update_one({"token": token}, {"$set": update_set})

        lead_doc = None
        if doc.get("lead_id"):
            lead_doc = await db.leads.find_one({"id": doc["lead_id"]}, {"_id": 0})
        ctx = _build_accept_ctx(doc, lead_doc, token, now, ip, ua)

        # Notify the listing agent — internal team CC'd on the same email
        agent_email_id: Optional[str] = None
        agent_email_error: Optional[str] = None
        try:
            subject, to, cc, html = _agent_signed_email(ctx)
            agent_email_id = await _send(subject=subject, to=to, cc=cc, html=html)
        except Exception as exc:
            agent_email_error = str(exc)
            logger.exception("Agent notify email failed")

        # Confirmation to the seller
        seller_email_id: Optional[str] = None
        seller_email_error: Optional[str] = None
        try:
            subject, to, cc, html = _seller_confirmed_email(ctx)
            seller_email_id = await _send(subject=subject, to=to, cc=cc, html=html)
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
