import React from "react";
import { Link } from "react-router-dom";
import SurveyGuide from "@/components/ui/survey-guide";

/*
 * Survey pricing table (home page, below "How it works").
 * Mirrors the printed price table: value bands x bedroom counts,
 * VAT note, and quotation tiles. No icons, clean and modular.
 */

const ROWS = [
  { band: "Up to £999,999", beds13: "£647", beds45: "£839", beds6: "On request" },
  { band: "£1,000,000 to £1,499,999", beds13: "£839", beds45: "£1,030", beds6: "On request" },
  { band: "£1,500,000 to £2,000,000", beds13: "£1,030", beds45: "£1,221", beds6: "On request" },
];

const NOTES = [
  {
    title: "Listed buildings, Grade 2 or 2*",
    body: (
      <>
        Add <span className="text-white font-semibold">£192</span> to the price
        shown above.
      </>
    ),
  },
  {
    title: "Listed buildings, Grade 1",
    body: (
      <>
        Priced by <span className="text-white font-semibold">individual quotation.</span>
      </>
    ),
  },
  {
    title: "6+ bedrooms",
    body: (
      <>
        Priced by <span className="text-white font-semibold">individual quotation</span>{" "}
        across every value band.
      </>
    ),
  },
  {
    title: "Above £2,000,000",
    body: (
      <>
        Priced by <span className="text-white font-semibold">individual quotation.</span>
      </>
    ),
  },
];

const GradientRule = () => (
  <div className="h-px w-full bg-gradient-to-r from-[#4FB6FF]/70 via-[#025eba]/70 to-[#4FB6FF]/40" />
);

const SurveyPricingTable = () => (
  <section
    id="pricing"
    className="relative bg-black pt-4 pb-20 md:pt-6 md:pb-28"
    data-testid="survey-pricing-section"
  >
    <div className="relative mx-auto max-w-3xl lg:max-w-6xl px-6">
      {/* Heading */}
      <div className="mx-auto max-w-3xl text-center mb-10 md:mb-12">
        <h2 className="font-archivo font-bold tracking-[-0.025em] leading-[1.18] text-2xl sm:text-3xl lg:text-[40px]">
          <span className="text-white">Survey </span>
          <span className="bg-gradient-to-r from-[#4FB6FF] to-[#025eba] bg-clip-text text-transparent">
            Pricing
          </span>
        </h2>
        <p className="mt-3 font-outfit text-white/60 text-sm sm:text-base">
          Clear survey pricing by property value and bedroom count.
        </p>
      </div>

      {/* Table card */}
      <div
        className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 sm:p-10"
        data-testid="survey-pricing-table"
      >
        {/* Desktop / tablet table */}
        <div className="hidden md:block">
          <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr] gap-x-6 pb-4">
            <span className="font-archivo font-bold text-white text-[17px]">Property value</span>
            <span className="font-archivo font-bold text-white text-[17px] text-right">1 to 3 beds</span>
            <span className="font-archivo font-bold text-white text-[17px] text-right">4 to 5 beds</span>
            <span className="font-archivo font-bold text-white text-[17px] text-right">6+ beds</span>
          </div>
          <GradientRule />
          {ROWS.map((r) => (
            <React.Fragment key={r.band}>
              <div
                className="grid grid-cols-[1.5fr_1fr_1fr_1fr] gap-x-6 items-center py-5"
                data-testid={`pricing-row-${r.band.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`}
              >
                <span className="font-outfit text-white/85 text-[15px]">{r.band}</span>
                <span className="font-archivo font-bold text-white text-[19px] text-right">{r.beds13}</span>
                <span className="font-archivo font-bold text-white text-[19px] text-right">{r.beds45}</span>
                <span className="font-outfit text-white/55 text-[15px] text-right">{r.beds6}</span>
              </div>
              <GradientRule />
            </React.Fragment>
          ))}
        </div>

        {/* Mobile stacked bands */}
        <div className="md:hidden space-y-5">
          {ROWS.map((r) => (
            <div
              key={r.band}
              className="rounded-2xl border border-white/10 bg-white/[0.02] p-5"
            >
              <p className="font-archivo font-bold text-white text-[16px] mb-4">{r.band}</p>
              <div className="space-y-3 font-outfit text-[14px]">
                <div className="flex justify-between">
                  <span className="text-white/60">1 to 3 beds</span>
                  <span className="font-archivo font-bold text-white text-[16px]">{r.beds13}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">4 to 5 beds</span>
                  <span className="font-archivo font-bold text-white text-[16px]">{r.beds45}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">6+ beds</span>
                  <span className="text-white/55">{r.beds6}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <p
          className="mt-5 font-outfit text-[13px] text-white/50"
          data-testid="pricing-vat-note"
        >
          *VAT is added to the price
        </p>

        {/* Quotation tiles */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {NOTES.map((n) => (
            <div
              key={n.title}
              className="rounded-2xl border border-white/10 bg-white/[0.02] p-5"
              data-testid={`pricing-note-${n.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`}
            >
              <p className="font-archivo font-bold text-white text-[15px] mb-1.5">{n.title}</p>
              <p className="font-outfit text-white/60 text-[14px] leading-[1.6]">{n.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 text-center">
          <Link
            to="/pricing"
            className="font-outfit font-semibold text-[14px] text-[#4FB6FF] hover:text-white transition-colors"
            data-testid="pricing-calculator-link"
          >
            Calculate your exact fee on the live calculator
          </Link>
        </div>
      </div>

      {/* What the survey covers */}
      <div className="mt-6">
        <SurveyGuide testidPrefix="home-survey-guide" />
      </div>
    </div>
  </section>
);

export default SurveyPricingTable;
