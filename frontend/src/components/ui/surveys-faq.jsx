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
    question: "Who pays for the survey, the seller or the buyer?",
    answer:
      "The seller, but nothing upfront. The fee is settled at completion or within six months, whichever comes first, and if the sale collapses because the buyer pulls out, they pay nothing at all.",
  },
  {
    question: "Does it cost me anything as an agent to offer this?",
    answer:
      "No. Gazeal Surveys is available to every Gazeal agent at no cost to you. You add it to your service and strengthen your pitch without touching your overheads.",
  },
  {
    question: "When is the survey carried out?",
    answer:
      "At the point of listing, as the property goes to market. That is the whole idea. The condition is known from day one, so buyers offer on the facts instead of finding them out weeks later.",
  },
  {
    question: "Will offering a survey slow my listing down?",
    answer:
      "No. You market the property as normal and the survey runs alongside. Having the report ready tends to speed the sale up, because buyers commit faster and with fewer conditions when the information is already there.",
  },
  {
    question: "What type of survey is it?",
    answer:
      "A professional condition survey carried out by accredited surveyors from the Residential Property Surveyors Association \u2014 similar to a Level 2 or Level 3 survey. It gives buyers a clear, independent view of the property before they offer.",
  },
  {
    question: "Can buyers rely on the report?",
    answer:
      "Yes. It is independent and professionally accredited, and it indemnifies both the seller and the buyer, so both sides are protected by it.",
  },
  {
    question: "Does the buyer still need their own survey or mortgage valuation?",
    answer:
      "A lender's mortgage valuation is a separate process and the buyer's lender will still run their own. The Gazeal Survey gives the buyer the condition information up front, so in most cases they have what they need to offer with confidence without commissioning a second survey.",
  },
  {
    question: "How do I introduce Gazeal Surveys to win the instruction?",
    answer:
      "Lead with certainty, not cost. Tell your seller they can give buyers full transparency from day one, the way Scotland does, at no upfront cost. It is a clear point of difference that wins listings and protects the sale.",
  },
  {
    question: "Is it available for all my listings?",
    answer:
      "Gazeal Surveys is available to every Gazeal agent for residential sales. Your account team can confirm anything specific about property types or locations.",
  },
];

const SurveysFAQ = ({ onOrderSurvey, onLearnMore }) => {
  return (
    <section
      id="faq"
      className="relative py-16 md:py-24 bg-black overflow-hidden"
      data-testid="surveys-faq-section"
    >
      {/* Ambient blue backdrop */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#025eba]/[0.05] to-transparent pointer-events-none" />
      <div className="pointer-events-none absolute right-1/4 bottom-0 h-[320px] w-[420px] bg-[#4FB6FF]/[0.08] blur-3xl opacity-50" />

      <div className="relative z-10 max-w-[1200px] mx-auto px-6 lg:px-12">
        <div className="grid lg:grid-cols-[1fr_2fr] gap-10 lg:gap-16">
          {/* Sticky column */}
          <div>
            <div className="lg:sticky lg:top-32">
              <h2 className="text-3xl md:text-4xl lg:text-[44px] font-archivo font-bold tracking-[-0.025em] leading-[1.15] mb-4">
                <span className="text-white">Common </span>
                <span className="bg-gradient-to-r from-[#4FB6FF] to-[#025eba] bg-clip-text text-transparent">
                  Questions
                </span>
              </h2>

              <p className="text-white/55 text-sm leading-relaxed mb-6 font-outfit">
                Everything you need to know about Gazeal Surveys and how it
                sits alongside your existing Gazeal Reservation.
              </p>

              <div className="p-4 bg-gradient-to-br from-[#4FB6FF]/[0.12] to-[#025eba]/[0.05] border border-[#4FB6FF]/25 rounded-xl">
                <p className="text-white/70 text-xs mb-1 font-outfit">
                  Still have questions?
                </p>
                <a
                  href="mailto:info@gazeal.co.uk"
                  className="bg-gradient-to-r from-[#4FB6FF] to-[#025eba] bg-clip-text text-transparent font-semibold text-sm hover:opacity-80 font-outfit"
                  data-testid="surveys-faq-contact"
                >
                  info@gazeal.co.uk →
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
                  className="border border-white/[0.08] bg-white/[0.02] px-5 rounded-xl data-[state=open]:border-[#4FB6FF]/30 data-[state=open]:bg-gradient-to-br data-[state=open]:from-[#4FB6FF]/[0.06] data-[state=open]:to-transparent transition-all overflow-hidden"
                  data-testid={`surveys-faq-item-${index}`}
                >
                  <AccordionTrigger className="text-left text-white hover:text-[#4FB6FF] hover:no-underline py-4 text-[15px] font-medium font-outfit">
                    {item.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-white/65 pb-4 leading-relaxed text-sm font-outfit whitespace-pre-line">
                    {item.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}

              {/* Apply CTA — rendered as a card instead of a Q&A */}
              <div
                className="border border-[#4FB6FF]/25 bg-gradient-to-br from-[#4FB6FF]/[0.08] to-[#025eba]/[0.04] rounded-xl px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                data-testid="surveys-faq-apply-card"
                id="apply"
              >
                <div>
                  <div className="text-white font-medium text-[15px] font-outfit mb-1">
                    Start offering surveys to your sellers today.
                  </div>
                  <div className="text-white/55 text-sm font-outfit">
                    Send your seller an invite in under two minutes.
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={onLearnMore}
                    className="inline-flex items-center justify-center gap-1.5 rounded-full text-white/85 hover:text-white font-medium px-4 py-2.5 text-sm border border-white/15 hover:border-white/35 transition-all font-outfit"
                    data-testid="surveys-faq-learn-more"
                  >
                    Learn More
                  </button>
                  <button
                    type="button"
                    onClick={onOrderSurvey}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#4FB6FF] to-[#025eba] text-white font-semibold px-5 py-2.5 text-sm hover:opacity-90 transition-opacity font-outfit shadow-[0_4px_15px_rgba(2,94,186,0.4)] whitespace-nowrap"
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
