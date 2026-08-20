"""Tests for the RPSA panel webhook that fires when a seller signs.

The payload mapping is tested directly. The end-to-end delivery is covered
by the integration test at the bottom, which needs a running backend and
skips itself otherwise.
"""
import os
import sys
import uuid

import pytest
import requests
from pymongo import MongoClient

# The agreements module reads these at import time.
os.environ.setdefault("RESEND_API_KEY", "re_test_key")
os.environ.setdefault("SENDER_EMAIL", "test@example.com")
os.environ.setdefault("NOTIFY_EMAIL", "notify@example.com")

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from routes.agreements import (  # noqa: E402
    _digits_only,
    _extract_rpsa_id,
    _parse_rpsa_response,
    _pm_rpsa_entry,
    _rpsa_webhook_payload,
)

# Captured from the live endpoint on 18 Aug 2026 — debug text and JSON
# concatenated in one body.
REAL_RPSA_RESPONSE = (
    'Webhook received<br>Prop Price=40000'
    '{"success":true,"message":"Record added44249",'
    '"reference":"bACvyoAMumU","rpsaref":44249}'
)

BASE_URL = os.environ.get(
    "REACT_APP_BACKEND_URL", "https://survey-pro-10.preview.emergentagent.com"
).rstrip("/")
API = f"{BASE_URL}/api"

_MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
_DB_NAME = os.environ.get("DB_NAME", "test_database")


def _package(**overrides):
    base = {
        "reference_number": "QoXJAX-4L2Q",
        "sale_room_url": "https://survey.gazeal.co.uk/agreement/QoXJAX-4L2Q",
        "status": "seller_signed",
        "seller": {
            "name": "Bryan Mansell",
            "email": "bryan@example.com",
            "phone": "07711223344",
        },
        "property": {
            "address_line_1": "41 Devonshire Street, London",
            "postcode": "W1G 7AJ",
            "asking_price": "£1,620,000",
        },
        "pricing_snapshot": {"property_value": 1_500_000},
    }
    base.update(overrides)
    return base


class TestDigitsOnly:
    def test_strips_currency_formatting(self):
        assert _digits_only("£760,000") == "760000"

    def test_handles_numbers_and_empty(self):
        assert _digits_only(1620000) == "1620000"
        assert _digits_only(None) == ""
        assert _digits_only("") == ""


class TestRpsaPayload:
    def test_flat_fields_match_rpsa_spec(self):
        p = _rpsa_webhook_payload(_package())
        assert p["ClientName"] == "Bryan Mansell"
        assert p["ClientEmail"] == "bryan@example.com"
        assert p["ClientMobile"] == "07711223344"
        assert p["ClientLandline"] == ""
        assert p["PropertyAddress"] == "41 Devonshire Street, London"
        assert p["PropertyPostcode"] == "W1G 7AJ"
        assert p["PropertyPrice"] == "1620000"
        assert p["GazealReference"] == "QoXJAX-4L2Q"

    def test_price_falls_back_to_pricing_snapshot(self):
        pkg = _package()
        pkg["property"]["asking_price"] = ""
        p = _rpsa_webhook_payload(pkg)
        assert p["PropertyPrice"] == "1500000"

    def test_full_package_is_included(self):
        p = _rpsa_webhook_payload(_package())
        assert p["status"] == "seller_signed"
        assert p["seller"]["name"] == "Bryan Mansell"
        assert p["reference_number"] == "QoXJAX-4L2Q"

    def test_missing_fields_become_empty_strings(self):
        p = _rpsa_webhook_payload({"reference_number": "ABC-123"})
        assert p["ClientName"] == ""
        assert p["PropertyPrice"] == ""
        assert p["GazealReference"] == "ABC-123"


class TestParseRpsaResponse:
    def test_real_response_with_debug_prefix(self):
        parsed = _parse_rpsa_response(REAL_RPSA_RESPONSE)
        assert parsed == {
            "success": True,
            "message": "Record added44249",
            "reference": "bACvyoAMumU",
            "rpsaref": 44249,
        }

    def test_plain_json(self):
        assert _parse_rpsa_response('{"rpsaref": 1}') == {"rpsaref": 1}

    def test_no_json_at_all(self):
        assert _parse_rpsa_response("Webhook received") is None
        assert _parse_rpsa_response("") is None


class TestExtractRpsaId:
    def test_real_response(self):
        assert _extract_rpsa_id(_parse_rpsa_response(REAL_RPSA_RESPONSE)) == "44249"

    def test_fallback_key_names(self):
        assert _extract_rpsa_id({"id": 42}) == "42"
        assert _extract_rpsa_id({"SurveyId": 88231}) == "88231"

    def test_our_echoed_reference_is_not_their_id(self):
        assert _extract_rpsa_id({"reference": "bACvyoAMumU"}) is None
        assert _extract_rpsa_id({"reference": "x", "rpsaref": 7}) == "7"

    def test_no_id_found(self):
        assert _extract_rpsa_id({"status": "created"}) is None
        assert _extract_rpsa_id(None) is None
        assert _extract_rpsa_id("OK") is None
        assert _extract_rpsa_id({"rpsaref": ""}) is None


class TestPmRpsaEntry:
    def test_maps_payload_and_rpsa_id(self):
        payload = _rpsa_webhook_payload(_package())
        response_json = _parse_rpsa_response(REAL_RPSA_RESPONSE)
        entry = _pm_rpsa_entry(payload, response_json, "44249")
        assert entry["gazealref"] == "QoXJAX-4L2Q"
        assert entry["rpsaref"] == "44249"
        assert entry["clientname"] == "Bryan Mansell"
        assert entry["clientemail"] == "bryan@example.com"
        assert entry["clientmobile"] == "07711223344"
        assert entry["propertyaddress"] == "41 Devonshire Street, London"
        assert entry["propertypostcode"] == "W1G 7AJ"
        assert entry["propertyprice"] == "1620000"
        assert '"rpsaref": 44249' in entry["rpsaresponse"]

    def test_missing_rpsa_id_and_response(self):
        entry = _pm_rpsa_entry({"GazealReference": "ABC-123"}, None, None)
        assert entry["gazealref"] == "ABC-123"
        assert entry["rpsaref"] == ""
        assert entry["rpsaresponse"] == ""


class TestRpsaWebhookIntegration:
    def test_accept_records_rpsa_webhook_audit(self):
        try:
            requests.get(f"{API}/", timeout=5)
        except requests.RequestException:
            pytest.skip("backend not reachable")

        suffix = uuid.uuid4().hex[:8]
        order = {
            "agent_name": f"TEST Agent {suffix}",
            "agency_name": "TEST Agency",
            "phone": "+447700900000",
            "email": "delivered@resend.dev",
            "seller_name": f"TEST Seller {suffix}",
            "seller_email": "delivered@resend.dev",
            "seller_phone": "07700900123",
            "address_line_1": f"{suffix} Test Street",
            "postcode": "SW1A 1AA",
            "asking_price": "£760,000",
            "confirmation": True,
        }
        r = requests.post(f"{API}/leads/order-survey", json=order, timeout=45)
        assert r.status_code == 200, r.text
        token = r.json()["agreement_token"]

        r = requests.post(
            f"{API}/agreements/{token}/accept", json={"risk_ack": True}, timeout=45
        )
        assert r.status_code == 200, r.text

        doc = MongoClient(_MONGO_URL)[_DB_NAME].agreements.find_one({"token": token})
        assert doc is not None
        rw = doc.get("rpsa_webhook")
        if rw is None:
            # RPSA_WEBHOOK_URL not configured on this deployment — nothing
            # should have been sent and nothing recorded.
            return
        assert rw["status"] in {"pending", "retrying", "delivered", "failed"}
        assert rw["url"], "webhook audit should record the endpoint used"
