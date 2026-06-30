"""Tests for new changes: email content + express-interest endpoint + SENDER_EMAIL env."""
import os
import sys
import uuid
import requests
from dotenv import load_dotenv

# Ensure backend env is loaded (for SENDER_EMAIL assertion + _render_seller_invite import)
load_dotenv("/app/backend/.env")

# Make backend modules importable
sys.path.insert(0, "/app/backend")

from routes.leads import _render_seller_invite, OrderSurveyLead  # noqa: E402

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://survey-pro-10.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"
LOCAL_API = "http://localhost:8001/api"


# ---------------------- SENDER_EMAIL env ----------------------
class TestSenderEmail:
    def test_sender_email_is_info_at_gazeal(self):
        assert os.environ.get("SENDER_EMAIL") == "info@gazeal.co.uk"


# ---------------------- Seller invite email rendering ----------------------
def _sample_lead() -> OrderSurveyLead:
    return OrderSurveyLead(
        agent_name="Test Agent",
        agency_name="Test Agency",
        branch="",
        phone="+447700900000",
        email="agent@example.com",
        seller_name="Jane Seller",
        seller_email="jane@example.com",
        seller_phone="",
        address_line_1="12 Test St",
        postcode="SW1A 1AA",
        listing_url="",
        asking_price="",
        confirmation=True,
    )


class TestSellerInviteEmail:
    def setup_method(self):
        self.html = _render_seller_invite(_sample_lead(), "https://x.example.com/agreement/abc123")

    def test_heading_contains_address(self):
        assert "Re: The Sale of 12 Test St, SW1A 1AA" in self.html

    def test_does_not_contain_old_h1(self):
        # The old H1 heading text inside <h1>. (The <title> tag still has it but
        # rendered H1 in body must NOT contain it.)
        # Quick check: look in body section after <body>
        body_start = self.html.lower().find("<body")
        body = self.html[body_start:]
        assert "Sign your Seller Survey Agreement" not in body, (
            "Old H1 'Sign your Seller Survey Agreement' should not appear in body"
        )

    def test_does_not_contain_rpsa_authorise_block(self):
        assert "authorises RPSA to arrange your survey" not in self.html

    def test_contains_new_intro_one_liner(self):
        import re
        normalised = re.sub(r"\s+", " ", self.html)
        assert (
            "To get started, the next step is to read the terms and agree to them by clicking the button below."
            in normalised
        )

    def test_what_happens_after_eyebrow_updated(self):
        assert "What happens after" in self.html
        # Must NOT be the old longer label
        assert "What happens after you sign" not in self.html

    def test_point_one_updated(self):
        assert "RPSA receives your request and contacts you directly." in self.html
        assert (
            "RPSA receives your signed agreement and contacts you directly to arrange the survey visit."
            not in self.html
        )

    def test_reassurance_block_removed(self):
        assert "You pay nothing on signing" not in self.html


# ---------------------- order-survey end-to-end response ----------------------
class TestOrderSurveyResponse:
    def test_returns_expected_keys(self):
        suffix = uuid.uuid4().hex[:8]
        payload = {
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
        r = requests.post(f"{API}/leads/order-survey", json=payload, timeout=30)
        assert r.status_code in (200, 201), r.text
        b = r.json()
        for k in ("id", "agreement_token", "agreement_url", "email_id", "seller_email_id", "status"):
            assert k in b, f"missing key {k} in {b}"
        assert b["status"] == "ok"


# ---------------------- express-interest endpoint ----------------------
def _create_token() -> str:
    suffix = uuid.uuid4().hex[:8]
    payload = {
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
    r = requests.post(f"{API}/leads/order-survey", json=payload, timeout=30)
    assert r.status_code in (200, 201), r.text
    return r.json()["agreement_token"]


class TestExpressInterest:
    def test_first_call_expressed_second_idempotent(self):
        token = _create_token()
        r1 = requests.post(f"{API}/agreements/{token}/express-interest", timeout=30)
        assert r1.status_code == 200, r1.text
        b1 = r1.json()
        assert b1["status"] == "expressed"
        assert b1.get("reservation_interest_at")

        # GET reflects the new state
        ctx = requests.get(f"{API}/agreements/{token}", timeout=15).json()
        assert ctx["reservation_interest"] is True
        assert ctx["reservation_interest_at"] is not None

        # Second call → already_expressed
        r2 = requests.post(f"{API}/agreements/{token}/express-interest", timeout=30)
        assert r2.status_code == 200, r2.text
        assert r2.json()["status"] == "already_expressed"

    def test_invalid_token_returns_404(self):
        r = requests.post(f"{API}/agreements/__not_a_token__/express-interest", timeout=15)
        assert r.status_code == 404
