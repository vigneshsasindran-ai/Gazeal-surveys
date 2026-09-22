"""Render the Harrisons agent 'seller has signed' email to a static HTML file.

Builds the template string only. Sends nothing: no Resend, no API, no network.
"""
import sys
from datetime import datetime, timezone

sys.path.insert(0, "/app/backend")
from routes import agreements as A  # noqa: E402

doc = {
    "token": "HHdemo1234",
    "brand": "harrisonshomes",
    "reference_number": "HHdemo1234",
    "seller_name": "Margaret Whitfield",
    "seller_email": "seller@example.com",
    "agent_name": "James Harrison",
    "agent_email": "agent@example.com",
    "agency_name": "Harrisons Homes",
    "branch": "",
    "address_line_1": "42 Kingsway Avenue",
    "postcode": "CM14 4LJ",
    "agreement_url": "https://survey.gazeal.co.uk/harrisonshomes/agreement/HHdemo1234",
    "terms_version": None,
    "terms_sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "pricing_snapshot": {"property_value": 475000, "bedrooms": "3", "listed_status": "No", "price": 999},
}
lead = {"asking_price": "£475,000", "bedrooms": "3", "listed_status": "No"}
now = datetime.now(timezone.utc).isoformat()

ctx = A._build_accept_ctx(doc, lead, doc["token"], now, "81.2.69.144", "Mozilla/5.0")
subject, to, cc, html = A._agent_signed_email(ctx)

out = "/app/frontend/public/email-previews/hh-3-agent-signed.html"
with open(out, "w") as f:
    f.write(html)
print("subject:", subject)
print("to:", to, "cc:", cc)
print("written:", out)
