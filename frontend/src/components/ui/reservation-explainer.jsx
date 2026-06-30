import React, { useState } from "react";
import { Check, X, ShieldCheck, AlertTriangle, ArrowRight } from "lucide-react";

/*
 * Reservation Agreement explainer — a modular, side-by-side comparison
 * between selling WITH a Gazeal Reservation Agreement and WITHOUT one,
 * plus the survey-fee terms in each scenario.
 *
 * Two surfaces use this:
 *   1. The seller agreement page — `variant="seller"` shows the interest
 *      checkbox + submit so the seller can ask Gazeal for more info.
 *   2. The landing page "Survey It. Reserve It." section —
 *      `variant="agent"` reframes the headline + drops the seller form.
 */

const WITH_BENEFITS = [
  "Buyer is committed to the sale",
  "No gazundering or late price renegotiations",
  "Compensation guaranteed by Gazeal if the buyer pulls out unreasonably",
];

const WITHOUT_RISKS = [
  "Buyer may not be committed to the sale",
  "Gazundering and price renegotiations at any point",
  "No compensation if the sale falls through",
];

const FEES_WITH = [
  "Pay nothing if the buyer pulls out unreasonably",
  "Pay nothing if the sale ends for a fair reason — bad survey, title problem, failed mortgage or broken chain",
  "You only pay on completion, or if you pull out of the sale unreasonably",
];

const FEES_WITHOUT = [
  "Survey fee becomes payable six months after instruction if no sale completes",
  "No protection against renegotiation on the back of the survey",
];

const Column = ({ tone, title, eyebrow, benefits, fees, icon: Icon, testid }) => {
  const isPositive = tone === "with";
  return (
    <div
      className={`relative rounded-2xl border p-7 sm:p-8 backdrop-blur-sm transition-all duration-500 ${
        isPositive
          ? "border-[#4FB6FF]/35 bg-gradient-to-b from-[#4FB6FF]/[0.08] to-[#025eba]/[0.02] hover:border-[#4FB6FF]/55"
          : "border-white/10 bg-white/[0.02] hover:border-white/20"
      }`}
      data-testid={testid}
    >
      {isPositive && (
        <div className="absolute -top-3 left-7 px-2.5 py-1 rounded-full text-[10px] tracking-[0.18em] uppercase font-outfit font-bold text-white"
             style={{ background: "linear-gradient(135deg,#4FB6FF,#025eba)" }}>
          Recommended
        </div>
      )}

      <div className="flex items-start justify-between mb-5">
        <div>
          <p className={`font-outfit font-semibold text-[10px] tracking-[0.22em] uppercase mb-2 ${
            isPositive ? "text-[#4FB6FF]" : "text-white/45"
          }`}>{eyebrow}</p>
          <h3 className="font-archivo font-bold text-white text-[22px] sm:text-[24px] leading-[1.15] tracking-[-0.015em] max-w-[18ch]">
            {title}
          </h3>
        </div>
        <span className={`shrink-0 inline-flex h-10 w-10 items-center justify-center rounded-xl ${
          isPositive
            ? "bg-gradient-to-br from-[#4FB6FF] to-[#025eba] shadow-[0_6px_22px_rgba(2,94,186,0.4)]"
            : "bg-white/[0.05] border border-white/10"
        }`}>
          <Icon className="w-5 h-5 text-white" strokeWidth={2.2} />
        </span>
      </div>

      <ul className="space-y-3 mb-6">
        {benefits.map((b) => (
          <li key={b} className="flex items-start gap-2.5">
            <span className={`mt-0.5 inline-flex h-4.5 w-4.5 items-center justify-center rounded-full shrink-0 ${
              isPositive ? "bg-[#4FB6FF]/15" : "bg-white/[0.06]"
            }`} style={{ height: 18, width: 18 }}>
              {isPositive ? (
                <Check className="w-3 h-3 text-[#4FB6FF]" strokeWidth={3} />
              ) : (
                <X className="w-3 h-3 text-white/45" strokeWidth={3} />
              )}
            </span>
            <span className="font-outfit text-[14px] leading-[1.55] text-white/80">{b}</span>
          </li>
        ))}
      </ul>

      <div className={`pt-5 border-t ${isPositive ? "border-[#4FB6FF]/15" : "border-white/[0.06]"}`}>
        <p className={`font-outfit font-semibold text-[10px] tracking-[0.22em] uppercase mb-3 ${
          isPositive ? "text-[#4FB6FF]" : "text-white/45"
        }`}>Survey fee</p>
        <ul className="space-y-2.5">
          {fees.map((f) => (
            <li key={f} className="flex items-start gap-2.5">
              <span className={`mt-1.5 h-1 w-1 rounded-full shrink-0 ${
                isPositive ? "bg-[#4FB6FF]" : "bg-white/30"
              }`} />
              <span className="font-outfit text-[13px] leading-[1.6] text-white/65">{f}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

const ReservationExplainer = ({ variant = "seller", token, initialInterest = false }) => {
  const isSeller = variant === "seller";
  const [interested, setInterested] = useState(initialInterest);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(initialInterest);
  const [err, setErr] = useState("");

  const submitInterest = async () => {
    if (!interested || !token) return;
    setSubmitting(true);
    setErr("");
    try {
      const res = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}/api/agreements/${token}/express-interest`,
        { method: "POST" }
      );
      if (!res.ok) throw new Error("failed");
      setSubmitted(true);
    } catch {
      setErr("We couldn't record that just now — please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section
      className="relative"
      data-testid={`reservation-explainer-${variant}`}
    >
      <div className="text-center max-w-2xl mx-auto mb-10">
        <p className="font-outfit font-semibold text-[11px] tracking-[0.22em] uppercase text-[#4FB6FF] mb-3">
          {isSeller ? "Before you go" : "Pair it with"}
        </p>
        <h2 className="font-archivo font-bold text-white text-3xl sm:text-4xl lg:text-[42px] leading-[1.1] tracking-[-0.025em]">
          {isSeller ? (
            <>What a <span className="bg-gradient-to-r from-[#4FB6FF] to-[#025eba] bg-clip-text text-transparent">Reservation Agreement</span> does for you.</>
          ) : (
            <>Survey it. Then <span className="bg-gradient-to-r from-[#4FB6FF] to-[#025eba] bg-clip-text text-transparent">reserve it</span>.</>
          )}
        </h2>
        <p className="mt-4 font-outfit text-[15px] sm:text-[16px] text-white/65 leading-[1.6] max-w-xl mx-auto">
          {isSeller
            ? "Two ways to sell. The right Reservation Agreement protects you, your sale, and your survey fee."
            : "An upfront survey takes the surprises off the table. A Gazeal Reservation Agreement keeps the buyer committed. Together they protect more of your pipeline."}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:gap-6">
        <Column
          tone="with"
          eyebrow="With Reservation Agreement"
          title="Commitment, protection, no fee surprises"
          icon={ShieldCheck}
          benefits={WITH_BENEFITS}
          fees={FEES_WITH}
          testid={`re-${variant}-with`}
        />
        <Column
          tone="without"
          eyebrow="Without Reservation Agreement"
          title="Standard sale, no safety net"
          icon={AlertTriangle}
          benefits={WITHOUT_RISKS}
          fees={FEES_WITHOUT}
          testid={`re-${variant}-without`}
        />
      </div>

      {isSeller && token && (
        <div className="mt-8 rounded-2xl border border-[#4FB6FF]/25 bg-[#4FB6FF]/[0.04] p-6 sm:p-7"
             data-testid="re-interest-card">
          {submitted ? (
            <div className="flex items-start gap-3" data-testid="re-interest-submitted">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full shrink-0"
                    style={{ background: "linear-gradient(135deg,#4FB6FF,#025eba)" }}>
                <Check className="w-4 h-4 text-white" strokeWidth={3} />
              </span>
              <div>
                <p className="font-archivo font-bold text-white text-[15px]">Thanks &mdash; we&apos;ll be in touch shortly.</p>
                <p className="mt-1 font-outfit text-[13px] text-white/65">We&apos;ll email you details on how a Gazeal Reservation Agreement could help protect your sale.</p>
              </div>
            </div>
          ) : (
            <>
              <label className="flex items-start gap-3 cursor-pointer select-none"
                     data-testid="re-interest-label">
                <input
                  type="checkbox"
                  checked={interested}
                  onChange={(e) => setInterested(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-white/30 bg-white/[0.06] accent-[#025eba] cursor-pointer"
                  data-testid="re-interest-checkbox"
                />
                <span>
                  <span className="block font-archivo font-bold text-white text-[15px]">I&apos;d like to know more about Gazeal Reservation Agreements.</span>
                  <span className="block mt-1 font-outfit text-[13px] text-white/65">Tick to ask Gazeal to send you details on how a Reservation Agreement could help protect your sale and your survey fee.</span>
                </span>
              </label>
              <div className="mt-5 flex items-center gap-3">
                <button
                  type="button"
                  onClick={submitInterest}
                  disabled={!interested || submitting}
                  className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 font-outfit font-semibold text-[13px] text-white disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
                  style={{
                    background: "linear-gradient(135deg,#4FB6FF,#025eba)",
                    boxShadow: "0 6px 22px rgba(2,94,186,0.4)",
                  }}
                  data-testid="re-interest-submit"
                >
                  {submitting ? "Sending…" : "Send me details"}
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                {err && (
                  <span className="font-outfit text-[12px] text-[#FF8A8A]" data-testid="re-interest-error">{err}</span>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
};

export default ReservationExplainer;
