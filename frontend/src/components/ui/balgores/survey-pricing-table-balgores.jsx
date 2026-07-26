import React from "react";
import { Link } from "react-router-dom";
import SurveyGuide from "@/components/ui/balgores/survey-guide-balgores";

/*
 * Survey pricing table — Balgores duplicate of the home-page table.
 * Flat palette only: #B8AB84 gold accents, no gradients.
 */

const ROWS = [
  { band: "Up to £999,999", beds13: "£776", beds45: "£1,006", beds6: "£1,374" },
  { band: "£1,000,000 to £1,499,999", beds13: "£1,006", beds45: "£1,235", beds6: "£1,604" },
  { band: "£1,500,000 to £1,999,999", beds13: "£1,235", beds45: "£1,466", beds6: "£1,834" },
  { band: "£2,000,000 to £2,499,999", beds13: "£1,718", beds45: "£2,063", beds6: "£2,408" },
];

const NOTES = [
  {
    title: "Listed buildings, Grade 2 or 2*",
    body: (
      <>
        Add <span className="text-white font-semibold">£200</span> to the price
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
];

const GoldRule = () => <div className="h-px w-full bg-[#B8AB84]/40" />;

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
          <span className="text-[#B8AB84]">Pricing</span>
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
        <p
          className="mb-5 text-right font-outfit font-semibold text-[13px] text-white/70"
          data-testid="pricing-vat-note"
        >
          *All prices include VAT
        </p>
        {/* Desktop / tablet table */}
        <div className="hidden md:block">
          <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr] gap-x-6 pb-4">
            <span className="font-archivo font-bold text-white text-[17px]">Property value</span>
            <span className="font-archivo font-bold text-white text-[17px] text-right">1 to 3 beds</span>
            <span className="font-archivo font-bold text-white text-[17px] text-right">4 to 5 beds</span>
            <span className="font-archivo font-bold text-white text-[17px] text-right">6+ beds</span>
          </div>
          <GoldRule />
          {ROWS.map((r) => (
            <React.Fragment key={r.band}>
              <div
                className="grid grid-cols-[1.5fr_1fr_1fr_1fr] gap-x-6 items-center py-5"
                data-testid={`pricing-row-${r.band.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`}
              >
                <span className="font-outfit text-white/85 text-[15px]">{r.band}</span>
                <span className="font-archivo font-bold text-white text-[19px] text-right">{r.beds13}</span>
                <span className="font-archivo font-bold text-white text-[19px] text-right">{r.beds45}</span>
                <span className="font-archivo font-bold text-white text-[19px] text-right">{r.beds6}</span>
              </div>
              <GoldRule />
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
                  <span className="font-archivo font-bold text-white text-[16px]">{r.beds6}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

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
            to="/balgores/pricing"
            className="font-outfit font-semibold text-[14px] text-[#B8AB84] hover:text-white transition-colors"
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
