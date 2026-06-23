# Gazeal Surveys API — Integrator Guide

> Last updated: June 2026 · Version 1

This guide is for integrators connecting to Gazeal Surveys: surveyor partners
(RPSA), CRMs (HubSpot, Salesforce), automation tools (Zapier, Make, n8n) and
internal dashboards.

Base URL (production): `https://survey-pro-10.emergent.host/api`

---

## 1. Concepts

### Consumer
An **API consumer** is anything that talks to our API. Each consumer has a
unique API key (a bearer token) and an optional webhook URL. Consumers are
provisioned and managed internally by Gazeal — you do not register yourself.

### Lead types
We capture two lead types today. They are returned from the API with a
`type` discriminator.

| `type`         | Trigger                                      |
| -------------- | -------------------------------------------- |
| `order_survey` | An agent fills the **Order Survey** form     |
| `learn_more`   | An agent fills the **Learn More** modal      |

### Scopes
Your API key is scoped. Common scopes:

| Scope                  | Effect                                                  |
| ---------------------- | ------------------------------------------------------- |
| `leads:order:read`     | Read `order_survey` leads via the pull API              |
| `leads:learn:read`     | Read `learn_more` leads via the pull API                |
| `leads:*:read`         | Read every lead type via the pull API                   |
| `webhook:order_survey` | Receive a webhook each time an `order_survey` is filed  |
| `webhook:learn_more`   | Receive a webhook each time a `learn_more` is filed     |
| `webhook:*`            | Receive every webhook event                             |

---

## 2. Authentication

Every authenticated request must carry:

```
Authorization: Bearer <YOUR_API_KEY>
```

Tokens start with `gzl_live_`. If a request omits the header or carries an
invalid / revoked token you'll get `401 Unauthorized`. If the token is valid
but missing the required scope you'll get `403 Forbidden`.

```bash
curl https://survey-pro-10.emergent.host/api/v1/health \
  -H "Authorization: Bearer gzl_live_XXXXXXXXX"
```

---

## 3. Two ways to consume data

You can use one or both. Most integrators do **both**: receive webhooks for
real-time delivery, fall back to the pull API for replay / audit.

### 3.1 Webhook push (real-time)

We POST to a URL you supply, the moment a lead is captured.

Headers we send:

| Header                | Purpose                                               |
| --------------------- | ----------------------------------------------------- |
| `Content-Type`        | Always `application/json`                             |
| `X-Gazeal-Event`      | Event name, e.g. `order_survey.created`               |
| `X-Gazeal-Event-Id`   | Unique event ID, prefixed `evt_`                      |
| `X-Gazeal-Timestamp`  | Unix epoch seconds when we signed the request         |
| `X-Gazeal-Signature`  | HMAC-SHA256 signature you must verify (see §3.1.1)    |
| `Idempotency-Key`     | Same as `X-Gazeal-Event-Id`. Safe to dedupe by this.  |
| `User-Agent`          | `Gazeal-Surveys-Webhook/1.0`                          |

Sample body:

```json
{
  "event": "order_survey.created",
  "event_id": "evt_9b3d50f1-…",
  "created_at": "2026-06-19T00:58:23.451Z",
  "data": {
    "id": "9b3d50f1-…",
    "type": "order_survey",
    "submitted_at": "2026-06-19T00:58:23.451Z",
    "agent": {
      "name": "Jane Doe",
      "agency": "Knight & Co",
      "branch": "Bristol Clifton",
      "email": "jane@knight.co.uk",
      "phone": "0117 000 0000"
    },
    "seller": {
      "name": "Sam Patel",
      "email": "sam@example.com",
      "phone": null
    },
    "property": {
      "address_line_1": "12 Park Lane",
      "postcode": "BS8 1AA",
      "listing_url": "https://www.rightmove.co.uk/properties/12345",
      "asking_price": "£450,000"
    },
    "confirmation": true
  }
}
```

#### 3.1.1 Verifying the signature

Always verify `X-Gazeal-Signature` before trusting the body. The signature
is computed as:

```
sha256=<HMAC_SHA256(secret, "<timestamp>.<raw_body>")>
```

Where:
- `secret` is your `whsec_…` webhook signing secret (provided alongside your
  API key)
- `<timestamp>` is the value of `X-Gazeal-Timestamp`
- `<raw_body>` is the **raw** request body — do not parse and re-stringify

Python example:

```python
import hmac, hashlib

def verify(secret, timestamp, raw_body, signature_header):
    expected = "sha256=" + hmac.new(
        secret.encode(),
        f"{timestamp}.".encode() + raw_body,
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(expected, signature_header)
```

Node.js example:

```js
const crypto = require("crypto");
function verify(secret, timestamp, rawBody, signatureHeader) {
  const expected = "sha256=" + crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex");
  return crypto.timingSafeEqual(
    Buffer.from(expected), Buffer.from(signatureHeader)
  );
}
```

If the signature is wrong, respond with HTTP `400`. If a request is older
than 5 minutes (replay attack), respond with HTTP `400`.

#### 3.1.2 Retry policy

If your endpoint returns a non-2xx response, we retry up to **3 times**:

| Attempt | Time after capture |
| ------- | ------------------ |
| 1       | immediate          |
| 2       | + 60 seconds       |
| 3       | + 5 minutes        |

After 3 failures we mark the delivery as `failed` and alert the Gazeal team
by email. You can request a manual replay (see §4.1) — there is no auto
replay beyond the 3rd attempt.

To indicate success, return any 2xx status code with no body required.
We treat the request as delivered the moment the connection closes.

#### 3.1.3 Idempotency

Network blips can cause us to deliver the same event twice. Always dedupe
on `event_id` (or the `Idempotency-Key` header — same value).

### 3.2 Pull API

When polling is acceptable, or as a replay channel after a webhook failure:

```bash
# List the most recent order_survey leads
curl "https://survey-pro-10.emergent.host/api/v1/leads?type=order_survey&limit=20" \
  -H "Authorization: Bearer gzl_live_XXXXXXXXX"
```

Response:

```json
{
  "data":  [ /* array of leads, newest first */ ],
  "count": 20,
  "next_cursor": "2026-06-15T09:12:08.001Z"
}
```

To paginate, pass the previous `next_cursor` back as `cursor=`:

```bash
curl "https://.../api/v1/leads?type=order_survey&limit=20&cursor=2026-06-15T09:12:08.001Z"
```

When `next_cursor` is `null`, you have the full history.

#### Filters

| Param   | Example                          | Notes                                    |
| ------- | -------------------------------- | ---------------------------------------- |
| `type`  | `order_survey`                   | Optional — defaults to all allowed types |
| `since` | `2026-06-15T00:00:00Z`           | Only leads created on/after this time    |
| `limit` | `50`                             | Default 50, max 200                      |
| `cursor`| `2026-06-15T09:12:08.001Z`       | From the previous page                   |

#### Fetch one

```bash
curl "https://.../api/v1/leads/9b3d50f1-…" \
  -H "Authorization: Bearer gzl_live_XXXXXXXXX"
```

---

## 4. Webhook ops — for Gazeal admins

These endpoints live under `/api/v1/admin/...` and require the
`ADMIN_TOKEN` env var (held by Gazeal only).

### 4.1 Replay a delivery

```bash
curl -X POST "https://.../api/v1/admin/deliveries/<delivery_id>/replay" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### 4.2 Mint a new consumer

```bash
curl -X POST "https://.../api/v1/admin/consumers" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "RPSA",
    "scopes": ["leads:order:read", "webhook:order_survey"],
    "webhook_url": "https://rpsa.example.com/gazeal/webhook"
  }'
```

Response (only time the `api_key` / `webhook_secret` are returned):

```json
{
  "id": "…",
  "name": "RPSA",
  "scopes": ["leads:order:read", "webhook:order_survey"],
  "webhook_url": "https://rpsa.example.com/gazeal/webhook",
  "active": true,
  "created_at": "2026-06-19T…",
  "api_key": "gzl_live_…",
  "webhook_secret": "whsec_…"
}
```

### 4.3 Rotate a consumer's key

```bash
curl -X POST "https://.../api/v1/admin/consumers/<id>/rotate" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

Returns a **new** `api_key` + `webhook_secret`. The old ones stop working
immediately.

### 4.4 Deactivate / delete

```bash
# Soft: keep the row, deny new requests
curl -X PATCH "https://.../api/v1/admin/consumers/<id>" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"active": false}'

# Hard: remove the row entirely
curl -X DELETE "https://.../api/v1/admin/consumers/<id>" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### 4.5 List deliveries

```bash
curl "https://.../api/v1/admin/deliveries?status=failed&limit=50" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

---

## 5. Connecting common platforms

### 5.1 RPSA (or any surveyor partner)

1. Gazeal mints a consumer with `name=RPSA`, scopes
   `["leads:order:read", "webhook:order_survey"]`, and the supplier's
   webhook URL.
2. Gazeal hands the `api_key` and `webhook_secret` over via a secure channel.
3. Supplier endpoint:
   - Verifies the HMAC signature on every request
   - Returns HTTP 200 on accept, parses the `data.*` block, creates a
     "Survey to book" record on their side
   - Optionally polls `GET /api/v1/leads?type=order_survey&since=...` once a
     day for a sanity check

### 5.2 HubSpot CRM

**Option A — HubSpot Workflows (no code):**

1. In HubSpot, create a Workflow triggered on a schedule (every 5 minutes).
2. Add a "Custom Coded Action" or use HubSpot's API connector to call:
   ```
   GET https://.../api/v1/leads?type=order_survey&since={{previous_run_at}}
   Authorization: Bearer gzl_live_…
   ```
3. For each lead in the response, create or update a HubSpot Contact (use
   `data.agent.email` as the identifier) and a Deal in your "Survey
   Orders" pipeline.

**Option B — Webhook to HubSpot:**

Subscribe via the consumer's `webhook_url`. Map our payload to HubSpot's
Contact + Deal in your receiver. The Contact's email is `data.agent.email`,
the Deal name is `data.seller.name` + `data.property.address_line_1`.

### 5.3 Salesforce

Use Salesforce's "Apex REST" or "Platform Events":

- Subscribe a public-facing Apex REST endpoint as the `webhook_url`
- Verify the HMAC signature
- Insert a Lead or Opportunity record from the payload

### 5.4 Zapier / Make / n8n

The fastest way to fan out to many destinations:

1. In Zapier, create a Zap with **Webhooks by Zapier → Catch Hook**. Copy
   the URL Zapier gives you.
2. Provide that URL to Gazeal as your `webhook_url`.
3. Add as many downstream steps as you need (Airtable row, Slack message,
   Google Sheet, etc.) — Zapier handles the fan-out and the formatting.

Zapier doesn't natively verify HMAC. For sensitive payloads, route to a
small Cloudflare Worker / AWS Lambda first to verify the signature, then
forward to Zapier.

### 5.5 Internal dashboard

If you're building an internal dashboard, mint a consumer with
`["leads:*:read"]` and no `webhook_url`. Poll the pull API on demand.

---

## 6. Errors

| Status | Meaning                                                  |
| ------ | -------------------------------------------------------- |
| `400`  | Malformed body / bad query params                        |
| `401`  | Missing or invalid `Authorization` header                |
| `403`  | Token is valid but lacks the required scope              |
| `404`  | Resource not found                                       |
| `429`  | Too many requests (none today, but reserve handling)     |
| `5xx`  | Our server problem — retry with exponential backoff      |

Every error response is a JSON object: `{"detail": "<reason>"}`.

---

## 7. Versioning & deprecations

The API is versioned via the URL path (`/api/v1/...`). Breaking changes
will ship under a new path (`/api/v2/...`). Within a version we may add
new optional fields to responses — clients must tolerate unknown fields.

Deprecation notice: we will announce any v1 deprecation at least 6 months
before sunset, by email to the contact on file for each consumer.

---

## 8. Contact

- Operational issues, webhook failures, key rotations:
  **vignesh.sasindran@gazeal.co.uk**
- API guide live URL: `GET /api/v1/guide`
- OpenAPI / Swagger UI: `https://survey-pro-10.emergent.host/docs`
