import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  Check,
  User,
  Building2,
  Home as HomeIcon,
  ShieldCheck,
  PenLine,
} from "lucide-react";

/*
 * /harrisonshomes/order-survey — SELLER-DIRECT flow.
 *
 * The seller orders their own Home Insight Survey:
 *   1. Your seller (seller details)
 *   2. Your property
 *   3. Your Harrisons Homes agent
 *   4. Review & send
 *
 * On submit the backend mints the agreement and the seller is taken
 * STRAIGHT to /harrisonshomes/agreement/{token} to sign — no email loop.
 */

const HH_LOGO =
  "/brand-assets/hh-logo-white.png";

const STEPS = [
  { number: 1, title: "Your seller", icon: User },
  { number: 2, title: "The property", icon: HomeIcon },
  { number: 3, title: "Your details", icon: Building2 },
  { number: 4, title: "Review & send", icon: ShieldCheck },
];

const inputCls =
  "w-full px-4 py-3 rounded-xl bg-white/5 border border-white/15 text-white placeholder-white/40 font-outfit text-[14px] focus:outline-none focus:border-[#DEA39D]/60 transition-colors";

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
  const [submitted, setSubmitted] = useState(false);
  const [reference, setReference] = useState("");
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
    // Your Harrisons Homes agent
    agentName: "",
    agentEmail: "",
    agentPhone: "",
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
      if (!formData.askingPrice.trim()) e.askingPrice = "Required";
      else if (!/\d/.test(formData.askingPrice)) e.askingPrice = "Enter the asking price";
      if (!formData.bedrooms) e.bedrooms = "Required";
      if (!formData.listedStatus) e.listedStatus = "Required";
    }
    if (step === 3) {
      if (!formData.agentName.trim()) e.agentName = "Your name is required";
      if (!formData.agentEmail.trim()) e.agentEmail = "Your email is required";
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
            flow: "agent",
            brand: "harrisonshomes",
            agent_name: formData.agentName.trim(),
            agency_name: "Harrisons Homes",
            branch: "",
            phone: formData.agentPhone.trim(),
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
      setReference(data.reference_number || "");
      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setSubmitError(
        "We couldn't submit your order just now. Please try again in a moment."
      );
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div
        className="min-h-screen bg-black flex items-center justify-center px-6 py-16"
        data-testid="order-survey-success"
      >
        <div className="w-full max-w-xl">
          <img
            src={HH_LOGO}
            alt="Harrisons Homes"
            className="h-7 w-auto mb-10"
          />
          <p className="font-outfit text-[11px] font-semibold tracking-[0.24em] uppercase text-[#DEA39D]">
            Order received
          </p>
          <h1 className="mt-4 font-archivo font-bold text-white text-3xl sm:text-4xl leading-[1.1] tracking-[-0.025em]">
            {formData.sellerName || "Your seller"} has been emailed their
            agreement
          </h1>
          <p className="mt-4 font-outfit text-[15px] text-white/65 leading-relaxed">
            We have sent {formData.sellerEmail} a link to the Home Insight Survey
            terms for {formData.addressLine1}. As soon as they accept, RPSA is
            instructed and you get a copy of the signed terms by email.
          </p>

          <ol className="mt-8 space-y-4">
            {[
              "Your seller reviews and accepts the terms online.",
              "RPSA contacts them directly to book a convenient visit.",
              "The report is issued to your seller and to you, ready to share with buyers.",
            ].map((line, i) => (
              <li key={line} className="flex items-start gap-3">
                <span
                  className="mt-0.5 w-6 h-6 rounded-full flex items-center justify-center shrink-0 font-outfit font-bold text-[11px] text-[#0E1748]"
                  style={{ background: "#DEA39D" }}
                >
                  {i + 1}
                </span>
                <span className="font-outfit text-[14px] text-white/70 leading-relaxed">
                  {line}
                </span>
              </li>
            ))}
          </ol>

          {reference && (
            <p className="mt-8 font-outfit text-[12px] text-white/40">
              Your reference: <span className="text-white/70">{reference}</span>
            </p>
          )}

          <div className="mt-10 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => navigate("/harrisonshomes")}
              className="inline-flex items-center gap-2 rounded-full px-6 py-3 font-outfit font-semibold text-[14px] text-[#0E1748] transition-all hover:opacity-90"
              style={{ background: "#DEA39D" }}
              data-testid="order-success-home"
            >
              Back to Harrisons Homes Surveys
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 rounded-full border border-white/20 hover:border-white/40 px-6 py-3 font-outfit font-semibold text-[14px] text-white/80 hover:text-white transition-all"
              data-testid="order-success-another"
            >
              Order another survey
            </button>
          </div>
        </div>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-black" data-testid="order-survey-page">
      {/* Slim header */}
      <header className="w-full">
        <div className="max-w-[1200px] mx-auto px-6 lg:px-12 py-5 flex items-center justify-between">
          <Link
            to="/harrisonshomes"
            className="flex items-center gap-3"
            data-testid="order-survey-back-home"
          >
            <img
              src={HH_LOGO}
              alt="Harrisons Homes"
              className="h-6 md:h-7 w-auto"
            />
          </Link>
          <button
            type="button"
            onClick={() => navigate("/harrisonshomes")}
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
            <p className="font-outfit text-[12px] font-semibold tracking-[0.22em] uppercase text-[#DEA39D] mb-4">
              Order your survey
            </p>
            <h1 className="text-3xl md:text-[42px] font-archivo font-bold tracking-[-0.025em] text-white leading-[1.12]">
              Order your{" "}
              <span className="text-[#DEA39D]">Home Insight Survey</span>
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
              You&apos;re ordering the survey on behalf of your seller. Here
              is how it works:
            </p>
            <ul className="space-y-2.5">
              {[
                "Tell us about your seller, the property and yourself below. It takes two minutes.",
                "We email your seller a link to review and accept the survey terms online.",
                "Once they accept, RPSA contacts them directly to arrange the visit. Harrisons Homes pays for the survey, so the seller has nothing to pay, now or later.",
              ].map((line) => (
                <li
                  key={line}
                  className="flex items-start gap-3 font-outfit text-[14px] text-white/75 leading-relaxed"
                >
                  <span
                    className="mt-[2px] inline-flex h-5 w-5 items-center justify-center rounded-full shrink-0"
                    style={{ background: "#DEA39D" }}
                  >
                    <Check className="w-3 h-3 text-[#0E1748]" strokeWidth={3} />
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
                          ? "border-[#DEA39D]/40 bg-white/[0.04]"
                          : "border-white/15 bg-white/[0.02]"
                      }`}
                      style={
                        isActive
                          ? {
                              background: "#DEA39D",
                              boxShadow: "0 0 18px rgba(185,191,214,0.45)",
                            }
                          : {}
                      }
                      data-testid={`order-step-indicator-${s.number}`}
                    >
                      {isComplete ? (
                        <Check className="w-4 h-4 text-[#DEA39D]" strokeWidth={3} />
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
                          ? "text-[#DEA39D]"
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
                            ? "#DEA39D"
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
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#DEA39D]/40 to-transparent pointer-events-none" />

            {/* Step 1 — About you (the seller) */}
            {currentStep === 1 && (
              <div className="space-y-5">
                <div>
                  <h3 className="font-archivo font-bold tracking-[-0.025em] text-[26px] text-white mb-1">
                    Your seller
                  </h3>
                  <p className="font-outfit text-[14px] text-white/55">
                    Who is selling, so RPSA knows who to contact to arrange the
                    visit and we know where to send the agreement.
                  </p>
                </div>
                <div>
                  <label className={labelCls}>Seller name *</label>
                  <input
                    type="text"
                    className={inputCls}
                    value={formData.sellerName}
                    onChange={setField("sellerName")}
                    placeholder="Seller full name"
                    data-testid="order-input-seller-name"
                  />
                  {errors.sellerName && (
                    <p className={errorCls}>{errors.sellerName}</p>
                  )}
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Seller email *</label>
                    <input
                      type="email"
                      className={inputCls}
                      value={formData.sellerEmail}
                      onChange={setField("sellerEmail")}
                      placeholder="you@email.co.uk"
                      data-testid="order-input-seller-email"
                    />
                    <p className="font-outfit text-[12px] text-white/45 mt-1.5">
                      This is where we send the agreement to sign.
                    </p>
                    {errors.sellerEmail && (
                      <p className={errorCls}>{errors.sellerEmail}</p>
                    )}
                  </div>
                  <div>
                    <label className={labelCls}>Seller phone *</label>
                    <input
                      type="tel"
                      className={inputCls}
                      value={formData.sellerPhone}
                      onChange={setField("sellerPhone")}
                      placeholder="Your contact number"
                      data-testid="order-input-seller-phone"
                    />
                    <p className="font-outfit text-[12px] text-white/45 mt-1.5">
                      RPSA calls this number to book the visit.
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
                      placeholder="Asking price"
                      data-testid="order-input-asking-price"
                    />
                    {errors.askingPrice && (
                      <p className={errorCls}>{errors.askingPrice}</p>
                    )}
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Bedrooms</label>
                    <select
                      className={`${inputCls} [&>option]:bg-[#0E1748]`}
                      value={formData.bedrooms}
                      onChange={setField("bedrooms")}
                      data-testid="order-input-bedrooms"
                    >
                      <option value="">Select bedrooms</option>
                      <option value="1 to 3">1 to 3</option>
                      <option value="4 to 5">4 to 5</option>
                      <option value="6+">6+</option>
                    </select>
                    {errors.bedrooms && (
                      <p className={errorCls}>{errors.bedrooms}</p>
                    )}
                  </div>
                  <div>
                    <label className={labelCls}>Registered Listed Building</label>
                    <select
                      className={`${inputCls} [&>option]:bg-[#0E1748]`}
                      value={formData.listedStatus}
                      onChange={setField("listedStatus")}
                      data-testid="order-input-listed"
                    >
                      <option value="">Select status</option>
                      <option value="N/A">N/A</option>
                      <option value="Grade 2 or 2*">Grade 2 or 2*</option>
                      <option value="Grade 1">Grade 1</option>
                    </select>
                    {errors.listedStatus && (
                      <p className={errorCls}>{errors.listedStatus}</p>
                    )}
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

            {/* Step 3 — The ordering agent */}
            {currentStep === 3 && (
              <div className="space-y-5">
                <div>
                  <h3 className="font-archivo font-bold tracking-[-0.025em] text-[26px] text-white mb-1">
                    Your details
                  </h3>
                  <p className="font-outfit text-[14px] text-white/55">
                    You are ordering this survey for your seller. Harrisons Homes
                    pays the fee, and we will keep you updated at every step.
                  </p>
                </div>
                <div>
                  <label className={labelCls}>Your name *</label>
                  <input
                    type="text"
                    className={inputCls}
                    value={formData.agentName}
                    onChange={setField("agentName")}
                    placeholder="Your full name"
                    data-testid="order-input-agent-name"
                  />
                  {errors.agentName && (
                    <p className={errorCls}>{errors.agentName}</p>
                  )}
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Your email *</label>
                    <input
                      type="email"
                      className={inputCls}
                      value={formData.agentEmail}
                      onChange={setField("agentEmail")}
                      placeholder="you@harrisonshomes.co.uk"
                      data-testid="order-input-agent-email"
                    />
                    {errors.agentEmail && (
                      <p className={errorCls}>{errors.agentEmail}</p>
                    )}
                  </div>
                  <div>
                    <label className={labelCls}>Your phone</label>
                    <input
                      type="tel"
                      className={inputCls}
                      value={formData.agentPhone}
                      onChange={setField("agentPhone")}
                      placeholder="Direct number (optional)"
                      data-testid="order-input-agent-phone"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 4 — Review & sign */}
            {currentStep === 4 && (
              <div className="space-y-5">
                <div>
                  <h3 className="font-archivo font-bold tracking-[-0.025em] text-[26px] text-white mb-1">
                    Review &amp; send
                  </h3>
                  <p className="font-outfit text-[14px] text-white/55">
                    A quick check, then we email your seller their agreement to
                    sign online.
                  </p>
                </div>

                <div className="rounded-xl bg-white/[0.03] border border-white/10 p-5">
                  <p className="font-outfit text-[11px] uppercase tracking-[0.18em] text-white/40 mb-3">
                    Summary
                  </p>
                  <dl className="space-y-2.5 font-outfit text-[14px]">
                    {[
                      ["Seller", formData.sellerName || "Not provided"],
                      [
                        "Contact",
                        `${formData.sellerEmail || "Not provided"} · ${formData.sellerPhone || "Not provided"}`,
                      ],
                      [
                        "Property",
                        `${formData.addressLine1 || "Not provided"}${formData.postcode ? `, ${fmtPostcode(formData.postcode)}` : ""}`,
                      ],
                      ["Property details", formData.listingUrl || "Not provided"],
                      ["Asking price", formData.askingPrice || "Not provided"],
                      ["Bedrooms", formData.bedrooms || "Not provided"],
                      ["Listed building", formData.listedStatus || "Not provided"],
                      ["Harrisons Homes agent", formData.agentName || "Not provided"],
                      [
                        "Agent contact",
                        formData.agentEmail || formData.agentPhone
                          ? [formData.agentEmail, formData.agentPhone]
                              .filter(Boolean)
                              .join(" · ")
                          : "Not provided",
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

                <div className="rounded-xl border border-[#DEA39D]/30 bg-[#DEA39D]/[0.06] p-5">
                  <p className="font-outfit text-[13.5px] text-white/80 leading-relaxed">
                    <span className="text-[#DEA39D] font-semibold">
                      What happens next:
                    </span>{" "}
                    when you continue, you&apos;ll be taken straight to your
                    survey agreement to read and sign online. Nothing is sent
                    to the surveyors until you&apos;ve agreed to the terms.
                  </p>
                </div>

                <label
                  className="flex items-start gap-4 cursor-pointer p-5 rounded-xl border border-white/10 bg-white/[0.02] hover:border-[#DEA39D]/30 transition-colors"
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
                    style={formData.confirmation ? { background: "#DEA39D" } : {}}
                  >
                    {formData.confirmation && (
                      <Check className="w-3 h-3 text-[#0E1748]" strokeWidth={3} />
                    )}
                  </span>
                  <span className="text-white/80 text-sm font-outfit leading-relaxed">
                    I confirm my seller has asked for this survey and is happy
                    for RPSA to contact them about arranging the visit. *
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
                  className="inline-flex items-center gap-2 rounded-full px-6 py-3 font-outfit font-semibold text-[14px] text-[#0E1748] transition-all hover:opacity-90"
                  style={{
                    background: "#DEA39D",
                    boxShadow: "0 6px 20px rgba(14,23,72,0.4)",
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
                  className="inline-flex items-center gap-2 rounded-full px-6 py-3 font-outfit font-semibold text-[14px] text-[#0E1748] transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background: "#DEA39D",
                    boxShadow: "0 6px 20px rgba(14,23,72,0.4)",
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
                      Send Agreement To Seller
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
