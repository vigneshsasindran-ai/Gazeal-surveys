import React from "react";
import { Check, X } from "lucide-react";

/*
 * Seller-facing process timeline for the agreement page (David Astburys branding).
 * Minimal: ticks + dates only, flat #9B2743 accent accents. Included in print.
 */

const fmtDate = (iso) => {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return null;
  }
};

const Dot = ({ state }) => {
  if (state === "done")
    return (
      <span
        className="inline-flex h-7 w-7 items-center justify-center rounded-full shrink-0"
        style={{ background: "#9B2743" }}
      >
        <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
      </span>
    );
  if (state === "declined")
    return (
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full shrink-0 bg-[#FF8A8A]/20 border border-[#FF8A8A]/50">
        <X className="w-3.5 h-3.5 text-[#FF8A8A]" strokeWidth={3} />
      </span>
    );
  if (state === "current")
    return (
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full shrink-0 border-2 border-[#9B2743]">
        <span className="h-2 w-2 rounded-full bg-[#9B2743]" />
      </span>
    );
  return (
    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full shrink-0 border border-[#2B1B20]/25">
      <span className="h-1.5 w-1.5 rounded-full bg-white/25" />
    </span>
  );
};

const AgreementTimeline = ({ data }) => {
  const accepted = data.status === "accepted";
  const declined = data.status === "declined";
  const sellerDirect = data.flow === "seller_direct";

  const steps = [
    {
      label: sellerDirect ? "You ordered your survey" : "Survey ordered",
      date: fmtDate(data.created_at),
      state: "done",
    },
  ];
  if (!sellerDirect) {
    steps.push({
      label: "Agreement emailed to you",
      date: fmtDate(data.seller_invite_sent_at || data.created_at),
      state: "done",
    });
  }
  steps.push(
    declined
      ? { label: "You declined the terms", date: fmtDate(data.declined_at), state: "declined" }
      : {
          label: accepted ? "You accepted the terms" : "You agree to the terms",
          date: fmtDate(data.accepted_at),
          state: accepted ? "done" : "current",
        }
  );
  steps.push({
    label: accepted ? "RPSA instructed to contact you" : "RPSA contacts you to arrange the visit",
    date: accepted ? fmtDate(data.rpsa_instructed_at || data.accepted_at) : null,
    state: accepted ? "done" : "upcoming",
  });

  return (
    <div
      className="mt-6 rounded-2xl border border-[#2B1B20]/10 bg-white/70 p-5 sm:p-6"
      data-testid="agreement-timeline"
    >
      <p className="font-outfit text-[11px] font-semibold tracking-[0.22em] uppercase text-[#9B2743]">
        Where things stand
      </p>
      <ol className="mt-4 flex flex-col gap-4 sm:flex-row sm:gap-3">
        {steps.map((s) => (
          <li
            key={s.label}
            className="flex items-center gap-3 sm:flex-1 sm:flex-col sm:items-center sm:gap-2 sm:text-center"
            data-testid={`timeline-step-${s.state}`}
          >
            <Dot state={s.state} />
            <span>
              <span
                className={`block font-outfit text-[13px] leading-snug ${
                  s.state === "upcoming" ? "text-[#2B1B20]/45" : "text-[#2B1B20]/90"
                }`}
              >
                {s.label}
              </span>
              {s.date && (
                <span className="block font-outfit text-[11px] text-[#2B1B20]/45 mt-0.5">
                  {s.date}
                </span>
              )}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
};

export default AgreementTimeline;
