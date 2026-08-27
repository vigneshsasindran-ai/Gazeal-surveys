"""eXp internal order-notification email template checks (brand=exp)."""
import sys

import pytest
from dotenv import load_dotenv

sys.path.insert(0, "/app/backend")
load_dotenv("/app/backend/.env")

from routes.leads import (  # noqa: E402
    BRAND_TOKENS,
    OrderSurveyLead,
    _render_exp_direct_order,
    _tokens,
)

SAFE_EMAIL = "vignesh.sasindran@gazeal.co.uk"


@pytest.fixture(scope="module")
def html():
    lead = OrderSurveyLead(
        seller_name="TEST_QA Seller",
        seller_email=SAFE_EMAIL,
        seller_phone="07700900123",
        address_line_1="TEST_9 eXp Avenue",
        postcode="SW1A 1AA",
        asking_price="725000",
        bedrooms="1 to 3",
        listed_status="N/A",
        agent_name="TEST_QA eXp Agent",
        email=SAFE_EMAIL,
        phone="07700900456",
        confirmation=True,
        brand="exp",
        flow="seller_direct",
    )
    return _render_exp_direct_order(lead, "https://example.test/exp/agreement/tok123")


def test_brand_tokens_exp():
    t = _tokens("exp")
    assert t["primary_dark"] == "#0C0F25"
    assert t["primary"] == "#B9BFD6"
    assert t["route_prefix"] == "/exp"
    assert t["partner_logo"]
    assert BRAND_TOKENS["exp"]["hero_bg_image"] == "none"


def test_exp_email_is_exp_branded(html):
    assert "eXp UK" in html
    assert "#0C0F25" in html
    assert "TEST_QA eXp Agent" in html
    assert "TEST_9 eXp Avenue" in html
    assert "https://example.test/exp/agreement/tok123" in html
    # no cross-brand leakage
    assert "Balgores" not in html
    assert "#B8AB84" not in html  # balgores gold
    assert "#025eba" not in html  # gazeal blue
    # no branch concept in the exp funnel email
    assert "Branch" not in html


def test_exp_email_no_placeholder_leftovers(html):
    assert "{" not in html.split("<body")[-1] or "}" not in html.split("<body")[-1]
    assert "None" not in html
