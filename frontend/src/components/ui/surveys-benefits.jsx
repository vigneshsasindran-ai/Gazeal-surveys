import React from "react";

/*
 * "Both sides covered" — buyer + seller benefits
 *
 * No icons. Two modular columns built as side-by-side glass cards. Each
 * column lists numbered benefit groups with a heading + supporting copy.
 * The shared indemnity footer sits underneath the two columns.
 *
 * Design rules:
 *   • Asymmetric: SELLER column is slightly emphasised (it's the audience
 *     the agent talks to first), but both columns share the same vertical
 *     rhythm so the eye reads them as a true pair.
 *   • No AI slop: no icons, no purple gradients, no equal-padding bento.
 *     Just headings, copy and a hairline between rows.
 */

const SELLER_BENEFITS = [
  {
    title: "No upfront cost",
    body: "Your seller pays nothing on the day. The survey is arranged at listing and only settles when the sale completes — so the biggest objection to ordering a survey early disappears.",
  },
  {
    title: "Nothing to pay if the sale falls through",
    body: "If the buyer walks away unreasonably, the seller does not pay for the survey. They keep the report on file ready for the next serious offer, with zero new spend.",
  },
  {
    title: "Fewer renegotiations after the offer",
    body: "Condition is on the table before a single offer lands. The buyer cannot use the survey as a late-stage haggling tool because everything is already known.",
  },
  {
    title: "A faster, more certain completion",
    body: "Surveys agreed at listing remove the most common cause of fall-through at week six. Less chasing, fewer collapses, and a sale that actually lands.",
  },
];

const BUYER_BENEFITS = [
  {
    title: "Stop paying for surveys on houses you never buy",
    body: "Buyers in England often spend hundreds of pounds on a survey for a property they never end up purchasing. With Gazeal Surveys the report is already on the listing — read it before you offer, not after.",
  },
  {
    title: "Offer with confidence, not nerves",
    body: "A professionally accredited condition survey is in your hands before you make a bid. You know what you're buying, so you can offer with conviction and move quickly when it counts.",
  },
  {
    title: "An independent surveyor, not the seller's pick",
    body: "Surveys are carried out by accredited surveyors from the Residential Property Surveyors Association. They are commissioned independently, so the report you read is one you can trust.",
  },
  {
    title: "Faster path from offer to completion",
    body: "Condition data is already on file. Your conveyancer has fewer surprises to chase, your lender's valuation runs in parallel, and the timeline from offer to keys shortens by weeks.",
  },
];

const Column = ({ audience, headline, items, accent }) => (
  <div
    className="relative rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-white/[0.01] backdrop-blur-sm p-8 sm:p-10"
    data-testid={`benefits-${audience.toLowerCase()}-column`}
  >
    <div
      className="absolute inset-x-0 top-0 h-px pointer-events-none"
      style={{
        background:
          "linear-gradient(90deg, transparent 0%, rgba(79,182,255,0.4) 50%, transparent 100%)",
      }}
    />

    <div className="flex items-center justify-between mb-6">
      <span
        className="inline-flex items-center gap-2 font-manrope text-[11px] font-semibold tracking-[0.22em] uppercase"
        style={{ color: accent }}
      >
        <span
          className="inline-block h-[6px] w-[6px] rounded-full"
          style={{ background: accent }}
        />
        For {audience}
      </span>
      <span className="font-manrope text-[11px] tracking-[0.18em] uppercase text-white/35">
        0{items.length}
      </span>
    </div>

    <h3 className="font-didot italic text-white text-[28px] sm:text-[32px] leading-[1.1] mb-8 max-w-[18ch]">
      {headline}
    </h3>

    <ol className="space-y-0">
      {items.map((item, i) => (
        <li
          key={item.title}
          className="grid grid-cols-[44px_1fr] gap-4 py-5"
          style={{
            borderTop:
              i === 0 ? "none" : "1px solid rgba(255,255,255,0.06)",
          }}
          data-testid={`benefits-${audience.toLowerCase()}-item-${i + 1}`}
        >
          <span
            className="font-archivo font-bold text-[18px] leading-none pt-1"
            style={{ color: accent }}
          >
            {String(i + 1).padStart(2, "0")}
          </span>
          <div>
            <p className="font-archivo font-semibold text-white text-[16px] sm:text-[17px] tracking-[-0.01em]">
              {item.title}
            </p>
            <p className="mt-2 font-manrope text-[14px] leading-[1.6] text-white/60">
              {item.body}
            </p>
          </div>
        </li>
      ))}
    </ol>
  </div>
);

const SurveysBenefits = () => {
  return (
    <section
      id="benefits"
      className="relative bg-black pt-4 pb-20 md:pt-6 md:pb-28 overflow-hidden"
      data-testid="surveys-benefits-section"
    >
      {/* Ambient blue glows */}
      <div className="pointer-events-none absolute -right-32 top-1/4 h-[420px] w-[420px] rounded-full bg-[#025eba]/12 blur-3xl opacity-60" />

      <div className="relative mx-auto max-w-3xl lg:max-w-6xl px-6">
        {/* Heading */}
        <div className="mx-auto max-w-3xl text-center mb-12 lg:mb-16">
          <p className="font-manrope text-[11px] sm:text-[12px] font-semibold tracking-[0.22em] uppercase text-[#4FB6FF] mb-4">
            Both sides covered
          </p>
          <h2
            className="font-didot italic leading-[1.12] text-white text-3xl sm:text-4xl lg:text-[44px]"
            data-testid="benefits-headline"
          >
            <span className="text-white">A product that works </span>
            <span className="bg-gradient-to-r from-[#4FB6FF] to-[#025eba] bg-clip-text text-transparent">
              for everyone in the chain.
            </span>
          </h2>
          <p className="mt-5 font-manrope text-[14px] sm:text-[15px] text-white/55 leading-relaxed">
            Surveys usually sit on one side of the table. Gazeal Surveys is
            written for both, with protection that follows the report wherever
            it goes.
          </p>
        </div>

        {/* Two columns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          <Column
            audience="Sellers"
            headline="Show your home is sale-ready, with zero financial risk."
            items={SELLER_BENEFITS}
            accent="#4FB6FF"
          />
          <Column
            audience="Buyers"
            headline="See the condition before you spend a penny."
            items={BUYER_BENEFITS}
            accent="#4FB6FF"
          />
        </div>

        {/* Indemnity footer */}
        <div
          className="mt-8 lg:mt-10 rounded-2xl border border-[#4FB6FF]/20 bg-gradient-to-br from-[#4FB6FF]/[0.06] to-[#025eba]/[0.03] px-7 py-6 sm:py-7 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-6 items-center"
          data-testid="benefits-indemnity"
        >
          <div>
            <p className="font-archivo font-bold text-[11px] tracking-[0.22em] uppercase text-[#4FB6FF] mb-2">
              Indemnified both sides
            </p>
            <p className="font-manrope text-[14px] sm:text-[15px] text-white/80 leading-relaxed max-w-[68ch]">
              The Gazeal Survey is professionally accredited and indemnifies{" "}
              <span className="text-white font-semibold">both the seller and the buyer</span>.
              Neither party is left exposed by relying on the report — they
              are covered by the surveyor&apos;s professional standing, not by
              any party in the transaction.
            </p>
          </div>
          <div className="flex items-center gap-4 md:flex-col md:items-end md:gap-1 md:text-right">
            <span className="font-archivo font-bold text-[11px] tracking-[0.22em] uppercase text-white/60">
              Carried out by
            </span>
            <span className="font-archivo font-bold text-[15px] tracking-[-0.01em] text-white">
              RPSA accredited surveyors
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SurveysBenefits;
