import React, { useMemo, useState } from "react";
import SurveysHeader from "@/components/ui/surveys-header";
import ReservationExplainer from "@/components/ui/reservation-explainer";

/*
 * Pricing page — dark-themed, on-brand survey price calculator.
 *
 *   • Property value slider  (interactive, £-formatted, snaps softly)
 *   • Bedrooms segmented     (1 to 3 · 4 to 5 · 6+)
 *   • Listed status segmented (Not listed · Grade 2 or 2* · Grade 1)
 *
 * The fee is looked up in a matrix (no reveal of net RPSA fee or margin).
 * If any input falls in a "quote" tier (property > £2M · 6+ beds · Grade 1),
 * the price card flips to a friendly "Bespoke quote" state with a CTA to
 * request a tailored price via Order Survey.
 *
 * Below the calculator we reuse the site-wide reservation-explainer boxes
 * so the seller understands *when* the survey fee is due in each scenario.
 */

// Pricing lookup by combined-tier level (propTier + bedTier + listedTier).
// Values taken verbatim from the source pricing spec (no computed floats,
// so we never get 1-penny rounding drift on tier=3 combos).
const PRICE_BY_TIER = [646.88, 838.55, 1030.22, 1221.88, 1413.55];

const PROP_BANDS = [
  { label: "Up to £999,999", min: 0, max: 999_999, tier: 0 },
  { label: "£1,000,000 – £1,499,999", min: 1_000_000, max: 1_499_999, tier: 1 },
  { label: "£1,500,000 – £2,000,000", min: 1_500_000, max: 2_000_000, tier: 2 },
  { label: "Above £2,000,000", min: 2_000_001, max: Infinity, tier: null },
];
const BED_OPTS = [
  { label: "1 to 3", tier: 0 },
  { label: "4 to 5", tier: 1 },
  { label: "6+", tier: null },
];
const LISTED_OPTS = [
  { label: "Not listed", tier: 0 },
  { label: "Grade 2 or 2*", tier: 1 },
  { label: "Grade 1", tier: null },
];

const SLIDER_MIN = 100_000;
const SLIDER_MAX = 2_500_000;
const SLIDER_STEP = 1_000;
const VALUE_HARD_MAX = 100_000_000; // typed values allowed above slider max (kicks in "quote")

const formatMoney = (n) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(n);
const formatFee = (n) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

function priceFor({ value, beds, listed }) {
  const propBand = PROP_BANDS.find((b) => value >= b.min && value <= b.max);
  const bedOpt = BED_OPTS.find((b) => b.label === beds);
  const listedOpt = LISTED_OPTS.find((l) => l.label === listed);
  if (!propBand || !bedOpt || !listedOpt) return { quote: true };
  if (propBand.tier == null || bedOpt.tier == null || listedOpt.tier == null) {
    return { quote: true, band: propBand.label };
  }
  const total = PRICE_BY_TIER[propBand.tier + bedOpt.tier + listedOpt.tier];
  return { quote: false, price: total, band: propBand.label };
}

// ---- Small building blocks (kept minimal, on-brand) ----
const Segmented = ({ options, value, onChange, testid }) => (
  <div className="grid grid-cols-3 gap-2 sm:gap-3" data-testid={testid}>
    {options.map((o) => {
      const active = value === o.label;
      return (
        <button
          key={o.label}
          type="button"
          onClick={() => onChange(o.label)}
          className={`relative px-3 py-3 rounded-xl font-outfit font-semibold text-[13px] sm:text-[14px] transition-all border ${
            active
              ? "text-white border-transparent"
              : "text-white/70 border-white/10 bg-white/[0.03] hover:border-white/25 hover:text-white"
          }`}
          style={active ? {
            background: "linear-gradient(135deg,#4FB6FF,#025eba)",
            boxShadow: "0 6px 22px rgba(2,94,186,0.4)",
          } : undefined}
          data-testid={`${testid}-opt-${o.label.replace(/\s+/g,"-").toLowerCase()}`}
        >
          {o.label}
        </button>
      );
    })}
  </div>
);

const Field = ({ label, hint, children }) => (
  <div>
    <div className="flex items-center justify-between mb-2">
      <span className="font-outfit font-semibold text-[11px] tracking-[0.22em] uppercase text-white/55">
        {label}
      </span>
      {hint && <span className="font-outfit text-[12px] text-white/45">{hint}</span>}
    </div>
    {children}
  </div>
);

// ---- Page ----
const PricingPage = () => {
  const [value, setValue] = useState(600_000);
  const [beds, setBeds] = useState(BED_OPTS[0].label);
  const [listed, setListed] = useState(LISTED_OPTS[0].label);
  const [inputText, setInputText] = useState(formatMoney(600_000));

  const setValueFromNumber = (n) => {
    const clamped = Math.max(0, Math.min(VALUE_HARD_MAX, Math.round(n || 0)));
    setValue(clamped);
    setInputText(formatMoney(clamped));
  };

  const onTextChange = (e) => {
    // Allow the user to type freely; only sync the slider when we can parse a number.
    const raw = e.target.value;
    setInputText(raw);
    const digits = raw.replace(/[^0-9]/g, "");
    if (digits.length === 0) return;
    const n = parseInt(digits, 10);
    if (Number.isFinite(n)) setValue(Math.min(VALUE_HARD_MAX, n));
  };

  const onTextBlur = () => setInputText(formatMoney(value));

  const onSliderChange = (e) => setValueFromNumber(Number(e.target.value));

  const result = useMemo(() => priceFor({ value, beds, listed }), [value, beds, listed]);
  const sliderPct = Math.max(0, Math.min(100, ((Math.min(value, SLIDER_MAX) - SLIDER_MIN) / (SLIDER_MAX - SLIDER_MIN)) * 100));

  return (
    <div className="min-h-screen bg-black text-white" data-testid="pricing-page">
      <SurveysHeader />

      <main className="relative pt-32 lg:pt-40 pb-24">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[520px]"
             style={{ background: "radial-gradient(60% 60% at 50% 0%, rgba(2,94,186,0.25) 0%, rgba(2,94,186,0) 60%)" }} />

        <div className="relative max-w-3xl lg:max-w-6xl mx-auto px-6">
          {/* Hero */}
          <div className="max-w-2xl">
            <h1 className="font-archivo font-bold text-4xl sm:text-5xl lg:text-[56px] leading-[1.05] tracking-[-0.025em] text-white">
              Know the price of your survey{" "}
              <span className="bg-gradient-to-r from-[#4FB6FF] to-[#025eba] bg-clip-text text-transparent">before you order.</span>
            </h1>
            <p className="mt-5 font-outfit text-base sm:text-lg text-white/65 leading-relaxed max-w-xl">
              Slide the property value, choose the bedrooms and listed status, and see the survey fee update live. No hidden extras.
            </p>
          </div>

          {/* Calculator + summary grid */}
          <div className="mt-14 grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
            {/* Controls card */}
            <div className="lg:col-span-3 rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-sm p-6 sm:p-8" data-testid="pricing-controls">
              <div className="space-y-8">
                {/* Property value: text input + slider */}
                <Field label="Property value" hint={result.band || "\u00A0"}>
                  <div className="flex items-center gap-3 mb-4">
                    <span className="font-archivo font-bold text-white text-3xl sm:text-4xl tracking-[-0.02em] shrink-0">£</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={inputText.startsWith("£") ? inputText.slice(1).trim() : inputText}
                      onChange={onTextChange}
                      onBlur={onTextBlur}
                      className="w-full bg-transparent font-archivo font-bold text-white text-3xl sm:text-4xl tracking-[-0.02em] border-b border-white/10 focus:border-[#4FB6FF] focus:outline-none pb-1 transition-colors"
                      aria-label="Property value in GBP"
                      data-testid="pricing-value-input"
                    />
                    <span className="font-outfit text-[12px] text-white/45 whitespace-nowrap">up to £2.5M+</span>
                  </div>
                  <div className="relative h-6">
                    <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-white/10 pointer-events-none" />
                    <div
                      className="absolute left-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full pointer-events-none"
                      style={{
                        width: `${sliderPct}%`,
                        background: "linear-gradient(90deg,#4FB6FF 0%,#025eba 100%)",
                      }}
                    />
                    <input
                      type="range"
                      min={SLIDER_MIN}
                      max={SLIDER_MAX}
                      step={SLIDER_STEP}
                      value={Math.min(value, SLIDER_MAX)}
                      onChange={onSliderChange}
                      className="pricing-slider absolute inset-0 w-full h-full appearance-none bg-transparent cursor-pointer"
                      data-testid="pricing-value-slider"
                    />
                  </div>
                  <div className="mt-2 flex justify-between font-outfit text-[11px] text-white/40">
                    <span>{formatMoney(SLIDER_MIN)}</span>
                    <span>£1M</span>
                    <span>£1.5M</span>
                    <span>£2M+</span>
                  </div>
                </Field>

                {/* Bedrooms */}
                <Field label="Bedrooms">
                  <Segmented options={BED_OPTS} value={beds} onChange={setBeds} testid="pricing-beds" />
                </Field>

                {/* Listed status */}
                <Field label="Listed status">
                  <Segmented options={LISTED_OPTS} value={listed} onChange={setListed} testid="pricing-listed" />
                </Field>
              </div>
            </div>

            {/* Summary card */}
            <div className="lg:col-span-2 rounded-3xl p-6 sm:p-8 relative overflow-hidden"
                 style={{ background: "linear-gradient(160deg,#0f2f5c 0%,#025eba 55%,#0a4a9a 100%)" }}
                 data-testid="pricing-summary">
              <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-[#4FB6FF]/25 blur-3xl" />
              <p className="relative font-outfit font-semibold text-[11px] tracking-[0.22em] uppercase text-white/70">Your survey fee</p>

              {result.quote ? (
                <>
                  <p className="relative mt-4 font-archivo font-bold text-white text-4xl sm:text-5xl leading-[1.05] tracking-[-0.025em]" data-testid="pricing-quote-label">
                    Bespoke<br/>quote
                  </p>
                  <p className="relative mt-4 font-outfit text-[14px] text-white/80 leading-relaxed">
                    Your combination sits outside our standard bands. We&apos;ll arrange a tailored quote from our accredited surveyor panel.
                  </p>
                </>
              ) : (
                <>
                  <p className="relative mt-3 font-archivo font-bold text-white text-5xl sm:text-[56px] leading-none tracking-[-0.03em]" data-testid="pricing-price">
                    {formatFee(result.price)}
                  </p>
                  <p className="relative mt-3 font-outfit text-[13px] text-white/75">
                    Payable only when the sale completes. Nothing on the day.
                  </p>
                </>
              )}

              <div className="relative mt-6 pt-5 border-t border-white/15 space-y-2 font-outfit text-[13px] text-white/85">
                <div className="flex justify-between"><span>Value band</span><span className="font-semibold">{result.band || "-"}</span></div>
                <div className="flex justify-between"><span>Bedrooms</span><span className="font-semibold">{beds}</span></div>
                <div className="flex justify-between"><span>Listed status</span><span className="font-semibold">{listed}</span></div>
              </div>
            </div>
          </div>

          {/* Fee-due explainer (reservation w/ vs without) */}
          <div className="mt-20 lg:mt-24 max-w-2xl">
            <p className="font-outfit font-semibold text-[11px] tracking-[0.22em] uppercase text-[#4FB6FF] mb-3">When the fee is due</p>
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
};

export default PricingPage;
