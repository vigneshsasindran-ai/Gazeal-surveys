# Gazeal Surveys — PRD

## Original Problem Statement
Dark-themed, highly polished landing page for Gazeal Surveys (agents order surveys). Mimics "Gazeal Elite" brand (Archivo/Outfit fonts, clean spacing). Functional forms (Order Survey stepper, Learn More modal), Resend emails, MongoDB, Consumer API / Webhook fan-out for third-party suppliers (RPSA), native hosted "Seller Survey Agreement" clickwrap page with audit trail, pricing calculator, and sale-room JSON package generation.

Parallel co-branded funnel for **Balgores** estate agents at `/balgores/*` with distinct styling (`#1A1434` dark purple, `#B8AB84` gold, flat colors only — NO mixed gradients) using physically duplicated components to protect the main Gazeal site.

## Environments
- PREVIEW: https://survey-pro-10.preview.emergentagent.com
- PRODUCTION: https://survey.gazeal.co.uk (user redeploys to push changes; agent has no prod access)

## Routes
- Gazeal: `/`, `/pricing`, `/order-survey`, `/agreement/:token`, `/intro` (unlisted video page)
- Balgores: `/balgores`, `/balgores/pricing`, `/balgores/order-survey`, `/balgores/agreement/:token`

## Key Rules
- Balgores = solid `#1A1434` + `#B8AB84` only. User hates mixed purple/gold gradients (UI + emails).
- DO NOT merge Balgores/Gazeal components — user chose duplicated files intentionally. Fixes must be applied twice.
- Frontend uses REACT_APP_BACKEND_URL; backend routes prefixed `/api`.

## Implemented (history)
- Full Gazeal funnel: hero, bento, sale agreed, reservation explainer, benefits, FAQ, footer reveal, learn-more modal, order stepper, pricing calculator (whole GBP), clickwrap agreement page w/ audit trail + sale_room_package generation
- Resend email notifications (brand-aware templates), Slack webhook notify, webhook fan-out (consumers collection), admin endpoints (ADMIN_TOKEN in backend/.env)
- Balgores parallel funnel (duplicated components), flat colors, custom icons/images
- GAZEAL_ECOSYSTEM_HANDOFF.md documents CRM/App integration plans

### June 2026 (this session)
- Balgores hero heading → "Essex, meet how Scotland sells homes."
- Balgores header: removed Gazeal Surveys logo; native gold "Balgores Property Group" text + B shield
- Balgores hero eyebrow: "HOME INSIGHTS POWERED BY GAZEAL" (gold, uppercase, no rule line)
- Fixed mobile horizontal overflow (bento 600px ambient gradient) — added overflow-hidden on both bento sections
- **NEW `/intro` page** (unlisted, Gazeal branding): hero copy + Vimeo embed (video 1208004372) replacing house image, "Featuring Alan Milstein — Director, Skyline Surveyors Ltd" caption, stat band ("Every UK postcode" / "1,000+ surveyors"), email capture CTA + Learn More → `/`
- **NEW `POST /api/leads/intro-email`**: stores lead (kind=intro_email) in `leads` collection, fan_out `intro_email.created`, Resend notification to NOTIFY_EMAIL. Tested working.

## Backlog / Upcoming
- **P0 — Task 1**: Legally self-contained package + PDF generation (Phase 1). Extend `sale_room_package` in `POST /api/agreements/{token}/accept` with `evidence` block (agreement_version, clickwrap_hash, accepted_at, accepted_ip, user_agent). Server-side signed PDF (weasyprint/reportlab), upload to object storage, include URL + SHA256 in package.
- **P1 — Task 2**: Outbound webhook delivery of sale_room_package JSON (RPSA) on seller acceptance.
- **P2 — Task 3**: Event bus & delivery worker for CRMs (lead.created, agreement.accepted → Hubspot/Pipedrive/Zapier).
- **P2 — Task 4**: Read-only sales-room WebView (iframe-embeddable) for the React Native Gazeal App. See GAZEAL_ECOSYSTEM_HANDOFF.md.

## 3rd Party
- Resend (RESEND_API_KEY, SENDER_EMAIL, NOTIFY_EMAIL in backend/.env)
- Slack incoming webhooks
