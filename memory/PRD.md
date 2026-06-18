# Gazeal Surveys — PRD

## Problem Statement (original)
Create a landing page for Gazeal Surveys, a product extension of Gazeal
(similar to Gazeal Elite). Primary colour `#025eba`. Heading font Archivo,
body font Outfit. The site must highlight seller surveys, the USP and killer
features. Design must be beautiful, interactive, on-brand — strictly
following modern frontend design principles (no AI slop, no purple/blue
gradients, no generic centered card grids, deliberate asymmetric layouts,
hairline 1px dividers, cream surfaces with brand-blue accents).

## Brand
- Primary: `#025eba` (used on hero, accents, CTAs, ribbons, icon containers)
- Cream surface: `#F7F4EE` for the body sections, `#FFFFFF` for inner panels
- Ink / Navy text: `#0B1220`, muted body text: `#4A5260`, hint: `#6B7280`
- Accent lime: `#DFFB4A` (used sparingly — Gazeal-guarantee chip, "CHECKED" pills)
- Heading font: Archivo (700/800)
- Body font: Outfit (400–600)
- Logo: Gazeal Surveys wordmark (white on blue / dark on cream)

## Architecture
- Frontend: React 19 + CRA + Tailwind + shadcn/ui (existing template)
- Backend: FastAPI + Mongo — untouched (front-end-only spec for now)
- Routes:
  - `/` → `SurveysLanding` (hero + 4 sections + CTA + footer + Learn More modal)
  - `/request-survey` → `RequestSurveyPage` (multi-step agent-for-seller form)

## Components
- `surveys-header.jsx` — fixed transparent → glass-pill on scroll, mobile drawer, "Get Started" CTA → `/request-survey`.
- `surveys-hero.jsx` — Section 1. 3-line Archivo headline, sub-copy, dual CTAs (`Apply to Join` → page, `Learn More` → modal). Kilted-cottage illustration with 4 floating "CHECKED" badges.
- `surveys-why-built.jsx` — Section 2. Asymmetric Scotland vs England comparison card (~9% vs ~32% fall-through), 2024 ribbon footer.
- `surveys-how-it-works.jsx` — Section 3. White panel inside cream surface; 3 staggered steps with brand-blue numerals and meta-timing pills.
- `surveys-safety-net.jsx` — Section 4. Inverted navy panel ("If the buyer walks, the survey is on us"), £0 guarantee chip with lime ribbon.
- `surveys-both-sides.jsx` — Section 5. Two intentionally different columns: For Buyers (blue accents) vs For Sellers (dark accents) separated by a vertical hairline.
- `surveys-cta.jsx` — Final blue band CTA strip above footer with `Apply to Join` + `Learn how it works`.
- `surveys-footer.jsx` — 3-column footer + RPSA badge + legal row.
- `surveys-learn-more-modal.jsx` — 3-step funnel + hybrid optional "Notify me" email capture (front-end only, logs to console).
- `pages/request-survey.jsx` — `/request-survey` dedicated multi-step form. Agent → Seller → Property listing (Rightmove/Zoopla URL validation) → Review & send. Front-end only, logs to console. Explicit copy that **RPSA will contact the seller directly to book**.

## Implemented (2026-06)
- Sections 2–5 built modularly with on-brand cream/white surfaces + #025eba accents.
- Footer with three columns (Product / Gazeal / Contact), RPSA chip, legal row.
- Final CTA strip (blue) above the footer.
- Learn More modal: 3 educational steps with progress dashes, optional notify-me email capture, success state.
- `/request-survey` dedicated page: 4-step stepper, Rightmove/Zoopla URL validation, agent-for-seller copy + RPSA explanation banner, review confirmation, success state.
- App.js wired with `<BrowserRouter>` + new route; header + hero + CTA all receive `onApply` (→ `/request-survey`) and `onLearnMore` (→ modal) props.
- All flows verified via Playwright screenshots: hero, modal step 1→3, modal email success, request-survey step 1→4, request-survey "Request received" page.
- No backend integrations (per user choice — submissions log to console).

## Backlog (P1)
- Backend `/api/leads` to persist Notify-me + Request-survey submissions to Mongo.
- Email notification to support@gazeal.co.uk when an agent submits (Resend integration).
- Rightmove/Zoopla scrape to auto-pull listing photos + address from URL.
- FAQ accordion + testimonials section.

## Backlog (P2)
- Dark mode variant.
- SEO metadata per section + sitemap.
- Animated stat counters for the Scotland vs England comparison.

## Test Credentials
Not applicable — static landing page, no auth.
