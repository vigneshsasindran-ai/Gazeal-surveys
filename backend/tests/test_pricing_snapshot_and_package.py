"""Tests for pricing_snapshot on accept + sale_room_package + admin package endpoint."""
import os
import uuid
import requests
from pymongo import MongoClient

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://survey-pro-10.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"
LOCAL_API = "http://localhost:8001/api"

# Read admin token from backend/.env
def _read_admin_token():
    with open("/app/backend/.env") as f:
        for line in f:
            if line.startswith("ADMIN_TOKEN"):
                return line.split("=", 1)[1].strip().strip('"').strip("'")
    return ""

ADMIN_TOKEN = _read_admin_token()

_MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
_DB_NAME = os.environ.get("DB_NAME", "test_database")
_mongo = MongoClient(_MONGO_URL)
_db = _mongo[_DB_NAME]


def _lead_payload(suffix):
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


def _new_token(headers=None, base=None):
    suffix = uuid.uuid4().hex[:8]
    url = f"{(base or API)}/leads/order-survey"
    r = requests.post(url, json=_lead_payload(suffix), headers=headers or {}, timeout=30)
    assert r.status_code in (200, 201), r.text
    return r.json()["agreement_token"]


class TestPricingSnapshotPersistence:
    def test_accept_with_snapshot_persists_and_returned_by_get(self):
        token = _new_token()
        snap = {
            "property_value": 1_620_000,
            "bedrooms": "4 to 5",
            "listed_status": "Not listed",
            "band": "£1,500,000 – £2,000,000",
            "price": 1030.22,
            "quote": False,
        }
        r = requests.post(f"{API}/agreements/{token}/accept", json={"pricing_snapshot": snap}, timeout=30)
        assert r.status_code == 200, r.text
        assert r.json()["status"] == "accepted"

        ctx = requests.get(f"{API}/agreements/{token}", timeout=15).json()
        assert ctx["pricing_snapshot"] is not None
        ps = ctx["pricing_snapshot"]
        assert ps["property_value"] == 1_620_000
        assert ps["bedrooms"] == "4 to 5"
        assert ps["listed_status"] == "Not listed"
        assert ps["band"] == "£1,500,000 – £2,000,000"
        assert abs(ps["price"] - 1030.22) < 0.01
        assert ps["quote"] is False

    def test_accept_without_body_still_works_and_snapshot_null(self):
        token = _new_token()
        r = requests.post(f"{API}/agreements/{token}/accept", timeout=30)
        assert r.status_code == 200, r.text
        ctx = requests.get(f"{API}/agreements/{token}", timeout=15).json()
        assert ctx["status"] == "accepted"
        assert ctx.get("pricing_snapshot") in (None,)

    def test_second_accept_still_idempotent(self):
        token = _new_token()
        r = requests.post(f"{API}/agreements/{token}/accept", json={"pricing_snapshot": {"property_value": 500000}}, timeout=30)
        assert r.status_code == 200
        r2 = requests.post(f"{API}/agreements/{token}/accept", timeout=15)
        assert r2.status_code == 200
        assert r2.json()["status"] == "already_accepted"


class TestSaleRoomPackage:
    def test_package_built_on_accept(self):
        token = _new_token()
        snap = {"property_value": 900000, "bedrooms": "1 to 3", "listed_status": "Not listed",
                "band": "Up to £999,999", "price": 646.88, "quote": False}
        r = requests.post(f"{API}/agreements/{token}/accept", json={"pricing_snapshot": snap}, timeout=30)
        assert r.status_code == 200

        doc = _db.agreements.find_one({"token": token})
        pkg = doc.get("sale_room_package")
        assert pkg is not None, "sale_room_package missing"
        # Shape checks
        assert pkg["status"] == "seller_signed"
        assert pkg["signed_at"]
        assert "reference_number" in pkg
        assert "sale_room_url" in pkg
        for k in ("agent", "seller", "property", "agreement"):
            assert k in pkg, f"missing {k}"
        assert pkg["agent"]["email"]
        assert pkg["seller"]["email"]
        assert pkg["property"]["address_line_1"]
        assert pkg["agreement"]["accepted_at"]
        assert pkg["agreement"]["accepted_user_agent"] is not None
        assert pkg["pricing_snapshot"]["property_value"] == 900000
        assert pkg["reservation_interest"] in (False, True)


class TestPackageEndpoint:
    def test_unauthorized_without_header(self):
        token = _new_token()
        requests.post(f"{API}/agreements/{token}/accept", timeout=30)
        r = requests.get(f"{API}/agreements/{token}/package", timeout=15)
        assert r.status_code == 401

    def test_unauthorized_with_wrong_header(self):
        token = _new_token()
        requests.post(f"{API}/agreements/{token}/accept", timeout=30)
        r = requests.get(f"{API}/agreements/{token}/package",
                         headers={"x-admin-token": "wrong"}, timeout=15)
        assert r.status_code == 401

    def test_authorized_returns_package(self):
        token = _new_token()
        snap = {"property_value": 750000, "bedrooms": "1 to 3", "listed_status": "Not listed",
                "band": "Up to £999,999", "price": 646.88, "quote": False}
        requests.post(f"{API}/agreements/{token}/accept", json={"pricing_snapshot": snap}, timeout=30)
        r = requests.get(f"{API}/agreements/{token}/package",
                         headers={"x-admin-token": ADMIN_TOKEN}, timeout=15)
        assert r.status_code == 200, r.text
        pkg = r.json()
        assert pkg["status"] == "seller_signed"
        assert pkg["pricing_snapshot"]["property_value"] == 750000
        assert pkg["agreement"]["accepted_at"]

    def test_not_yet_signed_returns_stub(self):
        token = _new_token()
        r = requests.get(f"{API}/agreements/{token}/package",
                         headers={"x-admin-token": ADMIN_TOKEN}, timeout=15)
        assert r.status_code == 200
        body = r.json()
        assert body.get("status") == "not_yet_signed"
        assert body.get("token") == token
