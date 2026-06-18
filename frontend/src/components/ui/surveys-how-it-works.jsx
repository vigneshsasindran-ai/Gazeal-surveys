import React from "react";
import { FileSignature, ClipboardCheck, Banknote } from "lucide-react";

/*
 * Section 3 — "How It Works"
 *
 * White panel inside a cream page. Three numbered steps presented as a
 * left-aligned vertical sequence on mobile and a staggered three-up grid on
 * desktop. The headline "Order on day one, pay at the end" is the anchor.
 *
 * Avoids: uniform cards centered with equal padding (AI slop), purple/blue
 * gradients. Uses sharp asymmetric step blocks with #025eba numerals and a
 * single hairline rule connecting them on desktop.
 */

const STEPS = [
  {
    n: "01",
    icon: FileSignature,
    title: "Order on day one",
    body: "When you list with a Gazeal-approved agent, the survey order is placed the moment the property goes live. No chasing, no waiting for an offer.",
    meta: "Listing day",
  },
  {
    n: "02",
    icon: ClipboardCheck,
    title: "RPSA surveyor visits the seller",
    body: "A regulated, independent RPSA surveyor books directly with the seller. The full condition report is uploaded to the listing for every serious buyer to read.",
    meta: "Within 7 days",
  },
  {
    n: "03",
    icon: Banknote,
    title: "Pay at the end",
    body: "The survey fee settles at completion out of sale proceeds. Sellers carry zero up-front cost. If completion happens, the survey was already on file.",
    meta: "At completion",
  },
];

const Step = ({ n, icon: Icon, title, body, meta, last }) => (
  <div
    className="relative flex flex-col gap-4 group"
    data-testid={`how-step-${n}`}
  >
    {/* Numeral */}
    <div className="flex items-center gap-3">
      <span
        className="font-archivo font-bold text-[44px] sm:text-[52px] leading-none tracking-[-0.04em]"
        style={{ color: "#025eba" }}
      >
        {n}
      </span>
      <span
        className="inline-flex h-11 w-11 items-center justify-center rounded-2xl transition-transform duration-500 group-hover:-rotate-3"
        style={{
          background: "#EAF2FF",
          color: "#025eba",
        }}
        aria-hidden="true"
      >
        <Icon className="w-5 h-5" strokeWidth={2.2} />
      </span>
    </div>

    <h3 className="font-archivo font-semibold text-[22px] sm:text-[24px] leading-[1.15] tracking-[-0.02em] text-[#0B1220]">
      {title}
    </h3>

    <p className="font-outfit text-[15px] leading-[1.6] text-[#4A5260] max-w-[42ch]">
      {body}
    </p>

    <span className="mt-auto inline-flex items-center gap-2 font-outfit text-[11px] font-semibold tracking-[0.16em] uppercase text-[#6B7280]">
      <span
        className="inline-block h-[6px] w-[6px] rounded-full"
        style={{ background: "#025eba" }}
      />
      {meta}
    </span>

    {/* Connector line on desktop, except for last */}
    {!last && (
      <span
        className="hidden lg:block absolute top-[26px] left-[calc(100%-12px)] w-[calc(100%-40px)] h-px"
        style={{ background: "rgba(11,18,32,0.12)" }}
        aria-hidden="true"
      />
    )}
  </div>
);

const SurveysHowItWorks = () => {
  return (
    <section
      id="how-it-works"
      className="relative w-full"
      style={{ backgroundColor: "#F7F4EE" }}
      data-testid="surveys-how-it-works"
    >
      <div className="max-w-[1280px] mx-auto px-6 lg:px-12 pb-20 lg:pb-28">
        {/* Header */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-end mb-12 lg:mb-16">
          <div className="lg:col-span-7">
            <div className="flex items-center gap-2 mb-5">
              <span
                className="inline-block h-[6px] w-[6px] rounded-full"
                style={{ background: "#025eba" }}
              />
              <span className="font-outfit text-[12px] font-semibold tracking-[0.18em] uppercase text-[#025eba]">
                How it works
              </span>
            </div>
            <h2
              className="font-archivo font-bold text-[#0B1220] tracking-[-0.025em] leading-[1.04] text-[36px] sm:text-[44px] lg:text-[52px]"
              data-testid="how-it-works-headline"
            >
              Order on day one.
              <br />
              Pay at the end.
            </h2>
          </div>

          <div className="lg:col-span-5">
            <p className="font-outfit text-[16px] sm:text-[17px] leading-[1.6] text-[#4A5260] max-w-[44ch]">
              A surveyor that operates like a normal supplier in the chain —
              ordered up front, paid on completion, fully RPSA regulated. Three
              steps, zero seller risk.
            </p>
          </div>
        </div>

        {/* White panel */}
        <div
          className="relative rounded-[28px] bg-white overflow-hidden"
          style={{
            border: "1px solid rgba(11,18,32,0.08)",
          }}
        >
          <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-[rgba(11,18,32,0.08)]">
            {STEPS.map((s, i) => (
              <div key={s.n} className="p-8 sm:p-10">
                <Step
                  n={s.n}
                  icon={s.icon}
                  title={s.title}
                  body={s.body}
                  meta={s.meta}
                  last={i === STEPS.length - 1}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default SurveysHowItWorks;
