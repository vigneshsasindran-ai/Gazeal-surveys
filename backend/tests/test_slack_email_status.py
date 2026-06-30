"""Tests for Slack notifications surfacing email send status.

Strategy: split into two layers.

A. UNIT — call slack_notify.notify_* directly with success / failure kwargs
   and patch the module's internal _post coroutine to capture the (blocks,
   fallback_text) it would send. Validates Slack payload shape & email
   status block content. No event-loop coupling with motor / ASGI.

B. HTTP — call the live FastAPI app via localhost:8001 with `requests`,
   monkeypatching nothing externally (Resend + Slack are real). We assert
   the *HTTP response* surfaces email_id / email_error correctly when the
   underlying email send succeeds; we cannot deterministically simulate a
   quota failure here, so we only assert the response shape & that the
   Slack ping call site is wired to receive email status (validated by A).
"""
from __future__ import annotations

import asyncio
import os
import sys
import uuid
from typing import Any
from unittest.mock import patch

import pytest
import requests
from dotenv import load_dotenv

load_dotenv("/app/backend/.env")
sys.path.insert(0, "/app/backend")

import slack_notify  # noqa: E402

BASE_URL = os.environ.get(
    "REACT_APP_BACKEND_URL", "https://survey-pro-10.preview.emergentagent.com"
).rstrip("/")
API = f"{BASE_URL}/api"
LOCAL_API = "http://localhost:8001/api"


# ---------------------------------------------------------------------------
# Helper to flatten Slack block-kit payload to plain text for assertions
# ---------------------------------------------------------------------------
def _flatten(blocks: list[dict[str, Any]], fallback: str) -> str:
    parts: list[str] = [fallback]
    for b in blocks:
        t = b.get("text")
        if isinstance(t, dict):
            parts.append(t.get("text", ""))
        elif isinstance(t, str):
            parts.append(t)
        for f in b.get("fields", []) or []:
            parts.append(f.get("text", ""))
    return "\n".join(parts)


# ---------------------------------------------------------------------------
# Capture helper: replaces slack_notify._post with a sync recorder. We also
# override _bg so coroutines run inline instead of being scheduled.
# ---------------------------------------------------------------------------
def _patch_slack(monkeypatch):
    calls: list[dict[str, Any]] = []

    async def fake_post(blocks, fallback_text):
        calls.append({"blocks": blocks, "fallback": fallback_text})

    def fake_bg(coro):
        # Run immediately so assertions see results without sleeping
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                # In a running loop, schedule and let it run
                asyncio.ensure_future(coro)
            else:
                loop.run_until_complete(coro)
        except RuntimeError:
            asyncio.run(coro)

    monkeypatch.setattr(slack_notify, "_post", fake_post)
    monkeypatch.setattr(slack_notify, "_bg", fake_bg)
    monkeypatch.setattr(slack_notify, "_WEBHOOK", "https://hooks.slack.example/x")
    return calls


# ===========================================================================
# A. UNIT TESTS — slack_notify.notify_* email-status block
# ===========================================================================
class TestSenderEnv:
    def test_sender_is_info_at_gazeal(self):
        assert os.environ.get("SENDER_EMAIL") == "info@gazeal.co.uk"


class TestNotifyOrderSubmitted:
    LEAD = {
        "seller_name": "Jane Seller",
        "agency_name": "Acme",
        "agent_name": "Bob Agent",
        "email": "bob@acme.com",
        "phone": "+447700",
        "seller_email": "jane@example.com",
        "seller_phone": "",
        "address_line_1": "12 Test St",
        "postcode": "SW1A 1AA",
        "asking_price": "£500k",
        "reference_number": "REF123",
    }

    def test_success_payload_has_check_marks_and_email_ids(self, monkeypatch):
        calls = _patch_slack(monkeypatch)
        slack_notify.notify_order_submitted(
            self.LEAD,
            agent_email_id="em_agent_1",
            seller_email_id="em_seller_2",
        )
        text = _flatten(calls[0]["blocks"], calls[0]["fallback"])
        assert "New Order Survey — Jane Seller" in text
        assert "REF123" in text
        assert ":white_check_mark: *Agent notification* sent (em_agent_1)" in text
        assert ":white_check_mark: *Seller invite* sent (em_seller_2)" in text

    def test_failure_payload_has_x_and_error_string(self, monkeypatch):
        calls = _patch_slack(monkeypatch)
        err = "You have reached your daily email sending quota."
        slack_notify.notify_order_submitted(
            self.LEAD,
            agent_email_error=err,
            seller_email_error=err,
        )
        text = _flatten(calls[0]["blocks"], calls[0]["fallback"])
        assert f":x: *Agent notification* failed — `{err}`" in text
        assert f":x: *Seller invite* failed — `{err}`" in text


class TestNotifyAgreementAccepted:
    DOC = {
        "seller_name": "Jane",
        "agency_name": "Acme",
        "agent_name": "Bob",
        "seller_email": "jane@example.com",
        "address_line_1": "1 Test Rd",
        "postcode": "SW1A 1AA",
        "token": "tok_abc",
        "reference_number": "REF999",
        "accepted_ip": "203.0.113.7",
        "accepted_at": "2026-01-01T00:00:00Z",
    }

    def test_accept_success(self, monkeypatch):
        calls = _patch_slack(monkeypatch)
        slack_notify.notify_agreement_accepted(
            self.DOC, gazeal_email_id="g_1", seller_email_id="s_1"
        )
        text = _flatten(calls[0]["blocks"], calls[0]["fallback"])
        assert "Seller accepted — Jane" in text
        assert "REF999" in text
        assert "2026-01-01T00:00:00Z" in text
        assert "203.0.113.7" in text
        assert ":white_check_mark: *Gazeal notification* sent (g_1)" in text
        assert ":white_check_mark: *Seller confirmation* sent (s_1)" in text

    def test_accept_failure(self, monkeypatch):
        calls = _patch_slack(monkeypatch)
        err = "You have reached your daily email sending quota."
        slack_notify.notify_agreement_accepted(
            self.DOC,
            gazeal_email_error=err,
            seller_email_error=err,
        )
        text = _flatten(calls[0]["blocks"], calls[0]["fallback"])
        assert f":x: *Gazeal notification* failed — `{err}`" in text
        assert f":x: *Seller confirmation* failed — `{err}`" in text


class TestNotifyReservationInterest:
    DOC = {
        "seller_name": "Jane",
        "seller_email": "jane@example.com",
        "agency_name": "Acme",
        "agent_name": "Bob",
        "agent_email": "bob@acme.com",
        "address_line_1": "1 Test Rd",
        "postcode": "SW1A 1AA",
        "token": "tok_zzz",
        "reference_number": "REF777",
    }

    def test_interest_success(self, monkeypatch):
        calls = _patch_slack(monkeypatch)
        slack_notify.notify_reservation_interest(self.DOC, gazeal_email_id="g_77")
        text = _flatten(calls[0]["blocks"], calls[0]["fallback"])
        assert "Reservation interest — Jane" in text
        assert ":white_check_mark: *Gazeal notification* sent (g_77)" in text

    def test_interest_failure(self, monkeypatch):
        calls = _patch_slack(monkeypatch)
        err = "You have reached your daily email sending quota."
        slack_notify.notify_reservation_interest(self.DOC, gazeal_email_error=err)
        text = _flatten(calls[0]["blocks"], calls[0]["fallback"])
        assert f":x: *Gazeal notification* failed — `{err}`" in text


# ===========================================================================
# Slack no-op when webhook URL is empty
# ===========================================================================
class TestSlackNoop:
    def test_post_is_noop_when_webhook_empty(self, monkeypatch):
        # Patch httpx to record calls; flip _WEBHOOK to empty.
        import httpx
        calls = {"n": 0}

        original = httpx.AsyncClient.post

        async def fake(self, url, *args, **kwargs):
            calls["n"] += 1
            return await original(self, url, *args, **kwargs)

        monkeypatch.setattr(httpx.AsyncClient, "post", fake)
        monkeypatch.setattr(slack_notify, "_WEBHOOK", "")
        asyncio.run(slack_notify._post([{"type": "section"}], "hi"))
        assert calls["n"] == 0


# ===========================================================================
# B. HTTP — live server contract checks (Resend is real, but the response
# shape always carries the email_id / email_error fields and reference_number)
# ===========================================================================
def _new_lead_payload(suffix: str) -> dict:
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


class TestOrderSurveyResponseShape:
    """Order-survey endpoint always exposes both email_id and email_error
    (one is None depending on outcome). This is the contract the Slack
    notifier depends on."""

    def test_response_includes_email_status_keys(self):
        suffix = uuid.uuid4().hex[:6]
        r = requests.post(
            f"{LOCAL_API}/leads/order-survey",
            json=_new_lead_payload(suffix),
            timeout=30,
        )
        assert r.status_code in (200, 201), r.text
        body = r.json()
        # Both pair of keys must be present (success or failure)
        for k in ("email_id", "email_error", "seller_email_id", "seller_email_error",
                  "reference_number", "agreement_token", "agreement_url", "status"):
            assert k in body, f"missing key {k} in {body}"
        # At least one of (email_id, email_error) is populated
        assert body["email_id"] or body["email_error"]
        assert body["seller_email_id"] or body["seller_email_error"]
