import React from "react";

/*
 * Section 2 — "Why We Built This"
 *
 * Cream off-white surface. Asymmetric two-column layout: a left rail with the
 * section eyebrow + headline + supporting paragraph, and a right card that
 * pits Scotland against England on survey timing.
 *
 * Design rules followed:
 * - Light theme (cream surface, white inner panel) following hero (#025eba) →
 *   off-white transition, no muddy gradients.
 * - 1px hairlines, no decorative drop shadows that read as bevelled cards.
 * - Brand blue (#025eba) used for ribbons, accent numerals & icons only.
 * - Asymmetric: copy column is narrower than the comparison card.
 */

const Tick = ({ className = "" }) => (
  <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
    <path
      d="M4.5 10.5l3.5 3.5 7.5-8"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const Cross = ({ className = "" }) => (
  <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
    <path
      d="M5.5 5.5l9 9M14.5 5.5l-9 9"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
    />
  </svg>
);

const Pill = ({ children, tone = "ink" }) => {
  const styles =
    tone === "blue"
      ? { background: "#025eba", color: "#ffffff" }
      : tone === "lime"
      ? { background: "#DFFB4A", color: "#0B1220" }
      : { background: "#0B1220", color: "#ffffff" };
  return (
    <span
      className="inline-flex items-center rounded-full font-outfit font-semibold text-[10px] tracking-[0.14em] uppercase px-2.5 py-1"
      style={styles}
    >
      {children}
    </span>
  );
};

const TimelineRow = ({
  region,
  flag,
  pill,
  pillTone,
  headline,
  body,
  stat,
  statLabel,
  positive,
}) => (
  <div
    className="relative flex flex-col gap-3 sm:gap-4 px-6 sm:px-8 py-7 sm:py-8"
    data-testid={`why-row-${region.toLowerCase()}`}
  >
    <div className="flex items-center gap-3">
      <span
        className="inline-flex h-9 w-9 items-center justify-center rounded-full text-base"
        style={{
          background: positive ? "#EAF2FF" : "#F2EFE8",
          color: "#0B1220",
        }}
        aria-hidden="true"
      >
        {flag}
      </span>
      <span className="font-archivo font-bold text-[15px] tracking-[-0.01em] text-[#0B1220]">
        {region}
      </span>
      <Pill tone={pillTone}>{pill}</Pill>
    </div>

    <h3 className="font-archivo font-semibold text-[22px] sm:text-[26px] leading-[1.15] tracking-[-0.02em] text-[#0B1220] max-w-[34ch]">
      {headline}
    </h3>

    <p className="font-outfit text-[15px] leading-[1.55] text-[#4A5260] max-w-[52ch]">
      {body}
    </p>

    <div className="mt-2 flex items-baseline gap-3">
      <span
        className="font-archivo font-bold text-[40px] sm:text-[48px] leading-none tracking-[-0.03em]"
        style={{ color: positive ? "#025eba" : "#0B1220" }}
      >
        {stat}
      </span>
      <span className="font-outfit text-[13px] text-[#6B7280] uppercase tracking-[0.14em]">
        {statLabel}
      </span>
      <span
        className="ml-auto inline-flex h-7 w-7 items-center justify-center rounded-full"
        style={{
          background: positive ? "#025eba" : "#0B1220",
          color: "#ffffff",
        }}
        aria-hidden="true"
      >
        {positive ? (
          <Tick className="w-4 h-4" />
        ) : (
          <Cross className="w-4 h-4" />
        )}
      </span>
    </div>
  </div>
);

const SurveysWhyBuilt = () => {
  return (
    <section
      id="why-built"
      className="relative w-full"
      style={{ backgroundColor: "#F7F4EE" }}
      data-testid="surveys-why-built"
    >
      {/* Hairline top transition */}
      <div
        className="h-px w-full"
        style={{ background: "rgba(11,18,32,0.08)" }}
      />

      <div className="max-w-[1280px] mx-auto px-6 lg:px-12 pt-20 lg:pt-28 pb-20 lg:pb-28">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-start">
          {/* Left rail — eyebrow + headline + copy */}
          <div className="lg:col-span-5 lg:sticky lg:top-32">
            <div className="flex items-center gap-2 mb-5">
              <span
                className="inline-block h-[6px] w-[6px] rounded-full"
                style={{ background: "#025eba" }}
              />
              <span className="font-outfit text-[12px] font-semibold tracking-[0.18em] uppercase text-[#025eba]">
                Why we built this
              </span>
            </div>

            <h2
              className="font-archivo font-bold text-[#0B1220] tracking-[-0.025em] leading-[1.04] text-[36px] sm:text-[44px] lg:text-[52px]"
              data-testid="why-built-headline"
            >
              The same house.
              <br />
              Two very different
              <br />
              ways to sell it.
            </h2>

            <p className="mt-6 font-outfit text-[16px] sm:text-[17px] leading-[1.6] text-[#4A5260] max-w-[44ch]">
              In Scotland, a Home Report is on the table the moment a property
              hits the market. In England &amp; Wales, the survey arrives weeks
              after an offer — and that is when most deals fall apart. Gazeal
              Surveys borrows the Scottish playbook so condition is settled
              before the negotiation starts.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Pill tone="blue">Scotland</Pill>
              <Pill tone="ink">England &amp; Wales</Pill>
            </div>

            <div className="mt-8 hidden lg:block">
              <div
                className="h-px w-16"
                style={{ background: "rgba(11,18,32,0.18)" }}
              />
              <p className="mt-5 font-outfit text-[13px] text-[#6B7280] max-w-[36ch]">
                Source: HomeOwners Alliance &amp; Quick Move Now fall-through
                statistics, 2024.
              </p>
            </div>
          </div>

          {/* Right — comparison card */}
          <div className="lg:col-span-7">
            <div
              className="relative overflow-hidden rounded-[28px] bg-white"
              style={{
                boxShadow: "0 1px 0 rgba(11,18,32,0.04)",
                border: "1px solid rgba(11,18,32,0.08)",
              }}
              data-testid="why-built-comparison-card"
            >
              {/* Header strip */}
              <div className="flex items-center justify-between px-6 sm:px-8 py-4 border-b border-[rgba(11,18,32,0.08)]">
                <span className="font-archivo font-semibold text-[14px] tracking-[-0.01em] text-[#0B1220]">
                  Survey timing, by market
                </span>
                <span className="font-outfit text-[11px] tracking-[0.14em] uppercase text-[#6B7280]">
                  2024 data
                </span>
              </div>

              <TimelineRow
                region="Scotland"
                flag="🏴"
                pill="Upfront"
                pillTone="blue"
                headline="Survey is published before the property goes live."
                body="Buyers see the condition, valuation and energy rating before they offer. Negotiation starts from a shared set of facts, not a hidden one."
                stat="~9%"
                statLabel="Fall-through rate"
                positive={true}
              />

              <div
                className="h-px w-full"
                style={{ background: "rgba(11,18,32,0.08)" }}
              />

              <TimelineRow
                region="England"
                flag="🏴󠁧󠁢󠁥󠁮󠁧󠁿"
                pill="After offer"
                pillTone="ink"
                headline="Survey is ordered after the offer — three to six weeks in."
                body="Bad news surfaces deep into the process: re-negotiations, re-marketing and re-starts. Solicitor fees, mortgage surveys and time vanish."
                stat="~32%"
                statLabel="Fall-through rate"
                positive={false}
              />

              {/* Footnote ribbon */}
              <div
                className="px-6 sm:px-8 py-4 flex items-center justify-between gap-4"
                style={{ background: "#025eba" }}
              >
                <p className="font-outfit text-[13px] sm:text-[14px] text-white/95">
                  Gazeal Surveys brings the Scottish model south of the border.
                </p>
                <span className="font-archivo font-bold text-[12px] tracking-[0.16em] uppercase text-white/85 whitespace-nowrap">
                  The Gazeal way
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SurveysWhyBuilt;
