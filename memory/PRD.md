# Gazeal Surveys — PRD

## Problem Statement (original)
Create a landing page for Gazeal Surveys, a product extension of Gazeal
(similar to Gazeal Elite). Primary colour `#025eba`. Heading fonts Archivo
+ Didot italic (for accent), body font Outfit / Manrope. Page must reuse
the Gazeal Elite landing's foundation — black/dark theme, modular dark
glass cards, FAQ accordion layout, scroll-revealing footer logo. Content
sourced from the official Gazeal Surveys flyer.

## Brand
- Background: `#050505` (dark)
- Primary brand: `#025eba` (deep blue)
- Light accent: `#4FB6FF` (cyan-blue, matches the 3D icon highlights)
- Brand gradient (replaces Elite's gold): `#4FB6FF → #025eba`
- Heading font: Archivo / Didot italic (for accent headings)
- Body font: Manrope / Outfit
- Logo: white wordmark "Gazeal Surveys"

## Architecture
- Frontend: React 19 + CRA + Tailwind + shadcn/ui
- Backend: FastAPI + Mongo (untouched — static landing)
- Route: `/` → `SurveysLanding`

## Components (final, after rebuild)
- `surveys-header.jsx` — fixed transparent → liquid-glass pill on scroll, mobile drawer, "Learn More" CTA scrolls to the FAQ apply card (mirrors Elite header pattern, rebranded to blue).
- `surveys-hero.jsx` — Section 1 (untouched). Solid #025eba background, 3-line Archivo headline, dual CTAs, kilted-cottage illustration with 4 floating "CHECKED" badges.
- `surveys-bento.jsx` — 3 dark glassmorphic cards mirroring Elite's `features-bento`. Cards: "No upfront cost" (padlock-G icon), "Critical property information" (house+clipboard icon), "Up to 98% sale success" (shield+checkmark icon). Trust strip with RPSA + indemnity + agent availability.
- `surveys-faq.jsx` — Sticky left column (Common Questions + contact card) + 6-item accordion on the right, ending in an "Apply" CTA card (`#apply` anchor).
- `surveys-footer-reveal.jsx` — Scroll-triggered footer reveal with the Gazeal Surveys logo unravelling at the bottom, neon blue glow strip, link row + "Get in touch" mailto CTA.

## Implemented (2026-06 — dark rebuild)
- Discarded the light-theme sections 2-5, CTA strip, light footer, Learn More modal, and `/request-survey` page.
- Migrated `index.css` to the Elite dark palette + added Manrope + Didot fonts.
- New 3D icons sourced from the user-supplied assets (padlock, house+clipboard, shield).
- Brand gradient swapped Elite gold (`#FFDE59 → #FF914D`) for Surveys blue (`#4FB6FF → #025eba`) throughout header, footer, FAQ, and bento cards.
- Copy lifted verbatim from the Gazeal Surveys flyer.
- All flows verified via Playwright: hero, bento, FAQ accordion + sticky column, scroll-revealing Gazeal Surveys logo footer with link bar + mailto CTA.

## Backlog (P1)
- Backend `/api/leads` to capture "Get in touch" submissions and email enquiries.
- Animated "How it works" timeline if the user wants more depth.
- Testimonials/social-proof row (Elite-style) under the bento.

## Backlog (P2)
- Light mode toggle (probably unnecessary).
- SEO metadata per section + sitemap.

## Test Credentials
Not applicable — static landing page, no auth.
