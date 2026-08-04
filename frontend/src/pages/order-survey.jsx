import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  Check,
  User,
  Users,
  Home as HomeIcon,
  ShieldCheck,
  Send,
} from "lucide-react";

/*
 * /order-survey — "Invite your seller to book a survey"
 *
 * Layout / flow ported from the Gazeal Advance GetPaidPage pattern:
 *   • Slim back link + headline
 *   • 4-step indicator strip
 *   • Glass card with per-step form
 *   • Footer with Back + Continue / Send the Invite
 *
 * Front-end only: on submit we log to console and show a success card,
 * then offer "Back to homepage".
 */

const LOGO_SRC =
  "https://customer-assets.emergentagent.com/job_survey-pro-10/artifacts/k9mairc3_Gazeal%20surveys%20logo.png";

const STEPS = [
  { number: 1, title: "About you", icon: User },
  { number: 2, title: "Your seller", icon: Users },
  { number: 3, title: "The property", icon: HomeIcon },
  { number: 4, title: "Confirmation", icon: ShieldCheck },
];

const inputCls =
  "w-full px-4 py-3 rounded-xl bg-white/5 border border-white/15 text-white placeholder-white/40 font-outfit text-[14px] focus:outline-none focus:border-[#4FB6FF]/60 transition-colors";

const labelCls =
  "block text-sm text-white/65 mb-2 font-outfit";

const errorCls = "text-[#FF6B6B] text-xs mt-1 font-outfit";

const OrderSurveyPage = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [errors, setErrors] = useState({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [formData, setFormData] = useState({
    // About you
    agentName: "",
    agencyName: "",
    branch: "",
    phone: "",
    email: "",
    // Your seller
    sellerName: "",
    sellerEmail: "",
    sellerPhone: "",
    // The property
    addressLine1: "",
    postcode: "",
    listingUrl: "",
    askingPrice: "",
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
      if (!formData.agentName.trim()) e.agentName = "Required";
      if (!formData.agencyName.trim()) e.agencyName = "Required";
      if (!formData.phone.trim()) e.phone = "Required";
      if (!formData.email.trim()) e.email = "Required";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email))
        e.email = "Valid email required";
    }
    if (step === 2) {
      if (!formData.sellerName.trim()) e.sellerName = "Required";
      if (!formData.sellerEmail.trim()) e.sellerEmail = "Required";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.sellerEmail))
        e.sellerEmail = "Valid email required";
    }
    if (step === 3) {
      if (!formData.addressLine1.trim()) e.addressLine1 = "Required";
      if (!formData.postcode.trim()) e.postcode = "Required";
      else if (!/^[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}$/i.test(formData.postcode.trim()))
        e.postcode = "Enter a valid UK postcode (e.g. CM2 6PJ)";
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
            agent_name: formData.agentName,
            agency_name: formData.agencyName,
            branch: formData.branch,
            phone: formData.phone,
            email: formData.email,
            seller_name: formData.sellerName,
            seller_email: formData.sellerEmail,
            seller_phone: formData.sellerPhone,
            address_line_1: formData.addressLine1,
            postcode: formData.postcode.trim().toUpperCase().replace(/\s+/g, "").replace(/(.{3})$/, " $1"),
            listing_url: formData.listingUrl,
            asking_price: formData.askingPrice,
            confirmation: formData.confirmation,
            
          }),
        }
      );
      if (!res.ok) {
        const detail = await res.text();
        throw new Error(detail || `Request failed (${res.status})`);
      }
      setIsSubmitted(true);
    } catch (err) {
      setSubmitError(
        "We couldn't send the invite just now. Please try again in a moment."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-black" data-testid="order-survey-page">
      {/* Slim header */}
      <header className="w-full">
        <div className="max-w-[1200px] mx-auto px-6 lg:px-12 py-5 flex items-center justify-between">
          <Link
            to="/"
            className="flex items-center gap-3"
            data-testid="order-survey-back-home"
          >
            <img src={LOGO_SRC} alt="Gazeal Surveys" className="h-9 w-auto" />
          </Link>
          <button
            type="button"
            onClick={() => navigate("/")}
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
            <p className="font-outfit text-[12px] font-semibold tracking-[0.22em] uppercase text-[#4FB6FF] mb-4">
              Order survey
            </p>
            <h1 className="text-3xl md:text-[42px] font-archivo font-bold tracking-[-0.025em] text-white leading-[1.12]">
              Invite your seller{" "}
              <span className="bg-gradient-to-r from-[#4FB6FF] to-[#025eba] bg-clip-text text-transparent">
                to book a survey
              </span>
            </h1>
          </div>

          {!isSubmitted && (
            <>
              {/* Before you start intro */}
              <div
                className="mb-10 rounded-2xl border border-white/10 bg-white/[0.02] p-6 md:p-7"
                data-testid="order-survey-intro"
              >
                <h2 className="font-archivo font-bold tracking-[-0.025em] text-[22px] text-white mb-3">
                  Before you start
                </h2>
                <p className="font-outfit text-[14px] leading-relaxed text-white/65 mb-4">
                  This sends your seller an invite to arrange their
                  survey. Here is how it works:
                </p>
                <ul className="space-y-2.5">
                  {[
                    "You add your details, your seller's details and the property listing below.",
                    "We email your seller an invite to book their survey with an accredited surveyor.",
                    "Your seller books directly. They pay nothing now. With a Gazeal Reservation Agreement, the fee is settled at completion, and there is no fee at all if the sale falls through at no fault of the seller.",
                  ].map((line) => (
                    <li
                      key={line}
                      className="flex items-start gap-3 font-outfit text-[14px] text-white/75 leading-relaxed"
                    >
                      <span
                        className="mt-[2px] inline-flex h-5 w-5 items-center justify-center rounded-full shrink-0"
                        style={{
                          background:
                            "linear-gradient(135deg, #4FB6FF 0%, #025eba 100%)",
                        }}
                      >
                        <Check className="w-3 h-3 text-white" strokeWidth={3} />
                      </span>
                      {line}
                    </li>
                  ))}
                </ul>
                <p className="font-outfit text-[13px] text-white/45 mt-5">
                  It takes two minutes and the listing link. We handle the
                  rest. Fields marked * are required.
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
                              ? "border-[#4FB6FF]/40 bg-white/[0.04]"
                              : "border-white/15 bg-white/[0.02]"
                          }`}
                          style={
                            isActive
                              ? {
                                  background:
                                    "linear-gradient(135deg, #4FB6FF 0%, #025eba 100%)",
                                  boxShadow:
                                    "0 0 18px rgba(79,182,255,0.45)",
                                }
                              : {}
                          }
                          data-testid={`order-step-indicator-${s.number}`}
                        >
                          {isComplete ? (
                            <Check className="w-4 h-4 text-[#4FB6FF]" strokeWidth={3} />
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
                              ? "text-[#4FB6FF]"
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
                                ? "linear-gradient(90deg, #4FB6FF, #025eba)"
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
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#4FB6FF]/40 to-transparent pointer-events-none" />

                {/* Step 1 */}
                {currentStep === 1 && (
                  <div className="space-y-5">
                    <div>
                      <h3 className="font-archivo font-bold tracking-[-0.025em] text-[26px] text-white mb-1">
                        About you
                      </h3>
                      <p className="font-outfit text-[14px] text-white/55">
                        We use this to send the seller their invite from your
                        branch.
                      </p>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
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
                      <div>
                        <label className={labelCls}>Agency name *</label>
                        <input
                          type="text"
                          className={inputCls}
                          value={formData.agencyName}
                          onChange={setField("agencyName")}
                          placeholder="Agency name"
                          data-testid="order-input-agency"
                        />
                        {errors.agencyName && (
                          <p className={errorCls}>{errors.agencyName}</p>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className={labelCls}>Branch</label>
                      <input
                        type="text"
                        className={inputCls}
                        value={formData.branch}
                        onChange={setField("branch")}
                        placeholder="Branch name (optional)"
                        data-testid="order-input-branch"
                      />
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className={labelCls}>Phone *</label>
                        <input
                          type="tel"
                          className={inputCls}
                          value={formData.phone}
                          onChange={setField("phone")}
                          placeholder="Contact number"
                          data-testid="order-input-phone"
                        />
                        {errors.phone && (
                          <p className={errorCls}>{errors.phone}</p>
                        )}
                      </div>
                      <div>
                        <label className={labelCls}>Email *</label>
                        <input
                          type="email"
                          className={inputCls}
                          value={formData.email}
                          onChange={setField("email")}
                          placeholder="Your work email"
                          data-testid="order-input-email"
                        />
                        {errors.email && (
                          <p className={errorCls}>{errors.email}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 2 */}
                {currentStep === 2 && (
                  <div className="space-y-5">
                    <div>
                      <h3 className="font-archivo font-bold tracking-[-0.025em] text-[26px] text-white mb-1">
                        Your seller
                      </h3>
                      <p className="font-outfit text-[14px] text-white/55">
                        This is who we send the invite to.
                      </p>
                    </div>
                    <div>
                      <label className={labelCls}>Seller name *</label>
                      <input
                        type="text"
                        className={inputCls}
                        value={formData.sellerName}
                        onChange={setField("sellerName")}
                        placeholder="Seller's full name"
                        data-testid="order-input-seller-name"
                      />
                      {errors.sellerName && (
                        <p className={errorCls}>{errors.sellerName}</p>
                      )}
                    </div>
                    <div>
                      <label className={labelCls}>Seller email *</label>
                      <input
                        type="email"
                        className={inputCls}
                        value={formData.sellerEmail}
                        onChange={setField("sellerEmail")}
                        placeholder="Seller's email"
                        data-testid="order-input-seller-email"
                      />
                      <p className="font-outfit text-[12px] text-white/45 mt-1.5">
                        The invite is sent here.
                      </p>
                      {errors.sellerEmail && (
                        <p className={errorCls}>{errors.sellerEmail}</p>
                      )}
                    </div>
                    <div>
                      <label className={labelCls}>Seller phone</label>
                      <input
                        type="tel"
                        className={inputCls}
                        value={formData.sellerPhone}
                        onChange={setField("sellerPhone")}
                        placeholder="Seller's phone (optional)"
                        data-testid="order-input-seller-phone"
                      />
                    </div>
                  </div>
                )}

                {/* Step 3 */}
                {currentStep === 3 && (
                  <div className="space-y-5">
                    <div>
                      <h3 className="font-archivo font-bold tracking-[-0.025em] text-[26px] text-white mb-1">
                        The property
                      </h3>
                      <p className="font-outfit text-[14px] text-white/55">
                        Just enough for the surveyor to plan their visit.
                      </p>
                    </div>
                    <div>
                      <label className={labelCls}>
                        First line of address *
                      </label>
                      <input
                        type="text"
                        className={inputCls}
                        value={formData.addressLine1}
                        onChange={setField("addressLine1")}
                        placeholder="First line of the property address"
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
                        <label className={labelCls}>
                          Asking price
                        </label>
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
                    <div>
                      <label className={labelCls}>
                        Property web link or details to help us identify the property
                      </label>
                      <p className="font-outfit text-[12px] text-white/45 mt-1.5 mb-2">
                        Optional, but really helps the surveyor. A Rightmove
                        or Zoopla link is ideal; a description, what3words or
                        any other detail works too.
                      </p>
                      <textarea
                        rows={3}
                        className={`${inputCls} resize-none`}
                        value={formData.listingUrl}
                        onChange={setField("listingUrl")}
                        placeholder="e.g. https://www.rightmove.co.uk/... or 'detached corner plot with the blue door, opposite the church'"
                        data-testid="order-input-listing-url"
                      />
                      {errors.listingUrl && (
                        <p className={errorCls}>{errors.listingUrl}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Step 4 */}
                {currentStep === 4 && (
                  <div className="space-y-5">
                    <div>
                      <h3 className="font-archivo font-bold tracking-[-0.025em] text-[26px] text-white mb-1">
                        Confirmation
                      </h3>
                      <p className="font-outfit text-[14px] text-white/55">
                        A quick review before we send the invite.
                      </p>
                    </div>

                    <div className="rounded-xl bg-white/[0.03] border border-white/10 p-5">
                      <p className="font-outfit text-[11px] uppercase tracking-[0.18em] text-white/40 mb-3">
                        Summary
                      </p>
                      <dl className="space-y-2.5 font-outfit text-[14px]">
                        {[
                          ["Agent", `${formData.agentName || "—"} · ${formData.agencyName || "—"}${formData.branch ? ` (${formData.branch})` : ""}`],
                          ["Contact", `${formData.email || "—"} · ${formData.phone || "—"}`],
                          ["Seller", formData.sellerName || "—"],
                          ["Seller invite to", formData.sellerEmail || "—"],
                          [
                            "Property",
                            `${formData.addressLine1 || "—"}${formData.postcode ? `, ${formData.postcode}` : ""}`,
                          ],
                          ["Property details", formData.listingUrl || "—"],
                          ["Asking price", formData.askingPrice || "—"],
                        ].map(([k, v]) => (
                          <div
                            key={k}
                            className="flex items-start justify-between gap-6 py-1"
                            data-testid={`order-review-${k
                              .toLowerCase()
                              .replace(/\s+/g, "-")}`}
                          >
                            <span className="text-white/55 shrink-0 w-[160px]">
                              {k}
                            </span>
                            <span className="text-white text-right break-words">
                              {v}
                            </span>
                          </div>
                        ))}
                      </dl>
                    </div>

                    <label
                      className="flex items-start gap-4 cursor-pointer p-5 rounded-xl border border-white/10 bg-white/[0.02] hover:border-[#4FB6FF]/30 transition-colors"
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
                        style={
                          formData.confirmation
                            ? {
                                background:
                                  "linear-gradient(135deg, #4FB6FF 0%, #025eba 100%)",
                              }
                            : {}
                        }
                      >
                        {formData.confirmation && (
                          <Check className="w-3 h-3 text-white" strokeWidth={3} />
                        )}
                      </span>
                      <span className="text-white/80 text-sm font-outfit leading-relaxed">
                        I confirm my seller is happy for RPSA to contact them
                        about arranging their survey. *
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
                    className="px-7 sm:px-9 pt-3 text-[#FF8A8A] text-xs font-outfit"
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
                        background:
                          "linear-gradient(135deg, #4FB6FF 0%, #025eba 100%)",
                        boxShadow: "0 6px 20px rgba(2,94,186,0.4)",
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
                        background:
                          "linear-gradient(135deg, #4FB6FF 0%, #025eba 100%)",
                        boxShadow: "0 6px 20px rgba(2,94,186,0.4)",
                      }}
                      data-testid="order-survey-submit"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          Send the Invite
                          <Send className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Success state */}
          {isSubmitted && (
            <div
              className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-white/[0.01] p-8 md:p-12 text-center"
              data-testid="order-survey-success"
            >
              <div
                className="inline-flex items-center justify-center w-14 h-14 rounded-full mb-6"
                style={{
                  background:
                    "linear-gradient(135deg, #4FB6FF 0%, #025eba 100%)",
                  boxShadow: "0 8px 30px rgba(79,182,255,0.4)",
                }}
              >
                <Check className="w-6 h-6 text-white" strokeWidth={3} />
              </div>
              <h2 className="font-archivo font-bold tracking-[-0.025em] text-[30px] text-white mb-3">
                Invite on its way to{" "}
                <span className="bg-gradient-to-r from-[#4FB6FF] to-[#025eba] bg-clip-text text-transparent">
                  {formData.sellerName.split(" ")[0] || "your seller"}
                </span>
              </h2>
              <p className="font-outfit text-[15px] text-white/65 max-w-[52ch] mx-auto leading-relaxed mb-8">
                RPSA will email your seller an invite from your branch and
                book the survey directly. You&apos;ll get a copy of the
                report the moment it&apos;s uploaded, and they pay nothing
                now. With a Gazeal Reservation Agreement the fee is settled
                at completion; without one, at completion or within six
                months, whichever comes first.
              </p>
              <button
                type="button"
                onClick={() => navigate("/")}
                className="inline-flex items-center gap-2 rounded-full px-6 py-3 font-outfit font-semibold text-[14px] text-white hover:opacity-90 transition-all"
                style={{
                  background:
                    "linear-gradient(135deg, #4FB6FF 0%, #025eba 100%)",
                  boxShadow: "0 6px 20px rgba(2,94,186,0.4)",
                }}
                data-testid="order-survey-return-home"
              >
                Back to homepage
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default OrderSurveyPage;
