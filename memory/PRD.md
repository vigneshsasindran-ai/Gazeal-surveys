# Gazeal Surveys — PRD

## Problem Statement (original)
Create a landing page for Gazeal Surveys. It is a product extension of Gazeal
similar to Gazeal Elite but the primary colour is #025eba. Font is Archivo for
headings and Outfit for paragraphs (similar to https://advance.gazeal.co.uk).
First, build landing page section 1 (hero): blue background, transparent header
effect (like the Elite landing), headline "England, meet how Scotland sells
homes.", and the provided Scottish cottage illustration as the hero image.

## Brand
- Primary colour: #025eba (solid blue background, white text)
- Heading font: Archivo (700/800 weights)
- Body font: Outfit (400–600 weights)
- Logo: Gazeal Surveys (white wordmark + blue "Surveys" accent)

## Architecture
- Frontend: React + CRA + Tailwind + shadcn/ui (existing template)
- Backend: FastAPI + Mongo (untouched — static landing for now)
- Routes: `/` → SurveysLanding

## Components
- `/app/frontend/src/components/ui/surveys-header.jsx` — fixed, transparent,
  liquid-glass pill on scroll. Mirrors Elite header pattern; white CTA pill
  "Get Started" instead of gold gradient. Mobile hamburger + drawer.
- `/app/frontend/src/components/ui/surveys-hero.jsx` — section 1 (hero):
  left column Archivo H1 + Outfit sub-copy, right column Scottish cottage
  illustration. Solid #025eba background with a subtle radial wash + grain.

## Implemented (2026-05)
- Hero Section 1 (complete) — headline, sub-copy, illustration, blue palette.
- Transparent header with scroll-triggered glass pill + mobile drawer.
- Google Fonts: Archivo + Outfit wired via `index.css` and preloaded in
  `public/index.html`. Page `<title>` and theme-color updated to Surveys brand.

## Backlog (P0 / next)
- Section 2: "How it works" (3-step explainer tailored to upfront surveys).
- Section 3: "Why upfront surveys" benefits grid.
- Section 4: FAQ accordion (shadcn accordion).
- Section 5: Contact / lead capture form + backend `/api/leads` endpoint.
- Footer with Gazeal main-site link.

## Backlog (P1)
- Animated stat counters (e.g. Scottish vs English fall-through rates).
- Testimonial carousel.
- Dedicated pricing / "For agents" CTA panel.

## Backlog (P2)
- Dark mode variant.
- SEO metadata per section + sitemap.

## Test Credentials
Not applicable — static landing page, no auth yet.
