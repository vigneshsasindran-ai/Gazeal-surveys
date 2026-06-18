# Gazeal Surveys — PRD

## Problem Statement (original)
Create a landing page for Gazeal Surveys, a product extension of Gazeal
(similar to Gazeal Elite). Primary colour `#025eba`. Reuse the Gazeal Elite
landing's foundation — black/dark theme, modular dark glass cards, FAQ
accordion layout, scroll-revealing footer logo. Content sourced from the
official Gazeal Surveys flyer. Two distinct CTAs:
  • **Order Survey** → dedicated multi-step page mirroring the Gazeal
    Advance `/get-paid` pattern, where an agent sends an invite to a seller.
  • **Learn More** → popup modal mirroring the Gazeal Elite "Submit
    Application" pattern, capturing Name + Agency + Email then handing off
    to a HubSpot meetings embed.

## Brand
- Background: `#050505` (dark)
- Primary brand: `#025eba` (deep blue)
- Light accent: `#4FB6FF` (cyan-blue)
- Brand gradient: `#4FB6FF → #025eba`
- Heading fonts: Archivo / Didot italic (accent)
- Body fonts: Manrope / Outfit

## Architecture
- Frontend: React 19 + CRA + Tailwind + shadcn/ui
- Backend: FastAPI + Mongo (untouched — front-end-only spec)
- Routes:
  - `/` → `SurveysLanding`
  - `/order-survey` → `OrderSurveyPage`

## Components
- `surveys-header.jsx` — fixed liquid-glass header on scroll. Two CTAs: outline "Learn More" (opens modal) and gradient "Order Survey" (→ `/order-survey`).
- `surveys-hero.jsx` — Section 1 (untouched layout). CTAs renamed to "Order Survey" (white pill) and "Learn More" (outline).
- `surveys-bento.jsx` — 3 dark glass cards (No upfront cost / Critical property information / 98% sale success) with the 3D padlock, house+clipboard and shield icons; trust strip.
- `surveys-faq.jsx` — sticky left column + 13-item accordion (all official copy from the user) + apply card with both CTAs.
- `surveys-footer-reveal.jsx` — scroll-revealing Gazeal Surveys logo + footer with both CTAs.
- `surveys-learn-more-modal.jsx` — Elite-style 2-state modal: form → HubSpot meeting embed at `https://meetings.hubspot.com/bryan-mansell/gazeal-surveys?embed=true` (prefills firstName/lastName/email).
- `pages/order-survey.jsx` — Advance-style 4-step page: About you → Your seller → The property → Confirmation. "Before you start" intro card, Rightmove/Zoopla URL validation, "Send the Invite" button, success state.

## Implemented (2026-06)
- Replaced all "Apply" labels with **Order Survey** primary CTA across hero / header / FAQ apply card / footer.
- Built `/order-survey` dedicated page mirroring the Gazeal Advance `GetPaidPage` pattern (intro card, stepper strip, glass card form, navigation footer, success state).
- Built the Learn More modal mirroring the Gazeal Elite `StandardModal` pattern with HubSpot meeting embed handoff.
- Front-end only — both flows log submissions to `console`. HubSpot embed handles real bookings.
- All flows verified via Playwright: hero CTAs, Learn More modal → HubSpot, /order-survey 4-step flow → success.

## Backlog (P1)
- Backend `/api/leads` to persist Learn More and Order Survey submissions.
- Email notification (Resend) to the Gazeal team when an order arrives.
- Auto-scrape Rightmove/Zoopla listing for address + photos.

## Test Credentials
Not applicable — static landing page, no auth.
