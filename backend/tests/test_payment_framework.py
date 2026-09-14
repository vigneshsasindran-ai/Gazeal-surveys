"""Tests for the payment framework additions to seller agreements.

Covers: TERMS_VERSION 1.1, 15 clauses, PAYMENT_SECTION, terms hash,
_plus_six_months, PDF generation, /accept enforcement of risk_ack + payment_ack,
public_context surface, and /terms.pdf endpoint.

Preview note: RESEND_API_KEY is intentionally invalid -> email_error 'API key
is invalid' is expected and not a bug.
"""
from __future__ import annotations

import os
import sys
from datetime import datetime, timezone

import pytest
import requests
from dotenv import load_dotenv

load_dotenv("/app/backend/.env")
sys.path.insert(0, "/app/backend")

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://survey-pro-10.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

SELLER_EMAIL = "vignesh.sasindran@gazeal.co.uk"


# ---------- terms.py unit checks ----------
def test_terms_module_version_and_clauses():
    import sys
    sys.path.insert(0, "/app/backend")
    import terms as terms_mod
    assert terms_mod.TERMS_VERSION == "1.1"
    assert terms_mod.TERMS_DATE == "13 September 2026"
    assert terms_mod.TERMS_LABEL == "Version 1.1, dated 13 September 2026"
    assert len(terms_mod.CLAUSES) == 15
    numbers = [c["no"] for c in terms_mod.CLAUSES]
    assert numbers == [f"{i:02d}" for i in range(1, 16)]
    ps = terms_mod.PAYMENT_SECTION
    assert ps["title"] == "The fee and when you pay"
    assert len(ps["paragraphs"]) == 3
    joined = " ".join(ps["paragraphs"])
    assert "Nothing is payable today" in joined
    assert "six months" in joined
    assert "Reservation Agreement" in joined
    assert "VAT" in joined
    text = terms_mod.terms_plain_text()
    assert "Version 1.1, dated 13 September 2026" in text
    h = terms_mod.terms_sha256(text)
    assert len(h) == 64 and all(c in "0123456789abcdef" for c in h)


def test_plus_six_months_helper():
    import sys
    sys.path.insert(0, "/app/backend")
    from routes.agreements import _plus_six_months
    assert _plus_six_months("2026-09-13T10:00:00+00:00").startswith("2027-03-13")
    # Month clamp on 31st
    out = _plus_six_months("2026-08-31T10:00:00+00:00")
    assert out.startswith("2027-02-28") or out.startswith("2027-02-27")


def test_build_agreement_pdf_produces_pdf_bytes():
    import sys
    sys.path.insert(0, "/app/backend")
    import terms as terms_mod
    from pdf_terms import build_agreement_pdf
    pdf = build_agreement_pdf(
        brand_label="Gazeal Surveys",
        seller_name="Test Seller",
        seller_email=SELLER_EMAIL,
        address="1 Test Rd, TE1 1ST",
        agent_label="Agency",
        reference="TESTREF",
        accepted_label="13 Sep 2026, 10:00 UTC",
        ip="1.1.1.1",
        device="pytest",
        fee_due_label="13 March 2027",
        fee_summary=[("Property value", "£500,000")],
        terms_label=terms_mod.TERMS_LABEL,
        clauses=terms_mod.CLAUSES,
        payment_section=terms_mod.PAYMENT_SECTION,
        terms_sha256=terms_mod.terms_sha256(),
    )
    assert isinstance(pdf, (bytes, bytearray)) and pdf.startswith(b"%PDF")
    assert len(pdf) > 4000


# ---------- helpers ----------
def _create_pending(brand: str, flow: str = "seller_direct") -> str:
    payload = {
        "brand": brand,
        "flow": flow,
        "seller_name": f"TEST Seller {brand}",
        "seller_email": SELLER_EMAIL,
        "seller_phone": "+447000000000",
        "address_line_1": "1 Test Road",
        "postcode": "TE1 1ST",
        "asking_price": "£500,000",
        "bedrooms": "1to3",
        "listed_status": "N/A",
        "listing_url": "https://example.com/listing",
        "branch": "Crouch End" if brand == "davidastburys" else ("Brentwood" if brand == "balgores" else None),
    }
    if brand == "gazeal":
        payload.pop("branch", None)
    if brand == "exp":
        payload["agent_name"] = "Test eXp Agent"
        payload["agent_email"] = SELLER_EMAIL
        payload["agency_name"] = "eXp UK"
        payload.pop("branch", None)
    r = requests.post(f"{API}/leads/order-survey", json=payload, timeout=30)
    assert r.status_code == 200, f"create failed {brand}: {r.status_code} {r.text[:400]}"
    tok = r.json().get("agreement_token")
    assert tok, r.json()
    return tok


BRAND_MATRIX = [
    ("gazeal", "seller_direct"),
    ("balgores", "seller_direct"),
    ("exp", "seller_direct"),
    ("davidastburys", "seller_direct"),
]


@pytest.fixture(scope="module")
def pending_tokens():
    tokens = {}
    for brand, flow in BRAND_MATRIX:
        tokens[brand] = _create_pending(brand, flow)
    return tokens


# ---------- API tests ----------
class TestPublicContext:
    def test_pending_agreement_exposes_new_fields(self, pending_tokens):
        for brand, tok in pending_tokens.items():
            r = requests.get(f"{API}/agreements/{tok}", timeout=15)
            assert r.status_code == 200, f"{brand} get failed: {r.text[:200]}"
            data = r.json()
            # Fields should be present as keys (may be None for pending)
            for k in ("fee_due_at", "terms_version", "terms_sha256",
                      "payment_acknowledged", "terms_pdf_available"):
                assert k in data, f"{brand} missing key {k}"
            assert data["brand"] == brand
            assert data["status"] == "pending"
            assert data["payment_acknowledged"] is False
            assert data["terms_pdf_available"] is False


class TestAcceptEnforcement:
    def test_missing_payment_ack_returns_422(self, pending_tokens):
        tok = pending_tokens["gazeal"]
        r = requests.post(f"{API}/agreements/{tok}/accept",
                          json={"risk_ack": True}, timeout=15)
        assert r.status_code == 422
        msg = r.text.lower()
        assert "payable" in msg or "payment" in msg or "fee" in msg

    def test_missing_risk_ack_returns_422(self, pending_tokens):
        tok = pending_tokens["balgores"]
        r = requests.post(f"{API}/agreements/{tok}/accept",
                          json={"payment_ack": True}, timeout=15)
        assert r.status_code == 422

    def test_both_acks_accepts_and_seals_terms(self, pending_tokens):
        # Use exp token for accept
        tok = pending_tokens["exp"]
        before = datetime.now(timezone.utc)
        r = requests.post(f"{API}/agreements/{tok}/accept",
                          json={"risk_ack": True, "payment_ack": True}, timeout=30)
        assert r.status_code == 200, r.text[:400]
        data = r.json()
        assert data["status"] == "accepted"

        # Re-fetch and verify sealed fields
        g = requests.get(f"{API}/agreements/{tok}", timeout=15).json()
        assert g["status"] == "accepted"
        assert g["payment_acknowledged"] is True
        assert g["terms_version"] == "Version 1.1, dated 13 September 2026"
        assert g["terms_sha256"] and len(g["terms_sha256"]) == 64
        assert g["terms_pdf_available"] is True
        assert g["fee_due_at"]
        # exactly six calendar months later
        acc = datetime.fromisoformat(g["accepted_at"])
        due = datetime.fromisoformat(g["fee_due_at"])
        months_diff = (due.year - acc.year) * 12 + (due.month - acc.month)
        assert months_diff == 6, f"expected 6 months got {months_diff}"

    def test_terms_pdf_endpoint_accepted(self, pending_tokens):
        tok = pending_tokens["exp"]  # already accepted above
        r = requests.get(f"{API}/agreements/{tok}/terms.pdf", timeout=30)
        assert r.status_code == 200, r.text[:200]
        assert r.headers.get("content-type", "").startswith("application/pdf")
        assert r.content[:4] == b"%PDF"
        assert len(r.content) > 3000

    def test_terms_pdf_endpoint_pending_returns_409(self, pending_tokens):
        tok = pending_tokens["davidastburys"]  # still pending
        r = requests.get(f"{API}/agreements/{tok}/terms.pdf", timeout=15)
        assert r.status_code == 409

    def test_accept_all_brands_smoke(self, pending_tokens):
        # Accept remaining brands and verify fee_due_at present
        for brand in ("gazeal", "balgores", "davidastburys"):
            tok = pending_tokens[brand]
            r = requests.post(f"{API}/agreements/{tok}/accept",
                              json={"risk_ack": True, "payment_ack": True}, timeout=30)
            assert r.status_code == 200, f"{brand}: {r.text[:200]}"
            g = requests.get(f"{API}/agreements/{tok}", timeout=15).json()
            assert g["fee_due_at"]
            assert g["terms_sha256"]
            assert g["payment_acknowledged"] is True


class TestEmailRenderers:
    """Render emails locally (no send) and verify _payment_block + PDF attachment."""

    def test_payment_block_and_attachment(self):
        import sys, base64
        sys.path.insert(0, "/app/backend")
        from routes.agreements import (
            _payment_block, _terms_pdf_attachment, _build_accept_ctx,
            _seller_confirmed_email, _agent_signed_email,
        )
        doc = {
            "brand": "gazeal", "seller_name": "Alice",
            "seller_email": SELLER_EMAIL, "agent_name": "Bob",
            "agent_email": SELLER_EMAIL, "agency_name": "Ag",
            "address_line_1": "1 Test Rd", "postcode": "TE1 1ST",
            "reference_number": "REF1",
        }
        ctx = _build_accept_ctx(doc, {}, "TOKEN123",
                                "2026-09-13T10:00:00+00:00", "1.1.1.1", "pytest")
        block = _payment_block(ctx)
        assert "Nothing is payable today" in block
        assert ctx["fee_due_label"] in block
        assert "13 March 2027" == ctx["fee_due_label"]

        # PDF attachment
        ctx["terms_pdf"] = b"%PDF-1.4\n%test\n"
        atts = _terms_pdf_attachment(ctx)
        assert len(atts) == 1
        a = atts[0]
        assert a["filename"] == "Signed-Survey-Terms-TOKEN123.pdf"
        assert a["content_type"] == "application/pdf"
        assert base64.b64decode(a["content"]).startswith(b"%PDF")

        # Email bodies include the payment block
        _, _, _, seller_html = _seller_confirmed_email(ctx)
        assert "Nothing is payable today" in seller_html
        assert ctx["fee_due_label"] in seller_html
        _, _, _, agent_html = _agent_signed_email(ctx)
        assert "Nothing is payable today" in agent_html
        assert ctx["fee_due_label"] in agent_html
