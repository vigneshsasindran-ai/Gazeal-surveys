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
  { big: "Every postcode", small: "Live nationwide from day one." },
  { big: "1,000+ surveyors", small: "Signed up and ready at launch.", accent: true },
  { big: "£0 upfront", small: "Nothing for your sellers to pay." },
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
      <h1
        className="font-archivo font-black tracking-[-0.03em] leading-[1.05] text-white text-[38px] sm:text-[54px] lg:text-[68px]"
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

      {/* Proof cards */}
      <div
        className="mt-10 md:mt-12 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-[900px] mx-auto"
        data-testid="launch-proof-strip"
      >
        {PROOF_POINTS.map((p) => (
          <div
            key={p.big}
            className="group relative rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-7 text-center overflow-hidden transition-colors duration-300 hover:border-[#4FB6FF]/40"
          >
            <div
              className="absolute inset-x-0 -top-16 h-32 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
              style={{
                background:
                  "radial-gradient(60% 100% at 50% 0%, rgba(79,182,255,0.18) 0%, rgba(79,182,255,0) 70%)",
              }}
            />
            <p className="relative font-archivo font-black tracking-[-0.02em] text-[24px] sm:text-[22px] lg:text-[28px] leading-none">
              {p.accent ? (
                <span className="bg-gradient-to-r from-[#4FB6FF] to-[#025eba] bg-clip-text text-transparent">
                  {p.big}
                </span>
              ) : (
                <span className="text-white">{p.big}</span>
              )}
            </p>
            <p className="relative mt-3 font-outfit text-white/60 text-[13px] sm:text-[14px] leading-snug">
              {p.small}
            </p>
          </div>
        ))}
      </div>

      {/* Urgency + CTA — one modular unit */}
      <div
        className="mt-12 md:mt-14 mx-auto max-w-[820px] rounded-3xl border border-white/10 bg-white/[0.03] p-8 sm:p-11"
        data-testid="launch-urgency"
      >
        <p className="font-outfit text-[14px] sm:text-[15px] text-white/65">
          Agents are already instructing surveys this week.
        </p>
        <p className="mt-3 font-archivo font-bold text-white text-[21px] sm:text-[26px] leading-[1.3] tracking-[-0.015em]">
          The only question is whether you{" "}
          <span className="text-[#4FB6FF]">lead in your town</span> or wait for
          your competitors to catch up.
        </p>
        <div
          className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4"
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
    </div>
  </section>
);

export default function LaunchPage() {
  return <IntroPage topSection={<LaunchTop />} />;
}
