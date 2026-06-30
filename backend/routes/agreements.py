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

logger = logging.getLogger(__name__)

SENDER_EMAIL = os.environ["SENDER_EMAIL"]
NOTIFY_EMAIL = os.environ["NOTIFY_EMAIL"]


# --------------------------- helpers ---------------------------
def generate_token() -> str:
    return secrets.token_urlsafe(8)  # ~11 chars, url-safe


def public_context(agreement: dict) -> dict:
    """Personalised data that the public agreement page needs to render."""
    return {
        "token": agreement["token"],
        "reference_number": agreement.get("reference_number") or agreement["token"],
        "status": agreement.get("status", "pending"),
        "seller": {
            "first_name": (agreement.get("seller_name") or "").split(" ")[0]
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
        },
        "accepted_at": agreement.get("accepted_at"),
        "accepted_ip": agreement.get("accepted_ip"),
        "declined_at": agreement.get("declined_at"),
        "reservation_interest": bool(agreement.get("reservation_interest")),
        "reservation_interest_at": agreement.get("reservation_interest_at"),
    }


async def _send(subject: str, html: str, to: list[str]) -> Optional[str]:
    params = {
        "from": SENDER_EMAIL,
        "to": to,
        "subject": subject,
        "html": html,
    }
    email = await asyncio.to_thread(resend.Emails.send, params)
    return email.get("id") if isinstance(email, dict) else None


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
        return public_context(doc)

    @router.post("/{token}/accept")
    async def accept(token: str, request: Request):
        doc = await db.agreements.find_one({"token": token})
        if not doc:
            raise HTTPException(404, "Agreement not found")
        if doc.get("status") == "accepted":
            return {"status": "already_accepted"}
        if doc.get("status") == "declined":
            raise HTTPException(409, "Agreement already declined")

        now = datetime.now(timezone.utc).isoformat()
        ip = (
            request.headers.get("x-forwarded-for", "").split(",")[0].strip()
            or (request.client.host if request.client else "")
        )
        ua = request.headers.get("user-agent", "")
        await db.agreements.update_one(
            {"token": token},
            {
                "$set": {
                    "status": "accepted",
                    "accepted_at": now,
                    "accepted_ip": ip,
                    "accepted_ua": ua,
                }
            },
        )

        address = f"{doc.get('address_line_1','')}, {doc.get('postcode','')}"
        seller_name = doc.get("seller_name") or "the seller"
        agent_label = f"{doc.get('agent_name','')} · {doc.get('agency_name','')}"

        # Notify Gazeal
        try:
            await _send(
                subject=f"Seller agreement ACCEPTED — {seller_name} ({address})",
                to=[NOTIFY_EMAIL],
                html=f"""
                <h2 style="font-family:Arial,sans-serif;color:#0B1220;">Seller agreement accepted</h2>
                <p style="font-family:Arial,sans-serif;font-size:14px;color:#0B1220;">
                  <strong>{seller_name}</strong> has accepted the Seller Survey Agreement.
                </p>
                <table cellpadding="6" style="font-family:Arial,sans-serif;font-size:13px;color:#0B1220;border-collapse:collapse;">
                  <tr><td style="color:#6B7280;">Seller</td><td>{seller_name} &middot; {doc.get('seller_email','')}</td></tr>
                  <tr><td style="color:#6B7280;">Property</td><td>{address}</td></tr>
                  <tr><td style="color:#6B7280;">Agent</td><td>{agent_label}</td></tr>
                  <tr><td style="color:#6B7280;">Accepted</td><td>{now}</td></tr>
                  <tr><td style="color:#6B7280;">IP / UA</td><td>{ip} &middot; <code style="font-size:11px;">{ua}</code></td></tr>
                </table>
                <p style="font-family:Arial,sans-serif;font-size:12px;color:#6B7280;">Reference: <code>{token}</code></p>
                """,
            )
        except Exception:
            logger.exception("Gazeal notify email failed")

        # Confirmation to the seller
        try:
            await _send(
                subject="Your Seller Survey Agreement is accepted",
                to=[doc.get("seller_email")],
                html=f"""
                <p style="font-family:Arial,sans-serif;font-size:14px;color:#0B1220;">
                  Hi {seller_name.split(' ')[0]},
                </p>
                <p style="font-family:Arial,sans-serif;font-size:14px;color:#0B1220;line-height:1.6;">
                  Thank you. Your acceptance of the Gazeal Seller Survey Agreement
                  for <strong>{address}</strong> has been recorded on {now}.
                  RPSA will be in touch shortly to arrange your survey.
                </p>
                <p style="font-family:Arial,sans-serif;font-size:12px;color:#6B7280;line-height:1.6;">
                  For your records, this acceptance was made from IP address
                  <code>{ip or 'unknown'}</code>.<br/>
                  Reference: <code>{token}</code>
                </p>
                <p style="font-family:Arial,sans-serif;font-size:12px;color:#6B7280;">
                  You can revisit your agreement at any time using your original link.
                </p>
                """,
            )
        except Exception:
            logger.exception("Seller confirmation email failed")

        # Webhook fan-out to RPSA
        fanout_doc = {
            "id": doc.get("lead_id") or token,
            "kind": "agreement_signed",
            "created_at": now,
            "submission_id": doc.get("lead_id"),
            "agent_name": doc.get("agent_name"),
            "agency_name": doc.get("agency_name"),
            "branch": doc.get("branch"),
            "email": doc.get("agent_email"),
            "seller_name": doc.get("seller_name"),
            "seller_email": doc.get("seller_email"),
            "address_line_1": doc.get("address_line_1"),
            "postcode": doc.get("postcode"),
            "agreement_token": token,
            "agreement_url": doc.get("agreement_url") or f"{os.environ.get('FRONTEND_BASE_URL','')}/agreement/{token}",
            "accepted_at": now,
        }
        await fan_out(db, "agreement.signed", fanout_doc)
        notify_agreement_accepted({**doc, "token": token, "accepted_ip": ip, "accepted_at": now})

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
            {"token": token}, {"$set": {"status": "declined", "declined_at": now}}
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
        try:
            await _send(
                subject=f"Reservation Agreement interest — {seller_name} ({address})",
                to=[NOTIFY_EMAIL],
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
                <p style="font-family:Arial,sans-serif;font-size:13px;color:#4A5260;">
                  Please follow up directly with the seller and brief the agent.
                </p>
                """,
            )
        except Exception:
            logger.exception("Reservation interest notify failed")

        notify_reservation_interest({**doc, "token": token})

        return {"status": "expressed", "reservation_interest_at": now}

    return router
