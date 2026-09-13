import React from "react";
import { ChevronRight, BadgeCheck } from "lucide-react";

/*
 * Gazeal Surveys Hero (Section 1)
 * - Solid primary blue (#0C0F25) background
 * - Left: Archivo headline (3 lines), Outfit sub-copy, dual CTAs
 * - Right: Scottish kilted-cottage illustration with 4 floating "CHECKED"
 *   survey badges (roof, structural, damp, electrical) positioned around the
 *   house so they read as parts of one composition.
 */

const HERO_IMAGE =
  "https://customer-assets.emergentagent.com/job_survey-pro-10/artifacts/m3mf6dk7_DESIGN%20ELEMENTS%20%20%2817%29.png";

const scrollToId = (id) => {
  const el = document.getElementById(id);
  if (el) {
    const y = el.getBoundingClientRect().top + window.pageYOffset - 90;
    window.scrollTo({ top: y, behavior: "smooth" });
  } else {
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  }
}; 

const CheckedBadge = ({ label, className = "", floatClass = "", testid }) => (
  <div
    className={`pointer-events-none select-none absolute flex items-center gap-1 sm:gap-1.5 lg:gap-2 rounded-xl sm:rounded-2xl bg-white/95 backdrop-blur-sm shadow-[0_10px_30px_rgba(0,0,0,0.18)] ring-1 ring-black/5 px-2 sm:px-3 lg:px-3.5 py-1.5 sm:py-2 lg:py-2.5 ${floatClass} ${className}`}
    data-testid={testid}
  >
    <BadgeCheck
      className="w-4 h-4 sm:w-5 sm:h-5 lg:w-7 lg:h-7 shrink-0"
      strokeWidth={2.4}
      style={{
        color: "#0C0F25",
        fill: "#0C0F25",
        stroke: "#ffffff",
      }}
    />
    <div className="flex flex-col leading-tight">
      <span className="font-outfit font-semibold text-[9px] sm:text-[11px] lg:text-[13px] text-slate-900 whitespace-nowrap">
        {label}
      </span>
    </div>
  </div>
);

const SurveysHero = ({ onOrderSurvey }) => {
  return (
    <section
      id="hero"
      className="relative w-full overflow-hidden"
      style={{ backgroundColor: "#0C0F25" }}
      data-testid="surveys-hero"
    >
      {/* Subtle depth: soft radial wash + faint grain (no dark gradients on blue) */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(120% 80% at 80% 20%, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0) 55%)",
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.06] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.9'/></svg>\")",
        }}
      />

      <div className="relative z-10 max-w-[1280px] mx-auto px-6 lg:px-12 pt-36 pb-24 md:pt-40 md:pb-28 lg:pt-44 lg:pb-32">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-6 xl:gap-8 lg:items-center">
          {/* Heading + paragraph (mobile: 1st, desktop: top-left) */}
          <div
            className="order-1 lg:col-start-1 lg:col-span-7 lg:row-start-1 text-white"
            data-testid="surveys-hero-copy"
          >
            <div
              className="inline-flex items-center mb-5 md:mb-6"
              data-testid="surveys-hero-eyebrow"
            >
              <span className="font-outfit font-semibold uppercase tracking-[0.22em] text-[12px] sm:text-[13px] text-[#B9BFD6]">
                Home Insights powered by Gazeal
              </span>
            </div>

            <h1
              className="font-archivo font-bold tracking-[-0.02em] leading-[1.05] text-white text-[36px] sm:text-[44px] lg:text-[52px] xl:text-[56px]"
              data-testid="surveys-hero-heading"
            >
              England, meet
              <br />
              how Scotland
              <br />
              sells homes.
            </h1>

            <p
              className="mt-6 md:mt-7 font-outfit text-white/90 text-[16px] sm:text-[17px] lg:text-[18px] leading-[1.55] max-w-[440px]"
              data-testid="surveys-hero-subcopy"
            >
              Selling with eXp UK? Order your survey upfront, inspired by
              the Scottish model, so buyers know your home&apos;s condition
              before they offer, and your sale stays sold.
            </p>
          </div>

          {/* Illustration + floating survey badges
              (mobile: 2nd between paragraph and CTAs, desktop: right column spanning both rows) */}
          <div
            className="order-2 lg:order-none lg:col-start-8 lg:col-span-5 lg:row-start-1 lg:row-span-2 flex justify-center lg:justify-end lg:pr-28 xl:pr-40"
            data-testid="surveys-hero-image-wrap"
          >
            <div className="relative w-[72%] sm:w-[60%] md:w-[52%] lg:w-[96%] max-w-[460px]">
              <img
                src={HERO_IMAGE}
                alt="A traditional Scottish stone cottage wearing a tartan kilt and sash, with bagpipes resting alongside"
                className="surveys-hero-float w-full h-auto select-none"
                draggable={false}
                data-testid="surveys-hero-image"
              />

              {/* Top-left — No Upfront Cost
                  (desktop: low/left so it just touches the roof slope, not the chimney) */}
              <CheckedBadge
                label="No Upfront Cost"
                className="-top-2 left-1 sm:-top-3 sm:left-2 lg:top-6 lg:-left-12 xl:top-8 xl:-left-16"
                floatClass="surveys-badge-float-a"
                testid="badge-roof"
              />
              {/* Top-right — Level 2/3 Survey */}
              <CheckedBadge
                label="Level 2/3 Survey"
                className="top-6 -right-2 sm:top-8 sm:-right-4 lg:top-14 lg:-right-12 xl:-right-20"
                floatClass="surveys-badge-float-b"
                testid="badge-structural"
              />
              {/* Bottom-left — Buyer Indemnified */}
              <CheckedBadge
                label="Buyer Indemnified"
                className="bottom-10 -left-3 sm:bottom-14 sm:-left-6 lg:bottom-20 lg:-left-24 xl:-left-32"
                floatClass="surveys-badge-float-c"
                testid="badge-damp"
              />
              {/* Bottom-right — All Postcodes */}
              <CheckedBadge
                label="All Postcodes"
                className="-bottom-1 -right-2 sm:-bottom-1 sm:-right-4 lg:-bottom-2 lg:-right-16 xl:-right-24"
                floatClass="surveys-badge-float-d"
                testid="badge-electrical"
              />
            </div>
          </div>

          {/* CTAs (mobile: 3rd below image, desktop: under paragraph in left column) */}
          <div
            className="order-3 lg:order-none lg:col-span-7 lg:row-start-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 lg:-mt-4"
            data-testid="surveys-hero-cta-row"
          >
            <button
              type="button"
              onClick={() =>
                onOrderSurvey ? onOrderSurvey() : scrollToId("features")
              }
              className="group inline-flex items-center justify-center gap-2 rounded-full bg-white text-[#0C0F25] font-outfit font-semibold px-7 py-3.5 text-[15px] shadow-[0_6px_22px_rgba(255,255,255,0.18)] hover:shadow-[0_8px_28px_rgba(255,255,255,0.28)] hover:-translate-y-[1px] transition-all duration-300"
              data-testid="surveys-hero-cta-primary"
            >
              Order Survey
              <ChevronRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5" />
            </button>

          </div>
        </div>
      </div>
    </section>
  );
};

export default SurveysHero;
