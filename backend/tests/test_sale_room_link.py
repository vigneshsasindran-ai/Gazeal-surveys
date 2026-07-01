"""Tests for the new 'Sale room / agreement link' feature.

Uses httpx.AsyncClient + ASGITransport against the FastAPI app so we can
monkeypatch in-process resend.Emails.send and slack_notify._post / _bg.
A session-scoped event loop keeps motor's AsyncIOMotorClient alive across
tests (otherwise we hit 'Event loop is closed').
"""
from __future__ import annotations

import asyncio
import os
import sys
import uuid
from typing import Any

import pytest
import pytest_asyncio
from dotenv import load_dotenv
from httpx import ASGITransport, AsyncClient

# Keep all async tests in this module on ONE event loop so motor's
# AsyncIOMotorClient (created at server import time) stays bound to a live
# loop across tests.
pytestmark = pytest.mark.asyncio(loop_scope="session")

load_dotenv("/app/backend/.env")
sys.path.insert(0, "/app/backend")

import resend  # noqa: E402
import slack_notify  # noqa: E402
from server import app  # noqa: E402

NOTIFY_EMAIL = os.environ["NOTIFY_EMAIL"]


# ---------------------------------------------------------------------------
# Session-scoped event loop so motor's client stays bound to one loop.
# ---------------------------------------------------------------------------

@pytest_asyncio.fixture(loop_scope="session", scope="session")
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


# ---------------------------------------------------------------------------
# Monkeypatch helpers (function-scoped → need session-scoped monkeypatch alt)
# ---------------------------------------------------------------------------
@pytest.fixture
def patched(monkeypatch):
    """Patch resend + slack inline. Returns a holder with `emails` & `slack`."""
    emails: list[dict[str, Any]] = []
    slack: list[dict[str, Any]] = []

    def fake_send(params):
        emails.append(params)
        return {"id": f"em_{uuid.uuid4().hex[:8]}"}

    async def fake_post(blocks, fallback_text):
        slack.append({"blocks": blocks, "fallback": fallback_text})

    def fake_bg(coro):
        # Schedule on the current loop and let pytest-asyncio drain it.
        asyncio.ensure_future(coro)

    monkeypatch.setattr(resend.Emails, "send", staticmethod(fake_send))
    monkeypatch.setattr(slack_notify, "_post", fake_post)
    monkeypatch.setattr(slack_notify, "_bg", fake_bg)
    monkeypatch.setattr(slack_notify, "_WEBHOOK", "https://hooks.slack.example/x")

    class Holder:
        pass

    h = Holder()
    h.emails = emails
    h.slack = slack
    return h


def _flatten(blocks: list[dict[str, Any]], fallback: str = "") -> str:
    parts = [fallback]
    for b in blocks:
        t = b.get("text")
        if isinstance(t, dict):
            parts.append(t.get("text", ""))
        elif isinstance(t, str):
            parts.append(t)
        for f in b.get("fields", []) or []:
            parts.append(f.get("text", ""))
    return "\n".join(parts)


def _payload(suffix: str) -> dict:
    return {
        "agent_name": f"TEST Agent {suffix}",
        "agency_name": "TEST Agency",
        "phone": "+447700900000",
        "email": f"test_agent_{suffix}@example.com",
        "seller_name": f"TEST Seller {suffix}",
        "seller_email": f"test_seller_{suffix}@example.com",
        "address_line_1": f"{suffix} Test Street",
        "postcode": "SW1A 1AA",
        "confirmation": True,
    }


async def _create(client, headers=None) -> tuple[str, dict]:
    h = {"Origin": "https://test.example.com"}
    if headers:
        h.update(headers)
    r = await client.post(
        "/api/leads/order-survey",
        json=_payload(uuid.uuid4().hex[:8]),
        headers=h,
    )
    assert r.status_code == 200, r.text
    body = r.json()
    # Let any background slack task settle
    await asyncio.sleep(0.05)
    return body["agreement_token"], body


# ===========================================================================
# 1. Accept endpoint — THREE emails + agreement_url everywhere
# ===========================================================================
class TestAcceptThreeEmails:
    async def test_accept_sends_three_emails(self, client, patched):
        token, body = await _create(client)
        patched.emails.clear()
        patched.slack.clear()

        r = await client.post(f"/api/agreements/{token}/accept")
        assert r.status_code == 200, r.text
        await asyncio.sleep(0.05)

        assert len(patched.emails) == 3, (
            f"Expected 3 emails, got {len(patched.emails)}: "
            f"{[c.get('to') for c in patched.emails]}"
        )
        all_to = [a for c in patched.emails for a in c["to"]]
        assert NOTIFY_EMAIL in all_to
        assert any(a.startswith("test_agent_") for a in all_to), all_to
        assert any(a.startswith("test_seller_") for a in all_to), all_to

    async def test_agent_email_subject_and_body(self, client, patched):
        token, body = await _create(client)
        agreement_url = body["agreement_url"]
        patched.emails.clear()

        await client.post(f"/api/agreements/{token}/accept")
        agent_email = next(
            c for c in patched.emails if any(a.startswith("test_agent_") for a in c["to"])
        )
        assert agent_email["subject"].startswith("Seller has signed — "), agent_email["subject"]
        assert agreement_url in agent_email["html"]
        assert token in agent_email["html"]

    async def test_gazeal_and_seller_bodies_contain_sale_room_link(
        self, client, patched
    ):
        token, body = await _create(client)
        agreement_url = body["agreement_url"]
        patched.emails.clear()

        await client.post(f"/api/agreements/{token}/accept")
        gz = next(c for c in patched.emails if NOTIFY_EMAIL in c["to"])
        seller = next(
            c for c in patched.emails if any(a.startswith("test_seller_") for a in c["to"])
        )
        assert "Sale room / agreement link" in gz["html"]
        assert agreement_url in gz["html"]
        assert "Sale room / agreement link" in seller["html"]
        assert agreement_url in seller["html"]

    async def test_slack_accept_three_rows_and_link(self, client, patched):
        token, body = await _create(client)
        patched.slack.clear()

        await client.post(f"/api/agreements/{token}/accept")
        await asyncio.sleep(0.1)
        assert patched.slack, "Slack not captured"
        text = _flatten(patched.slack[-1]["blocks"], patched.slack[-1]["fallback"])
        assert "Open signed agreement" in text
        assert "*Gazeal notification*" in text
        assert "*Agent notification*" in text
        assert "*Seller confirmation*" in text
        assert text.count(":white_check_mark:") >= 3


# ===========================================================================
# 2. Order-survey — email body + Slack contain sale-room link
# ===========================================================================
class TestOrderSurveySaleRoom:
    async def test_gazeal_email_contains_sale_room(self, client, patched):
        r = await client.post(
            "/api/leads/order-survey",
            json=_payload(uuid.uuid4().hex[:8]),
            headers={"Origin": "https://test.example.com"},
        )
        assert r.status_code == 200
        body = r.json()
        agreement_url = body["agreement_url"]
        gz = next(c for c in patched.emails if NOTIFY_EMAIL in c["to"])
        assert gz["subject"].startswith("New Seller Survey order — ")
        assert "Sale room" in gz["html"]
        assert agreement_url in gz["html"]
        assert body["reference_number"] in gz["html"]

    async def test_slack_contains_sale_room_section(self, client, patched):
        r = await client.post(
            "/api/leads/order-survey",
            json=_payload(uuid.uuid4().hex[:8]),
            headers={"Origin": "https://test.example.com"},
        )
        assert r.status_code == 200
        body = r.json()
        await asyncio.sleep(0.1)
        assert patched.slack
        text = _flatten(patched.slack[-1]["blocks"], patched.slack[-1]["fallback"])
        assert body["reference_number"] in text
        assert "Sale room / agreement link" in text, (
            "Sale room link missing from Slack — `doc` passed to "
            f"notify_order_submitted lacks agreement_url. Text:\n{text}"
        )
        assert body["agreement_url"] in text


# ===========================================================================
# 3. Express-interest — email + slack contain link + reference
# ===========================================================================
class TestExpressInterestSaleRoom:
    async def test_email_and_slack_contain_link(self, client, patched):
        token, body = await _create(client)
        agreement_url = body["agreement_url"]
        patched.emails.clear()
        patched.slack.clear()

        r = await client.post(f"/api/agreements/{token}/express-interest")
        assert r.status_code == 200, r.text
        await asyncio.sleep(0.1)

        gz = next(c for c in patched.emails if NOTIFY_EMAIL in c["to"])
        assert agreement_url in gz["html"]
        assert token in gz["html"]
        assert "Sale room / agreement link" in gz["html"]

        assert patched.slack
        text = _flatten(patched.slack[-1]["blocks"], patched.slack[-1]["fallback"])
        assert "Sale room / agreement link" in text
        assert agreement_url in text
        assert token in text


# ===========================================================================
# 4. Failure path — resend raises, response carries errors, Slack :x:
# ===========================================================================
class TestFailurePath:
    async def test_accept_returns_200_and_slack_shows_x_rows(
        self, client, patched, monkeypatch
    ):
        token, _ = await _create(client)
        patched.slack.clear()

        # Swap resend to raising for the accept call only
        err_msg = "You have reached your daily email sending quota."

        def bad_send(params):
            raise Exception(err_msg)

        monkeypatch.setattr(resend.Emails, "send", staticmethod(bad_send))

        r = await client.post(f"/api/agreements/{token}/accept")
        assert r.status_code == 200, r.text
        assert r.json()["status"] == "accepted"
        await asyncio.sleep(0.1)

        assert patched.slack
        text = _flatten(patched.slack[-1]["blocks"], patched.slack[-1]["fallback"])
        assert text.count(":x:") >= 3, f"Need 3 failure rows, got:\n{text}"
        assert err_msg in text

    async def test_order_survey_returns_email_errors(
        self, client, patched, monkeypatch
    ):
        err_msg = "Resend quota exceeded TEST."

        def bad_send(params):
            raise Exception(err_msg)

        monkeypatch.setattr(resend.Emails, "send", staticmethod(bad_send))
        patched.slack.clear()

        r = await client.post(
            "/api/leads/order-survey",
            json=_payload(uuid.uuid4().hex[:8]),
            headers={"Origin": "https://test.example.com"},
        )
        assert r.status_code == 200, r.text
        b = r.json()
        assert b["email_id"] is None
        assert b["email_error"] == err_msg
        assert b["seller_email_id"] is None
        assert b["seller_email_error"] == err_msg

        await asyncio.sleep(0.1)
        assert patched.slack
        text = _flatten(patched.slack[-1]["blocks"], patched.slack[-1]["fallback"])
        assert ":x: *Agent notification*" in text
        assert ":x: *Seller invite*" in text
        assert err_msg in text
