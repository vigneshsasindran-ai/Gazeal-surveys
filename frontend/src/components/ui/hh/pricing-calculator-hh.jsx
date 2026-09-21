import React, { useEffect, useMemo, useState } from "react";

/*
 * Reusable pricing calculator — used on /pricing and on the seller
 * agreement page. Same on-brand look, same pricing lookup, no CTA/summary
 * chrome outside the calculator itself so it can slot into either page.
 *
 * Props
 *   - variant?: "default" | "embedded"
 *       "default"   — wrapped in the full grid (controls + summary card)
 *       "embedded"  — tighter framing for the agreement page
 *   - initialValue?, initialBeds?, initialListed? — starting selections
 *   - showBandChip?: boolean — show the "£1M – £2M" hint above the input
 */

const PRICE_MATRIX = [
  [776, 1006, 1374],
  [1006, 1235, 1604],
  [1235, 1466, 1834],
  [1718, 2063, 2408],
];

const PROP_BANDS = [
  { label: "Up to £999,999", min: 0, max: 999_999, tier: 0 },
  { label: "£1,000,000 – £1,499,999", min: 1_000_000, max: 1_499_999, tier: 1 },
  { label: "£1,500,000 – £1,999,999", min: 1_500_000, max: 1_999_999, tier: 2 },
  { label: "£2,000,000 – £2,499,999", min: 2_000_000, max: 2_499_999, tier: 3 },
  { label: "Above £2,500,000", min: 2_500_000, max: Infinity, tier: null },
];
const BED_OPTS = [
  { label: "1 to 3", tier: 0 },
  { label: "4 to 5", tier: 1 },
  { label: "6+", tier: 2 },
];
const LISTED_OPTS = [
  { label: "N/A", add: 0 },
  { label: "Grade 2 or 2*", add: 200 },
  { label: "Grade 1", add: null },
];

const SLIDER_MIN = 100_000;
const SLIDER_MAX = 2_500_000;
const SLIDER_STEP = 1_000;
const VALUE_HARD_MAX = 100_000_000;

const formatMoney = (n) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(n);
const formatFee = (n) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.round(n));

function priceFor({ value, beds, listed }) {
  const propBand = PROP_BANDS.find((b) => value >= b.min && value <= b.max);
  const bedOpt = BED_OPTS.find((b) => b.label === beds);
  const listedOpt = LISTED_OPTS.find((l) => l.label === listed);
  if (!propBand || !bedOpt || !listedOpt) return { quote: true };
  if (propBand.tier == null || listedOpt.add == null) {
    return { quote: true, band: propBand.label };
  }
  const total = PRICE_MATRIX[propBand.tier][bedOpt.tier] + listedOpt.add;
  return { quote: false, price: total, band: propBand.label };
}

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
              ? "text-[#0E1748] border-transparent"
              : "text-white/70 border-white/10 bg-white/[0.03] hover:border-white/25 hover:text-white"
          }`}
          style={active ? {
            background: "#DEA39D",
            boxShadow: "0 6px 22px rgba(14,23,72,0.4)",
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

const PricingCalculator = ({
  initialValue = null,
  initialBeds = BED_OPTS[0].label,
  initialListed = LISTED_OPTS[0].label,
  variant = "default",
  testidPrefix = "pricing",
  requireTouch = false,
  onChange,
}) => {
  const [value, setValue] = useState(initialValue ?? 600_000);
  const [beds, setBeds] = useState(initialBeds);
  const [listed, setListed] = useState(initialListed);
  const [inputText, setInputText] = useState(initialValue != null ? formatMoney(initialValue) : "");
  const [touched, setTouched] = useState(initialValue != null && !requireTouch);

  const setValueFromNumber = (n) => {
    const clamped = Math.max(0, Math.min(VALUE_HARD_MAX, Math.round(n || 0)));
    setValue(clamped);
    setInputText(formatMoney(clamped));
  };
  const onTextChange = (e) => {
    setTouched(true);
    const raw = e.target.value;
    setInputText(raw);
    const digits = raw.replace(/[^0-9]/g, "");
    if (digits.length === 0) return;
    const n = parseInt(digits, 10);
    if (Number.isFinite(n)) setValue(Math.min(VALUE_HARD_MAX, n));
  };
  const onTextBlur = () => { if (touched) setInputText(formatMoney(value)); };
  const onSliderChange = (e) => { setTouched(true); setValueFromNumber(Number(e.target.value)); };

  const result = useMemo(() => priceFor({ value, beds, listed }), [value, beds, listed]);
  const sliderPct = Math.max(0, Math.min(100, ((Math.min(value, SLIDER_MAX) - SLIDER_MIN) / (SLIDER_MAX - SLIDER_MIN)) * 100));

  useEffect(() => {
    if (typeof onChange === "function") {
      onChange(
        touched
          ? {
              property_value: value,
              bedrooms: beds,
              listed_status: listed,
              band: result.band || null,
              price: result.quote ? null : result.price,
              quote: !!result.quote,
            }
          : null
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, beds, listed, touched]);

  const controlsCard = (
    <div
      className={`rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-sm p-6 sm:p-8 ${variant === "embedded" ? "" : ""}`}
      data-testid={`${testidPrefix}-controls`}
    >
      <div className="space-y-8">
        <Field label="Property value" hint={result.band || "\u00A0"}>
          <div className="flex items-center gap-3 mb-4">
            <span className="font-archivo font-bold text-white text-3xl sm:text-4xl tracking-[-0.02em] shrink-0">£</span>
            <input
              type="text"
              inputMode="numeric"
              value={inputText.startsWith("£") ? inputText.slice(1).trim() : inputText}
              onChange={onTextChange}
              onBlur={onTextBlur}
              placeholder="Enter property value"
              className="w-full bg-transparent font-archivo font-bold text-white text-3xl sm:text-4xl tracking-[-0.02em] border-b border-white/10 focus:border-[#DEA39D] focus:outline-none pb-1 transition-colors placeholder:font-outfit placeholder:font-medium placeholder:text-[17px] sm:placeholder:text-[19px] placeholder:text-white/40 placeholder:tracking-normal"
              aria-label="Property value in GBP"
              data-testid={`${testidPrefix}-value-input`}
            />
            <span className="font-outfit text-[12px] text-white/45 whitespace-nowrap">up to £2.5M+</span>
          </div>
          <div className="relative h-6">
            <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-white/10 pointer-events-none" />
            <div
              className="absolute left-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full pointer-events-none"
              style={{
                width: `${sliderPct}%`,
                background: "#DEA39D",
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
              data-testid={`${testidPrefix}-value-slider`}
            />
          </div>
          <div className="mt-2 flex justify-between font-outfit text-[11px] text-white/40">
            <span>{formatMoney(SLIDER_MIN)}</span>
            <span>£1M</span>
            <span>£1.5M</span>
            <span>£2M+</span>
          </div>
        </Field>

        <Field label="Bedrooms">
          <Segmented options={BED_OPTS} value={beds} onChange={(v) => { setTouched(true); setBeds(v); }} testid={`${testidPrefix}-beds`} />
        </Field>

        <Field label="Registered Listed Building">
          <Segmented options={LISTED_OPTS} value={listed} onChange={(v) => { setTouched(true); setListed(v); }} testid={`${testidPrefix}-listed`} />
        </Field>
      </div>
    </div>
  );

  const summaryCard = (
    <div
      className="rounded-3xl p-6 sm:p-8 relative overflow-hidden"
      style={{ background: "#0E1748" }}
      data-testid={`${testidPrefix}-summary`}
    >
      <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-[#DEA39D]/25 blur-3xl" />
      <div className="relative flex items-start justify-between gap-3">
        <p className="font-outfit font-semibold text-[11px] tracking-[0.22em] uppercase text-white/70">Your survey fee</p>
        <span
          className="shrink-0 rounded-full border border-white/25 bg-white/10 px-3 py-1 font-outfit font-semibold text-[10.5px] tracking-[0.06em] uppercase text-white/90"
          data-testid={`${testidPrefix}-vat-badge`}
        >
          All prices include VAT
        </span>
      </div>

      {!touched ? (
        <>
          <p className="relative mt-4 font-archivo font-bold text-white text-4xl sm:text-5xl leading-[1.05] tracking-[-0.025em]" data-testid={`${testidPrefix}-unset-label`}>
            Set your<br/>property value
          </p>
          <p className="relative mt-4 font-outfit text-[14px] text-white/80 leading-relaxed">
            Use the slider or type your property value, then choose bedrooms and listed status to see the survey fee Harrisons Homes covers for you.
          </p>
        </>
      ) : result.quote ? (
        <>
          <p className="relative mt-4 font-archivo font-bold text-white text-4xl sm:text-5xl leading-[1.05] tracking-[-0.025em]" data-testid={`${testidPrefix}-quote-label`}>
            Bespoke<br/>quote
          </p>
          <p className="relative mt-4 font-outfit text-[14px] text-white/80 leading-relaxed">
            Your combination sits outside our standard bands. We&apos;ll arrange a tailored quote from our accredited surveyor panel.
          </p>
        </>
      ) : (
        <>
          <p className="relative mt-3 font-archivo font-bold text-white text-5xl sm:text-[56px] leading-none tracking-[-0.03em]" data-testid={`${testidPrefix}-price`}>
            {formatFee(result.price)}
          </p>
          <p className="relative mt-3 font-outfit text-[13px] text-white/75">
            Harrisons Homes pays this fee for you. There is no cost to you, now or later.
          </p>
        </>
      )}

      <div className="relative mt-6 pt-5 border-t border-white/15 space-y-2 font-outfit text-[13px] text-white/85">
        <div className="flex justify-between"><span>Value band</span><span className="font-semibold">{result.band || "-"}</span></div>
        <div className="flex justify-between"><span>Bedrooms</span><span className="font-semibold">{beds}</span></div>
        <div className="flex justify-between"><span>Registered Listed Building</span><span className="font-semibold">{listed}</span></div>
      </div>

      <div
        className="relative mt-5 pt-4 border-t border-white/10 space-y-1.5 font-outfit text-[11.5px] leading-[1.55] text-white/60"
        data-testid={`${testidPrefix}-disclaimers`}
      >
        <p>This price is based on the information you have provided.</p>
        <p>The Estate Agent sets the valuation price, not the surveyor.</p>
      </div>
    </div>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start" data-testid={`${testidPrefix}-calculator`}>
      <div className="lg:col-span-3">{controlsCard}</div>
      <div className="lg:col-span-2">{summaryCard}</div>
    </div>
  );
};

export default PricingCalculator;
