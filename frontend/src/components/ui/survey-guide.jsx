import React, { useEffect, useState } from "react";
import { X } from "lucide-react";

/*
 * Survey guide explainer + PDF popup.
 * Reused on the home-page pricing table and the seller agreement page.
 */

const GUIDE_PDF_URL = `${process.env.REACT_APP_BACKEND_URL}/api/assets/survey-guide.pdf`;

export const SurveyGuideModal = ({ open, onClose }) => {
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4"
      data-testid="survey-guide-modal"
    >
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
        data-testid="survey-guide-backdrop"
      />
      <div className="relative w-full max-w-4xl h-[96vh] sm:h-[94vh] rounded-2xl overflow-hidden border border-white/15 bg-[#0b0b0d] flex flex-col shadow-[0_30px_80px_rgba(0,0,0,0.6)]">
        <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3.5 border-b border-white/10 bg-white/[0.03]">
          <p className="font-archivo font-bold text-white text-[14px] sm:text-[15px] truncate">
            Home Insights Survey Guide
          </p>
          <div className="flex items-center gap-2 shrink-0">
            <a
              href={GUIDE_PDF_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-outfit text-[12px] sm:text-[13px] font-semibold text-white/70 hover:text-white border border-white/20 hover:border-white/45 rounded-full px-4 py-1.5 transition-all"
              data-testid="survey-guide-open-tab"
            >
              Open in new tab
            </a>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-all"
              aria-label="Close guide"
              data-testid="survey-guide-close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        <iframe
          src={GUIDE_PDF_URL}
          title="Gazeal Surveys summary guide"
          className="flex-1 w-full bg-white"
          data-testid="survey-guide-iframe"
        />
      </div>
    </div>
  );
};

const SurveyGuide = ({ testidPrefix = "survey-guide" }) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div
        className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:p-8"
        data-testid={`${testidPrefix}-card`}
      >
        <div className="flex flex-col md:flex-row md:items-center gap-6 md:gap-10">
          <div className="flex-1">
            <p className="font-outfit font-semibold text-[11px] tracking-[0.22em] uppercase text-[#4FB6FF] mb-3">
              What the survey covers
            </p>
            <p className="font-outfit text-[14px] sm:text-[15px] leading-[1.65] text-white/75">
              This guide summarises the information covered in a full Home
              Insights Survey, a detailed report on every element of a single
              property. The complete survey follows the guidance defined by the
              RPSA Survey Inspection &amp; Reporting Standards, Edition 1v5.2,
              November 2020.
            </p>
          </div>
          <div className="shrink-0">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="inline-flex items-center justify-center rounded-full font-outfit font-semibold text-[14px] px-7 py-3.5 text-white transition-all hover:opacity-90"
              style={{
                background: "linear-gradient(135deg,#4FB6FF,#025eba)",
                boxShadow: "0 6px 22px rgba(2,94,186,0.4)",
              }}
              data-testid={`${testidPrefix}-open-button`}
            >
              Read the guide
            </button>
          </div>
        </div>
      </div>
      <SurveyGuideModal open={open} onClose={() => setOpen(false)} />
    </>
  );
};

export default SurveyGuide;
