# Gazeal Surveys — PRD

> **⚠️ CROSS-APP INTEGRATION WORK:** If this session mentions the Gazeal
> mobile/admin app, RPSA, sales-room fan-out, CRM push, or webhook
> consumers, read **`/app/memory/GAZEAL_ECOSYSTEM_HANDOFF.md`** FIRST.
> That document holds the sibling-app architecture, future plans, user
> learnings, and rules for cross-app work.

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
- **"Footer overlaps the clauses on scroll"**: removed the landing-page
  `SurveysFooterReveal` (a 600px fixed scroll-reveal overlay) from the
  agreement page; replaced it with a compact static `AgreementFooter`
  (logo + Main Site / Elite / email links + copyright) so the clauses
  remain visible at every scroll position.

### 2026-02-03 — Nav bug fix + copy updates + price rounding
- Header nav bug fixed: `surveys-header.jsx` now uses
  `useLocation`/`useNavigate`. Anchor links from `/pricing` and
  `/agreement/:token` navigate to `/#<section-id>`; landing page has a
  `useEffect` on `location.hash` to scroll after mount. Header CTAs
  fall back to routing: Order Survey → `/order-survey`, Learn More →
  `/?learn=1` which the landing page consumes to auto-open the modal.
- surveys-bento Card 1: title `No upfront cost*` + footnote
  `*Under the terms of a Reservation Agreement`.
- surveys-bento Card 2: paragraph rewritten (Gazeal Survey wording).
- surveys-bento: new horizontal indemnification row added below the
  three cards with heading `Indemnifies both seller and buyer.` and
  matching paragraph.
- reservation-explainer: WITH_FEE_NOTE copy updated (removed
  `unreasonably` qualifier on buyer pull-out; changed `when` → `if`).
- pricing-calculator: `Listed status` → `Registered Listed Building`;
  `Not listed` option → `Not applicable`; added disclaimers block
  (`This price is based on the information you have provided.` +
  `The Estate Agent sets the valuation price, not the surveyor.`);
  all prices now rounded to whole GBP (`£647` instead of `£646.88`).
  Same rounding applied to `pricing_snapshot` display on
  `/agreement/:token`.

### 2026-02-04 — Second copy/design pass
- Card 1 asterisk restyled to subtle (small superscript, white/45)
  rather than large blue.
- Indemnifies row heading changed to
  `Professional Indemnity protects both seller and buyer.` and
  paragraph opener changed to
  `The surveyor's indemnity covers both the buyer and the seller.`.
- Survey-it-reserve-it body copy rewritten:
  `A survey gives both parties confidence in the property, and the
  Gazeal Reservation Agreement gives both parties confidence in each
  other. Put the two together and the sale becomes far more certain.`
- Reservation explainer: bullet points 1-3 rewritten on both boxes
  (both parties committed, gazundering/gazumping wording, either party
  compensation). Titles bumped to `text-[26px] sm:text-[30px]
  lg:text-[34px]` to match the indemnifies row weight.
- Benefits headline updated to `See the condition before you make an offer.`
- FAQ trimmed by four Qs (falls-through-unreasonably,
  seller-actually-does, indemnifies-plain-terms, cost-hesitant-seller);
  FAQ 1 answer stripped of `unreasonably`; FAQ "What type of survey"
  now includes `similar to a Level 2 or Level 3 survey`.
- Pricing calculator listed-building option label `Not applicable` → `N/A`.
- Bento icon float animation switched to `translate3d` with
  `backface-visibility: hidden` and `transform-style: preserve-3d` for
  GPU compositing (fixes the jittery drift on the sale-agreed
  transparency image).

- Testing agent iteration_9 — 17/17 checks PASS.


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
