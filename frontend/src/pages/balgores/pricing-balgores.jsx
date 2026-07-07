import React from "react";
import SurveysHeader from "@/components/ui/balgores/surveys-header-balgores";
import ReservationExplainer from "@/components/ui/balgores/reservation-explainer-balgores";
import PricingCalculator from "@/components/ui/balgores/pricing-calculator-balgores";

/*
 * Pricing page — dark-themed, on-brand survey price calculator.
 *
 *   • PricingCalculator (reusable) — property value slider + text input,
 *     bedrooms, listed status, live price / bespoke-quote card.
 *   • Below: the reservation-explainer boxes so the seller sees exactly
 *     WHEN the survey fee is due.
 */

const PricingPage = () => (
  <div className="min-h-screen bg-black text-white" data-testid="pricing-page">
    <SurveysHeader />

    <main className="relative pt-32 lg:pt-40 pb-24">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[520px]"
           style={{ background: "radial-gradient(60% 60% at 50% 0%, rgba(26,20,52,0.25) 0%, rgba(26,20,52,0) 60%)" }} />

      <div className="relative max-w-3xl lg:max-w-6xl mx-auto px-6">
        {/* Hero */}
        <div className="max-w-2xl">
          <h1 className="font-archivo font-bold text-4xl sm:text-5xl lg:text-[56px] leading-[1.05] tracking-[-0.025em] text-white">
            Know the price of your survey{" "}
            <span className="text-[#B8AB84]">before you order.</span>
          </h1>
          <p className="mt-5 font-outfit text-base sm:text-lg text-white/65 leading-relaxed max-w-xl">
            Slide the property value, choose the bedrooms and listed status, and see the survey fee update live. No hidden extras.
          </p>
        </div>

        {/* Calculator */}
        <div className="mt-14">
          <PricingCalculator />
        </div>

        {/* Fee-due explainer */}
        <div className="mt-20 lg:mt-24 max-w-2xl">
          <p className="font-outfit font-semibold text-[11px] tracking-[0.22em] uppercase text-[#B8AB84] mb-3">When the fee is due</p>
          <h2 className="font-archivo font-bold text-white text-3xl sm:text-4xl leading-[1.1] tracking-[-0.025em]">
            Only Pay If the Sale Completes.
          </h2>
        </div>
        <div className="mt-10">
          <ReservationExplainer variant="agent" />
        </div>
      </div>
    </main>
  </div>
);

export default PricingPage;
