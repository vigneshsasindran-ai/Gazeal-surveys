import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Check,
  User,
  Building2,
  Home as HomeIcon,
  ShieldCheck,
  PenLine,
} from "lucide-react";

/*
 * /balgores/order-survey — SELLER-DIRECT flow.
 *
 * The seller orders their own Home Insight Survey:
 *   1. About you (seller details)
 *   2. Your property
 *   3. Your Balgores branch (+ optional agent)
 *   4. Review & sign
 *
 * On submit the backend mints the agreement and the seller is taken
 * STRAIGHT to /balgores/agreement/{token} to sign — no email loop.
 */

const BALGORES_LOGO =
  "https://customer-assets.emergentagent.com/job_survey-pro-10/artifacts/mtuv9mso_download%20%281%29.webp";

const BRANCHES = [
  "Basildon",
  "Brentwood",
  "Chadwell Heath",
  "Chelmsford",
  "Dagenham",
  "Gravesend",
  "Hayes",
  "Hornchurch",
  "Loughton",
  "Ongar",
  "Romford",
  "South Woodham Ferrers",
  "Upminster",
  "Wickford",
];

const STEPS = [
  { number: 1, title: "About you", icon: User },
  { number: 2, title: "Your property", icon: HomeIcon },
  { number: 3, title: "Your branch", icon: Building2 },
  { number: 4, title: "Review & sign", icon: ShieldCheck },
];

const inputCls =
  "w-full px-4 py-3 rounded-xl bg-white/5 border border-white/15 text-white placeholder-white/40 font-outfit text-[14px] focus:outline-none focus:border-[#B8AB84]/60 transition-colors";

const labelCls = "block text-sm text-white/65 mb-2 font-outfit";

const errorCls = "text-[#FF6B6B] text-xs mt-1 font-outfit";

const fmtPostcode = (p) =>
  p.trim().toUpperCase().replace(/\s+/g, "").replace(/(.{3})$/, " $1");

const OrderSurveyPage = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [formData, setFormData] = useState({
    // About you (the seller)
    sellerName: "",
    sellerEmail: "",
    sellerPhone: "",
    // The property
    addressLine1: "",
    postcode: "",
    listingUrl: "",
    askingPrice: "",
    bedrooms: "",
    listedStatus: "",
    // Balgores branch
    branch: "",
    agentName: "",
    agentEmail: "",
    // Confirmation
    confirmation: false,
  });

  const totalSteps = STEPS.length;

  const setField = (key) => (e) => {
    const val = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setFormData((prev) => ({ ...prev, [key]: val }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: "" }));
  };

  const validateStep = (step) => {
    const e = {};
    if (step === 1) {
      if (!formData.sellerName.trim()) e.sellerName = "Required";
      if (!formData.sellerEmail.trim()) e.sellerEmail = "Required";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.sellerEmail))
        e.sellerEmail = "Valid email required";
      if (!formData.sellerPhone.trim()) e.sellerPhone = "Required";
    }
    if (step === 2) {
      if (!formData.addressLine1.trim()) e.addressLine1 = "Required";
      if (!formData.postcode.trim()) e.postcode = "Required";
      else if (!/^[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}$/i.test(formData.postcode.trim()))
        e.postcode = "Enter a valid UK postcode (e.g. CM2 6PJ)";
    }
    if (step === 3) {
      if (!formData.branch) e.branch = "Please select your branch";
      if (
        formData.agentEmail.trim() &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.agentEmail)
      )
        e.agentEmail = "Valid email required";
    }
    if (step === 4) {
      if (!formData.confirmation) e.confirmation = "Please confirm to continue";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => {
    if (validateStep(currentStep) && currentStep < totalSteps) {
      setCurrentStep((s) => s + 1);
    }
  };
  const prev = () => {
    if (currentStep > 1) setCurrentStep((s) => s - 1);
  };

  const submit = async () => {
    if (!validateStep(totalSteps)) return;
    setIsSubmitting(true);
    setSubmitError("");
    try {
      const res = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}/api/leads/order-survey`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            flow: "seller_direct",
            brand: "balgores",
            agent_name: formData.agentName.trim(),
            agency_name: "Balgores Property Group",
            branch: formData.branch,
            phone: "",
            email: formData.agentEmail.trim() || null,
            seller_name: formData.sellerName,
            seller_email: formData.sellerEmail,
            seller_phone: formData.sellerPhone,
            address_line_1: formData.addressLine1,
            postcode: fmtPostcode(formData.postcode),
            listing_url: formData.listingUrl,
            asking_price: formData.askingPrice,
            bedrooms: formData.bedrooms,
            listed_status: formData.listedStatus,
            confirmation: formData.confirmation,
          }),
        }
      );
      if (!res.ok) {
        const detail = await res.text();
        throw new Error(detail || `Request failed (${res.status})`);
      }
      const data = await res.json();
      if (!data.agreement_token) throw new Error("No agreement token returned");
      navigate(`/balgores/agreement/${data.agreement_token}`);
    } catch (err) {
      setSubmitError(
        "We couldn't submit your order just now. Please try again in a moment."
      );
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-black" data-testid="order-survey-page">
      {/* Slim header */}
      <header className="w-full">
        <div className="max-w-[1200px] mx-auto px-6 lg:px-12 py-5 flex items-center justify-between">
          <Link
            to="/balgores"
            className="flex items-center gap-3"
            data-testid="order-survey-back-home"
          >
            <span className="font-outfit font-light text-[#B8AB84] text-[15px] md:text-[18px] tracking-[0.02em] whitespace-nowrap">
              Balgores Property Group
            </span>
            <img
              src={BALGORES_LOGO}
              alt="Balgores"
              className="h-8 md:h-9 w-auto rounded-[3px]"
            />
          </Link>
          <button
            type="button"
            onClick={() => navigate("/balgores")}
            className="inline-flex items-center gap-1.5 font-outfit text-[13px] font-medium text-white/60 hover:text-white transition-colors"
            data-testid="order-survey-cancel"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to home
          </button>
        </div>
        <div className="h-px w-full bg-white/[0.06]" />
      </header>

      <main className="pt-12 pb-24">
        <div className="max-w-[860px] mx-auto px-6">
          {/* Title */}
          <div className="text-center mb-10">
            <p className="font-outfit text-[12px] font-semibold tracking-[0.22em] uppercase text-[#B8AB84] mb-4">
              Order your survey
            </p>
            <h1 className="text-3xl md:text-[42px] font-archivo font-bold tracking-[-0.025em] text-white leading-[1.12]">
              Order your{" "}
              <span className="text-[#B8AB84]">Home Insight Survey</span>
            </h1>
          </div>

          {/* Before you start intro */}
          <div
            className="mb-10 rounded-2xl border border-white/10 bg-white/[0.02] p-6 md:p-7"
            data-testid="order-survey-intro"
          >
            <h2 className="font-archivo font-bold tracking-[-0.025em] text-[22px] text-white mb-3">
              Before you start
            </h2>
            <p className="font-outfit text-[14px] leading-relaxed text-white/65 mb-4">
              You&apos;re ordering the survey for your own home. Here is how
              it works:
            </p>
            <ul className="space-y-2.5">
              {[
                "Tell us about you, your property and your Balgores branch below. It takes two minutes.",
                "Review and sign your survey agreement online, straight away. No waiting for emails.",
                "RPSA, the accredited surveyor body, contacts you directly to arrange a convenient visit. You pay nothing now. The fee is settled at completion or within six months, whichever comes first, and if the sale falls through unreasonably, you pay nothing at all.",
              ].map((line) => (
                <li
                  key={line}
                  className="flex items-start gap-3 font-outfit text-[14px] text-white/75 leading-relaxed"
                >
                  <span
                    className="mt-[2px] inline-flex h-5 w-5 items-center justify-center rounded-full shrink-0"
                    style={{ background: "#B8AB84" }}
                  >
                    <Check className="w-3 h-3 text-white" strokeWidth={3} />
                  </span>
                  {line}
                </li>
              ))}
            </ul>
            <p className="font-outfit text-[13px] text-white/45 mt-5">
              Fields marked * are required.
            </p>
          </div>

          {/* Stepper */}
          <div className="flex items-center justify-between mb-10">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              const isActive = currentStep === s.number;
              const isComplete = currentStep > s.number;
              return (
                <React.Fragment key={s.number}>
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center border transition-all ${
                        isActive
                          ? "border-transparent"
                          : isComplete
                          ? "border-[#B8AB84]/40 bg-white/[0.04]"
                          : "border-white/15 bg-white/[0.02]"
                      }`}
                      style={
                        isActive
                          ? {
                              background: "#B8AB84",
                              boxShadow: "0 0 18px rgba(184,171,132,0.45)",
                            }
                          : {}
                      }
                      data-testid={`order-step-indicator-${s.number}`}
                    >
                      {isComplete ? (
                        <Check className="w-4 h-4 text-[#B8AB84]" strokeWidth={3} />
                      ) : (
                        <Icon
                          className={`w-4 h-4 ${
                            isActive ? "text-white" : "text-white/55"
                          }`}
                          strokeWidth={2.2}
                        />
                      )}
                    </div>
                    <span
                      className={`text-[11px] mt-2 hidden md:block font-outfit ${
                        isActive
                          ? "text-white"
                          : isComplete
                          ? "text-[#B8AB84]"
                          : "text-white/40"
                      }`}
                    >
                      {s.title}
                    </span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div
                      className="flex-1 h-px mx-2 md:mx-3 transition-all"
                      style={{
                        background:
                          currentStep > s.number
                            ? "#B8AB84"
                            : "rgba(255,255,255,0.10)",
                      }}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {/* Form card */}
          <div
            className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-white/[0.01] backdrop-blur-sm p-7 md:p-10 relative overflow-hidden"
            data-testid="order-survey-form"
          >
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#B8AB84]/40 to-transparent pointer-events-none" />

            {/* Step 1 — About you (the seller) */}
            {currentStep === 1 && (
              <div className="space-y-5">
                <div>
                  <h3 className="font-archivo font-bold tracking-[-0.025em] text-[26px] text-white mb-1">
                    About you
                  </h3>
                  <p className="font-outfit text-[14px] text-white/55">
                    So the surveyor knows who to contact to arrange the visit.
                  </p>
                </div>
                <div>
                  <label className={labelCls}>Your name *</label>
                  <input
                    type="text"
                    className={inputCls}
                    value={formData.sellerName}
                    onChange={setField("sellerName")}
                    placeholder="Your full name"
                    data-testid="order-input-seller-name"
                  />
                  {errors.sellerName && (
                    <p className={errorCls}>{errors.sellerName}</p>
                  )}
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Your email *</label>
                    <input
                      type="email"
                      className={inputCls}
                      value={formData.sellerEmail}
                      onChange={setField("sellerEmail")}
                      placeholder="you@email.co.uk"
                      data-testid="order-input-seller-email"
                    />
                    <p className="font-outfit text-[12px] text-white/45 mt-1.5">
                      Your confirmation and report updates arrive here.
                    </p>
                    {errors.sellerEmail && (
                      <p className={errorCls}>{errors.sellerEmail}</p>
                    )}
                  </div>
                  <div>
                    <label className={labelCls}>Your phone *</label>
                    <input
                      type="tel"
                      className={inputCls}
                      value={formData.sellerPhone}
                      onChange={setField("sellerPhone")}
                      placeholder="Your contact number"
                      data-testid="order-input-seller-phone"
                    />
                    <p className="font-outfit text-[12px] text-white/45 mt-1.5">
                      The surveyor calls this number to book the visit.
                    </p>
                    {errors.sellerPhone && (
                      <p className={errorCls}>{errors.sellerPhone}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Step 2 — Your property */}
            {currentStep === 2 && (
              <div className="space-y-5">
                <div>
                  <h3 className="font-archivo font-bold tracking-[-0.025em] text-[26px] text-white mb-1">
                    Your property
                  </h3>
                  <p className="font-outfit text-[14px] text-white/55">
                    Just enough for the surveyor to plan their visit.
                  </p>
                </div>
                <div>
                  <label className={labelCls}>First line of address *</label>
                  <input
                    type="text"
                    className={inputCls}
                    value={formData.addressLine1}
                    onChange={setField("addressLine1")}
                    placeholder="First line of your property address"
                    data-testid="order-input-address"
                  />
                  {errors.addressLine1 && (
                    <p className={errorCls}>{errors.addressLine1}</p>
                  )}
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Postcode *</label>
                    <input
                      type="text"
                      className={inputCls}
                      value={formData.postcode}
                      onChange={setField("postcode")}
                      placeholder="Postcode"
                      data-testid="order-input-postcode"
                    />
                    {errors.postcode && (
                      <p className={errorCls}>{errors.postcode}</p>
                    )}
                  </div>
                  <div>
                    <label className={labelCls}>Asking price</label>
                    <input
                      type="text"
                      className={inputCls}
                      value={formData.askingPrice}
                      onChange={setField("askingPrice")}
                      placeholder="Asking price (optional)"
                      data-testid="order-input-asking-price"
                    />
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Bedrooms</label>
                    <select
                      className={`${inputCls} [&>option]:bg-[#1A1434]`}
                      value={formData.bedrooms}
                      onChange={setField("bedrooms")}
                      data-testid="order-input-bedrooms"
                    >
                      <option value="">Not sure (optional)</option>
                      <option value="1 to 3">1 to 3</option>
                      <option value="4 to 5">4 to 5</option>
                      <option value="6+">6+</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Registered Listed Building</label>
                    <select
                      className={`${inputCls} [&>option]:bg-[#1A1434]`}
                      value={formData.listedStatus}
                      onChange={setField("listedStatus")}
                      data-testid="order-input-listed"
                    >
                      <option value="">Not sure (optional)</option>
                      <option value="N/A">N/A</option>
                      <option value="Grade 2 or 2*">Grade 2 or 2*</option>
                      <option value="Grade 1">Grade 1</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className={labelCls}>
                    Property web link or details to help us identify the property
                  </label>
                  <p className="font-outfit text-[12px] text-white/45 mt-1.5 mb-2">
                    Optional, but really helps the surveyor. A Rightmove or
                    Zoopla link is ideal; a description, what3words or any
                    other detail works too.
                  </p>
                  <textarea
                    rows={3}
                    className={`${inputCls} resize-none`}
                    value={formData.listingUrl}
                    onChange={setField("listingUrl")}
                    placeholder="e.g. https://www.rightmove.co.uk/... or 'detached corner plot with the blue door, opposite the church'"
                    data-testid="order-input-listing-url"
                  />
                </div>
              </div>
            )}

            {/* Step 3 — Your Balgores branch */}
            {currentStep === 3 && (
              <div className="space-y-5">
                <div>
                  <h3 className="font-archivo font-bold tracking-[-0.025em] text-[26px] text-white mb-1">
                    Your Balgores branch
                  </h3>
                  <p className="font-outfit text-[14px] text-white/55">
                    Tell us which branch you&apos;re selling with, so your
                    report reaches the right team.
                  </p>
                </div>
                <div>
                  <label className={labelCls}>Branch *</label>
                  <div className="relative">
                    <select
                      className={`${inputCls} appearance-none pr-10 cursor-pointer ${
                        formData.branch ? "" : "text-white/40"
                      }`}
                      value={formData.branch}
                      onChange={setField("branch")}
                      data-testid="order-input-branch"
                    >
                      <option value="" disabled className="bg-[#0a0a0a] text-white/60">
                        Please select
                      </option>
                      {BRANCHES.map((b) => (
                        <option key={b} value={b} className="bg-[#0a0a0a] text-white">
                          {b}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
                  </div>
                  {errors.branch && <p className={errorCls}>{errors.branch}</p>}
                </div>
                <div className="pt-2">
                  <p className="font-outfit text-[13px] text-white/55 mb-4">
                    If you&apos;re already dealing with someone at Balgores,
                    add them below so they&apos;re kept in the loop. Both
                    fields are optional.
                  </p>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls}>Balgores agent name</label>
                      <input
                        type="text"
                        className={inputCls}
                        value={formData.agentName}
                        onChange={setField("agentName")}
                        placeholder="Agent name (optional)"
                        data-testid="order-input-agent-name"
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Balgores agent email</label>
                      <input
                        type="email"
                        className={inputCls}
                        value={formData.agentEmail}
                        onChange={setField("agentEmail")}
                        placeholder="Agent email (optional)"
                        data-testid="order-input-agent-email"
                      />
                      {errors.agentEmail && (
                        <p className={errorCls}>{errors.agentEmail}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 4 — Review & sign */}
            {currentStep === 4 && (
              <div className="space-y-5">
                <div>
                  <h3 className="font-archivo font-bold tracking-[-0.025em] text-[26px] text-white mb-1">
                    Review &amp; sign
                  </h3>
                  <p className="font-outfit text-[14px] text-white/55">
                    A quick check before you sign your agreement online.
                  </p>
                </div>

                <div className="rounded-xl bg-white/[0.03] border border-white/10 p-5">
                  <p className="font-outfit text-[11px] uppercase tracking-[0.18em] text-white/40 mb-3">
                    Summary
                  </p>
                  <dl className="space-y-2.5 font-outfit text-[14px]">
                    {[
                      ["You", formData.sellerName || "—"],
                      [
                        "Contact",
                        `${formData.sellerEmail || "—"} · ${formData.sellerPhone || "—"}`,
                      ],
                      [
                        "Property",
                        `${formData.addressLine1 || "—"}${formData.postcode ? `, ${fmtPostcode(formData.postcode)}` : ""}`,
                      ],
                      ["Property details", formData.listingUrl || "—"],
                      ["Asking price", formData.askingPrice || "—"],
                      ["Bedrooms", formData.bedrooms || "—"],
                      ["Listed building", formData.listedStatus || "—"],
                      ["Balgores branch", formData.branch || "—"],
                      [
                        "Balgores agent",
                        formData.agentName || formData.agentEmail
                          ? `${formData.agentName || "—"}${formData.agentEmail ? ` · ${formData.agentEmail}` : ""}`
                          : "—",
                      ],
                    ].map(([k, v]) => (
                      <div
                        key={k}
                        className="flex items-start justify-between gap-6 py-1"
                        data-testid={`order-review-${k
                          .toLowerCase()
                          .replace(/\s+/g, "-")}`}
                      >
                        <span className="text-white/55 shrink-0 w-[160px]">{k}</span>
                        <span className="text-white text-right break-words">{v}</span>
                      </div>
                    ))}
                  </dl>
                </div>

                <div className="rounded-xl border border-[#B8AB84]/30 bg-[#B8AB84]/[0.06] p-5">
                  <p className="font-outfit text-[13.5px] text-white/80 leading-relaxed">
                    <span className="text-[#B8AB84] font-semibold">
                      What happens next:
                    </span>{" "}
                    when you continue, you&apos;ll be taken straight to your
                    survey agreement to read and sign online. Nothing is sent
                    to the surveyors until you&apos;ve agreed to the terms.
                  </p>
                </div>

                <label
                  className="flex items-start gap-4 cursor-pointer p-5 rounded-xl border border-white/10 bg-white/[0.02] hover:border-[#B8AB84]/30 transition-colors"
                  data-testid="order-confirmation-checkbox"
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={formData.confirmation}
                    onChange={setField("confirmation")}
                  />
                  <span
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mt-[2px] transition-all ${
                      formData.confirmation
                        ? "border-transparent"
                        : "border-white/35"
                    }`}
                    style={formData.confirmation ? { background: "#B8AB84" } : {}}
                  >
                    {formData.confirmation && (
                      <Check className="w-3 h-3 text-white" strokeWidth={3} />
                    )}
                  </span>
                  <span className="text-white/80 text-sm font-outfit leading-relaxed">
                    I confirm I&apos;m happy for RPSA to contact me about
                    arranging my survey. *
                  </span>
                </label>
                {errors.confirmation && (
                  <p className={errorCls}>{errors.confirmation}</p>
                )}
              </div>
            )}

            {/* Footer nav */}
            {submitError && (
              <p
                className="pt-3 text-[#FF8A8A] text-xs font-outfit"
                data-testid="order-survey-error"
              >
                {submitError}
              </p>
            )}
            <div className="mt-10 pt-6 border-t border-white/10 flex items-center justify-between">
              <button
                type="button"
                onClick={prev}
                disabled={currentStep === 1}
                className={`inline-flex items-center gap-1.5 font-outfit font-medium text-[14px] ${
                  currentStep === 1
                    ? "text-white/25 cursor-not-allowed"
                    : "text-white/65 hover:text-white"
                } transition-colors`}
                data-testid="order-survey-prev"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>

              {currentStep < totalSteps ? (
                <button
                  type="button"
                  onClick={next}
                  className="inline-flex items-center gap-2 rounded-full px-6 py-3 font-outfit font-semibold text-[14px] text-white transition-all hover:opacity-90"
                  style={{
                    background: "#B8AB84",
                    boxShadow: "0 6px 20px rgba(26,20,52,0.4)",
                  }}
                  data-testid="order-survey-next"
                >
                  Continue
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={submit}
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 rounded-full px-6 py-3 font-outfit font-semibold text-[14px] text-white transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background: "#B8AB84",
                    boxShadow: "0 6px 20px rgba(26,20,52,0.4)",
                  }}
                  data-testid="order-survey-submit"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      One moment...
                    </>
                  ) : (
                    <>
                      Review &amp; Sign Agreement
                      <PenLine className="w-4 h-4" />
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default OrderSurveyPage;
