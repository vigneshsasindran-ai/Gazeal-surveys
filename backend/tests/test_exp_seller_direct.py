"""eXp UK (/exp) seller-direct funnel — backend tests.

Covers: POST /api/leads/order-survey (brand=exp, flow=seller_direct),
GET /api/agreements/{token} brand echo, decline/reopen/accept lifecycle,
validation guards, and admin panel visibility of the exp order row.

EMAIL SAFETY: every email in the payload is vignesh.sasindran@gazeal.co.uk.
"""
import os
import re
from pathlib import Path

import pytest
import requests
from dotenv import dotenv_values

frontend_env = dotenv_values("/app/frontend/.env")
base_url = os.environ.get("REACT_APP_BACKEND_URL") or frontend_env.get("REACT_APP_BACKEND_URL")
if not base_url:
    raise RuntimeError("REACT_APP_BACKEND_URL missing")
BASE_URL = base_url.rstrip("/")
SAFE_EMAIL = "vignesh.sasindran@gazeal.co.uk"


@pytest.fixture(scope="module")
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json", "Origin": BASE_URL})
    return s


@pytest.fixture(scope="session")
def admin_credentials():
    p = Path("/app/memory/test_credentials.md")
    if not p.exists():
        pytest.skip("missing test_credentials.md")
    c = p.read_text(encoding="utf-8")
    u = re.search(r"(?im)^\s*[-*]?\s*(?:\*\*)?Username(?:\*\*)?\s*:\s*`?([^`\s]+)", c)
    pw = re.search(r"(?im)^\s*[-*]?\s*(?:\*\*)?Password(?:\*\*)?\s*:\s*`?([^`\s]+)", c)
    if not u or not pw:
        pytest.skip("no admin creds found")
    return {"username": u.group(1), "password": pw.group(1)}


def exp_payload(**over):
    body = {
        "seller_name": "TEST_ExpSeller QA",
        "seller_email": SAFE_EMAIL,
        "seller_phone": "07700900123",
        "address_line_1": "TEST_12 eXp Test Road",
        "postcode": "SW1A 1AA",
        "asking_price": "450000",
        "bedrooms": "3",
        "listed_status": "not_listed",
        "listing_url": "",
        "agent_name": "TEST_QA Agent",
        "email": SAFE_EMAIL,
        "phone": "07700900456",
        "confirmation": True,
        "brand": "exp",
        "flow": "seller_direct",
    }
    body.update(over)
    return body


# --------------------------------------------------------------- order create
class TestExpOrderSurvey:
    def test_create_exp_seller_direct_order(self, api):
        r = api.post(f"{BASE_URL}/api/leads/order-survey", json=exp_payload())
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["status"] == "ok"
        token = d.get("agreement_token")
        assert isinstance(token, str) and len(token) > 5
        assert d["reference_number"] == token
        # seller-direct → no seller invite email
        assert d.get("seller_email_id") is None
        assert d.get("seller_email_error") is None
        # internal notification must have been generated cleanly
        assert d.get("email_error") is None, f"internal email error: {d.get('email_error')}"
        assert d.get("email_id"), "no internal email id returned"
        # agreement url must carry the /exp route prefix
        assert "/exp/agreement/" in d["agreement_url"], d["agreement_url"]
        pytest.exp_token = token

    def test_get_agreement_returns_exp_brand(self, api):
        token = getattr(pytest, "exp_token", None)
        assert token, "order creation test must run first"
        r = api.get(f"{BASE_URL}/api/agreements/{token}")
        assert r.status_code == 200, r.text
        d = r.json()
        assert "_id" not in d
        assert d.get("brand") == "exp"
        assert d.get("flow") == "seller_direct"
        assert d.get("status") == "pending"
        assert d["seller"]["full_name"] == "TEST_ExpSeller QA"
        assert d["agent"]["name"] == "TEST_QA Agent"
        assert d["property"]["postcode"] == "SW1A 1AA"
        # no branch for exp
        assert not d["agent"].get("branch")

    def test_existing_preview_exp_token(self, api):
        r = api.get(f"{BASE_URL}/api/agreements/gpvGPRPfPjI")
        assert r.status_code == 200, r.text
        assert r.json().get("brand") == "exp"

    def test_agent_flow_still_requires_agent_details(self, api):
        r = api.post(
            f"{BASE_URL}/api/leads/order-survey",
            json=exp_payload(flow="agent", agent_name="", agency_name="", email=None),
        )
        assert r.status_code == 422, r.text

    def test_invalid_brand_rejected(self, api):
        r = api.post(f"{BASE_URL}/api/leads/order-survey", json=exp_payload(brand="expuk"))
        assert r.status_code == 422

    def test_missing_seller_email_rejected(self, api):
        p = exp_payload()
        p.pop("seller_email")
        r = api.post(f"{BASE_URL}/api/leads/order-survey", json=p)
        assert r.status_code == 422

    def test_unknown_token_404(self, api):
        r = api.get(f"{BASE_URL}/api/agreements/definitelyNotAToken123")
        assert r.status_code == 404


# ------------------------------------------------------- lifecycle: decline
class TestExpAgreementLifecycle:
    @pytest.fixture(scope="class")
    def token(self, api):
        r = api.post(f"{BASE_URL}/api/leads/order-survey", json=exp_payload(
            seller_name="TEST_ExpLifecycle QA"))
        assert r.status_code == 200, r.text
        return r.json()["agreement_token"]

    def test_decline_then_reopen_then_accept(self, api, token):
        r = api.post(f"{BASE_URL}/api/agreements/{token}/decline", json={})
        assert r.status_code == 200, r.text
        assert r.json()["status"] == "declined"

        g = api.get(f"{BASE_URL}/api/agreements/{token}").json()
        assert g["status"] == "declined"

        # accept must be blocked while declined
        blocked = api.post(f"{BASE_URL}/api/agreements/{token}/accept",
                           json={"risk_ack": True})
        assert blocked.status_code == 409, blocked.text

        rp = api.post(f"{BASE_URL}/api/agreements/{token}/reopen", json={})
        assert rp.status_code == 200, rp.text
        g = api.get(f"{BASE_URL}/api/agreements/{token}").json()
        assert g["status"] == "pending"

        # accept without risk_ack is rejected
        bad = api.post(f"{BASE_URL}/api/agreements/{token}/accept", json={})
        assert bad.status_code == 422, bad.text

        ok = api.post(f"{BASE_URL}/api/agreements/{token}/accept", json={
            "risk_ack": True,
            "pricing_snapshot": {
                "property_value": 450000, "bedrooms": "3",
                "listed_status": "not_listed", "band": "400k-500k",
                "price": 1195, "quote": False, "details_confirmed": True,
            },
        })
        assert ok.status_code == 200, ok.text
        g = api.get(f"{BASE_URL}/api/agreements/{token}").json()
        assert g["status"] == "accepted"
        assert g.get("accepted_at")
        assert g.get("brand") == "exp"

        # idempotent
        again = api.post(f"{BASE_URL}/api/agreements/{token}/accept",
                         json={"risk_ack": True})
        assert again.status_code == 200
        assert again.json()["status"] == "already_accepted"

        # decline after accept blocked
        d2 = api.post(f"{BASE_URL}/api/agreements/{token}/decline", json={})
        assert d2.status_code == 409


# ------------------------------------------------------------- admin panel
class TestAdminPanelExp:
    def test_login_and_exp_lead_visible(self, api, admin_credentials):
        lr = requests.post(f"{BASE_URL}/api/panel/auth/login", json=admin_credentials)
        assert lr.status_code == 200, lr.text
        tok = lr.json().get("token")
        assert tok
        h = {"Authorization": f"Bearer {tok}"}
        r = requests.get(f"{BASE_URL}/api/panel/leads", headers=h)
        assert r.status_code == 200, r.text
        data = r.json()
        rows = data["orders"]
        assert rows, "no order rows returned"
        exp_rows = [x for x in rows if x.get("brand") == "exp"]
        assert exp_rows, "no exp brand rows in panel leads"
        mine = [x for x in exp_rows if str(x.get("seller_name", "")).startswith("TEST_Exp")]
        assert mine, "newly created exp order not present in panel"
        assert mine[0].get("agent_name") == "TEST_QA Agent"
        assert mine[0].get("flow") == "seller_direct"
        assert not mine[0].get("branch")
        assert "/exp/agreement/" in mine[0].get("agreement_url", "")
        assert all("_id" not in x for x in rows)

    def test_panel_requires_auth(self):
        r = requests.get(f"{BASE_URL}/api/panel/leads")
        assert r.status_code in (401, 403)
