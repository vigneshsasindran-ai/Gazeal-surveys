import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  Check,
  Building2,
  User2,
  Link as LinkIcon,
  CalendarCheck2,
} from "lucide-react";

/*
 * /request-survey
 *
 * Multi-step request form. The agent (logged-in user) orders a survey on
 * behalf of a seller. Replaces the standard "extra info" section with a
 * Rightmove/Zoopla listing URL field, and explicitly tells the agent that
 * RPSA will contact the seller directly to book.
 *
 * Aesthetic: cream surface, large left-rail context, white form panel on the
 * right. Asymmetric, no centered uniform layout. Brand-blue progress + CTA.
 * Pure front-end — final submission is logged to console.
 */

const LOGO_SRC =
  "https://customer-assets.emergentagent.com/job_survey-pro-10/artifacts/k9mairc3_Gazeal%20surveys%20logo.png";

const STEPS = [
  {
    key: "agent",
    eyebrow: "Step 01 of 04",
    title: "Tell us about you",
    sub: "The agent placing the order. We use this to send the seller invite from your branch.",
    icon: Building2,
  },
  {
    key: "seller",
    eyebrow: "Step 02 of 04",
    title: "The seller",
    sub: "RPSA will contact the seller directly to book — we won't pass their details on to anyone else.",
    icon: User2,
  },
  {
    key: "property",
    eyebrow: "Step 03 of 04",
    title: "The property listing",
    sub: "Drop the Rightmove or Zoopla URL — we pull the address, photos and rooms straight from the listing.",
    icon: LinkIcon,
  },
  {
    key: "review",
    eyebrow: "Step 04 of 04",
    title: "Confirm & send",
    sub: "We'll send the seller an invite within minutes. RPSA contacts them within one working day to book the visit.",
    icon: CalendarCheck2,
  },
];

const Field = ({ label, hint, children, testid }) => (
  <label className="block" data-testid={testid}>
    <span className="font-archivo font-semibold text-[12px] tracking-[0.14em] uppercase text-[#0B1220]">
      {label}
    </span>
    {hint && (
      <span className="block mt-1 font-outfit text-[12px] text-[#6B7280]">
        {hint}
      </span>
    )}
    <div className="mt-2">{children}</div>
  </label>
);

const inputCls =
  "w-full rounded-2xl bg-white border border-[rgba(11,18,32,0.12)] focus:border-[#025eba] focus:ring-0 focus:outline-none px-4 py-3 font-outfit text-[15px] text-[#0B1220] placeholder:text-[#6B7280] transition-colors";

const RequestSurveyPage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  const [form, setForm] = useState({
    agentName: "",
    agentBranch: "",
    agentEmail: "",
    agentPhone: "",
    sellerName: "",
    sellerEmail: "",
    sellerPhone: "",
    listingUrl: "",
    notes: "",
  });

  const set = (k) => (e) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const total = STEPS.length;
  const current = STEPS[step];

  const canAdvance = useMemo(() => {
    if (current.key === "agent")
      return form.agentName && form.agentBranch && form.agentEmail;
    if (current.key === "seller")
      return form.sellerName && (form.sellerEmail || form.sellerPhone);
    if (current.key === "property")
      return /^https?:\/\/(www\.)?(rightmove|zoopla)\.co\.uk\//i.test(
        form.listingUrl.trim()
      );
    return true;
  }, [current.key, form]);

  const next = () => setStep((s) => Math.min(s + 1, total - 1));
  const prev = () => setStep((s) => Math.max(s - 1, 0));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!canAdvance) return;
    if (step < total - 1) {
      next();
      return;
    }
    console.log("[GazealSurveys] Request-survey submission:", form);
    setSubmitted(true);
  };

  return (
    <div
      className="min-h-screen w-full"
      style={{ backgroundColor: "#F7F4EE" }}
      data-testid="request-survey-page"
    >
      {/* Slim header */}
      <header className="w-full" data-testid="request-survey-header">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-12 py-5 flex items-center justify-between">
          <Link
            to="/"
            className="flex items-center gap-3"
            data-testid="request-survey-back-home"
          >
            <img src={LOGO_SRC} alt="Gazeal Surveys" className="h-9 w-auto" />
          </Link>
          <button
            type="button"
            onClick={() => navigate("/")}
            className="inline-flex items-center gap-1.5 font-outfit text-[13px] font-semibold text-[#0B1220] hover:text-[#025eba] transition-colors"
            data-testid="request-survey-cancel"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to site
          </button>
        </div>
        <div
          className="h-px w-full"
          style={{ background: "rgba(11,18,32,0.08)" }}
        />
      </header>

      <main className="max-w-[1280px] mx-auto px-6 lg:px-12 pt-12 lg:pt-20 pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-start">
          {/* Left rail */}
          <aside className="lg:col-span-5 lg:sticky lg:top-12">
            <div className="flex items-center gap-2 mb-5">
              <span
                className="inline-block h-[6px] w-[6px] rounded-full"
                style={{ background: "#025eba" }}
              />
              <span className="font-outfit text-[12px] font-semibold tracking-[0.18em] uppercase text-[#025eba]">
                Request a survey
              </span>
            </div>
            <h1
              className="font-archivo font-bold text-[#0B1220] tracking-[-0.025em] leading-[1.04] text-[36px] sm:text-[42px] lg:text-[48px]"
              data-testid="request-survey-headline"
            >
              An agent ordering
              <br />
              for a seller, in
              <br />
              under two minutes.
            </h1>
            <p className="mt-6 font-outfit text-[16px] leading-[1.6] text-[#4A5260] max-w-[44ch]">
              Send the seller invite. RPSA-regulated surveyors take it from
              there — they contact the seller directly to book the visit and
              upload the report straight to your listing.
            </p>

            <ol className="mt-10 space-y-4" data-testid="request-survey-stepper">
              {STEPS.map((s, i) => {
                const Icon = s.icon;
                const active = i === step;
                const done = i < step;
                return (
                  <li
                    key={s.key}
                    className="flex items-center gap-3"
                    data-testid={`step-indicator-${s.key}`}
                  >
                    <span
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full transition-all duration-300"
                      style={{
                        background: active
                          ? "#025eba"
                          : done
                          ? "#0B1220"
                          : "#ffffff",
                        color: active || done ? "#ffffff" : "#0B1220",
                        border:
                          !active && !done
                            ? "1px solid rgba(11,18,32,0.16)"
                            : "none",
                      }}
                    >
                      {done ? (
                        <Check className="w-4 h-4" strokeWidth={3} />
                      ) : (
                        <Icon className="w-4 h-4" strokeWidth={2.2} />
                      )}
                    </span>
                    <span
                      className="font-outfit text-[14px]"
                      style={{
                        color: active ? "#0B1220" : "#6B7280",
                        fontWeight: active ? 600 : 500,
                      }}
                    >
                      {s.title}
                    </span>
                  </li>
                );
              })}
            </ol>
          </aside>

          {/* Form panel */}
          <section className="lg:col-span-7">
            {submitted ? (
              <div
                className="rounded-[28px] bg-white p-8 sm:p-10"
                style={{ border: "1px solid rgba(11,18,32,0.08)" }}
                data-testid="request-survey-success"
              >
                <span
                  className="inline-flex h-12 w-12 items-center justify-center rounded-full"
                  style={{ background: "#025eba", color: "#ffffff" }}
                >
                  <Check className="w-5 h-5" strokeWidth={3} />
                </span>
                <h2 className="mt-5 font-archivo font-bold text-[28px] sm:text-[32px] leading-[1.1] tracking-[-0.02em] text-[#0B1220]">
                  Request received.
                </h2>
                <p className="mt-3 font-outfit text-[15px] leading-[1.6] text-[#4A5260] max-w-[52ch]">
                  We&apos;ve emailed the seller an invite from your branch. An RPSA
                  surveyor will contact them within one working day to book the
                  visit. You&apos;ll get a copy of the report the moment it&apos;s
                  uploaded.
                </p>

                <div
                  className="mt-7 rounded-2xl p-5 grid grid-cols-1 sm:grid-cols-2 gap-4"
                  style={{ background: "#F7F4EE" }}
                >
                  <div>
                    <p className="font-outfit text-[11px] tracking-[0.14em] uppercase text-[#6B7280]">
                      Listing
                    </p>
                    <p className="mt-1 font-outfit text-[14px] text-[#0B1220] truncate">
                      {form.listingUrl || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="font-outfit text-[11px] tracking-[0.14em] uppercase text-[#6B7280]">
                      Seller
                    </p>
                    <p className="mt-1 font-outfit text-[14px] text-[#0B1220]">
                      {form.sellerName || "—"}
                    </p>
                  </div>
                </div>

                <div className="mt-8 flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={() => navigate("/")}
                    className="inline-flex items-center justify-center gap-1.5 rounded-full text-white px-5 py-3 font-outfit font-semibold text-[14px] hover:-translate-y-[1px] transition-all"
                    style={{ background: "#025eba" }}
                    data-testid="request-survey-return-home"
                  >
                    Back to homepage
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSubmitted(false);
                      setStep(0);
                      setForm({
                        agentName: "",
                        agentBranch: "",
                        agentEmail: "",
                        agentPhone: "",
                        sellerName: "",
                        sellerEmail: "",
                        sellerPhone: "",
                        listingUrl: "",
                        notes: "",
                      });
                    }}
                    className="inline-flex items-center justify-center gap-1.5 rounded-full bg-transparent text-[#0B1220] px-5 py-3 font-outfit font-semibold text-[14px] border border-[rgba(11,18,32,0.16)] hover:border-[#0B1220] transition-all"
                    data-testid="request-survey-new"
                  >
                    Submit another
                  </button>
                </div>
              </div>
            ) : (
              <form
                onSubmit={handleSubmit}
                className="rounded-[28px] bg-white overflow-hidden"
                style={{ border: "1px solid rgba(11,18,32,0.08)" }}
                data-testid="request-survey-form"
              >
                {/* Step header */}
                <div className="px-7 sm:px-9 pt-7">
                  <span className="font-outfit text-[12px] font-semibold tracking-[0.18em] uppercase text-[#025eba]">
                    {current.eyebrow}
                  </span>
                  <h2 className="mt-2 font-archivo font-bold text-[24px] sm:text-[28px] leading-[1.15] tracking-[-0.02em] text-[#0B1220]">
                    {current.title}
                  </h2>
                  <p className="mt-2 font-outfit text-[14px] leading-[1.55] text-[#4A5260] max-w-[58ch]">
                    {current.sub}
                  </p>

                  {/* Progress bar */}
                  <div
                    className="mt-5 h-1 w-full rounded-full overflow-hidden"
                    style={{ background: "rgba(11,18,32,0.08)" }}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${((step + 1) / total) * 100}%`,
                        background: "#025eba",
                      }}
                    />
                  </div>
                </div>

                {/* Step body */}
                <div className="px-7 sm:px-9 py-7">
                  {current.key === "agent" && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <Field label="Your name" testid="field-agent-name">
                        <input
                          type="text"
                          required
                          value={form.agentName}
                          onChange={set("agentName")}
                          placeholder="Jane Doe"
                          className={inputCls}
                          data-testid="input-agent-name"
                        />
                      </Field>
                      <Field
                        label="Agency / branch"
                        testid="field-agent-branch"
                      >
                        <input
                          type="text"
                          required
                          value={form.agentBranch}
                          onChange={set("agentBranch")}
                          placeholder="Knight & Co — Bristol"
                          className={inputCls}
                          data-testid="input-agent-branch"
                        />
                      </Field>
                      <Field label="Work email" testid="field-agent-email">
                        <input
                          type="email"
                          required
                          value={form.agentEmail}
                          onChange={set("agentEmail")}
                          placeholder="jane@knight.co.uk"
                          className={inputCls}
                          data-testid="input-agent-email"
                        />
                      </Field>
                      <Field
                        label="Phone"
                        hint="Optional"
                        testid="field-agent-phone"
                      >
                        <input
                          type="tel"
                          value={form.agentPhone}
                          onChange={set("agentPhone")}
                          placeholder="0117 000 0000"
                          className={inputCls}
                          data-testid="input-agent-phone"
                        />
                      </Field>
                    </div>
                  )}

                  {current.key === "seller" && (
                    <div className="space-y-5">
                      <div
                        className="rounded-2xl p-4 text-[13px] font-outfit leading-[1.55]"
                        style={{
                          background: "#EAF2FF",
                          color: "#0B1220",
                          border: "1px solid rgba(2,94,186,0.18)",
                        }}
                        data-testid="seller-invite-notice"
                      >
                        We&apos;ll send the seller an invite from your branch.
                        <strong className="font-archivo">
                          {" "}RPSA will then contact them directly to book the
                          survey visit
                        </strong>{" "}
                        — you don&apos;t need to coordinate the appointment.
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <Field
                          label="Seller&apos;s full name"
                          testid="field-seller-name"
                        >
                          <input
                            type="text"
                            required
                            value={form.sellerName}
                            onChange={set("sellerName")}
                            placeholder="Sam Patel"
                            className={inputCls}
                            data-testid="input-seller-name"
                          />
                        </Field>
                        <Field
                          label="Seller email"
                          hint="One of email or phone is required"
                          testid="field-seller-email"
                        >
                          <input
                            type="email"
                            value={form.sellerEmail}
                            onChange={set("sellerEmail")}
                            placeholder="sam@example.com"
                            className={inputCls}
                            data-testid="input-seller-email"
                          />
                        </Field>
                        <Field
                          label="Seller phone"
                          hint="One of email or phone is required"
                          testid="field-seller-phone"
                        >
                          <input
                            type="tel"
                            value={form.sellerPhone}
                            onChange={set("sellerPhone")}
                            placeholder="07000 000000"
                            className={inputCls}
                            data-testid="input-seller-phone"
                          />
                        </Field>
                      </div>
                    </div>
                  )}

                  {current.key === "property" && (
                    <div className="space-y-5">
                      <Field
                        label="Listing URL"
                        hint="Paste the full Rightmove or Zoopla URL — we&apos;ll pull the address and photos."
                        testid="field-listing-url"
                      >
                        <div className="relative">
                          <input
                            type="url"
                            required
                            value={form.listingUrl}
                            onChange={set("listingUrl")}
                            placeholder="https://www.rightmove.co.uk/properties/..."
                            className={`${inputCls} pl-11`}
                            data-testid="input-listing-url"
                          />
                          <LinkIcon
                            className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280]"
                            strokeWidth={2.2}
                          />
                        </div>
                        {form.listingUrl &&
                          !/^https?:\/\/(www\.)?(rightmove|zoopla)\.co\.uk\//i.test(
                            form.listingUrl.trim()
                          ) && (
                            <p
                              className="mt-2 font-outfit text-[12px]"
                              style={{ color: "#B23A3A" }}
                              data-testid="listing-url-error"
                            >
                              Please paste a Rightmove or Zoopla URL.
                            </p>
                          )}
                      </Field>

                      <Field
                        label="Notes for the surveyor"
                        hint="Optional — access notes, alarm codes, key safe, etc."
                        testid="field-notes"
                      >
                        <textarea
                          rows={4}
                          value={form.notes}
                          onChange={set("notes")}
                          placeholder="e.g. Key safe code on side of garage, dog on premises."
                          className={`${inputCls} resize-none`}
                          data-testid="input-notes"
                        />
                      </Field>
                    </div>
                  )}

                  {current.key === "review" && (
                    <div className="space-y-4">
                      {[
                        ["Agent", `${form.agentName} — ${form.agentBranch}`],
                        ["Agent contact", `${form.agentEmail}${form.agentPhone ? ` · ${form.agentPhone}` : ""}`],
                        ["Seller", form.sellerName],
                        [
                          "Seller contact",
                          [form.sellerEmail, form.sellerPhone]
                            .filter(Boolean)
                            .join(" · ") || "—",
                        ],
                        ["Listing", form.listingUrl],
                        ["Notes", form.notes || "—"],
                      ].map(([label, value]) => (
                        <div
                          key={label}
                          className="flex items-start justify-between gap-6 py-3"
                          style={{
                            borderBottom: "1px solid rgba(11,18,32,0.08)",
                          }}
                          data-testid={`review-${label
                            .toLowerCase()
                            .replace(/\s+/g, "-")}`}
                        >
                          <span className="font-outfit text-[12px] tracking-[0.14em] uppercase text-[#6B7280] shrink-0 w-[150px]">
                            {label}
                          </span>
                          <span className="font-outfit text-[14px] text-[#0B1220] text-right break-words">
                            {value}
                          </span>
                        </div>
                      ))}

                      <p
                        className="mt-5 font-outfit text-[12px] leading-[1.55] text-[#6B7280]"
                        data-testid="review-rpsa-note"
                      >
                        By submitting you confirm the seller has agreed to be
                        contacted by an RPSA-regulated surveyor to book the
                        visit. Survey fee settles at completion. Free if the
                        sale falls through.
                      </p>
                    </div>
                  )}
                </div>

                {/* Footer nav */}
                <div
                  className="px-7 sm:px-9 py-5 flex items-center justify-between"
                  style={{
                    borderTop: "1px solid rgba(11,18,32,0.08)",
                    background: "#FBFAF6",
                  }}
                >
                  <button
                    type="button"
                    onClick={prev}
                    disabled={step === 0}
                    className="inline-flex items-center gap-1.5 font-outfit font-semibold text-[14px] text-[#0B1220] disabled:text-[#0B1220]/30 hover:text-[#025eba] transition-colors"
                    data-testid="request-survey-prev"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Back
                  </button>

                  <button
                    type="submit"
                    disabled={!canAdvance}
                    className="inline-flex items-center gap-1.5 rounded-full text-white px-6 py-3 font-outfit font-semibold text-[14px] hover:-translate-y-[1px] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ background: "#025eba" }}
                    data-testid="request-survey-next"
                  >
                    {step === total - 1 ? "Send request" : "Continue"}
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </form>
            )}
          </section>
        </div>
      </main>
    </div>
  );
};

export default RequestSurveyPage;
