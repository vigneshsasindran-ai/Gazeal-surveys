"""End-to-end tests for the seller agreement clickwrap (Gazeal Surveys)."""
import os
import uuid
import requests
from pymongo import MongoClient

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://survey-pro-10.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"
SAMPLE_VALID_TOKEN = os.environ.get("SAMPLE_AGREEMENT_TOKEN", "")  # read-only token, set via env

# Mongo client to look up agreement tokens by lead_id (the lead response
# doesn't surface the token; the seller receives it via email).
_MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
_DB_NAME = os.environ.get("DB_NAME", "test_database")
_mongo = MongoClient(_MONGO_URL)
_db = _mongo[_DB_NAME]


# --------------------- helpers ---------------------
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


def _create_agreement(headers: dict | None = None, base: str | None = None) -> tuple[str, dict]:
    """POST /api/leads/order-survey; prefers agreement_token from response, falls back to Mongo lookup."""
    suffix = uuid.uuid4().hex[:8]
    url = f"{(base or API)}/leads/order-survey"
    r = requests.post(url, json=_new_lead_payload(suffix), headers=headers or {}, timeout=30)
    assert r.status_code in (200, 201), f"order-survey failed: {r.status_code} {r.text}"
    body = r.json()
    token = body.get("agreement_token")
    if not token:
        lead_id = body.get("id")
        assert lead_id, f"No lead id returned: {body}"
        agreement = _db.agreements.find_one({"lead_id": lead_id})
        assert agreement and agreement.get("token"), (
            f"No agreement persisted for lead_id={lead_id}; doc={agreement}"
        )
        token = agreement["token"]
    return token, body


# --------------------- READ ---------------------
class TestGetAgreement:
    def test_valid_token_returns_public_context(self):
        r = requests.get(f"{API}/agreements/{SAMPLE_VALID_TOKEN}", timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["token"] == SAMPLE_VALID_TOKEN
        assert "status" in data
        assert "seller" in data and "first_name" in data["seller"]
        assert "agent" in data and "name" in data["agent"] and "agency" in data["agent"]
        assert "property" in data and "address_line_1" in data["property"] and "postcode" in data["property"]
        # Status may have changed in prior runs; just ensure expected keys exist
        assert "accepted_at" in data
        assert "declined_at" in data

    def test_invalid_token_returns_404(self):
        r = requests.get(f"{API}/agreements/this_token_does_not_exist_xyz", timeout=15)
        assert r.status_code == 404


# --------------------- ORDER SURVEY -> CREATES LEAD + AGREEMENT ---------------------
LOCAL_API = "http://localhost:8001/api"
FRONTEND_BASE_URL_ENV = os.environ.get("FRONTEND_BASE_URL", "https://survey-pro-10.preview.emergentagent.com").rstrip("/")


class TestOrderSurveyCreatesAgreement:
    def test_creates_agreement_and_surfaces_token(self):
        token, body = _create_agreement()
        # BUG 1 FIX: agreement_token + agreement_url must be in response
        assert body.get("agreement_token"), f"agreement_token missing from response: {body}"
        assert body.get("agreement_url"), f"agreement_url missing from response: {body}"
        assert body["agreement_url"].endswith(f"/agreement/{body['agreement_token']}")
        # Token must be fetchable (no 'not found' immediately after mint)
        r = requests.get(f"{API}/agreements/{token}", timeout=15)
        assert r.status_code == 200, r.text
        ctx = r.json()
        assert ctx["status"] == "pending"
        assert ctx["accepted_at"] is None
        assert ctx["property"]["postcode"] == "SW1A 1AA"

    def test_agreement_url_persisted_in_mongo(self):
        """BUG 1 FIX: the agreement doc must contain the agreement_url field."""
        token, body = _create_agreement()
        agreement = _db.agreements.find_one({"token": token})
        assert agreement is not None
        assert agreement.get("agreement_url") == body.get("agreement_url"), (
            f"Mongo agreement_url '{agreement.get('agreement_url')}' != response '{body.get('agreement_url')}'"
        )


class TestAgreementUrlDerivation:
    """BUG 1 FIX: agreement_url derives from request Origin/Referer with FRONTEND_BASE_URL fallback.

    These hit localhost directly so the ingress doesn't rewrite/strip headers.
    """

    def test_origin_header_used_for_agreement_url(self):
        custom_origin = "https://survey.gazeal.co.uk"
        token, body = _create_agreement(headers={"Origin": custom_origin}, base=LOCAL_API)
        assert body["agreement_url"].startswith(f"{custom_origin}/agreement/"), (
            f"Expected agreement_url to start with {custom_origin}/agreement/, got: {body['agreement_url']}"
        )
        assert body["agreement_url"].endswith(f"/agreement/{token}")

    def test_referer_header_used_when_no_origin(self):
        referer = "https://custom.example.com/some/path"
        token, body = _create_agreement(headers={"Referer": referer}, base=LOCAL_API)
        assert body["agreement_url"].startswith("https://custom.example.com/agreement/"), (
            f"Expected agreement_url scheme+host derived from referer, got: {body['agreement_url']}"
        )

    def test_fallback_to_frontend_base_url_when_no_headers(self):
        # Strip Host header? Requests sends Host automatically but no Origin/Referer.
        # Note: some clients (e.g. via TestClient) might inject Origin; bare requests should not.
        s = requests.Session()
        suffix = uuid.uuid4().hex[:8]
        # Send explicitly without origin/referer
        r = s.post(
            f"{LOCAL_API}/leads/order-survey",
            json=_new_lead_payload(suffix),
            headers={},  # no Origin, no Referer
            timeout=30,
        )
        assert r.status_code in (200, 201), r.text
        body = r.json()
        assert body.get("agreement_url"), body
        assert body["agreement_url"].startswith(f"{FRONTEND_BASE_URL_ENV}/agreement/"), (
            f"Expected fallback to FRONTEND_BASE_URL ({FRONTEND_BASE_URL_ENV}), got: {body['agreement_url']}"
        )


# --------------------- ACCEPT FLOW ---------------------
class TestAcceptFlow:
    def test_accept_then_idempotent(self):
        token, _ = _create_agreement()
        r = requests.post(f"{API}/agreements/{token}/accept", timeout=30)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["status"] == "accepted"
        assert body.get("accepted_at")

        # Verify persistence via GET
        ctx = requests.get(f"{API}/agreements/{token}", timeout=15).json()
        assert ctx["status"] == "accepted"
        assert ctx["accepted_at"] is not None

        # Idempotent: a second accept returns already_accepted (NOT 409)
        r2 = requests.post(f"{API}/agreements/{token}/accept", timeout=15)
        assert r2.status_code == 200, r2.text
        assert r2.json()["status"] == "already_accepted"

    def test_decline_on_accepted_returns_409(self):
        token, _ = _create_agreement()
        r = requests.post(f"{API}/agreements/{token}/accept", timeout=30)
        assert r.status_code == 200
        r2 = requests.post(f"{API}/agreements/{token}/decline", timeout=15)
        assert r2.status_code == 409, f"Expected 409 on decline-after-accept, got {r2.status_code}: {r2.text}"


# --------------------- DECLINE FLOW ---------------------
class TestDeclineFlow:
    def test_decline_fresh(self):
        token, _ = _create_agreement()
        r = requests.post(f"{API}/agreements/{token}/decline", timeout=30)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["status"] == "declined"
        assert body.get("declined_at")

        ctx = requests.get(f"{API}/agreements/{token}", timeout=15).json()
        assert ctx["status"] == "declined"

    def test_accept_on_declined_returns_409(self):
        token, _ = _create_agreement()
        r = requests.post(f"{API}/agreements/{token}/decline", timeout=30)
        assert r.status_code == 200
        r2 = requests.post(f"{API}/agreements/{token}/accept", timeout=15)
        assert r2.status_code == 409, f"Expected 409 on accept-after-decline, got {r2.status_code}: {r2.text}"

    def test_decline_idempotent(self):
        token, _ = _create_agreement()
        r = requests.post(f"{API}/agreements/{token}/decline", timeout=30)
        assert r.status_code == 200
        r2 = requests.post(f"{API}/agreements/{token}/decline", timeout=15)
        assert r2.status_code == 200
        assert r2.json()["status"] == "already_declined"


# --------------------- NOT FOUND on action ---------------------
class TestActionsOn404:
    def test_accept_unknown_404(self):
        r = requests.post(f"{API}/agreements/__nope__/accept", timeout=15)
        assert r.status_code == 404

    def test_decline_unknown_404(self):
        r = requests.post(f"{API}/agreements/__nope__/decline", timeout=15)
        assert r.status_code == 404
