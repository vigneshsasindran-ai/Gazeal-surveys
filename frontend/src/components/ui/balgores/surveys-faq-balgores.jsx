import React from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ArrowRight } from "lucide-react";

/*
 * Gazeal Surveys — FAQ
 * Mirrors the Elite FAQ pattern: sticky left column with heading + contact
 * card, accordion list on the right, and an "Apply" CTA row at the bottom
 * styled as a card instead of a Q&A.
 */

const FAQ_ITEMS = [
  {
    question: "Who pays for the survey, me or the buyer?",
    answer:
      "You do, but nothing upfront. The fee is settled at completion or within six months, whichever comes first, and if the sale collapses because the buyer pulls out, you pay nothing at all.",
  },
  {
    question: "When is the survey carried out?",
    answer:
      "At the point of listing, as your home goes to market. That is the whole idea. The condition is known from day one, so buyers offer on the facts instead of finding them out weeks later.",
  },
  {
    question: "Will it slow down putting my home on the market?",
    answer:
      "No. Your home is marketed as normal and the survey runs alongside. Having the report ready tends to speed the sale up, because buyers commit faster and with fewer conditions when the information is already there.",
  },
  {
    question: "What type of survey is it?",
    answer:
      "A professional condition survey carried out by accredited surveyors from the Residential Property Surveyors Association, similar to a Level 2 or Level 3 survey. It gives buyers a clear, independent view of your property before they offer.",
  },
  {
    question: "What if the survey finds a problem?",
    answer:
      "You stay in control. You can get the works done before buyers view, like selling with a full service history, or simply share the findings so buyers offer with their eyes open. Either way, nothing new can surface later to derail your sale.",
  },
  {
    question: "Can buyers rely on the report?",
    answer:
      "Yes. It is independent and professionally accredited, and it indemnifies both you and the buyer, so both sides are protected by it.",
  },
  {
    question: "Does the buyer still need their own survey or mortgage valuation?",
    answer:
      "A lender's mortgage valuation is a separate process and the buyer's lender will still run their own. Your upfront survey gives the buyer the condition information from day one, so in most cases they have what they need to offer with confidence without commissioning a second survey.",
  },
  {
    question: "Do I have to order a survey to sell with Balgores?",
    answer:
      "No, it is completely optional. But sellers who order upfront give buyers transparency from day one, which tends to mean stronger offers and a sale that holds together.",
  },
  {
    question: "How do I get started?",
    answer:
      "Click Order Survey, tell us about you and your property, and sign the agreement online. It takes about two minutes and you pay nothing today.",
  },
];

const SurveysFAQ = ({ onOrderSurvey }) => {
  return (
    <section
      id="faq"
      className="relative py-16 md:py-24 bg-black overflow-hidden"
      data-testid="surveys-faq-section"
    >
      {/* Ambient blue backdrop */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#1A1434]/[0.05] to-transparent pointer-events-none" />
      <div className="pointer-events-none absolute right-1/4 bottom-0 h-[320px] w-[420px] bg-[#B8AB84]/[0.08] blur-3xl opacity-50" />

      <div className="relative z-10 max-w-[1200px] mx-auto px-6 lg:px-12">
        <div className="grid lg:grid-cols-[1fr_2fr] gap-10 lg:gap-16">
          {/* Sticky column */}
          <div>
            <div className="lg:sticky lg:top-32">
              <h2 className="text-3xl md:text-4xl lg:text-[44px] font-archivo font-bold tracking-[-0.025em] leading-[1.15] mb-4">
                <span className="text-white">Common </span>
                <span className="text-[#B8AB84]">
                  Questions
                </span>
              </h2>

              <p className="text-white/55 text-sm leading-relaxed mb-6 font-outfit">
                Everything you need to know about ordering your upfront
                survey when selling with Balgores.
              </p>

              <div className="p-4 bg-[#B8AB84]/[0.08] border border-[#B8AB84]/25 rounded-xl">
                <p className="text-white/70 text-xs mb-1 font-outfit">
                  Still have questions?
                </p>
                <a
                  href="mailto:survey@gazeal.co.uk"
                  className="text-[#B8AB84] font-semibold text-sm hover:opacity-80 font-outfit"
                  data-testid="surveys-faq-contact"
                >
                  survey@gazeal.co.uk →
                </a>
              </div>
            </div>
          </div>

          {/* Accordion */}
          <div>
            <Accordion type="single" collapsible className="space-y-2">
              {FAQ_ITEMS.map((item, index) => (
                <AccordionItem
                  key={index}
                  value={`item-${index}`}
                  className="border border-white/[0.08] bg-white/[0.02] px-5 rounded-xl data-[state=open]:border-[#B8AB84]/30 data-[state=open]:bg-[#B8AB84]/[0.06] transition-all overflow-hidden"
                  data-testid={`surveys-faq-item-${index}`}
                >
                  <AccordionTrigger className="text-left text-white hover:text-[#B8AB84] hover:no-underline py-4 text-[15px] font-medium font-outfit">
                    {item.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-white/65 pb-4 leading-relaxed text-sm font-outfit whitespace-pre-line">
                    {item.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}

              {/* Apply CTA — rendered as a card instead of a Q&A */}
              <div
                className="border border-[#B8AB84]/25 bg-[#B8AB84]/[0.06] rounded-xl px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                data-testid="surveys-faq-apply-card"
                id="apply"
              >
                <div>
                  <div className="text-white font-medium text-[15px] font-outfit mb-1">
                    Get your home sale-ready today.
                  </div>
                  <div className="text-white/55 text-sm font-outfit">
                    Order your survey and sign online in under two minutes.
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={onOrderSurvey}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-[#B8AB84] text-white font-semibold px-5 py-2.5 text-sm hover:opacity-90 transition-opacity font-outfit shadow-[0_4px_15px_rgba(26,20,52,0.4)] whitespace-nowrap"
                    data-testid="surveys-faq-order-survey"
                  >
                    Order Survey
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </Accordion>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SurveysFAQ;
