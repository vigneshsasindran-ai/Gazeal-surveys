import React from "react";
import { Check, AlertTriangle, FileSearch, Share2, PenLine, ChevronRight } from "lucide-react";

// Legal-approved wording: keep verbatim.
export const TIMING_PARAGRAPHS = [
  "Of those sales that are agreed that then fall through, whether reasonably or not, one third do so because of arguments about the condition of the property. Getting a Gazeal Survey up front and making it available to the buyer before the Reservation Agreement is signed ensures that their offer is made with full knowledge of the condition of the property and therefore vastly reduces, or even eliminates, the risk that the buyer can withdraw later for this reason.",
  "Therefore, to get the maximum value from a Gazeal Survey you should order it before an offer is received and ensure it is made available to the buyer before the Reservation Agreement is signed.",
  "If you order and disclose it after the Reservation Agreement is signed, you will still have the benefit of speed, transparency and goodwill, but you will not have the advantage of being protected by the buyers' prior knowledge of the condition if it discloses defects of which they were not previously aware.",
];

export const TIMING_ACK =
  "I understand that to get the maximum value from a Gazeal Survey, it should be ordered before an offer is received and made available to the buyer before the Reservation Agreement is signed.";

export const TIMING_THEMES = {
  gazeal: { accent: "#4FB6FF", fill: "linear-gradient(135deg,#4FB6FF,#025eba)", tick: "#FFFFFF", ink: "255,255,255" },
  balgores: { accent: "#B8AB84", fill: "#B8AB84", tick: "#FFFFFF", ink: "255,255,255" },
  exp: { accent: "#B9BFD6", fill: "#FFFFFF", tick: "#0C0F25", ink: "255,255,255" },
  da: { accent: "#9B2743", fill: "#9B2743", tick: "#FFFFFF", ink: "43,27,32" },
  hh: { accent: "#DEA39D", fill: "#DEA39D", tick: "#0E1748", ink: "255,255,255" },
};

const ink = (t, a) => `rgba(${t.ink},${a})`;

const STEPS = [
  { icon: FileSearch, label: "Order your Gazeal Survey", sub: "before an offer is received" },
  { icon: Share2, label: "Share it with your buyer", sub: "so they offer with full knowledge" },
  { icon: PenLine, label: "Reservation Agreement signed", sub: "with your buyer fully informed" },
];

const StepStrip = ({ t }) => (
  <ol className="mt-6 grid sm:grid-cols-3 gap-3" data-testid="timing-notice-steps">
    {STEPS.map((s, i) => (
      <li key={s.label} className="relative rounded-xl p-4 border"
          style={{ borderColor: ink(t, 0.12), background: ink(t, 0.03) }}
          data-testid={`timing-notice-step-${i + 1}`}>
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full flex items-center justify-center font-outfit font-bold text-[12px]"
                style={{ background: t.fill, color: t.tick }}>{i + 1}</span>
          <s.icon className="w-4 h-4" style={{ color: t.accent }} />
        </div>
        <p className="mt-3 font-outfit font-semibold text-[14px]" style={{ color: ink(t, 0.95) }}>{s.label}</p>
        <p className="mt-0.5 font-outfit text-[12px]" style={{ color: ink(t, 0.55) }}>{s.sub}</p>
        {i < 2 && <ChevronRight className="hidden sm:block absolute -right-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: t.accent }} />}
      </li>
    ))}
  </ol>
);

export const SurveyTimingCard = ({ theme = "gazeal" }) => {
  const t = TIMING_THEMES[theme];
  return (
    <section className="mt-8 rounded-2xl border-2 p-6 sm:p-7"
             style={{ borderColor: `${t.accent}66`, background: `${t.accent}0F` }}
             data-testid="timing-notice-card">
      <p className="flex items-center gap-2 font-outfit font-semibold text-[11px] tracking-[0.22em] uppercase"
         style={{ color: t.accent }}>
        <AlertTriangle className="w-4 h-4" /> Please read before you agree
      </p>
      <h2 className="mt-3 font-archivo font-bold text-[22px] sm:text-[26px] leading-[1.2] tracking-[-0.02em]"
          style={{ color: ink(t, 1) }} data-testid="timing-notice-heading">
        When your survey is shared with the buyer matters.
      </h2>
      <StepStrip t={t} />
      <div className="mt-6 space-y-3 font-outfit text-[14px] leading-[1.7]" style={{ color: ink(t, 0.78) }}
           data-testid="timing-notice-text">
        {TIMING_PARAGRAPHS.map((p, i) => (
          <p key={i} style={i === 1 ? { color: ink(t, 1), fontWeight: 600 } : undefined}>{p}</p>
        ))}
      </div>
    </section>
  );
};

export const SurveyTimingReminder = ({ theme = "gazeal" }) => {
  const t = TIMING_THEMES[theme];
  return (
    <div className="mb-6 flex items-start gap-3 rounded-xl border-l-4 px-4 py-3.5"
         style={{ borderColor: t.accent, background: ink(t, 0.04) }}
         data-testid="timing-notice-reminder">
      <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: t.accent }} />
      <p className="font-outfit text-[14px] leading-relaxed" style={{ color: ink(t, 0.85) }}>
        <span className="font-semibold" style={{ color: ink(t, 1) }}>Remember:</span> to get the maximum value
        from a Gazeal Survey, ensure it is made available to the buyer before the Reservation Agreement is signed.
      </p>
    </div>
  );
};

export const SurveyTimingAck = ({ theme = "gazeal", checked, onChange }) => {
  const t = TIMING_THEMES[theme];
  return (
    <label className="mt-3 flex items-start gap-3 cursor-pointer rounded-xl border p-3.5 transition-colors"
           style={{ borderColor: checked ? `${t.accent}99` : ink(t, 0.15), background: checked ? `${t.accent}0F` : ink(t, 0.02) }}
           data-testid="agreement-timing-ok-label">
      <input type="checkbox" className="sr-only" checked={checked}
             onChange={(e) => onChange(e.target.checked)} data-testid="agreement-timing-ok-checkbox" />
      <span className="w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-all"
            style={checked ? { background: t.fill, borderColor: "transparent" } : { borderColor: ink(t, 0.35) }}>
        {checked && <Check className="w-3 h-3" style={{ color: t.tick }} strokeWidth={3} />}
      </span>
      <span className="font-outfit text-[13px] leading-relaxed" style={{ color: ink(t, 0.75) }}>{TIMING_ACK}</span>
    </label>
  );
};
