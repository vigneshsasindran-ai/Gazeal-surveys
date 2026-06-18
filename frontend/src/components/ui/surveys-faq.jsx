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
    question: "What is Gazeal Surveys?",
    answer:
      "Gazeal Surveys is an upfront survey product inspired by the Scottish Home Report model. The survey is arranged when the property is listed and shared with buyers as part of the sale process, so condition is on the table before an offer is made — not weeks after. Sellers only pay when the property completes, and if the sale falls through unreasonably there is no cost to the seller.",
  },
  {
    question: "How is this different from a normal survey?",
    answer:
      "Normal surveys are ordered by the buyer after an offer has been accepted, which is exactly when most problems surface and exactly when chains start to break. Gazeal Surveys flips that timeline. The survey is in place at listing so buyers can read it before they offer, and the seller only pays at completion rather than upfront. Same regulated surveyor, very different position in the timeline.",
  },
  {
    question: "What happens to the cost if the sale falls through?",
    answer:
      "If the sale falls through unreasonably, the seller does not pay for the survey. The cost is only triggered when a completion happens. That removes the biggest objection sellers have to ordering a survey early and makes it easy for agents to offer better upfront information without asking sellers to spend money before they have sold their home.",
  },
  {
    question: "Who carries out the surveys?",
    answer:
      "Surveys are carried out by surveyors provided through the Residential Property Surveyors Association (RPSA). They are regulated, independent professionals, which means the report a buyer reads is a report they can trust — and the indemnity covers both the seller and the buyer.",
  },
  {
    question: "Does this work alongside a standard Gazeal Reservation?",
    answer:
      "Yes. Gazeal Reservation already delivers around 95% sale success by securing commitment at the point of offer. Gazeal Surveys sits alongside it and addresses one of the largest remaining causes of fall-through: survey surprises late in the process. Used together, agents can push success rates up to 98% on a typical book.",
  },
  {
    question: "Which agents can offer Gazeal Surveys?",
    answer:
      "Gazeal Surveys is available to all Gazeal agents. If you are already using Gazeal Reservation you can start offering surveys to your sellers immediately — there is no separate onboarding, just a quick conversation with your account team.",
  },
];

const SurveysFAQ = () => {
  const handleApply = () => {
    const el = document.getElementById("apply");
    if (el) {
      const y = el.getBoundingClientRect().top + window.pageYOffset - 90;
      window.scrollTo({ top: y, behavior: "smooth" });
    } else {
      window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
    }
  };

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
              <h2 className="text-3xl md:text-4xl lg:text-[44px] font-didot italic leading-[1.15] mb-4">
                <span className="text-white">Common </span>
                <span className="bg-gradient-to-r from-[#4FB6FF] to-[#025eba] bg-clip-text text-transparent">
                  Questions
                </span>
              </h2>

              <p className="text-white/55 text-sm leading-relaxed mb-6 font-manrope">
                Everything you need to know about Gazeal Surveys and how it
                sits alongside your existing Gazeal Reservation.
              </p>

              <div className="p-4 bg-gradient-to-br from-[#4FB6FF]/[0.12] to-[#025eba]/[0.05] border border-[#4FB6FF]/25 rounded-xl">
                <p className="text-white/70 text-xs mb-1 font-manrope">
                  Still have questions?
                </p>
                <a
                  href="mailto:info@gazeal.co.uk"
                  className="bg-gradient-to-r from-[#4FB6FF] to-[#025eba] bg-clip-text text-transparent font-semibold text-sm hover:opacity-80 font-manrope"
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
                  <AccordionTrigger className="text-left text-white hover:text-[#4FB6FF] hover:no-underline py-4 text-[15px] font-medium font-manrope">
                    {item.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-white/65 pb-4 leading-relaxed text-sm font-manrope whitespace-pre-line">
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
                  <div className="text-white font-medium text-[15px] font-manrope mb-1">
                    Start offering surveys to your sellers today.
                  </div>
                  <div className="text-white/55 text-sm font-manrope">
                    A quick conversation with your account team — that&apos;s it.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleApply}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#4FB6FF] to-[#025eba] text-white font-semibold px-5 py-2.5 text-sm hover:opacity-90 transition-opacity font-manrope shadow-[0_4px_15px_rgba(2,94,186,0.4)] whitespace-nowrap"
                  data-testid="surveys-faq-learn-more"
                >
                  Learn more
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </Accordion>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SurveysFAQ;
