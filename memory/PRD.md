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
- **Jul 30 2026: Admin panel** — /admin (username gazeal, env ADMIN_PANEL_USERNAME/PASSWORD + JWT_SECRET; bcrypt check, 12h JWT bearer, 5-attempt/15-min lockout). Backend `routes/panel.py`: POST /api/panel/auth/login, GET /api/panel/leads (orders joined with agreements + stage timestamps, learn-more enquiries), DELETE /api/panel/leads/{id} (removes lead + agreement), GET /api/panel/export (styled xlsx). UI: stats cards, tabs, search, status filters, expandable rows with visual process timeline (ordered → emailed → accepted/declined/reconsidered → RPSA emailed), DOUBLE-confirm delete modal, Excel export, logout. noindex everywhere: meta tag on /admin, X-Robots-Tag on all /api/panel responses, robots.txt (new) disallows /admin + agreement paths. Self-tested all endpoints + UI flows. NOTE FOR DEPLOY: user must add ADMIN_PANEL_USERNAME, ADMIN_PANEL_PASSWORD, JWT_SECRET to production Secrets tab; requirements.txt refreshed (PyJWT/bcrypt/openpyxl).
- **Jul 30 2026: First-name fix** — `_first_name()` in leads.py (imported by agreements.py) skips honorifics ("Mr Vignesh Sasindran" → "Vignesh") for agreement page + all emails; computed at render time so no data migration.
- **Jul 30 2026: RPSA email change** — production secret RPSA_EMAIL now surveys@rpsa.org.uk (user set in Secrets tab); preview .env matched. No hardcoded rpsa addresses in code.
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

## Aug 2026: Seller risk acknowledgement (VERIFIED)
- Both agreement pages (Gazeal + Balgores) show a single checkbox after the Reservation Agreement interest box: "I understand that proceeding with my sale without a Gazeal Reservation Agreement allows my buyer to walk away or renegotiate at any point, without any protection for me."
- Accept button disabled until ticked; sticky bar hints "One last step: please tick the confirmation above to enable Agree."
- Backend enforces it too: POST /api/agreements/{token}/accept returns 422 without `risk_ack: true`; stores `risk_acknowledged: true` on the agreement doc for the audit trail.
- Tested: 15/15 backend pytest (tests/test_agreements.py incl. new test_accept_requires_risk_ack), safe e2e accept on both brands with redirected recipients (email_audit_acceptance recorded all 3 email IDs), recipients restored, demo tokens hEcjMBDNcro/j3je4PfutiA reset to pending.
- Also confirmed: Balgores orders (flow=seller_direct) appear in /admin panel alongside Gazeal orders (no brand filter in panel.py), with status, stages timeline, branch and agreement link.

## Aug 2026: Admin panel — fee countdown + reservation dropdown (VERIFIED)
- Signed orders show a colour-coded fee badge next to the Signed label: "Fee due in X mo Y days" (green), amber in the final month, red "Fee overdue" past 6 calendar months from accepted_at. Expanded detail shows "Fee due by <date>".
- Per-order "Reservation Agreement on this order" dropdown (Not set / Yes / No), saved instantly via PATCH /api/panel/leads/{id}/reservation → lead.reservation_status; small badge on the row (blue Yes / grey No). Informational only, does not affect the countdown.
- Excel export gained "Reservation" and "Fee Due By" columns.
- Tested: PATCH 200/422/401 via curl, persistence verified, export 200, UI screenshot verified badge + dropdown + optimistic badge update, countdown math checked for green/amber/overdue states.

## Aug 2026: Tech team RPSA/ProcessMaker webhook merged (VERIFIED)
- Merged external commit e3a0310 from user's GitHub repo (github.com/vigneshsasindran-ai/Gazeal-surveys) via fetched remote `teamrepo`. Clean merge, no conflicts.
- On seller signing: POSTs order to RPSA panel webhook (RPSA_WEBHOOK_URL env), extracts rpsaref from their quirky response, saves pairing to ProcessMaker (PM_RPSA_SAVE_URL env). Retries 3x each, full audit under agreement.rpsa_webhook, failure alert email to NOTIFY_EMAIL. Panel stages expose rpsa_webhook_status/delivered_at/rpsa_id.
- SAFE BY DEFAULT: both URLs unset in preview .env → nothing fires. Live values (from code comments): RPSA_WEBHOOK_URL=https://www.rpsapanel.co.uk/rpsagazealwebhook.php, PM_RPSA_SAVE_URL=https://reservation.gazeal.co.uk/api/1.0/workflow/extraRest/rpsa/saveRpsaEntry/ — user must add these two secrets in production Secrets tab before/at deploy.
- UPDATE: platform requires agent-added secrets, so both LIVE URLs are now SET in backend/.env (user will re-publish to push them to production). WARNING: preview accepts now hit the real RPSA panel + ProcessMaker — blank both vars before any accept testing (see test_credentials.md).
- Tested: 31/31 (16 new tests/test_rpsa_webhook.py + 15 test_agreements.py) with redirected emails; recipients restored after.

## Aug 2026: Agent name on admin order rows (VERIFIED)
- Each order row in /admin now shows the estate agency name (or "Balgores · Branch" for seller-direct) between the address and brand badge. testid: order-agent-label-{ref}. Screenshot verified.

## Aug 2026: Calculator "Enter property value" placeholder (VERIFIED)
- All pricing calculators (Gazeal + Balgores, /pricing, home, agreement pages) now start with an EMPTY value input showing grey placeholder "Enter property value" instead of a default number, making typing obvious. Summary card shows "Set your property value" until interaction.
- Calculator: initialValue default changed 600_000 → null; touched derived from initialValue presence; onTextBlur only reformats when touched. Agreement pages pass initialValue=undefined when no prefill (unset flow unchanged); prefilled agreements still show the value immediately.
- Screenshot verified: /pricing placeholder + typing 450000 → £776; Balgores agreement prefill 450,000 → £1,006.

## Aug 2026: Property value guardrail — no more silent £600k defaults (VERIFIED, iteration_11 100%)
- Root cause: agreement calculator always started at £600,000 default; untouched value was silently recorded on accept.
- Fix (user choices 1b, 2a+2b, 3):
  1. Agreement GET now merges lead data: property.asking_price/bedrooms/listed_status (public_context(agreement, lead) in agreements.py; works for all past agreements).
  2. Calculator prefills from parsed asking price (parseAskingPrice handles £/commas/k/m; min £10k, no auto-multiply) + bedrooms/listed from order. Note above calc: "We've pre-filled your property value from your order..." vs "Please set your property value below...".
  3. If no parseable price: PricingCalculator requireTouch prop → summary shows "Set your property value", onChange emits null until any interaction; Agree disabled until pricingSnapshot set; sticky hint explains.
  4. Confirm popup gained "Your property details" summary (value/bedrooms/listed/fee), "Edit details" link (closes modal, scrolls to calcRef), and required "I confirm these property details are correct" checkbox gating final accept. pricing_snapshot now stores details_confirmed: true.
  5. Order forms (both brands) capture optional Bedrooms + Registered Listed Building dropdowns (labels EXACTLY match calculator options "1 to 3"/"4 to 5"/"6+", "N/A"/"Grade 2 or 2*"/"Grade 1") → stored on lead → prefill agreement.
- Regression: public /pricing + home calculators unchanged (requireTouch defaults false). New backend test file: /app/backend/tests/test_agreement_unset_flow.py (6/6).
- Cleanup done: production recipients restored, demo tokens hEcjMBDNcro + j3je4PfutiA both pending. Balgores demo lead now has asking_price £450,000 + bedrooms 4 to 5 (intentional, demos the prefill flow).

## Aug 2026: Reservation interest in admin panel (VERIFIED)
- Panel /leads now returns reservation_interest + reservation_interest_at per order (from agreement docs, so all past interests included automatically).
- New "Reservation Interest (n)" tab in /admin: newest-first list with date, seller, address, contact, brand, agreement link. data-testids: admin-tab-interest, admin-interest-list, interest-row-{ref}.
- Insights gained "Reservation Agreement interest — n total" green bar chart (shares the Daily/Weekly/Monthly/Quarterly/Yearly toggle). testid: chart-reservation-interest.
- Verified live: 19 past interests listed + charted in preview.

## Aug 2026: Confirm modal additions (VERIFIED)
- Risk statement now ends with "Remember to ask your agent to secure your sale when a buyer is found." (both brands).
- Added optional checkbox in accept modal: "Send me more information about Gazeal Reservation Agreements." — when ticked, fires existing POST /api/agreements/{token}/express-interest before accept (idempotent; hidden if reservation_interest already set). data-testids: agreement-more-info-label / agreement-more-info-checkbox.
- Tested e2e on Gazeal (reservation_interest=True + accepted + risk_acknowledged=True in DB) with redirected emails; Balgores modal visually verified; recipients restored; demo tokens reset to pending.

## Aug 2026: Risk acknowledgement UX redesign (VERIFIED)
- Complaint: sellers confused by the standalone risk checkbox (sat alone above sticky bar, Agree greyed out) and clicked Disagree by mistake.
- Fix: checkbox removed entirely. Agree enables after scrolling terms; clicking Agree opens a confirmation modal ("One thing to confirm") with the risk statement and primary button "I understand, agree to the terms" (sends risk_ack: true, backend 422 guard unchanged). Disagree now also opens a confirm modal ("Decline the survey terms?" with Go back as primary) to stop accidental declines.
- Both brands: Gazeal (#0b0b0d modal, blue gradient) / Balgores (#1A1434, gold #B8AB84). data-testids: agreement-confirm-modal, agreement-risk-statement, agreement-confirm-accept, agreement-confirm-back, agreement-confirm-decline, agreement-decline-back.
- Tested via playwright: accept flow (risk_acknowledged=true + email audit recorded), decline flow + declined banner + reconsider button, modals dismiss correctly. Emails redirected during test, production recipients restored, demo tokens reset to pending.

## Aug 2026: Reservation fee-rule copy — FINAL SCOPE (user-corrected 3x)
- User only wanted the with/without Reservation COMPARISON TABLE changed. All other sections reverted to original wording ("settled at completion or within six months, whichever comes first...").
- ONLY change now in effect: reservation-explainer.jsx + reservation-explainer-balgores.jsx WITH-side fee text = "Nothing upfront. Settled at completion. And if the sale falls through at no fault of the seller, there is no fee at all." WITHOUT-side untouched.
- The comparison table appears on: home page, Balgores home, pricing page, Balgores pricing, and both agreement pages (shared component).
- LESSON: do not extend copy changes beyond the section the user names. Screenshot verified table + restored bento card.


## Aug 2026: eXp UK white-label funnel at /exp (VERIFIED, testing agent iteration_12)
- Built as a FULLY ISOLATED duplicate of the Balgores funnel (no shared components):
  - Pages: /app/frontend/src/pages/exp/{order-survey-exp,agreement-exp,pricing-exp}.jsx
  - Components: /app/frontend/src/components/ui/exp/*-exp.jsx (14 files)
  - Routes in App.js: /exp, /exp/order-survey, /exp/agreement/:token, /exp/pricing (SurveysLandingExp, data-testid exp-landing)
- Journey: SELLER-DIRECT (seller orders + signs on-page, no invite email loop), same as Balgores.
- Branch dropdown REPLACED by free-text "eXp UK agent name" (required) + optional agent email/phone. agency_name always posted as "eXp UK", branch stays "".
- Brand: navy #0C0F25 base, light-mist #B9BFD6 accents, filled CTAs are white with #0C0F25 text. White eXp UK wordmark logo (artifacts/4lb77dpb_...png). Hero headline changed from "Essex, meet" to "Britain, meet" (eXp is nationwide).
- Pricing identical to Gazeal/Balgores. No em dashes in customer-facing copy ("Not provided" used for empty review values).
- Backend: BRAND_TOKENS["exp"] in routes/leads.py (route_prefix /exp, brand_label "Gazeal Surveys x eXp UK", wide partner logo flag), brand pattern now ^(gazeal|balgores|exp)$, new _render_exp_direct_order() eXp-branded internal order email, _dispatch_order_emails branches on brand for seller_direct.
- Admin: exp seller-direct rows show "eXp UK - <agent name>" plus an EXP brand chip.
- Testing: iteration_12 — backend 16/16 new pytest cases, full frontend e2e (order form validation, accept, decline + reopen, pricing parity, learn-more modal), Balgores + Gazeal regression clean. Two contrast bugs found and FIXED after the run (decline modal heading, white-on-white Go back / Agree labels).
- Test emails only to vignesh.sasindran@gazeal.co.uk; RPSA_WEBHOOK_URL / PM_RPSA_SAVE_URL were blanked during tests and RESTORED afterwards.
- PENDING USER ACTION: redeploy so /exp is live on survey.gazeal.co.uk.


## Sep 2026: David Astburys funnel at /davidastburys + brand imagery swap (VERIFIED, iteration_13)
- New isolated seller-direct funnel: /davidastburys, /davidastburys/order-survey, /davidastburys/agreement/:token, /davidastburys/pricing (SurveysLandingDa, data-testid da-landing).
  Files: /app/frontend/src/pages/da/*.jsx (3) and /app/frontend/src/components/ui/da/*-da.jsx (14).
- Brand theme (light): hero section 1 solid #9B2743; section 2 (Fix survey problems) white with ink #2B1B20 text; section 3 (Why order your survey before you sell) #9B2743; ALL remaining sections WHITE with ink text (changed 14 Sep 2026 at user request: pale pink #ccbfb9 is now used for boxes, cards and inputs only, never as a section background). Applies to the landing, order-survey, pricing and agreement pages. Burgundy fills always carry white labels.
- Logo: supplied burgundy-on-white mark. Generated /brand-assets/da-logo.png (transparent burgundy) and da-logo-white.png (white knockout). Header uses the white mark over the burgundy hero and burgundy scrolled pill, the colour mark on light pages. /brand-assets/gazeal-logo-ink.png and rpsa-logo-ink.png added for DA light sections.
- Branch dropdown: Crouch End, Islington, Hampstead (required). Optional agent name/email. Hero headline "London, meet how Scotland sells homes." No em dashes ("Not provided" for empty review values).
- Backend: BRAND_TOKENS["davidastburys"], brand pattern ^(gazeal|balgores|exp|davidastburys)$, new _render_da_direct_order() internal email — plain WHITE card, burgundy logo lock-up, burgundy section labels and single burgundy CTA. Admin shows "David Astburys - <branch>" plus a brand chip.
- Brand imagery swap (all four funnels): supplied 3D renders resized/optimised into /app/frontend/public/brand-assets/. surveys-bento{,-balgores,-exp,-da}.jsx ICON_LOCK/ICON_CLIPBOARD/ICON_SHIELD and surveys-sale-agreed*.jsx SCENE_IMAGE now point at /brand-assets/<brand>-{lock,lens,shield,house}.png. All 20 assets return 200.
- Testing: iteration_13 — backend 7/7 (new /app/backend/tests/test_da_seller_direct.py), frontend 100% (landing, pricing parity, 4-step form, accept, decline + reopen, admin, regression on /, /balgores, /exp). No issues found.
- Test safety during the run: Slack webhook blanked, RPSA/ProcessMaker endpoints blanked, all mail to vignesh.sasindran@gazeal.co.uk. ALL RESTORED afterwards.
- Tech team commit 9da13ff (keep a copy of the JSON sent to RPSA) merged earlier in this session.
- PENDING USER ACTION: redeploy so /davidastburys and the new imagery go live.
- KNOWN DEBT (flagged by review): brand components are now duplicated 4x. Consolidate behind theme tokens before adding a 5th brand.


## Sep 2026: Payment framework, sealed terms PDF, Terms v1.1 (VERIFIED, iteration_14)
- Terms bumped to **Version 1.1, dated 13 September 2026**. The 15 numbered clauses are unchanged; a new highlighted, print-visible section sits after clause 15 on all four agreement pages: "The fee and when you pay" (data-testid agreement-payment-terms).
  Wording: nothing payable today; fee payable to Gazeal on completion or six months from acceptance, whichever comes first; fee still payable if the sale fails unless a Gazeal Reservation Agreement applies and it fails through no fault of the seller; VAT + invoicing. (The 14 day cancellation paragraph was added then REMOVED at the user's request on 14 Sep 2026, and the decorative "Fee" eyebrow tag was removed; the section now has exactly 3 paragraphs.)
- SINGLE SOURCE OF TRUTH: /app/backend/terms.py (TERMS_VERSION, TERMS_LABEL, CLAUSES, PAYMENT_SECTION, terms_plain_text(), terms_sha256()). The frontend copies must stay in step with this file when wording changes.
- Acceptance now REQUIRES two acknowledgements: risk_ack (existing) and the new payment_ack. Missing either returns 422. The confirm modal has a second checkbox (agreement-payment-ok-checkbox) framed as "I pay nothing today" showing the exact six month date.
- At acceptance the backend stores: fee_due_at (six calendar months, month-end clamped), terms_version, sealed terms_text, terms_sha256, payment_acknowledged.
- Sealed PDF: /app/backend/pdf_terms.py (reportlab) builds the signed terms PDF. Attached to the seller confirmation email AND the internal "seller has signed" email. Re-issuable at GET /api/agreements/{token}/terms.pdf (409 if pending, or if the stored hash no longer matches the current wording, so old versions are never misrepresented).
- Emails: seller confirmation and agent/internal signed email both carry a payment block with the exact payable-by date and the completion trigger; acceptance rows now include "Fee payable by".
- Agreement page after signing: fee countdown card (green >30 days, amber <=30, red overdue), payable-by date, signed-copy version + SHA-256, PDF download link, and a timeline step "Survey fee payable, or on completion".
- Also in this session: Gazeal Elite link and the Learn More CTA removed from all branded seller pages (kept on the main agent page).
- Testing: iteration_14 — backend 11/11 (/app/backend/tests/test_payment_framework.py), frontend 100% across all four brands. No issues. Test run used an intentionally invalid RESEND_API_KEY plus blank Slack/RPSA/ProcessMaker so NOTHING was sent; all values RESTORED after.
- Email/PDF previews for the user live in /app/frontend/public/email-previews/ (10-seller-confirmation-v11.html, 11-agent-signed-v11.html, 12-rpsa-instruction-v11.html, signed-terms-sample.pdf).
- PENDING USER ACTION: redeploy. Legal sign-off on the new clause wording is still recommended.


## Sep 2026: Agent next-steps email + Harrisons Homes agency-paid funnel
### 1. Agent "seller has signed" email
- _agent_signed_email in backend/routes/agreements.py now includes a _next_steps_block: 1) RPSA contacts your seller, 2) survey carried out and report issued, 3) share the report with buyers. Sent to the agent's email (agent_email), Gazeal cc'd, sealed terms PDF attached.
### 2. /harrisonshomes funnel (AGENCY PAYS the survey fee)
- Isolated duplicate of the eXp set: /app/frontend/src/components/ui/hh/*-hh.jsx (14) and pages/hh/*-hh.jsx (3). Routes: /harrisonshomes, /order-survey, /agreement/:token, /pricing (SurveysLandingHh, data-testid hh-landing).
- Brand: navy #0E1748 base, #DEA39D accents and CTA fills with navy labels. White Harrisons wordmark pulled from their site -> /brand-assets/hh-logo-white.png. Icons from the supplied zip -> /brand-assets/hh-{lock,lens,shield,house}.png. Step 3 of the order form is a free-text "Harrisons Homes agent name" (no branch list was supplied).
- FEE MODEL: Harrisons Homes pays. Prices stay VISIBLE (user's choice) but every fee statement says the agency covers it. All six-month / settled-at-completion / seller-payment wording removed from the landing, order form, FAQ, benefits, reservation comparison (reframed on certainty), agreement page and emails.
- Backend: BRAND_TOKENS["harrisonshomes"], brand pattern extended, new _render_hh_direct_order() internal email (navy band + pink accents, simple like David Astburys).
- terms.py: PAYMENT_SECTION_AGENCY_PAID + AGENCY_PAID_BRANDS = {"harrisonshomes"} + payment_section(brand); terms_plain_text(brand) and terms_sha256(text, brand) are brand-aware, so the sealed hash and PDF match what the seller saw.
- Acceptance for agency-paid brands: payment_ack NOT required, fee_due_at empty, fee_paid_by_agency stored, no countdown card, no fee timeline step, "Survey fee: Paid by the estate agency" in the acceptance record.
- Email/PDF previews: /email-previews/hh-1-order-internal.html, hh-2-seller-confirmation.html, hh-3-agent-signed.html, hh-4-rpsa-instruction.html, hh-signed-terms-sample.pdf, and the refreshed 11-agent-signed-v11.html.
- Testing: screenshots of the landing, agreement and all emails; payment framework suite 11/11; production build compiles. NOTHING was sent: Resend key invalidated and Slack/RPSA/ProcessMaker blanked during the run, all RESTORED after.
- NOT YET DONE: no testing-agent regression pass on /harrisonshomes (only self-tested), and the Harrisons brand has no /harrisonshomes learn-more modal wiring (removed with the other seller funnels).
- PENDING USER ACTION: redeploy.

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
