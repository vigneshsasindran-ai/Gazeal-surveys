import React from "react";
import { ChevronRight } from "lucide-react";
import ReservationExplainer from "@/components/ui/reservation-explainer";

/*
 * "Survey It. Reserve It." — paired-product section
 *
 *   • Headline + brief intro + CTA (keeps existing tone)
 *   • Modular comparison: with vs without a Gazeal Reservation Agreement
 *     (shared component, agent variant — no interest checkbox)
 *
 * Rebranded with the Surveys blue gradient (#4FB6FF → #025eba).
 */

const SurveysSaleAgreed = ({ onOrderSurvey }) => {
  return (
    <section
      id="sale-agreed"
      className="relative bg-black pt-4 pb-20 md:pt-6 md:pb-28 overflow-hidden"
      data-testid="surveys-sale-agreed-section"
    >
      {/* Ambient blue glow */}
      <div className="pointer-events-none absolute -left-32 top-1/3 h-[420px] w-[420px] rounded-full bg-[#025eba]/15 blur-3xl opacity-60" />
      <div className="pointer-events-none absolute right-0 bottom-0 h-[360px] w-[360px] rounded-full bg-[#4FB6FF]/10 blur-3xl opacity-50" />

      <div className="relative mx-auto max-w-3xl lg:max-w-6xl px-6">
        {/* Heading row */}
        <div className="max-w-3xl mb-12 lg:mb-16">
          <h2
            className="font-archivo font-bold tracking-[-0.025em] leading-[1.1] text-white text-4xl sm:text-5xl lg:text-[56px]"
            data-testid="sale-agreed-heading"
          >
            Survey It. Reserve It.
            <br />
            <span className="bg-gradient-to-r from-[#4FB6FF] to-[#025eba] bg-clip-text text-transparent">
              Now It&apos;s as Good as Sold.
            </span>
          </h2>

          <p
            className="mt-5 text-base sm:text-lg text-white/65 font-outfit leading-relaxed max-w-xl"
            data-testid="sale-agreed-body"
          >
            A sale agreed is the most fragile point in your pipeline. An
            upfront survey and a Gazeal Reservation Agreement protect both
            ends — fewer surprises, fewer fall-throughs.
          </p>

          <div className="mt-7">
            <button
              type="button"
              onClick={onOrderSurvey}
              className="inline-flex items-center gap-2 rounded-full px-6 py-3 font-outfit font-semibold text-[14px] text-white hover:opacity-90 transition-all"
              style={{
                background:
                  "linear-gradient(135deg, #4FB6FF 0%, #025eba 100%)",
                boxShadow: "0 6px 22px rgba(2,94,186,0.4)",
              }}
              data-testid="sale-agreed-cta"
            >
              Order Survey
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modular comparison */}
        <ReservationExplainer variant="agent" />
      </div>
    </section>
  );
};

export default SurveysSaleAgreed;
