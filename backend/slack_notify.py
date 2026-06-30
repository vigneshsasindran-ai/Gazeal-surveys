"""Slack incoming-webhook notifier (fire-and-forget).

A single SLACK_WEBHOOK_URL env var posts to the #gazeal-surveys channel.
Failures are logged but never propagated — Slack outages must not break
the main request flow.
"""
from __future__ import annotations

import asyncio
import logging
import os
from typing import Any

import httpx

logger = logging.getLogger(__name__)

_WEBHOOK = os.environ.get("SLACK_WEBHOOK_URL", "").strip()


async def _post(blocks: list[dict[str, Any]], fallback_text: str) -> None:
    if not _WEBHOOK:
        return  # Slack not configured — silently no-op
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            await client.post(
                _WEBHOOK,
                json={"text": fallback_text, "blocks": blocks},
            )
    except Exception as exc:  # pragma: no cover
        logger.warning("Slack notify failed: %s", exc)


def _bg(coro) -> None:
    """Fire a coroutine in the background so the caller doesn't await it."""
    try:
        asyncio.create_task(coro)
    except RuntimeError:  # pragma: no cover — outside an event loop
        pass


# ---------- helpers ----------
def _field(label: str, value: str) -> dict[str, Any]:
    return {"type": "mrkdwn", "text": f"*{label}*\n{value or '—'}"}


# ---------- public API ----------
def notify_order_submitted(lead: dict[str, Any]) -> None:
    """Agent submitted the Order Survey form."""
    address = ", ".join(
        x for x in (lead.get("address_line_1"), lead.get("postcode")) if x
    )
    blocks: list[dict[str, Any]] = [
        {
            "type": "header",
            "text": {
                "type": "plain_text",
                "text": f"New Order Survey — {lead.get('seller_name','?')}",
                "emoji": True,
            },
        },
        {
            "type": "section",
            "fields": [
                _field("Property", address),
                _field("Asking price", lead.get("asking_price") or "—"),
                _field("Agent", f"{lead.get('agent_name','')} · {lead.get('agency_name','')}"),
                _field("Agent contact", f"{lead.get('email','')}\n{lead.get('phone','')}"),
                _field("Seller", lead.get("seller_name", "")),
                _field("Seller contact", f"{lead.get('seller_email','')}\n{lead.get('seller_phone','') or '—'}"),
            ],
        },
    ]
    if lead.get("listing_url"):
        blocks.append({
            "type": "section",
            "text": {"type": "mrkdwn", "text": f":link: <{lead['listing_url']}|View listing>"},
        })
    _bg(_post(blocks, f"New Order Survey from {lead.get('agency_name','')}"))


def notify_agreement_accepted(doc: dict[str, Any]) -> None:
    """Seller accepted the Seller Survey Agreement."""
    address = ", ".join(
        x for x in (doc.get("address_line_1"), doc.get("postcode")) if x
    )
    blocks: list[dict[str, Any]] = [
        {
            "type": "header",
            "text": {
                "type": "plain_text",
                "text": f"Seller accepted — {doc.get('seller_name','?')}",
                "emoji": True,
            },
        },
        {
            "type": "section",
            "fields": [
                _field("Property", address),
                _field("Seller", f"{doc.get('seller_name','')}\n{doc.get('seller_email','')}"),
                _field("Listing agent", f"{doc.get('agent_name','')} · {doc.get('agency_name','')}"),
                _field("Token", f"`{doc.get('token','')}`"),
                _field("Accepted at", doc.get("accepted_at") or "—"),
                _field("IP address", f"`{doc.get('accepted_ip') or 'unknown'}`"),
            ],
        },
    ]
    if doc.get("agreement_url"):
        blocks.append({
            "type": "section",
            "text": {"type": "mrkdwn", "text": f":memo: <{doc['agreement_url']}|Open signed agreement>"},
        })
    _bg(_post(blocks, f"Seller agreement accepted — {doc.get('seller_name','')}"))


def notify_reservation_interest(doc: dict[str, Any]) -> None:
    """Seller ticked the Reservation Agreement interest checkbox."""
    address = ", ".join(
        x for x in (doc.get("address_line_1"), doc.get("postcode")) if x
    )
    blocks: list[dict[str, Any]] = [
        {
            "type": "header",
            "text": {
                "type": "plain_text",
                "text": f"Reservation interest — {doc.get('seller_name','?')}",
                "emoji": True,
            },
        },
        {
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": (
                    f"*{doc.get('seller_name','')}* would like more details on "
                    f"a Gazeal Reservation Agreement."
                ),
            },
        },
        {
            "type": "section",
            "fields": [
                _field("Property", address),
                _field("Seller email", doc.get("seller_email", "")),
                _field("Listing agent", f"{doc.get('agent_name','')} · {doc.get('agency_name','')}"),
                _field("Agent email", doc.get("agent_email", "")),
            ],
        },
    ]
    _bg(_post(blocks, f"Reservation interest from {doc.get('seller_name','')}"))
