import React, { useState } from "react";
import { Check, X, ShieldCheck, AlertTriangle } from "lucide-react";

/*
 * Reservation Agreement comparison — two modular boxes, no heading.
 * Each box has 4 items; the 4th is highlighted as the "important note"
 * (fee terms).
 *
 *   Box 1 — Survey with a Reservation Agreement (recommended, blue tone)
 *   Box 2 — Survey without a Reservation Agreement (neutral, grey tone)
 *
 * On the seller agreement page (`variant="seller"`) an interest checkbox
 * + submit appears below the boxes, posting to
 * `POST /api/agreements/{token}/express-interest`.
 */

const WITH_ITEMS = [
  "Both parties committed to the sale",
  "No gazundering or last-minute renegotiations",
  "Compensation guaranteed by Gazeal if either party pulls out unreasonably",
];

const WITH_FEE_NOTE =
  "Sellers do not pay survey fees if the buyer pulls out or if the sale ends for a fair reason by both parties under the terms of the agreement. The seller only pays on completion, or if they pull out of the sale unreasonably.";

const WITHOUT_ITEMS = [
  "Neither party committed to the sale",
  "Gazumping or gazundering at any point",
  "No compensation if the sale falls through",
];

const WITHOUT_FEE_NOTE =
  "Survey fee becomes payable after 6 months from instruction, and no protection against renegotiation on the back of the survey.";

const Box = ({ tone, title, items, feeNote, icon: Icon, testid }) => {
  const isPositive = tone === "with";
  return (
    <div
      className={`relative rounded-2xl border p-7 sm:p-8 backdrop-blur-sm transition-all duration-500 ${
        isPositive
          ? "border-[#B8AB84]/35 bg-[#B8AB84]/[0.06] hover:border-[#B8AB84]/55"
          : "border-white/10 bg-white/[0.02] hover:border-white/20"
      }`}
      data-testid={testid}
    >
      {isPositive && (
        <div
          className="absolute -top-3 left-7 px-2.5 py-1 rounded-full text-[10px] tracking-[0.18em] uppercase font-outfit font-bold text-white"
          style={{ background: "#B8AB84" }}
        >
          Recommended
        </div>
      )}

      <div className="flex items-start justify-between mb-6 gap-4">
        <h3 className="font-archivo font-bold text-white text-[26px] sm:text-[30px] lg:text-[34px] leading-[1.08] tracking-[-0.025em] max-w-[16ch]">
          {title}
        </h3>
        {isPositive && (
          <span
            className="shrink-0 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#B8AB84] shadow-[0_6px_22px_rgba(26,20,52,0.4)]"
          >
            <Icon className="w-5 h-5 text-white" strokeWidth={2.2} />
          </span>
        )}
      </div>

      <ul className="space-y-3.5">
        {items.map((b) => (
          <li key={b} className="flex items-start gap-2.5">
            <span
              className={`mt-0.5 inline-flex items-center justify-center rounded-full shrink-0 ${
                isPositive ? "bg-[#B8AB84]/15" : "bg-white/[0.06]"
              }`}
              style={{ height: 20, width: 20 }}
            >
              {isPositive ? (
                <Check className="w-3 h-3 text-[#B8AB84]" strokeWidth={3} />
              ) : (
                <X className="w-3 h-3 text-white/45" strokeWidth={3} />
              )}
            </span>
            <span className="font-outfit text-[14px] leading-[1.55] text-white/80">{b}</span>
          </li>
        ))}
      </ul>

      {/* Item 4 — highlighted/boxed fee note */}
      <div
        className={`mt-5 rounded-xl p-4 sm:p-5 ${
          isPositive
            ? "border border-[#B8AB84]/45 bg-[#B8AB84]/[0.10]"
            : "border border-white/15 bg-white/[0.04]"
        }`}
        data-testid={`${testid}-note`}
      >
        <div className="flex items-start gap-3">
          <span
            className={`mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full shrink-0 ${
              isPositive
                ? "bg-[#B8AB84]"
                : "bg-white/[0.08] border border-white/15"
            }`}
          >
            {isPositive ? (
              <Check className="w-3 h-3 text-white" strokeWidth={3} />
            ) : (
              <X className="w-3 h-3 text-white/60" strokeWidth={3} />
            )}
          </span>
          <div>
            <p
              className={`font-archivo font-bold text-[11px] tracking-[0.18em] uppercase mb-1.5 ${
                isPositive ? "text-[#B8AB84]" : "text-white/55"
              }`}
            >
              Survey fee
            </p>
            <p className="font-outfit text-[13.5px] leading-[1.6] text-white/85">{feeNote}</p>
          </div>
        </div>
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

  const toggleInterest = async (checked) => {
    setInterested(checked);
    if (!checked || submitted || !token) return;
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
      setErr("We couldn't record that just now — please untick and try again.");
      setInterested(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="relative" data-testid={`reservation-explainer-${variant}`}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:gap-6">
        <Box
          tone="with"
          title="Survey with a Reservation Agreement"
          icon={ShieldCheck}
          items={WITH_ITEMS}
          feeNote={WITH_FEE_NOTE}
          testid={`re-${variant}-with`}
        />
        <Box
          tone="without"
          title="Survey without a Reservation Agreement"
          icon={AlertTriangle}
          items={WITHOUT_ITEMS}
          feeNote={WITHOUT_FEE_NOTE}
          testid={`re-${variant}-without`}
        />
      </div>

      {isSeller && token && (
        <div
          className="mt-8 rounded-2xl border border-[#B8AB84]/25 bg-[#B8AB84]/[0.04] p-6 sm:p-7"
          data-testid="re-interest-card"
        >
          <p className="font-outfit text-[12px] tracking-[0.22em] uppercase font-semibold text-[#B8AB84] mb-3"
             data-testid="re-interest-eyebrow">
            Want to think about it?
          </p>
          <p className="font-outfit text-[14px] text-white/75 leading-[1.65] mb-5 max-w-[60ch]">
            You don&apos;t have to decide now. Tick the box below and we&apos;ll
            send you more details on how a Gazeal Reservation Agreement could
            help protect your sale. You can come back to this page later to
            accept or decline the survey terms once you&apos;ve had a chance to
            read everything.
          </p>
          {submitted ? (
            <div className="flex items-start gap-3" data-testid="re-interest-submitted">
              <span
                className="inline-flex h-9 w-9 items-center justify-center rounded-full shrink-0"
                style={{ background: "#B8AB84" }}
              >
                <Check className="w-4 h-4 text-white" strokeWidth={3} />
              </span>
              <div>
                <p className="font-archivo font-bold text-white text-[15px]">
                  Thanks &mdash; we&apos;ll be in touch shortly.
                </p>
                <p className="mt-1 font-outfit text-[13px] text-white/65">
                  We&apos;ll email you details on how a Gazeal Reservation Agreement could help protect your sale. This page stays live for you to come back and accept or decline once you&apos;re ready.
                </p>
              </div>
            </div>
          ) : (
            <>
              <label
                className="flex items-start gap-3 cursor-pointer select-none"
                data-testid="re-interest-label"
              >
                <input
                  type="checkbox"
                  checked={interested}
                  onChange={(e) => toggleInterest(e.target.checked)}
                  disabled={submitting}
                  className="mt-1 h-4 w-4 rounded border-white/30 bg-white/[0.06] accent-[#1A1434] cursor-pointer disabled:opacity-60"
                  data-testid="re-interest-checkbox"
                />
                <span>
                  <span className="block font-archivo font-bold text-white text-[15px]">
                    I&apos;d like to know more about Gazeal Reservation Agreements.
                  </span>
                  <span className="block mt-1 font-outfit text-[13px] text-white/65">
                    Tick this box and Gazeal will email you details on how a
                    Reservation Agreement could help protect your sale.
                    {submitting && (
                      <span className="ml-1 text-[#B8AB84]">Saving…</span>
                    )}
                  </span>
                </span>
              </label>
              {err && (
                <p
                  className="mt-3 font-outfit text-[12px] text-[#FF8A8A]"
                  data-testid="re-interest-error"
                >
                  {err}
                </p>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
};

export default ReservationExplainer;
