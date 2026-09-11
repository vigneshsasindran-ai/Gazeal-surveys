"""David Astburys seller-direct funnel tests (POST /api/leads/order-survey, GET /api/agreements/{token})."""
import os
import sys
import pytest
import requests

BASE = os.environ.get("REACT_APP_BACKEND_URL", "https://survey-pro-10.preview.emergentagent.com").rstrip("/")
SAFE_EMAIL = "vignesh.sasindran@gazeal.co.uk"

sys.path.insert(0, "/app/backend")


def da_payload(**over):
    body = {
        "seller_name": "TEST_DA Seller QA",
        "seller_email": SAFE_EMAIL,
        "seller_phone": "07700900123",
        "address_line_1": "TEST_12 DA Test Road",
        "postcode": "N8 8AA",
        "asking_price": "725000",
        "bedrooms": "3",
        "listed_status": "not_listed",
        "listing_url": "",
        "branch": "Crouch End",
        "agency_name": "David Astburys",
        "agent_name": "",
        "email": None,
        "phone": "",
        "confirmation": True,
        "brand": "davidastburys",
        "flow": "seller_direct",
    }
    body.update(over)
    return body


@pytest.fixture(scope="module")
def created_token():
    r = requests.post(f"{BASE}/api/leads/order-survey", json=da_payload())
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["status"] == "ok"
    tok = d["agreement_token"]
    assert isinstance(tok, str)
    assert d.get("email_error") in (None, "")
    assert d.get("agreement_url", "").endswith(f"/davidastburys/agreement/{tok}")
    return tok


def test_da_create_order_ok(created_token):
    assert created_token


def test_da_agreement_returns_brand(created_token):
    g = requests.get(f"{BASE}/api/agreements/{created_token}")
    assert g.status_code == 200, g.text
    body = g.json()
    assert body["brand"] == "davidastburys"


def test_da_invalid_brand_rejected():
    r = requests.post(f"{BASE}/api/leads/order-survey", json=da_payload(brand="davidastburys_uk"))
    assert r.status_code == 422


def test_da_missing_seller_email_rejected():
    p = da_payload()
    p.pop("seller_email")
    r = requests.post(f"{BASE}/api/leads/order-survey", json=p)
    assert r.status_code in (400, 422)


def test_da_pending_preview_token_is_da():
    g = requests.get(f"{BASE}/api/agreements/6shviT64YAc")
    assert g.status_code == 200, g.text
    assert g.json()["brand"] == "davidastburys"


def test_da_internal_email_template_white_theme():
    # Load env before importing backend modules
    from dotenv import load_dotenv
    load_dotenv("/app/backend/.env")
    from routes.leads import _render_da_direct_order, OrderSurveyLead
    payload = da_payload(seller_name="TEST QA")
    payload["email"] = None
    lead = OrderSurveyLead(**payload)
    html = _render_da_direct_order(lead, "https://example.com/davidastburys/agreement/abc")
    assert "David Astburys" in html
    assert "#9B2743" in html
    low = html.lower()
    assert ("background:#ffffff" in low) or ("background: #ffffff" in low) or ("background-color:#ffffff" in low) or ("background:#fff" in low)


def test_da_agreement_response_no_em_dash(created_token):
    g = requests.get(f"{BASE}/api/agreements/{created_token}")
    # em dash search inside `agency`, `agent`, `property` context blocks
    txt = g.text
    # Report but do not fail hard on legal em-dashes; we only care about user copy
    # Terms clauses may legitimately contain em dash; skip if only in `terms`
    body = g.json()
    for key in ("agency_name", "agent_name", "seller_name", "property_address", "brand_label"):
        v = body.get(key)
        if isinstance(v, str):
            assert "\u2014" not in v, f"em dash found in {key}={v!r}"
