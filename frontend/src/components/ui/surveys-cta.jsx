import React from "react";
import { ChevronRight } from "lucide-react";

/*
 * Final CTA strip — sits just above the footer.
 * Full-bleed blue band, mirrors the hero brand colour and re-engages with
 * the two primary actions: "Apply to Join" (→ /request-survey) and a
 * "Learn how it works" trigger (opens the Learn More modal via prop).
 */

const SurveysCta = ({ onApply, onLearnMore }) => {
  return (
    <section
      id="contact"
      className="relative w-full overflow-hidden"
      style={{ backgroundColor: "#025eba" }}
      data-testid="surveys-cta"
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(80% 60% at 80% 30%, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0) 55%)",
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.06] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.9'/></svg>\")",
        }}
      />

      <div className="relative z-10 max-w-[1280px] mx-auto px-6 lg:px-12 py-20 lg:py-28">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-end">
          <div className="lg:col-span-8">
            <span className="font-outfit text-[12px] font-semibold tracking-[0.18em] uppercase text-white/70">
              Get started
            </span>
            <h2
              className="mt-4 font-archivo font-bold text-white tracking-[-0.025em] leading-[1.04] text-[36px] sm:text-[44px] lg:text-[56px]"
              data-testid="surveys-cta-headline"
            >
              Bring upfront surveys
              <br />
              to your next listing.
            </h2>
            <p className="mt-5 font-outfit text-white/85 text-[16px] sm:text-[17px] leading-[1.6] max-w-[54ch]">
              Apply to join the Gazeal Surveys panel and we&apos;ll get your seller
              booked with an RPSA surveyor within 48 hours. No tie-ins, no
              up-front cost.
            </p>
          </div>

          <div className="lg:col-span-4 flex flex-col sm:flex-row lg:flex-col gap-3 lg:items-end">
            <button
              type="button"
              onClick={onApply}
              className="group inline-flex items-center justify-center gap-2 rounded-full bg-white text-[#025eba] font-outfit font-semibold px-7 py-3.5 text-[15px] shadow-[0_8px_28px_rgba(255,255,255,0.18)] hover:shadow-[0_10px_32px_rgba(255,255,255,0.28)] hover:-translate-y-[1px] transition-all duration-300"
              data-testid="surveys-cta-apply"
            >
              Apply to Join
              <ChevronRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5" />
            </button>
            <button
              type="button"
              onClick={onLearnMore}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-transparent text-white font-outfit font-semibold px-7 py-3.5 text-[15px] border border-white/35 hover:border-white hover:bg-white/[0.06] transition-all duration-300"
              data-testid="surveys-cta-learn-more"
            >
              Learn how it works
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SurveysCta;
