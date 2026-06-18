import React, { useEffect, useState } from "react";
import { X, ChevronLeft, ChevronRight, Check } from "lucide-react";

/*
 * "Learn More" multi-step funnel
 *
 * - Hybrid: 3 educational steps + optional "Notify me" email capture on
 *   the final step.
 * - Light theme, cream surface, brand-blue accents (no purple gradients).
 * - Trapped focus pattern via simple ESC + backdrop click.
 */

const STEPS = [
  {
    eyebrow: "Step 01 — Diagnosis",
    title: "Why English transactions collapse.",
    body: "Roughly 1 in 3 sales in England fall through, costing the seller, the buyer and the chain. The single biggest cause is condition data arriving weeks after an offer, not before.",
    bullets: [
      "Average fall-through rate: ~32%",
      "Average time wasted per failed sale: 6–8 weeks",
      "Average buyer spend on surveys never used: £400–£1,200",
    ],
  },
  {
    eyebrow: "Step 02 — The Scottish model",
    title: "Condition before negotiation.",
    body: "In Scotland, the Home Report is published when the property goes live. Every buyer sees the same data. Offers are made with confidence and fall-through rates sit around 9%.",
    bullets: [
      "Independent surveyor appointed up front",
      "Full report attached to the listing",
      "Buyers and sellers start the negotiation aligned",
    ],
  },
  {
    eyebrow: "Step 03 — How Gazeal Surveys works",
    title: "Order day one. Pay at completion.",
    body: "Gazeal places the survey order on listing day. RPSA-regulated surveyors visit the seller within seven days. The fee settles at completion — and is free if the sale falls through.",
    bullets: [
      "No up-front cost to the seller",
      "Free re-marketing with the same report",
      "RPSA regulated, independent of the agent",
    ],
  },
];

const Progress = ({ index, total }) => (
  <div className="flex items-center gap-2" data-testid="learn-more-progress">
    {Array.from({ length: total }).map((_, i) => (
      <span
        key={i}
        className="h-[3px] rounded-full transition-all duration-500"
        style={{
          width: i === index ? 40 : 20,
          background: i <= index ? "#025eba" : "rgba(11,18,32,0.16)",
        }}
      />
    ))}
  </div>
);

const SurveysLearnMoreModal = ({ open, onClose }) => {
  const [step, setStep] = useState(0);
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  // Reset state when reopening
  useEffect(() => {
    if (open) {
      setStep(0);
      setEmail("");
      setSubmitted(false);
    }
  }, [open]);

  if (!open) return null;

  const total = STEPS.length;
  const isLast = step === total - 1;
  const current = STEPS[step];

  const next = () => setStep((s) => Math.min(s + 1, total - 1));
  const prev = () => setStep((s) => Math.max(s - 1, 0));

  const handleNotify = (e) => {
    e.preventDefault();
    // Front-end only per spec — log to console.
    console.log("[GazealSurveys] Notify-me submission:", { email });
    setSubmitted(true);
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-6"
      role="dialog"
      aria-modal="true"
      data-testid="learn-more-modal"
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-[#0B1220]/55 backdrop-blur-sm"
        onClick={onClose}
        data-testid="learn-more-backdrop"
      />

      {/* Sheet */}
      <div
        className="relative w-full sm:max-w-[640px] bg-[#F7F4EE] rounded-t-[28px] sm:rounded-[28px] overflow-hidden shadow-[0_30px_80px_rgba(0,0,0,0.35)] transition-all"
        style={{ border: "1px solid rgba(11,18,32,0.08)" }}
        data-testid="learn-more-sheet"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 sm:px-8 pt-6">
          <span className="font-outfit text-[12px] font-semibold tracking-[0.18em] uppercase text-[#025eba]">
            {current.eyebrow}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[#0B1220]/60 hover:bg-[#0B1220]/[0.06] hover:text-[#0B1220] transition-all"
            aria-label="Close dialog"
            data-testid="learn-more-close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 sm:px-8 pt-3 pb-2">
          <Progress index={step} total={total} />
        </div>

        {/* Body */}
        <div className="px-6 sm:px-8 pt-4 pb-2">
          <h3 className="font-archivo font-bold text-[26px] sm:text-[30px] leading-[1.12] tracking-[-0.02em] text-[#0B1220] max-w-[22ch]">
            {current.title}
          </h3>
          <p className="mt-4 font-outfit text-[15px] leading-[1.6] text-[#4A5260] max-w-[58ch]">
            {current.body}
          </p>

          <ul className="mt-6 space-y-3">
            {current.bullets.map((b) => (
              <li
                key={b}
                className="flex items-start gap-3 font-outfit text-[14px] text-[#0B1220]"
              >
                <span
                  className="mt-[2px] inline-flex h-5 w-5 items-center justify-center rounded-full"
                  style={{ background: "#025eba", color: "#ffffff" }}
                >
                  <Check className="w-3 h-3" strokeWidth={3} />
                </span>
                {b}
              </li>
            ))}
          </ul>

          {/* Optional notify-me on last step */}
          {isLast && (
            <div
              className="mt-7 rounded-2xl bg-white p-5"
              style={{ border: "1px solid rgba(11,18,32,0.08)" }}
              data-testid="learn-more-notify"
            >
              {submitted ? (
                <div className="flex items-center gap-3">
                  <span
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full"
                    style={{ background: "#025eba", color: "#ffffff" }}
                  >
                    <Check className="w-4 h-4" strokeWidth={3} />
                  </span>
                  <div>
                    <p className="font-archivo font-semibold text-[15px] text-[#0B1220]">
                      You&apos;re on the list.
                    </p>
                    <p className="font-outfit text-[13px] text-[#4A5260]">
                      We&apos;ll email you the moment Gazeal Surveys is live in your
                      area.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <p className="font-archivo font-semibold text-[15px] text-[#0B1220]">
                    Want updates as we roll out by region?
                  </p>
                  <p className="mt-1 font-outfit text-[13px] text-[#4A5260]">
                    Optional — drop your email and we&apos;ll let you know when
                    we&apos;re live in yours.
                  </p>
                  <form
                    onSubmit={handleNotify}
                    className="mt-3 flex flex-col sm:flex-row gap-2"
                  >
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@agency.co.uk"
                      className="flex-1 rounded-full bg-[#F7F4EE] border border-[rgba(11,18,32,0.12)] focus:border-[#025eba] focus:outline-none px-5 py-3 font-outfit text-[14px] text-[#0B1220] placeholder:text-[#6B7280]"
                      data-testid="learn-more-email-input"
                    />
                    <button
                      type="submit"
                      className="inline-flex items-center justify-center gap-1.5 rounded-full px-5 py-3 font-outfit font-semibold text-[14px] text-white transition-all duration-300 hover:-translate-y-[1px]"
                      style={{ background: "#025eba" }}
                      data-testid="learn-more-email-submit"
                    >
                      Notify me
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </form>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer nav */}
        <div className="mt-6 px-6 sm:px-8 py-5 flex items-center justify-between border-t border-[rgba(11,18,32,0.08)]">
          <button
            type="button"
            onClick={prev}
            disabled={step === 0}
            className="inline-flex items-center gap-1.5 font-outfit font-semibold text-[14px] text-[#0B1220] disabled:text-[#0B1220]/30 hover:text-[#025eba] transition-colors"
            data-testid="learn-more-prev"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>

          {isLast ? (
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#0B1220] text-white px-5 py-2.5 font-outfit font-semibold text-[14px] hover:-translate-y-[1px] transition-all duration-300"
              data-testid="learn-more-done"
            >
              Done
            </button>
          ) : (
            <button
              type="button"
              onClick={next}
              className="inline-flex items-center gap-1.5 rounded-full text-white px-5 py-2.5 font-outfit font-semibold text-[14px] hover:-translate-y-[1px] transition-all duration-300"
              style={{ background: "#025eba" }}
              data-testid="learn-more-next"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SurveysLearnMoreModal;
