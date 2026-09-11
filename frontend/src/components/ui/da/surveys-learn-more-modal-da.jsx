import React, { useEffect, useRef, useState } from "react";
import { X, Check, ArrowRight } from "lucide-react";

/*
 * "Learn More" modal — ported from the Gazeal Elite StandardModal pattern.
 *
 *   1. Collect Full Name + Agency + Work Email
 *   2. On submit → switch to HubSpot meeting embed
 *      (https://meetings.hubspot.com/bryan-mansell/gazeal-surveys?embed=true)
 *
 * Front-end only: lead data is logged to console; the HubSpot iframe handles
 * the actual booking.
 */

const HUBSPOT_URL =
  "https://meetings.hubspot.com/bryan-mansell/gazeal-surveys?embed=true";

const HubSpotMeetingsEmbed = ({ formData = {} }) => {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const [firstName, ...rest] = (formData.fullName || "").trim().split(/\s+/);
    const lastName = rest.join(" ");
    const params = new URLSearchParams();
    if (firstName) params.set("firstName", firstName);
    if (lastName) params.set("lastName", lastName);
    if (formData.email) params.set("email", formData.email);
    const prefilledSrc = `${HUBSPOT_URL}${
      params.toString() ? `&${params.toString()}` : ""
    }`;

    const embed = document.createElement("div");
    embed.className = "meetings-iframe-container";
    embed.setAttribute("data-src", prefilledSrc);
    containerRef.current.innerHTML = "";
    containerRef.current.appendChild(embed);

    const SCRIPT_SRC =
      "https://static.hsappstatic.net/MeetingsEmbed/ex/MeetingsEmbedCode.js";
    const existing = document.querySelector(`script[src="${SCRIPT_SRC}"]`);
    if (existing) existing.remove();
    const script = document.createElement("script");
    script.type = "text/javascript";
    script.src = SCRIPT_SRC;
    script.async = true;
    document.body.appendChild(script);

    return () => {
      script.remove();
    };
  }, [formData.fullName, formData.email]);

  return (
    <div
      ref={containerRef}
      className="w-full rounded-xl overflow-hidden bg-white/70 border border-[#2B1B20]/10"
      style={{ minHeight: "640px" }}
      data-testid="hubspot-meetings-embed"
    />
  );
};

const SurveysLearnMoreModal = ({ open, onClose }) => {
  const [formData, setFormData] = useState({
    fullName: "",
    agency: "",
    email: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") handleClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  const handleClose = () => {
    setFormData({ fullName: "", agency: "", email: "" });
    setIsSuccess(false);
    setIsSubmitting(false);
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError("");
    try {
      const res = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}/api/leads/learn-more`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            full_name: formData.fullName,
            agency: formData.agency,
            email: formData.email,
            brand: "davidastburys",
          }),
        }
      );
      if (!res.ok) {
        const detail = await res.text();
        throw new Error(detail || `Request failed (${res.status})`);
      }
      setIsSuccess(true);
    } catch (err) {
      setSubmitError(
        "We couldn't send your request just now. Please try again in a moment."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      data-testid="learn-more-modal"
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-[#2B1B20]/60 backdrop-blur-sm"
        onClick={handleClose}
        data-testid="learn-more-backdrop"
      />

      <div
        className={`relative w-full ${
          isSuccess ? "max-w-3xl" : "max-w-lg"
        } bg-white border border-[#2B1B20]/10 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto`}
      >
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#9B2743]/40 to-transparent pointer-events-none" />

        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-[#2B1B20]/50 hover:text-[#2B1B20] transition-colors z-10"
          data-testid="learn-more-close"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        {!isSuccess ? (
          <div className="p-8" data-testid="learn-more-form-state">
            <div className="text-center mb-7">
              <div
                className="inline-flex items-center justify-center w-14 h-14 rounded-full mb-4"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(184,171,132,0.18) 0%, rgba(155,39,67,0.12) 100%)",
                  border: "1px solid rgba(184,171,132,0.25)",
                }}
              >
                <Check className="h-6 w-6 text-[#9B2743]" strokeWidth={2.4} />
              </div>
              <h2 className="text-2xl sm:text-[28px] font-archivo font-bold tracking-[-0.025em] mb-2 text-[#2B1B20]">
                Learn more about upfront surveys
              </h2>
              <p className="text-[#2B1B20]/65 font-outfit text-sm sm:text-[15px] max-w-sm mx-auto leading-relaxed">
                Tell us who you are and we&apos;ll get you on a quick call to
                walk through how the upfront survey works for your sale.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-[#2B1B20]/60 mb-2 font-outfit">
                  Full name
                </label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) =>
                    setFormData({ ...formData, fullName: e.target.value })
                  }
                  className="w-full px-4 py-3 rounded-xl bg-white/70 border border-[#2B1B20]/15 text-[#2B1B20] placeholder-[#2B1B20]/40 font-outfit text-[14px] focus:outline-none focus:border-[#9B2743]/60 transition-colors"
                  placeholder="Enter your full name"
                  data-testid="learn-more-input-name"
                />
              </div>
              <div>
                <label className="block text-sm text-[#2B1B20]/60 mb-2 font-outfit">
                  Estate agency / branch
                </label>
                <input
                  type="text"
                  required
                  value={formData.agency}
                  onChange={(e) =>
                    setFormData({ ...formData, agency: e.target.value })
                  }
                  className="w-full px-4 py-3 rounded-xl bg-white/70 border border-[#2B1B20]/15 text-[#2B1B20] placeholder-[#2B1B20]/40 font-outfit text-[14px] focus:outline-none focus:border-[#9B2743]/60 transition-colors"
                  placeholder="e.g. David Astburys Islington"
                  data-testid="learn-more-input-agency"
                />
              </div>
              <div>
                <label className="block text-sm text-[#2B1B20]/60 mb-2 font-outfit">
                  Work email
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="w-full px-4 py-3 rounded-xl bg-white/70 border border-[#2B1B20]/15 text-[#2B1B20] placeholder-[#2B1B20]/40 font-outfit text-[14px] focus:outline-none focus:border-[#9B2743]/60 transition-colors"
                  placeholder="you@agency.co.uk"
                  data-testid="learn-more-input-email"
                />
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-6 px-6 py-3.5 rounded-full font-outfit font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                style={{
                  background:
                    "#9B2743",
                  boxShadow: "0 6px 20px rgba(155,39,67,0.4)",
                }}
                data-testid="learn-more-submit"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-[#2B1B20]/30 border-t-white rounded-full animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    Continue to booking
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
              {submitError && (
                <p
                  className="text-[#FF8A8A] text-xs text-center mt-2 font-outfit"
                  data-testid="learn-more-error"
                >
                  {submitError}
                </p>
              )}
              <p className="text-[#2B1B20]/40 text-xs text-center mt-2 font-outfit">
                By continuing you agree to Gazeal&apos;s terms of service.
              </p>
            </form>
          </div>
        ) : (
          <div
            className="p-6 sm:p-8"
            data-testid="learn-more-calendar-state"
          >
            <div className="text-center mb-5">
              <div
                className="inline-flex items-center justify-center w-12 h-12 rounded-full mb-3"
                style={{
                  background:
                    "#9B2743",
                }}
              >
                <Check className="h-5 w-5 text-white" strokeWidth={3} />
              </div>
              <h2 className="text-xl sm:text-2xl font-archivo font-bold tracking-[-0.025em] mb-1 text-[#2B1B20]">
                Book your Gazeal Surveys call
              </h2>
              <p className="text-[#2B1B20]/60 font-outfit text-sm">
                Thanks {formData.fullName.split(" ")[0] || "there"}. Pick a
                slot that works for you below.
              </p>
            </div>
            <HubSpotMeetingsEmbed formData={formData} />
            <div className="mt-4 text-center">
              <button
                onClick={handleClose}
                className="text-[#2B1B20]/40 hover:text-[#2B1B20]/80 text-sm font-outfit transition-colors"
                data-testid="learn-more-done"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SurveysLearnMoreModal;
