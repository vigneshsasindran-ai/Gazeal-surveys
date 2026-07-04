# Gazeal Ecosystem — Long-Lived Handoff & Future Plans

> **Purpose of this document.** This is the persistent knowledge base for the
> Gazeal Surveys app (this repo) *and* its relationship to the sibling Gazeal
> mobile + admin app. Every future E1 fork should read this before proposing
> anything cross-system. It captures:
>
> 1. What the two apps are and how they relate
> 2. Committed future development plans (not-yet-built, ordered by priority)
> 3. Learnings about the user's working style and expectations
> 4. Rules for what to do (and NOT do) when the user asks about Gazeal
>
> **Owner:** Vignesh Sasindran. **Maintained by:** every E1 fork that touches
> this repo. If you learn something new, append it here — do not delete.
>
> _Last updated: 2026-02-04._

---

## 1. The two apps at a glance

### 1.1 This repo — **Gazeal Surveys** (`/app`)
- **Purpose:** Public marketing site + clickwrap seller-agreement + pricing
  calculator + backend to fan out survey leads to consumers (RPSA, etc.).
- **Stack:** React (CRA) + Tailwind + FastAPI + MongoDB (Motor).
- **Live at (preview):** `https://survey-pro-10.preview.emergentagent.com`
- **Prod domain (not yet mapped):** `survey.gazeal.co.uk` (planned).
- **Key backend surfaces:**
  - `POST /api/leads/order-survey` — agent submits an order
  - `POST /api/agreements/{token}/accept` — seller clickwrap accept
    (writes `sale_room_package` JSON + captures IP/UA)
  - `POST /api/agreements/{token}/express-interest`
  - `GET /api/agreements/{token}/package` (admin-token gated)
  - `GET /api/v1/leads` — Consumer API (Pattern-2 for external systems)
  - `/api/admin/consumers` — mint scoped API keys
- **Integrations wired:** Resend (email), Slack (incoming webhook), object
  storage (available via emergentintegrations).
- **Not wired yet:** any outbound push to Gazeal, RPSA, CRMs.

### 1.2 Sibling repo — **Gazeal Mobile + Admin**
- **Repo:** https://github.com/vigneshsasindran-ai/GAZEAL-APP-LAUNCH-VERSION
  (checked into `/tmp/gazeal-app` when we clone it).
- **Purpose:** Estate-agent-facing mobile app for lead + agreement
  management, with an admin dashboard for the Gazeal team.
- **Stack:**
  - Mobile: **Expo React Native** (managed workflow, published to App Store
    + Play Store; OTA via `eas update --branch production`)
  - Backend: **FastAPI + MongoDB** (same stack as this repo)
  - Admin: single-page HTML at `backend/admin/dashboard.html`
    (currently ~4,900 lines; a refactor is in P2)
- **Live at:**
  - API base: `https://role-sync-deploy.emergent.host`
  - Admin login: `https://role-sync-deploy.emergent.host/api/admin/dashboard.html`
- **Auth:** Mobile users = phone + Twilio Verify OTP. Admin =
  username/password → server-side session token in `admin_sessions`.
- **Admin credentials (as of last handoff):** user `gazeal` / pass
  `G@zeal!Adm1n#2026` (do NOT paste into public/testing artefacts).
- **Integrations wired:** Twilio Verify, Expo Push, Slack, Resend, S3
  (boto3), Emergent OTA.
- **Data model (top of mind):**
  - `users` — id, phone, email, name, company_id, push_token, badges
  - `companies` — id, name, invite_code (SCC — Secure Company Code)
  - `leads` — agent_id, lead_type (buyer/seller), name, email, phone,
    property_address, agreement_type (reservation/deposit/chain),
    agency_name, account_manager, notes, status, created_at
  - `agreements` — full reservation/deposit deal shape (agent + seller +
    buyer + property + terms: guarantee_amount, exchange_days, who_pays_fee)
  - `survey_waitlist` — captured from the mobile "coming soon" card
  - `notifications`, `advance_requests`, `design_requests`, `push_errors`,
    `admin_sessions`, `issues`.
- **Existing lead status flow:** `pending → contacted → waiting_info →
  in_progress → completed` (admin can PATCH; a push notification goes to
  the owning agent).
- **Existing agreement status flow:** `pending → contacted_seller →
  contacted_buyer → waiting_for_information → agreement_issued →
  agreement_in_force`.
- **⚠️ Important disambiguation:** the word "lead" in this Surveys repo
  ≠ a "lead" in the Gazeal repo. They are separate collections with
  different shapes. NEVER attempt to write to Gazeal's Mongo directly.
  Cross-app data flow MUST be via authenticated HTTP contracts.

---

## 2. Future development plans (backlog, not yet built)

### 2.1 Sale-room package hardening (paused; user said "do not do this now")
When we resume, plan is:

- Add an `evidence` block to the `sale_room_package` written on
  `POST /api/agreements/{token}/accept`:
  ```
  evidence: {
    agreement_version: "v1.0-2026-02",
    clickwrap_hash: "sha256:<hash of exact clauses shown>",
    accepted_at, accepted_ip, user_agent,
    signed_pdf: { url: "s3://...", sha256: "..." }
  }
  ```
- Generate the signed PDF server-side (weasyprint or reportlab), upload to
  S3/object-storage, store URL + SHA-256 in the package.
- Bump `schema_version` on the package to `1.1`.
- No user-facing change; the seller UI stays as it is.

**Status:** deferred by user 2026-02-04.

### 2.2 RPSA webhook fan-out (paused; user said "do not do this now")
When we resume:
- New env vars: `RPSA_WEBHOOK_URL`, `RPSA_WEBHOOK_SECRET`.
- Inside `POST /api/agreements/{token}/accept`, after the package is
  written, POST it to `RPSA_WEBHOOK_URL` with header
  `X-Gazeal-Signature: sha256=<HMAC(secret, body)>`.
- Reuse the existing retry/log machinery in `/app/backend/webhooks.py`.
- Slack ping on success/failure.

**Status:** deferred by user 2026-02-04.

### 2.3 Generic event-bus / CRM-ready fan-out (future architecture)
Design goal: separate **what happened** from **who consumes it**, so
adding HubSpot/Pipedrive/Salesforce later is a config row, not a code
change.

- **Event types (internal):** `lead.created`, `agreement.accepted`,
  `agreement.declined`, `sale.completed`, `sale.fell_through`.
- **`consumers` collection** (already partially scaffolded in
  `/app/backend/consumers.py`): each row = `{ url, secret, event_filter[],
  payload_schema, active }`.
- **`webhook_deliveries` collection:** delivery attempts, statuses,
  exponential backoff (5s → 30s → 5m → 30m → 6h → 24h → dead-letter).
- **Payload transformers:** per-consumer functions that shape the event
  into the consumer's expected schema (e.g. HubSpot contact + deal).
- **Order of build:** ship the RPSA webhook first (single consumer, simple),
  then extract the fan-out logic into this bus, then add the first CRM
  transformer.

### 2.4 Push Survey leads → Gazeal admin (Pattern-2 integration)
User's chosen approach (from 2026-02-04 conversation, **paused before
build**): **Option A — HMAC-signed webhook push.**

- **Survey side:** add Gazeal as a `consumers` row with the Gazeal inbox
  URL + shared secret. On every accepted agreement, POST to Gazeal.
- **Gazeal side (paste-patch to be delivered):**
  - New endpoint: `POST /api/admin/inbox/survey-lead` (HMAC verify).
  - New collection: `survey_leads` (kept SEPARATE from Gazeal's own
    `leads` to avoid schema drift).
  - New sidebar tab in `backend/admin/dashboard.html`: "Survey Leads",
    same table pattern as the existing Leads tab, with status flow
    `new → reviewing → surveyor_assigned → survey_scheduled → completed`.
  - Slack ping + optional Expo push to the assigned account manager.
- **Identity match:** on inbound, look up the agent by email/phone in
  Gazeal's `users` collection. If found, attach the survey lead to
  their user record so it appears on their mobile app too.

**Effort estimate:** ~4 hours total (Survey side + Gazeal patch).
**Status:** deferred. When user asks to start, follow the plan above.

### 2.5 Sales-room UX in Gazeal — chosen shape: **Hybrid (Path C)**
User has NOT yet locked this in, but my recommendation for when they
revisit:

- **Data lives in Gazeal.** Survey pushes each accepted `sale_room_package`
  into a new Gazeal `sales_rooms` collection via 2.4's webhook.
- **UI initially lives in Survey.** Add
  `/sales-room/{ref}?viewer_token=...` — read-only page rendering the
  property + pricing + evidence + PDF link. Gazeal mobile opens it in an
  in-app WebView (theming makes it feel native). Gazeal admin opens it in
  a new tab.
- **Migrate UI to native Gazeal when justified** — swap WebView for a
  native React Native screen. Data already lives in Gazeal, so no schema
  work is needed at that point.

**What's NOT possible:** we cannot share React web components with the
React Native app. Two runtimes; either WebView-embed or re-implement.

### 2.6 Other backlog (already in `/app/memory/PRD.md`)
- Domain mapping: `survey.gazeal.co.uk` → this preview.
- Optional Rightmove/Zoopla listing auto-scrape.
- Admin dashboard code review + refactor for both apps (Gazeal's 4.9k-line
  HTML is a P2 in their PRD).

---

## 3. Learnings about the user — how Vignesh works

Distilled from ~30 conversation turns. Update this section as you learn
more.

### 3.1 Communication style
- **Direct and decisive.** Says "yes / no / do not do this" clearly. Rarely
  ambiguous. When he says "not now" he means it — don't try to sneak the
  work in.
- **Product-minded, not pedantic about implementation.** Cares about
  outcomes (fewer renegotiations, indemnity clarity, "does it work for
  agents") more than tech choices. Trusts sensible tech defaults.
- **Writes copy directly in chat.** When he pastes new copy, use it
  verbatim — do not paraphrase, do not clean it up. Punctuation and
  wording are deliberate. Preserve his voice (short sentences, plain
  English, no marketing fluff).
- **Batches many small requests in one message.** Numbered lists with
  1., 2., 3., etc. Answer them all in one pass, in order, and use his
  numbering in the response so he can tick items off.
- **Asks strategic questions mid-build.** e.g. "what are your thoughts
  on…", "is this possible…". When he asks this, he wants **thinking
  first, code second.** Never jump to implementation on a strategic
  question — give options, trade-offs, then wait for a yes.

### 3.2 Design preferences (locked in)
- **Dark theme.** Gazeal Elite / Gazeal Surveys palette:
  primary gradient `#4FB6FF → #025eba` (blue), on true black.
- **Fonts:** Archivo (bold headings, tight tracking) + Outfit (body).
- **Copy tone:** confident, plain-English, no em dashes in body copy,
  no exclamation marks.
- **Nothing should feel "AI slop":** no purple gradients on white, no
  generic Inter, no centered symmetrical everything.
- **Bento layouts, glassmorphic cards, subtle gradient accents.**
  Big headings, generous whitespace.
- **Interactive elements need `data-testid`s** (kebab-case, function-based).

### 3.3 Testing expectations
- Prefers the testing agent for anything > 2 features or any bug that has
  been reported once. He will not run manual QA himself unless asked.
- Doesn't want repeated screenshot loops — one smoke test, then testing
  agent, then finish.
- Will report bugs by pasting them plainly ("The X on Y page is not
  working"). Reproduce first, don't guess.

### 3.4 Deployment context
- Runs the Survey app on Emergent preview. Production deployment has
  previously failed — user has said "continue in preview" and will
  handle production themselves when ready.
- Gazeal app deploys via Emergent + EAS OTA. He does the mobile builds
  himself from his laptop; we don't touch EAS from here.
- **He owns all GitHub commits.** For push actions in this repo, direct
  him to the "Save to GitHub" button. For the Gazeal repo, deliver
  paste-ready patches; do NOT try to push from this workspace.

### 3.5 Language
- English only. Do not switch languages even if a doc snippet is in
  another language.

---

## 4. Rules for when the user mentions the Gazeal app

**Read this section before you respond to any Gazeal-adjacent question.**

### 4.1 If the user asks a question about how the two apps interact
1. **Do not start coding.** He wants thoughts first.
2. **Clone or re-read the Gazeal repo** from
   `https://github.com/vigneshsasindran-ai/GAZEAL-APP-LAUNCH-VERSION`
   into `/tmp/gazeal-app` (if not already there). Read `README.md`,
   `memory/PRD.md`, `memory/TECH_STACK.md`, and the relevant sections of
   `backend/server.py` and `backend/admin/dashboard.html`. Never guess
   about Gazeal shape — check the code.
3. **Respond with:**
   - What you understand about the current state
   - 2–4 options with honest trade-offs
   - A recommendation
   - A short "what's possible / what isn't" table when architecture is
     involved
4. **End with a targeted `ask_human`** — not open-ended, always with
   lettered options.

### 4.2 If the user asks you to implement something in Gazeal
- **You cannot commit to the Gazeal repo from this workspace.** This
  workspace is bound to the Survey app on Emergent.
- **The correct workflow is:**
  1. Clone Gazeal to `/tmp/gazeal-app`.
  2. Read the affected files there.
  3. Produce a paste-ready patch (diff or full-file rewrite) as a chat
     message.
  4. Instruct the user to apply the patch inside the Gazeal Emergent
     workspace (a separate environment), then deploy.
- Only touch Survey app code inside `/app` from this workspace.

### 4.3 What NOT to do
- ❌ Never write directly to Gazeal's MongoDB.
- ❌ Never suggest sharing a single Mongo between both apps.
- ❌ Never try to import Survey's React web components into Gazeal's
  React Native mobile — the runtimes are incompatible.
- ❌ Never push to the Gazeal GitHub repo from this workspace.
- ❌ Never store the Gazeal admin password in `test_credentials.md` on
  this repo — it belongs on the Gazeal side only.
- ❌ Never treat the two `leads` collections as equivalent; the shapes
  differ.

### 4.4 What ALWAYS to do
- ✅ Re-read this document at the start of any session that touches
  cross-app concerns.
- ✅ Prefer HMAC-signed HTTPS webhooks for cross-app data flow.
- ✅ Match agent identity across systems by **email + phone** (both apps
  store both).
- ✅ Keep new Survey-originated data on the Gazeal side in a NEW
  collection (`survey_leads`, `sales_rooms`, etc.) — never mix into
  Gazeal's existing `leads` or `agreements`.
- ✅ Update THIS document at the end of any session that changes
  cross-app plans, decisions, or user preferences.

---

## 5. Session-by-session decision log

Append every cross-app-relevant decision here with a date. Do not delete
past entries.

| Date | Decision |
|---|---|
| 2026-02-04 | User approved the audit-trail + evidence block plan **in principle** but paused actual build. |
| 2026-02-04 | User paused the RPSA webhook build. |
| 2026-02-04 | User confirmed the sales-room hybrid direction (Path C) is *acceptable* but is not commissioning it yet. |
| 2026-02-04 | User provided the Gazeal repo URL and asked for cross-app thinking. Asked to store all plans in this doc and pause cross-app work. |

---

## 6. Quick reference — files and endpoints

### Survey app (this repo, `/app`)
- `frontend/src/App.js` — routes (`/`, `/order-survey`, `/agreement/:token`, `/pricing`)
- `frontend/src/components/ui/surveys-*.jsx` — landing sections
- `frontend/src/components/ui/pricing-calculator.jsx` — shared calc
- `frontend/src/components/ui/reservation-explainer.jsx` — shared explainer
- `frontend/src/pages/agreement.jsx` — clickwrap page + pricing snapshot
- `backend/server.py` — thin, delegates to routes
- `backend/routes/leads.py` — order-survey POST + Resend + Slack
- `backend/routes/agreements.py` — accept/decline/express-interest, package
- `backend/routes/consumer_api.py` — `/api/v1/leads`
- `backend/routes/admin.py` — admin token endpoints
- `backend/webhooks.py` + `backend/consumers.py` — fan-out plumbing
- `backend/slack_notify.py` — Slack incoming webhook wrapper

### Gazeal app (sibling repo)
- `backend/server.py` — 2,479 lines, single-file API
- `backend/admin/dashboard.html` — 4,915 lines admin UI
- `memory/PRD.md`, `memory/TECH_STACK.md` — source of truth for their stack
- `AGENT_HANDOFF.md` — 967-line internal knowledge base
- Prod API: `https://role-sync-deploy.emergent.host`

### Env vars owned by Survey app (in `/app/backend/.env`)
- `MONGO_URL`, `DB_NAME`
- `RESEND_API_KEY`, `SENDER_EMAIL` (= `info@gazeal.co.uk`)
- `SLACK_WEBHOOK_URL`
- `ADMIN_TOKEN` (for `/api/admin/*` on this backend)
- **Future (not yet added):** `RPSA_WEBHOOK_URL`, `RPSA_WEBHOOK_SECRET`,
  `GAZEAL_INBOX_URL`, `GAZEAL_INBOX_SECRET`.

---

## 7. Meta — how to maintain this document

1. **Append, don't rewrite.** Especially the decision log (§5) and
   learnings (§3).
2. **Update section 2 (backlog) when the user changes priorities.** Move
   completed items into `/app/memory/PRD.md` under a dated changelog
   entry, and leave a one-line "shipped on YYYY-MM-DD, see PRD.md"
   marker here.
3. **When the Gazeal repo changes** (new endpoints, new models), update
   §1.2 with a fresh line-number/collection-name reference.
4. **Never delete a rule from §4** without an explicit user instruction
   captured in the decision log.
5. **Read this file FIRST** in any fork that gets a message mentioning
   Gazeal, RPSA, sales-room, CRM, admin dashboard, or webhooks.
