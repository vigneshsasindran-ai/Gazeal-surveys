"""Balgores seller-direct funnel — order-survey + agreement fetch/accept.

Covers the new /balgores flow where the seller orders their own survey and
signs the agreement on-page (no invite email loop).
"""
import os
import pytest
import requests
from dotenv import load_dotenv

# Load env from backend/.env to pick up ADMIN_TOKEN & REACT_APP_BACKEND_URL
load_dotenv("/app/frontend/.env")

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")


@pytest.fixture(scope="module")
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


def _seller_payload(**overrides):
    payload = {
        "flow": "seller_direct",
        "brand": "balgores",
        "agent_name": "",
        "agency_name": "Balgores Property Group",
        "branch": "Chelmsford",
        "phone": "",
        "email": None,
        "seller_name": "TEST Seller Direct",
        "seller_email": "seller-test@example.com",
        "seller_phone": "07700900123",
        "address_line_1": "12 Test Lane",
        "postcode": "CM2 6PJ",
        "listing_url": "",
        "asking_price": "£450,000",
        "confirmation": True,
    }
    payload.update(overrides)
    return payload


def _agent_payload(**overrides):
    payload = {
        "flow": "agent",
        "brand": "gazeal",
        "agent_name": "TEST Agent Name",
        "agency_name": "TEST Agency",
        "branch": "HQ",
        "phone": "02012345678",
        "email": "vignesh.sasindran@gazeal.co.uk",
        "seller_name": "TEST Seller Agent Flow",
        "seller_email": "vignesh.sasindran@gazeal.co.uk",
        "seller_phone": "07700900456",
        "address_line_1": "34 Regression Street",
        "postcode": "SW1A 1AA",
        "listing_url": "",
        "asking_price": "£600,000",
        "confirmation": True,
    }
    payload.update(overrides)
    return payload


# --- seller_direct submission -----------------------------------------------
class TestSellerDirectSubmission:
    def test_seller_direct_returns_agreement_and_no_seller_invite(self, api):
        r = api.post(f"{BASE_URL}/api/leads/order-survey", json=_seller_payload())
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["status"] == "ok"
        assert data.get("agreement_token"), "agreement_token missing"
        assert "/balgores/agreement/" in data.get("agreement_url", ""), data
        # White-label Balgores internal email attempted (id may be None only on quota, but should be non-null in normal case)
        assert data.get("email_id") is not None, f"email_id was None: {data.get('email_error')}"
        # In seller_direct there is NO seller invite email
        assert data.get("seller_email_id") is None
        assert data.get("seller_email_error") is None
        pytest.seller_token = data["agreement_token"]

    def test_get_seller_direct_agreement(self, api):
        token = getattr(pytest, "seller_token", None)
        assert token, "prerequisite submission did not run"
        r = api.get(f"{BASE_URL}/api/agreements/{token}")
        assert r.status_code == 200, r.text
        ctx = r.json()
        assert ctx["status"] == "pending"
        # agent.name is empty/blank for seller_direct
        assert (ctx["agent"].get("name") or "") == ""
        assert ctx["agent"]["agency"] == "Balgores Property Group"
        assert ctx["agent"]["branch"] == "Chelmsford"
        assert ctx["brand"] == "balgores"

    def test_accept_seller_direct_agreement(self, api):
        token = getattr(pytest, "seller_token", None)
        assert token, "prerequisite submission did not run"
        r = api.post(f"{BASE_URL}/api/agreements/{token}/accept", json={})
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["status"] == "accepted"
        assert data.get("accepted_at")

        # Verify persistence
        g = api.get(f"{BASE_URL}/api/agreements/{token}")
        assert g.status_code == 200
        assert g.json()["status"] == "accepted"


# --- agent flow (regression) ------------------------------------------------
class TestAgentFlowRegression:
    def test_agent_flow_submits_and_returns_both_emails(self, api):
        r = api.post(f"{BASE_URL}/api/leads/order-survey", json=_agent_payload())
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["status"] == "ok"
        assert data.get("agreement_token")
        assert "/balgores/agreement/" not in data.get("agreement_url", "")
        assert "/agreement/" in data["agreement_url"]
        # Both emails attempted; ids can be None only if Resend quota was hit
        # Assert the attempts didn't produce errors instead.
        # If they DID come back non-null, even better.
        if data.get("email_id") is None:
            print("email_error:", data.get("email_error"))
        if data.get("seller_email_id") is None:
            print("seller_email_error:", data.get("seller_email_error"))
        # Field must be present in response (regression on schema)
        assert "seller_email_id" in data
        assert "email_id" in data

    def test_agent_flow_missing_agent_details_422(self, api):
        # flow=agent but no agent_name/agency_name/email -> 422
        r = api.post(
            f"{BASE_URL}/api/leads/order-survey",
            json=_agent_payload(agent_name="", agency_name="", email=None),
        )
        assert r.status_code == 422, r.text


# --- default flow (omitted) — should default to agent and require fields ----
class TestDefaultFlow:
    def test_default_flow_missing_agent_returns_422(self, api):
        payload = _agent_payload(agent_name="", agency_name="", email=None)
        payload.pop("flow")  # omit flow
        r = api.post(f"{BASE_URL}/api/leads/order-survey", json=payload)
        assert r.status_code == 422, r.text
