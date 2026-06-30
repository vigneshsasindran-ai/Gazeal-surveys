# Gazeal Surveys — PRD

## Problem Statement (original)
Dark-themed, highly polished landing page for Gazeal Surveys (agents
ordering RPSA surveys for their sellers). Mimic the Gazeal Elite brand:
black/cream/white dark aesthetic, Archivo headings, Outfit body, no
"AI-slop" gradients. Two primary CTAs:
- **Order Survey** → multi-step `/order-survey` page (agent invites seller).
- **Learn More** → modal capturing name+agency+email then handing to a
  HubSpot meeting embed.

Production requirements added during the build:
1. Resend-powered email notifications to Gazeal + branded seller invites.
2. Native, hosted **Seller Survey Agreement** clickwrap page (replaces
   PandaDoc) at `/agreement/:token` with persistent live state per Msg 358.
3. Consumer API + webhook fan-out for third-party integrators (RPSA).

## Brand
- Background: `#050505` (dark) with cream + pure-white surfaces.
- Primary: `#025eba`. Light accent: `#4FB6FF`. Gradient: `#4FB6FF → #025eba`.
- Headings: Archivo bold (and Didot italic accent).
- Body: Outfit / Manrope.

## Architecture
- Frontend: React 19 + CRA + Tailwind + shadcn/ui
- Backend: FastAPI + Mongo (Motor) + Resend
- Routes (frontend):
  - `/` → SurveysLanding
  - `/order-survey` → OrderSurveyPage
  - `/agreement/:token` → AgreementPage (clickwrap)
- Routes (backend, all under `/api`):
  - `POST /leads/order-survey` — order capture, mints agreement token,
    sends agent notification + branded seller invite, returns
    `{ id, agreement_token, agreement_url, email_id, seller_email_id, ... }`
  - `POST /leads/learn-more` — modal lead capture + Gazeal notification
  - `GET  /agreements/{token}` — public agreement context
  - `POST /agreements/{token}/accept` — captures IP/UA/timestamp, idempotent,
    emails Vignesh, fan-outs `agreement.signed` webhook
  - `POST /agreements/{token}/decline` — idempotent, emails Vignesh
  - `GET  /v1/leads` (+ admin mint key) — Consumer API for RPSA / CRMs
  - `POST /v1/admin/consumers` — mint API keys (admin-token guarded)

## Data model
- `leads`: form submissions (`learn_more` | `order_survey`).
- `agreements`: `{ token, lead_id, status: pending|accepted|declined,
  accepted_at, accepted_ip, accepted_ua, declined_at, seller_*, agent_*,
  address_line_1, postcode }`.
- `api_consumers`, `webhook_deliveries`: webhook fan-out + retry.

## Implemented
### 2026-06 — Landing & forms
- Dark-themed landing with Hero, Bento, Sale-Agreed, Benefits, FAQ, footer.
- `/order-survey` 4-step Advance-pattern page (agent → seller → property →
  confirmation, with success state).
- Learn-More modal handing off to HubSpot meeting embed.

### 2026-06 — Backend & emails
- `POST /api/leads/learn-more` and `POST /api/leads/order-survey` persist
  to Mongo and send branded Resend emails.
- `_render_seller_invite` produces an application-style email with the
  agreement link.

### 2026-06 — Consumer API
- `webhooks.py` + `consumers.py`: HMAC-signed fan-out with retries.
- `routes/admin.py`: admin-token-guarded consumer minting.
- `routes/consumer_api.py`: paginated `GET /api/v1/leads`.
- `/app/docs/API_GUIDE.md` + `.html`: integrator handbook.

### 2026-06 — Native Seller Agreement clickwrap (replaces PandaDoc)
- `/app/backend/routes/agreements.py`: token mint, GET, POST accept/decline,
  IP+UA capture, Resend notifications to Vignesh, webhook fan-out
  (`agreement.signed`).
- `/app/frontend/src/pages/agreement.jsx`: full clickwrap UI with the 15
  clauses, scroll-gated Agree, persistent accepted/declined banner, Archivo
  + Outfit typography, reused SurveysHeader + SurveysFooterReveal.
- Idempotent acceptance: re-accept returns 200 `{already_accepted}`, link
  remains live forever per Msg 358.
- Order-survey response now exposes `agreement_token` + `agreement_url`
  for downstream integrations.

## Tested
- Backend: 14/14 pytest (`/app/backend/tests/test_agreements.py`).
- Frontend: All Playwright flows pass (pending→scroll-unlock→accept persisted, decline persisted, invalid token 404 view, mobile responsive).
- Brand visuals verified via screenshot.

## Bug fixes (2026-06)
- **"Agreement not found"** on production email link: backend now derives the
  agreement URL from the order request's `Origin` header (falling back to
  `Referer` host, then `FRONTEND_BASE_URL` env). The resolved
  `agreement_url` is persisted on the agreement document so the email
  link always matches whichever domain the agent submitted from
  (preview / emergent.host / `survey.gazeal.co.uk`).
- **"Text rendering inside a modal behind the scroll screens"**: removed
  the nested `max-h-[520px] overflow-y-auto` clause box. Clauses now flow
  inline with the page scroll. Agree is unlocked by an
  `IntersectionObserver` sentinel after the last clause, with a sticky
  bottom action bar showing the scroll hint until the seller reaches the
  end of the terms.

## Backlog
### P1
- Admin Dashboard integration (Pattern 2): wire user's external admin app
  to `/api/v1/leads` Consumer API. Awaiting dashboard URL/tech stack.

### P2
- Map `survey.gazeal.co.uk` to this preview (platform-level domain config).
- Optional auto-scrape Rightmove/Zoopla listing for address + photos.

### Nice-to-have polish (from testing-agent code review)
- Decide whether to expose `seller.full_name` on the unauthenticated GET
  agreement endpoint (currently included).
- Strengthen scroll-unlock gate: require an explicit scroll event before
  unlocking Agree on very tall viewports (`scrollHeight - 28` threshold).
- Distinguish 409 state-conflict from network errors in the agreement page
  error toast.

## Test Credentials
Not applicable — landing+forms+clickwrap, no end-user auth. Admin token
for Consumer API minting lives in `/app/backend/.env` as `ADMIN_TOKEN`.
