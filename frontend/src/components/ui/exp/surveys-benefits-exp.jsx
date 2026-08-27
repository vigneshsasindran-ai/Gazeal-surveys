import React from "react";
import { ArrowRight, ClipboardList, Send, FileCheck } from "lucide-react";

/*
 * "Here's how it works"
 *
 * Section flow:
 *   1. Three-step ordering process — modular cards, animated connectors,
 *      hover lift + glow.
 *   2. Two columns underneath: "For sellers" / "For buyers" benefits with
 *      a designed segmented label instead of the AI-generic uppercase eyebrow.
 *   3. RPSA logo strip at the bottom covering indemnity.
 */

const RPSA_LOGO =
  "https://customer-assets.emergentagent.com/job_survey-pro-10/artifacts/k6oyoxt0_logo-white.png";

const STEPS = [
  {
    icon: ClipboardList,
    title: "Order your survey",
    body: "Tell us about you, your property and your eXp UK agent. It takes a couple of minutes, and you sign your agreement online there and then.",
  },
  {
    icon: Send,
    title: "A surveyor comes to you",
    body: "RPSA contacts you directly and arranges a convenient visit from an accredited surveyor. Once the report is ready, it comes back to you and your eXp UK agent.",
  },
  {
    icon: FileCheck,
    title: "Buyers offer with confidence",
    body: "Your agent shares the report with interested buyers so they can offer knowing your home's real condition. Fewer surprises later, fewer renegotiations, and a stronger sale from the start.",
  },
];

const SELLER_COPY =
  "When used with a Gazeal Reservation Agreement, you can order an upfront survey without paying on day one. The survey fee is settled at completion or within six months, whichever comes first. If the buyer pulls out unreasonably, or if either party withdraws for a valid reason under the agreement, you do not pay. Buyers get the condition information before they offer, which means fewer late surprises, less renegotiation, and a sale that has a much better chance of completing.";

const BUYER_COPY =
  "An upfront survey gives your buyer key condition information before they make an offer. Instead of waiting weeks and then discovering a problem later, they can see the report at the start and offer with more confidence. The survey is carried out by an accredited RPSA surveyor, so your buyer gets a clearer view of the property before committing to the sale. With the condition known upfront, there are fewer surprises, less back and forth, and a much smoother route to completion.";

const StepCard = ({ index, icon: Icon, title, body }) => (
  <div
    className="group relative"
    data-testid={`how-step-${index + 1}`}
  >
    <div
      className="relative h-full rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-white/[0.01] backdrop-blur-sm p-7 sm:p-8 overflow-hidden transition-all duration-500 hover:-translate-y-1 hover:border-[#B9BFD6]/35"
      style={{
        boxShadow: "0 0 0 rgba(12,15,37,0)",
      }}
    >
      {/* Top hairline shimmer */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#B9BFD6]/40 to-transparent pointer-events-none" />

      {/* Hover glow */}
      <div
        className="pointer-events-none absolute -inset-12 opacity-0 group-hover:opacity-100 transition-opacity duration-700"
        style={{
          background:
            "radial-gradient(40% 40% at 30% 0%, rgba(184,171,132,0.18) 0%, rgba(12,15,37,0) 70%)",
        }}
      />

      {/* Step number + icon row */}
      <div className="relative flex items-center justify-between mb-6">
        <span
          className="font-archivo font-bold text-[44px] leading-none tracking-[-0.04em] bg-clip-text text-transparent transition-all duration-500"
          style={{
            backgroundImage: "#B9BFD6",
          }}
        >
          {String(index + 1).padStart(2, "0")}
        </span>
        <span
          className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] transition-all duration-500 group-hover:border-[#B9BFD6]/40 group-hover:bg-[#B9BFD6]/[0.08] group-hover:-rotate-6"
        >
          <Icon
            className="w-5 h-5 text-[#B9BFD6]"
            strokeWidth={2.2}
          />
        </span>
      </div>

      <h3 className="relative font-archivo font-bold tracking-[-0.02em] text-white text-[20px] sm:text-[22px] leading-[1.2]">
        {title}
      </h3>
      <p className="relative mt-3 font-outfit text-[14px] sm:text-[15px] leading-[1.65] text-white/65">
        {body}
      </p>

      {/* Animated underline */}
      <div className="relative mt-6 h-px w-full bg-white/[0.08] overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 w-0 group-hover:w-full transition-all duration-700 ease-out"
          style={{
            background: "#FFFFFF",
          }}
        />
      </div>

      <div className="relative mt-3 flex items-center gap-1.5 text-[12px] font-outfit font-semibold tracking-[0.08em] uppercase text-white/40 group-hover:text-[#B9BFD6] transition-colors duration-500">
        Step {String(index + 1).padStart(2, "0")}
        <ArrowRight className="w-3 h-3 transition-transform duration-500 group-hover:translate-x-0.5" />
      </div>
    </div>
  </div>
);

const SegmentedLabel = ({ audience }) => (
  <div
    className="inline-flex items-center rounded-full p-1 border border-white/10 bg-white/[0.03]"
    data-testid={`benefits-label-${audience.toLowerCase()}`}
  >
    <span className="px-3 py-0.5 text-[10px] tracking-[0.22em] uppercase text-white/55 font-outfit font-semibold">
      For
    </span>
    <span
      className="rounded-full px-3 py-1 text-[11px] tracking-[0.12em] uppercase text-[#0C0F25] font-outfit font-semibold"
      style={{
        background: "#FFFFFF",
        boxShadow: "0 4px 14px rgba(12,15,37,0.35)",
      }}
    >
      {audience}
    </span>
  </div>
);

const BenefitColumn = ({ audience, headline, body }) => (
  <div
    className="relative rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-white/[0.01] backdrop-blur-sm p-8 sm:p-10"
    data-testid={`benefits-${audience.toLowerCase()}-column`}
  >
    <div
      className="absolute inset-x-0 top-0 h-px pointer-events-none"
      style={{
        background:
          "linear-gradient(90deg, transparent 0%, rgba(184,171,132,0.4) 50%, transparent 100%)",
      }}
    />

    <div className="mb-6">
      <SegmentedLabel audience={audience} />
    </div>

    <h3 className="font-archivo font-bold tracking-[-0.025em] text-white text-[26px] sm:text-[30px] leading-[1.15] mb-6 max-w-[20ch]">
      {headline}
    </h3>

    <p
      className="font-outfit text-[15px] sm:text-[16px] leading-[1.75] text-white/70"
      data-testid={`benefits-${audience.toLowerCase()}-body`}
    >
      {body}
    </p>
  </div>
);

const SurveysBenefits = () => {
  return (
    <section
      id="benefits"
      className="relative bg-black pt-4 pb-20 md:pt-6 md:pb-28 overflow-hidden"
      data-testid="surveys-benefits-section"
    >
      <div className="pointer-events-none absolute -right-32 top-1/4 h-[420px] w-[420px] rounded-full bg-[#0C0F25]/12 blur-3xl opacity-60" />
      <div className="pointer-events-none absolute left-0 bottom-1/4 h-[360px] w-[360px] rounded-full bg-[#B9BFD6]/8 blur-3xl opacity-50" />

      <div className="relative mx-auto max-w-3xl lg:max-w-6xl px-6">
        {/* Heading */}
        <div className="mx-auto max-w-3xl text-center mb-12 lg:mb-16">
          <h2
            className="font-archivo font-bold tracking-[-0.025em] leading-[1.1] text-white text-3xl sm:text-4xl lg:text-[44px]"
            data-testid="benefits-headline"
          >
            <span className="text-white">Here&apos;s </span>
            <span className="text-[#B9BFD6]">
              how it works.
            </span>
          </h2>
        </div>

        {/* THREE STEPS with animated connectors */}
        <div className="relative">
          {/* Desktop connector line behind the row */}
          <div
            className="hidden lg:block absolute top-[92px] left-[16%] right-[16%] h-px"
            style={{
              background:
                "linear-gradient(90deg, transparent 0%, rgba(184,171,132,0.25) 20%, rgba(12,15,37,0.25) 80%, transparent 100%)",
            }}
            aria-hidden="true"
          />

          <div className="relative grid grid-cols-1 md:grid-cols-3 gap-5 lg:gap-6">
            {STEPS.map((step, i) => (
              <StepCard
                key={step.title}
                index={i}
                icon={step.icon}
                title={step.title}
                body={step.body}
              />
            ))}
          </div>
        </div>

        {/* Spacer */}
        <div className="h-16 md:h-24" />

        {/* TWO BENEFIT COLUMNS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          <BenefitColumn
            audience="Sellers"
            headline="Show your home is sale ready, with zero financial risk."
            body={SELLER_COPY}
          />
          <BenefitColumn
            audience="Buyers"
            headline="They see the condition before they make an offer."
            body={BUYER_COPY}
          />
        </div>

        {/* Indemnity footer — RPSA logo */}
        <div
          className="mt-8 lg:mt-10 rounded-2xl border border-[#B9BFD6]/20 bg-[#B9BFD6]/[0.05] px-7 py-6 sm:py-7 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-6 items-center"
          data-testid="benefits-indemnity"
        >
          <div>
            <p className="font-archivo font-bold text-[11px] tracking-[0.22em] uppercase text-[#B9BFD6] mb-2">
              Indemnified both sides
            </p>
            <p className="font-outfit text-[14px] sm:text-[15px] text-white/80 leading-[1.65] max-w-[68ch]">
              The survey is professionally accredited and indemnifies{" "}
              <span className="text-white font-semibold">
                both you and your buyer
              </span>
              , so neither side is left exposed by relying on the report.
              Both are covered by the surveyor&apos;s professional standing
              rather than by anyone else in the transaction.
            </p>
          </div>
          <div className="flex flex-col items-start md:items-end gap-2">
            <span className="font-archivo font-bold text-[11px] tracking-[0.22em] uppercase text-white/55">
              Carried out by
            </span>
            <img
              src={RPSA_LOGO}
              alt="Residential Property Surveyors Association"
              className="h-14 sm:h-16 w-auto opacity-90"
              loading="lazy"
              data-testid="benefits-rpsa-logo"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default SurveysBenefits;
