import React from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import IntroPage, { EmailCapture } from "@/pages/intro";

/*
 * /launch — ad landing page for agents ("be first in your town").
 * A launch announcement section sits on top, followed by the full
 * intro page content (video hero, stats, footer).
 */

const PROOF_POINTS = [
  "Live in every postcode",
  "1,000+ surveyors ready at launch",
  "Nothing for sellers to pay upfront",
];

const LaunchTop = () => (
  <section className="relative bg-black overflow-hidden" data-testid="launch-top">
    {/* Ambient glow behind the headline */}
    <div
      className="absolute inset-x-0 top-0 h-[560px] pointer-events-none"
      style={{
        background:
          "radial-gradient(55% 55% at 50% 0%, rgba(2,94,186,0.28) 0%, rgba(2,94,186,0) 65%)",
      }}
    />

    <div className="relative z-10 max-w-[1100px] mx-auto px-6 pt-32 md:pt-40 pb-16 md:pb-24 text-center">
      {/* Live status */}
      <div
        className="inline-flex items-center gap-2.5 rounded-full border border-white/15 bg-white/[0.04] px-4 py-2"
        data-testid="launch-live-badge"
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#4FB6FF] opacity-70" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-[#4FB6FF]" />
        </span>
        <span className="font-outfit font-semibold uppercase tracking-[0.2em] text-[11px] text-white/70">
          Now live across the UK
        </span>
      </div>

      <h1
        className="mt-7 md:mt-9 font-archivo font-black tracking-[-0.03em] leading-[1.05] text-white text-[38px] sm:text-[54px] lg:text-[68px]"
        data-testid="launch-heading"
      >
        Upfront Seller Surveys are
        <br className="hidden sm:block" /> now live in{" "}
        <span className="bg-gradient-to-r from-[#4FB6FF] to-[#025eba] bg-clip-text text-transparent">
          every UK postcode.
        </span>
      </h1>

      <p
        className="mt-7 mx-auto max-w-[720px] font-outfit text-white/70 text-[16px] lg:text-[18px] leading-[1.65]"
        data-testid="launch-subcopy"
      >
        The Government has made the direction clear. Sellers need more upfront
        information, buyers need more confidence, and agents need a better way
        to stop sales falling apart.
      </p>

      {/* Proof strip */}
      <div
        className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-2.5 sm:gap-0"
        data-testid="launch-proof-strip"
      >
        {PROOF_POINTS.map((p, i) => (
          <React.Fragment key={p}>
            {i > 0 && (
              <span className="hidden sm:block mx-5 h-1 w-1 rounded-full bg-white/25" aria-hidden="true" />
            )}
            <span className="font-archivo font-bold text-white text-[14px] sm:text-[15px] tracking-[-0.01em]">
              {p}
            </span>
          </React.Fragment>
        ))}
      </div>

      {/* Urgency block */}
      <div
        className="mt-12 md:mt-14 mx-auto max-w-[780px] rounded-2xl border border-white/10 bg-white/[0.03] p-7 sm:p-9"
        data-testid="launch-urgency"
      >
        <p className="font-outfit text-[14px] sm:text-[15px] text-white/65">
          Agents are already instructing surveys this week.
        </p>
        <p className="mt-3 font-archivo font-bold text-white text-[21px] sm:text-[26px] leading-[1.3] tracking-[-0.015em]">
          The direction is set. The only question is whether you{" "}
          <span className="text-[#4FB6FF]">lead in your town</span> or wait for
          your competitors to catch up.
        </p>
      </div>

      {/* CTA */}
      <p className="mt-11 font-outfit font-semibold uppercase tracking-[0.22em] text-[11px] text-white/50">
        Start offering Seller Surveys
      </p>
      <div
        className="mt-5 flex flex-col sm:flex-row items-center justify-center gap-4"
        data-testid="launch-cta-row"
      >
        <EmailCapture buttonLabel="Claim your town" />
        <Link
          to="/"
          className="inline-flex items-center justify-center gap-2 rounded-full bg-transparent text-white font-outfit font-semibold px-7 py-3.5 text-[15px] border border-white/35 hover:border-white hover:bg-white/[0.06] transition-all duration-300"
          data-testid="launch-learn-more-link"
        >
          Learn More
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  </section>
);

export default function LaunchPage() {
  return <IntroPage topSection={<LaunchTop />} />;
}
