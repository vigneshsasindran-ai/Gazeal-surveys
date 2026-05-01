import React from "react";
import { ChevronRight } from "lucide-react";

/*
 * Gazeal Surveys Hero (Section 1)
 * - Solid primary blue (#025eba) background
 * - Left: Archivo headline (3 lines), Outfit sub-copy, dual CTAs
 * - Right: Scottish kilted-cottage illustration (compact, plenty of whitespace)
 * - Styled to echo advance.gazeal.co.uk — generous negative space and a
 *   primary / secondary CTA pairing
 */

const HERO_IMAGE =
  "https://customer-assets.emergentagent.com/job_ce36e598-d2a0-4d72-aaac-d0b490c4438e/artifacts/y0mduhc7_Header%20image.png";

const scrollToId = (id) => {
  const el = document.getElementById(id);
  if (el) {
    const y = el.getBoundingClientRect().top + window.pageYOffset - 90;
    window.scrollTo({ top: y, behavior: "smooth" });
  } else {
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  }
};

const SurveysHero = () => {
  return (
    <section
      id="hero"
      className="relative w-full overflow-hidden"
      style={{ backgroundColor: "#025eba" }}
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
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-6 xl:gap-8 items-center">
          {/* Copy */}
          <div
            className="lg:col-span-7 text-white"
            data-testid="surveys-hero-copy"
          >
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
              className="mt-6 md:mt-7 font-outfit text-white/90 text-[16px] sm:text-[17px] lg:text-[18px] leading-[1.55] max-w-[620px]"
              data-testid="surveys-hero-subcopy"
            >
              Gazeal has introduced upfront surveys inspired by the Scottish
              model, so buyers know the condition before they offer.
            </p>

            {/* CTAs */}
            <div
              className="mt-8 md:mt-10 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4"
              data-testid="surveys-hero-cta-row"
            >
              <button
                type="button"
                onClick={() => scrollToId("contact")}
                className="group inline-flex items-center justify-center gap-2 rounded-full bg-white text-[#025eba] font-outfit font-semibold px-7 py-3.5 text-[15px] shadow-[0_6px_22px_rgba(255,255,255,0.18)] hover:shadow-[0_8px_28px_rgba(255,255,255,0.28)] hover:-translate-y-[1px] transition-all duration-300"
                data-testid="surveys-hero-cta-primary"
              >
                Apply to Join
                <ChevronRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5" />
              </button>

              <button
                type="button"
                onClick={() => scrollToId("how-it-works")}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-transparent text-white font-outfit font-semibold px-7 py-3.5 text-[15px] border border-white/35 hover:border-white hover:bg-white/[0.06] transition-all duration-300"
                data-testid="surveys-hero-cta-secondary"
              >
                Learn More
              </button>
            </div>
          </div>

          {/* Illustration */}
          <div
            className="lg:col-span-5 flex justify-center lg:justify-end"
            data-testid="surveys-hero-image-wrap"
          >
            <img
              src={HERO_IMAGE}
              alt="A traditional Scottish stone cottage wearing a tartan kilt and sash, with bagpipes resting alongside"
              className="w-[64%] sm:w-[52%] md:w-[44%] lg:w-[88%] max-w-[420px] h-auto select-none"
              draggable={false}
              data-testid="surveys-hero-image"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default SurveysHero;
