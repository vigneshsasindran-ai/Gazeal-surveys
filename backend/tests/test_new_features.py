"""Backend tests for the new features:
- persisted email audit trail on order + acceptance
- reopen (reconsider) flow after decline
- new public_context fields (created_at, flow, seller_invite_sent_at, rpsa_instructed_at, previously_declined_at)
"""
import os
import time
import uuid
import requests
from pymongo import MongoClient

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://survey-pro-10.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

_MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
_DB_NAME = os.environ.get("DB_NAME", "test_database")
_db = MongoClient(_MONGO_URL)[_DB_NAME]


def _agent_payload(suffix: str) -> dict:
    return {
        "agent_name": f"TEST Agent {suffix}",
        "agency_name": "TEST Agency",
        "branch": "Test Branch",
        "phone": "+447700900000",
        "email": f"delivered@resend.dev",
        "seller_name": f"TEST Seller {suffix}",
        "seller_email": "delivered@resend.dev",
        "address_line_1": f"{suffix} Test Street",
        "postcode": "SW1A 1AA",
        "confirmation": True,
        "brand": "gazeal",
        "flow": "agent",
    }


def _seller_direct_payload(suffix: str) -> dict:
    return {
        "seller_name": f"TEST Seller {suffix}",
        "seller_email": "seller-test@example.com",
        "seller_phone": "+447700900001",
        "address_line_1": f"{suffix} Balgores Rd",
        "postcode": "CM1 1AA",
        "confirmation": True,
        "brand": "balgores",
        "branch": "Chelmsford",
        "agency_name": "Balgores Property Group",
        "flow": "seller_direct",
    }


def _order(payload: dict) -> tuple[str, dict]:
    r = requests.post(f"{API}/leads/order-survey", json=payload, timeout=45)
    assert r.status_code == 200, f"{r.status_code} {r.text}"
    body = r.json()
    return body["agreement_token"], body


# ---------- 1. Agent flow: email_audit_order + seller_invite_sent_at ----------
class TestAgentFlowAudit:
    def test_agent_flow_public_context_and_mongo_audit(self):
        token, body = _order(_agent_payload(uuid.uuid4().hex[:8]))
        r = requests.get(f"{API}/agreements/{token}", timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["flow"] == "agent"
        assert data["created_at"], "created_at missing from public context"
        assert data["seller_invite_sent_at"], "seller_invite_sent_at should be non-null for agent flow"
        assert data["rpsa_instructed_at"] is None
        assert data["previously_declined_at"] is None

        # Mongo audit trail
        doc = _db.agreements.find_one({"token": token})
        assert doc is not None
        audit = doc.get("email_audit_order") or {}
        assert audit.get("internal", {}).get("id"), f"email_audit_order.internal.id missing: {audit}"
        assert audit.get("seller_invite", {}).get("id"), f"email_audit_order.seller_invite.id missing: {audit}"


# ---------- 2. Seller-direct flow: no seller invite email ----------
class TestSellerDirectFlow:
    def test_seller_direct_no_invite(self):
        token, _ = _order(_seller_direct_payload(uuid.uuid4().hex[:8]))
        data = requests.get(f"{API}/agreements/{token}", timeout=15).json()
        assert data["flow"] == "seller_direct"
        assert data["seller_invite_sent_at"] is None, "seller_direct must not send an invite email"


# ---------- 3. Decline -> reopen -> accept cycle ----------
class TestReopenCycle:
    def test_full_cycle(self):
        token, _ = _order(_agent_payload(uuid.uuid4().hex[:8]))

        # decline
        r = requests.post(f"{API}/agreements/{token}/decline", timeout=30)
        assert r.status_code == 200 and r.json()["status"] == "declined"
        data = requests.get(f"{API}/agreements/{token}", timeout=15).json()
        assert data["status"] == "declined" and data["declined_at"]

        # reopen
        r = requests.post(f"{API}/agreements/{token}/reopen", timeout=30)
        assert r.status_code == 200, r.text
        assert r.json()["status"] == "pending"
        data = requests.get(f"{API}/agreements/{token}", timeout=15).json()
        assert data["status"] == "pending"
        assert data["declined_at"] is None
        assert data["previously_declined_at"], "previously_declined_at should be set after reopen"

        # accept
        r = requests.post(f"{API}/agreements/{token}/accept", timeout=45)
        assert r.status_code == 200 and r.json()["status"] == "accepted"
        data = requests.get(f"{API}/agreements/{token}", timeout=15).json()
        assert data["status"] == "accepted"
        assert data["accepted_at"]
        assert data["rpsa_instructed_at"], "rpsa_instructed_at should be non-null after accept"

        # Mongo: status_history + email_audit_acceptance
        doc = _db.agreements.find_one({"token": token})
        assert doc is not None
        history = doc.get("status_history") or []
        actions = [h.get("action") for h in history]
        assert "declined" in actions, f"status_history missing declined: {history}"
        assert "reopened" in actions, f"status_history missing reopened: {history}"

        accept_audit = doc.get("email_audit_acceptance") or {}
        assert accept_audit.get("agent_notify", {}).get("id"), f"agent_notify missing id: {accept_audit}"
        assert accept_audit.get("seller_confirmation", {}).get("id"), f"seller_confirmation missing id: {accept_audit}"
        assert accept_audit.get("rpsa_instruction", {}).get("id"), f"rpsa_instruction missing id: {accept_audit}"


# ---------- 4. Edge cases ----------
class TestReopenEdges:
    def test_reopen_on_accepted_returns_409(self):
        token, _ = _order(_agent_payload(uuid.uuid4().hex[:8]))
        assert requests.post(f"{API}/agreements/{token}/accept", timeout=45).status_code == 200
        r = requests.post(f"{API}/agreements/{token}/reopen", timeout=15)
        assert r.status_code == 409, f"Expected 409 for reopen on accepted, got {r.status_code}: {r.text}"

    def test_reopen_on_pending_is_noop(self):
        token, _ = _order(_agent_payload(uuid.uuid4().hex[:8]))
        r = requests.post(f"{API}/agreements/{token}/reopen", timeout=15)
        assert r.status_code == 200, r.text
        assert r.json().get("status") == "pending"
        # ensure it stays pending
        data = requests.get(f"{API}/agreements/{token}", timeout=15).json()
        assert data["status"] == "pending"
        assert data["previously_declined_at"] is None

    def test_accept_on_declined_without_reopen_returns_409(self):
        token, _ = _order(_agent_payload(uuid.uuid4().hex[:8]))
        assert requests.post(f"{API}/agreements/{token}/decline", timeout=30).status_code == 200
        r = requests.post(f"{API}/agreements/{token}/accept", timeout=15)
        assert r.status_code == 409, f"Expected 409, got {r.status_code}: {r.text}"


# ---------- 5. Regression: old accepted agreement still returns 200 ----------
class TestRegression:
    def test_old_accepted_token_still_readable(self):
        old_token = "1mikRpd52Rg"
        doc = _db.agreements.find_one({"token": old_token})
        if not doc:
            import pytest
            pytest.skip(f"old_token {old_token} not present in db; regression skipped")
        r = requests.get(f"{API}/agreements/{old_token}", timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        # graceful new fields should exist (may be null for legacy)
        assert "created_at" in data
        assert "flow" in data
        assert "seller_invite_sent_at" in data
        assert "rpsa_instructed_at" in data
        assert "previously_declined_at" in data
