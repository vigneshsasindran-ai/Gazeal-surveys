import React from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ChevronRight } from "lucide-react";

/*
 * "The seller's advantage" — interactive accordion on a flat #0C0F25 band.
 * Seller-perspective content inspired by the Cooper-Adams pre-sale survey
 * thinking: fix the biggest late-stage sale-killer before it happens.
 * Flat eXp UK palette only: solid #0C0F25 base + #B9BFD6 accent.
 */

const ITEMS = [
  {
    title: "Every day in the UK, sales fall through because of a survey",
    body: "The traditional process leaves the survey until weeks after a price is agreed. That's exactly when defects surface, and at the eleventh hour a buyer can renegotiate hard or simply walk away, scot-free. Ordering your survey before you go to market takes the single biggest late-stage sale-killer off the table.",
  },
  {
    title: "It's like selling with a full service history",
    body: "Buying a used car with a full service history and a fresh MOT feels safe, and homes are no different. When buyers can see an independent, accredited report from day one, they trust the property and the price. Being upfront builds the kind of confidence that carries a sale all the way to completion.",
  },
  {
    title: "Fix it, or simply be upfront about it",
    body: "Once you know what the survey says, you choose what to do. Get the works done before you launch and market at a stronger price, or share the findings with viewers so they offer with their eyes open. Either way, nothing \u201cnew\u201d can be discovered later to derail your sale.",
  },
  {
    title: "No hidden surprises. No renegotiation.",
    body: "Buyers who offer after seeing the report have already priced the condition in. That means no price chips on the back of a survey, no last-minute gazundering, and far fewer collapsed chains. It is the same transparency that makes the Scottish system work so well.",
  },
  {
    title: "And unlike a normal pre-sale survey, you don't pay upfront",
    body: "A typical pre-sale survey means paying hundreds of pounds before you've sold. Here, you never pay upfront. The fee is settled at completion or within six months, whichever comes first, and if the deal collapses through no fault of your own, there is no cost at all when using a Gazeal Reservation Agreement.",
  },
];

const SellerAdvantage = ({ onOrderSurvey, eyebrow }) => {
  return (
    <section
      id="seller-advantage"
      className="relative py-16 md:py-24 overflow-hidden"
      style={{ backgroundColor: "#0C0F25" }}
      data-testid="seller-advantage-section"
    >
      <div className="relative z-10 max-w-[1200px] mx-auto px-6 lg:px-12">
        <div className="grid lg:grid-cols-[1fr_1.4fr] gap-10 lg:gap-16 items-start">
          {/* Left — heading + CTA */}
          <div className="lg:sticky lg:top-32">
            {eyebrow && (
              <p
                className="font-outfit text-[12px] font-semibold tracking-[0.22em] uppercase text-[#B9BFD6] mb-4"
                data-testid="seller-advantage-eyebrow"
              >
                {eyebrow}
              </p>
            )}
            <h2
              className="font-archivo font-bold tracking-[-0.025em] leading-[1.12] text-white text-3xl sm:text-4xl lg:text-[44px]"
              data-testid="seller-advantage-heading"
            >
              Why order your survey
              <br />
              <span className="text-[#B9BFD6]">before you sell?</span>
            </h2>
            <p className="mt-5 font-outfit text-[15px] leading-relaxed text-white/75 max-w-[46ch]">
              Most sellers only find out what a survey says when it&apos;s
              already threatening their sale. Getting there first turns the
              survey from a risk into your strongest selling tool.
            </p>
            {onOrderSurvey && (
              <button
                type="button"
                onClick={onOrderSurvey}
                className="mt-8 inline-flex items-center gap-2 rounded-full bg-white text-[#0C0F25] font-outfit font-semibold px-7 py-3.5 text-[15px] hover:-translate-y-[1px] transition-transform duration-300"
                data-testid="seller-advantage-cta"
              >
                Order Survey
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Right — accordion */}
          <Accordion
            type="single"
            collapsible
            defaultValue="advantage-0"
            className="space-y-3"
            data-testid="seller-advantage-accordion"
          >
            {ITEMS.map((item, index) => (
              <AccordionItem
                key={index}
                value={`advantage-${index}`}
                className="border border-white/15 bg-white/[0.03] px-5 sm:px-6 rounded-xl data-[state=open]:border-[#B9BFD6]/60 data-[state=open]:bg-white/[0.05] transition-all overflow-hidden"
                data-testid={`seller-advantage-item-${index}`}
              >
                <AccordionTrigger className="text-left hover:no-underline py-5 gap-4">
                  <span className="flex items-baseline gap-4">
                    <span className="font-archivo font-bold text-[#B9BFD6] text-[14px] shrink-0">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="font-archivo font-bold text-white text-[16px] sm:text-[18px] tracking-[-0.01em] leading-[1.3]">
                      {item.title}
                    </span>
                  </span>
                </AccordionTrigger>
                <AccordionContent className="pb-6 pl-[34px] font-outfit text-[14px] sm:text-[15px] leading-[1.7] text-white/75">
                  {item.body}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
};

export default SellerAdvantage;
