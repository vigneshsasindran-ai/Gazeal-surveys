"""Tests for the new 'unset pricing / details_confirmed' flow and order-survey bedrooms + listed_status fields."""
import os
import uuid
import requests
from pymongo import MongoClient

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://survey-pro-10.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

_mongo = MongoClient(os.environ.get("MONGO_URL", "mongodb://localhost:27017"))
_db = _mongo[os.environ.get("DB_NAME", "test_database")]


def _lead_payload(**overrides) -> dict:
    suffix = uuid.uuid4().hex[:8]
    base = {
        "agent_name": f"TEST Agent {suffix}",
        "agency_name": "TEST Agency",
        "phone": "+447700900000",
        "email": f"test_agent_{suffix}@example.com",
        "seller_name": f"TEST Seller {suffix}",
        "seller_email": "delivered@resend.dev",
        "address_line_1": f"{suffix} Test Street",
        "postcode": "SW1A 1AA",
        "asking_price": "£750,000",
        "bedrooms": "2 to 3",
        "listed_status": "Grade II",
        "confirmation": True,
    }
    base.update(overrides)
    return base


def _create(**overrides):
    r = requests.post(f"{API}/leads/order-survey", json=_lead_payload(**overrides), timeout=30)
    assert r.status_code in (200, 201), r.text
    body = r.json()
    return body["agreement_token"], body


# ------------------------------ Seed tokens ------------------------------
class TestSeedTokens:
    """The two demo tokens must exist and expose the new property fields."""

    def test_gazeal_unset_token_exposes_empty_asking_price(self):
        r = requests.get(f"{API}/agreements/hEcjMBDNcro", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert data["status"] == "pending"
        prop = data["property"]
        assert prop["asking_price"] == ""
        assert prop["bedrooms"] == ""
        assert prop["listed_status"] == ""

    def test_balgores_prefill_token_exposes_asking_price(self):
        r = requests.get(f"{API}/agreements/j3je4PfutiA", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert data["status"] == "pending"
        prop = data["property"]
        assert prop["asking_price"] == "£450,000"
        assert prop["bedrooms"] == "4 to 5"
        assert prop["listed_status"] == "N/A"
        assert data["brand"] == "balgores"
        assert data["flow"] == "seller_direct"


# ------------------------------ order-survey fields ------------------------------
class TestOrderSurveyBedroomsListed:
    def test_bedrooms_and_listed_stored_and_returned(self):
        token, _ = _create(bedrooms="4 to 5", listed_status="Grade I", asking_price="£875,000")
        r = requests.get(f"{API}/agreements/{token}", timeout=15)
        assert r.status_code == 200
        prop = r.json()["property"]
        assert prop["asking_price"] == "£875,000"
        assert prop["bedrooms"] == "4 to 5"
        assert prop["listed_status"] == "Grade I"

        # Mongo lead persisted the fields too
        agreement = _db.agreements.find_one({"token": token})
        assert agreement, "agreement missing"
        lead = _db.leads.find_one({"id": agreement["lead_id"]})
        assert lead["bedrooms"] == "4 to 5"
        assert lead["listed_status"] == "Grade I"

    def test_bedrooms_listed_optional_default_empty(self):
        # Omit both fields entirely
        payload = _lead_payload()
        payload.pop("bedrooms", None)
        payload.pop("listed_status", None)
        r = requests.post(f"{API}/leads/order-survey", json=payload, timeout=30)
        assert r.status_code in (200, 201), r.text
        token = r.json()["agreement_token"]
        ctx = requests.get(f"{API}/agreements/{token}", timeout=15).json()
        assert ctx["property"]["bedrooms"] == ""
        assert ctx["property"]["listed_status"] == ""


# ------------------------------ Accept + pricing snapshot ------------------------------
class TestAcceptRiskAckAndPricingSnapshot:
    def test_accept_without_risk_ack_returns_422(self):
        token, _ = _create()
        r = requests.post(f"{API}/agreements/{token}/accept", json={}, timeout=15)
        assert r.status_code == 422, r.text
        # still pending
        ctx = requests.get(f"{API}/agreements/{token}", timeout=15).json()
        assert ctx["status"] == "pending"

    def test_accept_persists_pricing_snapshot_with_details_confirmed(self):
        token, _ = _create()
        snapshot = {
            "property_value": 725000,
            "bedrooms": "4 to 5",
            "listed_status": "N/A",
            "band": "£500k–£1m",
            "price": 899,
            "quote": True,
            "details_confirmed": True,
        }
        r = requests.post(
            f"{API}/agreements/{token}/accept",
            json={"risk_ack": True, "pricing_snapshot": snapshot},
            timeout=30,
        )
        assert r.status_code == 200, r.text
        assert r.json()["status"] == "accepted"

        ctx = requests.get(f"{API}/agreements/{token}", timeout=15).json()
        assert ctx["status"] == "accepted"
        snap = ctx["pricing_snapshot"]
        assert snap["property_value"] == 725000
        assert snap["bedrooms"] == "4 to 5"
        assert snap["details_confirmed"] is True
        assert snap["price"] == 899

        # risk_acknowledged persisted on the doc
        agreement = _db.agreements.find_one({"token": token})
        assert agreement.get("risk_acknowledged") is True
