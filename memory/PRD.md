# Gazeal Surveys — PRD

## Original Problem Statement
Dark-themed, highly polished landing page for Gazeal Surveys (agents order surveys). Mimics "Gazeal Elite" brand (Archivo/Outfit fonts, clean spacing). Functional forms (Order Survey stepper, Learn More modal), Resend emails, MongoDB, Consumer API / Webhook fan-out for third-party suppliers (RPSA), native hosted "Seller Survey Agreement" clickwrap page with audit trail, pricing calculator, and sale-room JSON package generation.

Parallel co-branded funnel for **Balgores** estate agents at `/balgores/*` with distinct styling (`#1A1434` dark purple, `#B8AB84` gold, flat colors only — NO mixed gradients) using physically duplicated components to protect the main Gazeal site.

## Environments
- PREVIEW: https://survey-pro-10.preview.emergentagent.com
- PRODUCTION: https://survey.gazeal.co.uk (user redeploys to push changes; agent has no prod access)

## Routes
- Gazeal: `/`, `/pricing`, `/order-survey`, `/agreement/:token`, `/intro` (unlisted video page), `/launch` (ad landing page)
- Balgores: `/balgores`, `/balgores/pricing`, `/balgores/order-survey`, `/balgores/agreement/:token`

## Key Rules
- Balgores = solid `#1A1434` + `#B8AB84` only. NO mixed purple/gold gradients (UI + emails).
- DO NOT merge Balgores/Gazeal components — duplicated intentionally. Fixes applied twice.
- **NEVER send test emails to gazeal@rpsa.org.uk.** If acceptance-flow testing is needed, temporarily set RPSA_EMAIL=vignesh.sasindran@gazeal.co.uk in backend/.env, test, restore, restart backend.
- Always share preview links in every response (user mandate).

## Email Notification Matrix
Sender: **survey@gazeal.co.uk**. Internal = TO vignesh.sasindran@gazeal.co.uk, CC erik.groen@gazeal.co.uk + survey@gazeal.co.uk (NOTIFY_EMAIL / NOTIFY_CC in backend/.env).
1. Learn More lead → internal (branded)
2. Intro/launch page signup → internal (`POST /api/leads/intro-email`)
3. Order survey → internal (branded, note: details go to RPSA only after seller accepts)
4. Seller invite → seller (branded, CTA "Get started")
5. (removed — replaced by CC on #6)
6. Seller accepted → listing agent, CC internal (branded, acceptance record)
7. Seller accepted confirmation → seller (branded)
8. Seller declined → internal
9. Reservation interest → internal
10. RPSA survey instruction → **gazeal@rpsa.org.uk**, CC survey@gazeal.co.uk + vignesh (branded, full case details)
11. Balgores seller-direct order (`flow=seller_direct`) → white-labelled Balgores email (B logo, flat #1A1434 header/footer, gold CTA) TO NOTIFY_EMAIL only (no CC), replaces #3+#4 for that flow. Emails #6/7/10 still fire on acceptance.

"Sale room" renamed "Seller survey agreement" user-facing. Sale room product = FUTURE PROJECT.

## Pricing (July 2026, all inc. VAT)
Matrix bands × beds: ≤£999,999: 776/1006/1374 · £1M–1.5M: 1006/1235/1604 · £1.5M–2M: 1235/1466/1834 · £2M–2.5M: 1718/2063/2408. Above £2.5M = bespoke quote. Listed Grade 2/2* add £200; Grade 1 = quote. Implemented in home table (`survey-pricing-table.jsx`) + both calculators (`pricing-calculator.jsx`, balgores duplicate).

## Agreement Page (both funnels)
- Full **Home Insight Survey Service Terms v3.2** (15 clauses), heading "Home Insight Survey Service Terms."
- Version line: **Version 1.0, dated 14th July 2026** (in intro panel + acceptance line)
- Personalised intro (seller/address/agent/agency auto-filled)
- Clause 14 privacy links: RPSA (rpsa.org.uk/gdpr-2018-privacy-notice) + Gazeal (gazeal.co.uk/privacy-policy)
- Survey guide PDF popup (served same-origin via `GET /api/assets/survey-guide.pdf`, file at /app/backend/assets/, currently 22MB "Home Insight Survey.pdf" — compression offered, not accepted yet); mobile opens native viewer in new tab

## Implemented (history highlights)
- **Jul 30 2026: Audit trail + timeline + Reconsider flow** — (1) Email audit persisted on agreement docs: `email_audit_order` (internal + seller invite ids) at order time, `email_audit_acceptance` (agent/seller/RPSA ids or errors) + `rpsa_instructed_at` at acceptance. (2) Seller-facing "Where things stand" timeline on both agreement pages (`agreement-timeline.jsx` / `-balgores.jsx`): ticks + dates, 4 steps agent flow / 3 steps seller_direct, declined state, included in print. (3) `POST /api/agreements/{token}/reopen`: declined seller can re-open the same link ("Review the terms again" button in declined banner), decline preserved in `status_history` + `previously_declined_at`; acceptance emails carry "(previously declined on X)" note; internal reopen notification to NOTIFY_EMAIL. Tested 100% (iteration_10, backend/tests/test_new_features.py). Fixes the 60 High Road Halton Lancaster case once deployed.
- **Jul 30 2026: Production export** — pulled all 41 prod leads via Consumer API (temp key, deleted after) → /app/frontend/public/exports/Gazeal_Surveys_Leads_2026-07-30.xlsx.
- **Jul 2026: Balgores seller-direct overhaul** — seller-perspective copy across hero/bento/benefits/FAQ, new `seller-advantage-balgores.jsx` accordion, rewritten `order-survey-balgores.jsx` (branch dropdown, sign-on-submit redirect), backend `flow` field on OrderSurveyLead + `_render_balgores_direct_order` white-label email, agreement page "ordered through Balgores Property Group (branch)" fallback when no agent. Tested 100% (iteration_9, incl. Gazeal regression). Backend tests: /app/backend/tests/test_balgores_seller_direct.py. Later: seller-advantage moved below bento + also added (with "pay nothing today" eyebrow, no CTA) to both agreement pages above the terms; Gazeal-branded `seller-advantage.jsx` created; fee wording standardised everywhere to "Nothing upfront. Settled at completion or within six months, whichever comes first"; Balgores got pricing table + guide card + Pricing nav; new guide PDF replaced in backend/assets; code-review fixes (accept() refactored into helper builders — identical output verified, email dispatch extracted in leads.py, test token to env, index keys fixed).
- Full Gazeal + Balgores funnels, Resend brand-aware emails, Slack notify (order/accept/interest only — NOT learn-more/intro signups), webhook fan-out, admin endpoints (ADMIN_TOKEN)
- `/intro`: Bryan Mansell quote hero + Vimeo facade player (poster + play, no player chrome), Home Insights box, stats band, email capture ("Get on the waitlist") + Learn More; mobile order: quote → video → content
- `/launch`: ad landing — huge centred heading "Upfront Seller Surveys are now live in every UK postcode.", proof cards (Every postcode / 1,000+ surveyors / £0 upfront), urgency box with email CTA "Claim your town" + Learn More, then full intro content below
- Home: Survey Pricing table + guide card below "How it works"; Pricing in header nav
- Favicon (blue G house icon) across all pages: favicon.ico + 32/192 PNGs + apple-touch-icon in index.html
- Fixed mobile horizontal overflow (bento gradient); PDF popup ~95vh tall
- Balgores: "Essex, meet how Scotland…", Balgores-only header logo, "HOME INSIGHTS POWERED BY GAZEAL" eyebrow

## Backlog / Upcoming
- **P0**: Evidence block + signed PDF in `sale_room_package` on acceptance (agreement_version now exists: v1.0 14 Jul 2026; clickwrap_hash, accepted_ip, user_agent; weasyprint/reportlab PDF + SHA256 + object storage). Pairs with emailing seller a durable copy of accepted docs (internal launch requirement).
- **P1**: Outbound webhook delivery of sale_room_package JSON (RPSA) on acceptance.
- **P2**: CRM event bus (lead.created, agreement.accepted → Hubspot/Pipedrive/Zapier).
- **P2**: Read-only sales-room WebView for Gazeal App (see GAZEAL_ECOSYSTEM_HANDOFF.md).
- Optional: compress 22MB guide PDF; Slack notify for learn-more/intro signups; OG meta tags for /intro & /launch; tag launch-page signups with source for ad attribution.

## 3rd Party
- Resend (RESEND_API_KEY, SENDER_EMAIL=survey@gazeal.co.uk, NOTIFY_EMAIL, NOTIFY_CC, RPSA_EMAIL=gazeal@rpsa.org.uk in backend/.env)
- Slack incoming webhook (SLACK_WEBHOOK_URL) — verified working from preview; if prod Slack silent, check prod env vars
Y_EMAIL, NOTIFY_CC, RPSA_EMAIL=gazeal@rpsa.org.uk in backend/.env)
- Slack incoming webhook (SLACK_WEBHOOK_URL) — verified working from preview; if prod Slack silent, check prod env vars
