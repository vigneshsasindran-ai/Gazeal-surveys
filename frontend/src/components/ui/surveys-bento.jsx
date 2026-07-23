import React from "react";
import { Card, CardContent } from "@/components/ui/card";

/*
 * Gazeal Surveys — Features Bento
 * Three dark glassmorphic cards, ported from the Elite bento pattern,
 * rebranded with the Surveys blue gradient (#025eba → #4FB6FF) and the
 * three 3D illustrations supplied with the flyer.
 */

const ICON_LOCK =
  "https://customer-assets.emergentagent.com/job_survey-pro-10/artifacts/xebanqzg_DESIGN%20ELEMENTS%20%20%2821%29.png";
const ICON_CLIPBOARD =
  "https://customer-assets.emergentagent.com/job_survey-pro-10/artifacts/msgu0rm9_DESIGN%20ELEMENTS%20%20%2823%29.png";
const ICON_SHIELD =
  "https://customer-assets.emergentagent.com/job_survey-pro-10/artifacts/pgz0h9t7_DESIGN%20ELEMENTS%20%20%2822%29.png";

const Visual = ({ src, alt, delay = "0s" }) => (
  <div className="relative mx-auto flex aspect-square size-28 sm:size-32 rounded-full border border-white/10 before:absolute before:-inset-2 before:rounded-full before:border before:border-white/5 after:absolute after:-inset-5 after:rounded-full after:border after:border-white/[0.03]">
    <img
      src={src}
      alt={alt}
      draggable={false}
      className="surveys-bento-icon m-auto h-[78%] w-[78%] object-contain select-none"
      style={{
        animationDelay: delay,
        filter: "drop-shadow(0 12px 30px rgba(2,94,186,0.35))",
      }}
    />
  </div>
);

const SurveysCard = ({ children, className = "", ...props }) => (
  <Card
    className={`relative overflow-hidden border-white/10 bg-gradient-to-b from-white/[0.04] to-white/[0.01] backdrop-blur-sm hover:border-[#4FB6FF]/30 transition-colors duration-300 ${className}`}
    {...props}
  >
    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#4FB6FF]/40 to-transparent pointer-events-none" />
    {children}
  </Card>
);

const SurveysBento = () => {
  return (
    <section
      id="features"
      className="relative bg-black pt-16 md:pt-20 pb-8 md:pb-12 overflow-hidden"
      data-testid="surveys-bento-section"
    >
      {/* Ambient blue backdrop */}
      <div className="absolute left-1/2 top-0 -translate-x-1/2 h-[400px] w-[600px] bg-gradient-to-b from-[#025eba]/20 to-transparent blur-3xl pointer-events-none opacity-50" />

      <div className="relative mx-auto max-w-3xl lg:max-w-6xl px-6">
        {/* Heading */}
        <div className="mx-auto max-w-4xl text-center mb-10 md:mb-12">
          <h2 className="text-2xl sm:text-3xl lg:text-[40px] font-archivo font-bold tracking-[-0.025em] leading-[1.18]">
            <span className="text-white">Fix survey problems </span>
            <span className="bg-gradient-to-r from-[#4FB6FF] to-[#025eba] bg-clip-text text-transparent">
              before they break the sale.
            </span>
          </h2>
          <p className="mt-5 font-outfit text-[14px] sm:text-[15px] text-white/70 leading-relaxed max-w-2xl mx-auto">
            In Scotland, buyers understand the condition of the home before
            they offer, which means fewer surprises, fewer late
            renegotiations and stronger sales from the start.
          </p>
        </div>

        {/* Bento Grid */}
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5 items-stretch">
          {/* Card 1 — No upfront cost */}
          <SurveysCard className="h-full" data-testid="surveys-card-no-upfront-cost">
            <CardContent className="h-full flex flex-col items-center text-center pt-10 pb-8 px-6">
              <Visual src={ICON_LOCK} alt="Padlock with Gazeal G" delay="0s" />
              <h3 className="mt-6 text-2xl sm:text-[26px] font-archivo font-bold tracking-[-0.025em] text-white">
                No upfront cost
              </h3>
              <p className="mt-3 text-sm sm:text-[15px] text-white/70 font-outfit leading-relaxed">
                The survey is arranged at the start of marketing and shared
                with buyers during the sale, but the seller pays no money
                upfront. The survey fee is settled only upon completion of
                the sale, and if the deal collapses through no fault of the
                seller, the survey costs nothing at all.
                <span className="text-white/45 align-super text-[0.75em] ml-0.5">*</span>
              </p>
              <p
                className="mt-auto pt-5 text-[12px] text-white/50 font-outfit italic leading-relaxed"
                data-testid="surveys-card-no-upfront-cost-footnote"
              >
                *When using a Gazeal Reservation Agreement
              </p>
            </CardContent>
          </SurveysCard>

          {/* Card 2 — Critical property information */}
          <SurveysCard className="h-full" data-testid="surveys-card-critical-info">
            <CardContent className="h-full flex flex-col items-center text-center pt-10 pb-8 px-6">
              <Visual
                src={ICON_CLIPBOARD}
                alt="House with a survey clipboard and pencil"
                delay="0.8s"
              />
              <h3 className="mt-6 text-2xl sm:text-[26px] font-archivo font-bold tracking-[-0.025em] text-white">
                Critical property information
              </h3>
              <p className="mt-3 text-sm sm:text-[15px] text-white/70 font-outfit leading-relaxed">
                Buyers have to make offers before they know enough about the
                condition of the home, and that creates real risk later in
                the process when something unexpected turns up. The Gazeal
                Survey puts the key property information in front of buyers
                before they offer, so they can make a clearer, more
                confident decision from the start. That tends to mean fewer
                late surprises, fewer renegotiations and a stronger sale
                from the moment the offer is made.
              </p>
            </CardContent>
          </SurveysCard>

          {/* Card 3 — 98% sale success */}
          <SurveysCard className="h-full" data-testid="surveys-card-success">
            <CardContent className="h-full flex flex-col items-center text-center pt-10 pb-8 px-6">
              <Visual
                src={ICON_SHIELD}
                alt="Glass shield with a checkmark"
                delay="1.6s"
              />
              <h3 className="mt-6 text-2xl sm:text-[26px] font-archivo font-bold tracking-[-0.025em] text-white">
                Up to{" "}
                <span className="bg-gradient-to-r from-[#4FB6FF] to-[#025eba] bg-clip-text text-transparent">
                  98%
                </span>{" "}
                sale success
              </h3>
              <p className="mt-3 text-sm sm:text-[15px] text-white/70 font-outfit leading-relaxed">
                Gazeal already helps agents reach around 95% sale success by
                securing commitment at the point of offer. Of the small
                number of sales that still fall apart, survey issues are one
                of the biggest causes. Gazeal Surveys fixes this earlier by
                giving buyers the information they need upfront, so
                commitment and transparency work together to give your
                seller the strongest possible chance of completing, with
                success rates reaching up to 98%.
              </p>
            </CardContent>
          </SurveysCard>
        </div>

        {/* Horizontal indemnification row */}
        <div
          className="relative z-10 mt-4 sm:mt-5"
          data-testid="surveys-indemnifies-row"
        >
          <SurveysCard>
            <CardContent className="pt-8 pb-8 px-6 sm:px-10">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-10 items-start">
                <h3
                  className="md:col-span-5 text-3xl sm:text-4xl lg:text-[42px] font-archivo font-bold tracking-[-0.025em] leading-[1.1] text-white"
                  data-testid="surveys-indemnifies-heading"
                >
                  Professional Indemnity{" "}
                  <span className="bg-gradient-to-r from-[#4FB6FF] to-[#025eba] bg-clip-text text-transparent">
                    protects both seller and buyer.
                  </span>
                </h3>
                <p
                  className="md:col-span-7 text-sm sm:text-[15px] text-white/75 font-outfit leading-relaxed"
                  data-testid="surveys-indemnifies-copy"
                >
                  The surveyor&apos;s indemnity covers both the buyer and
                  the seller. The seller is protected on what they
                  disclose, and the buyer can rely on the findings with
                  confidence. Neither side carries the risk alone, so
                  buyers trust the survey instead of commissioning their
                  own, and sellers share information without fear of
                  comeback. This gives agents fewer renegotiations, fewer
                  late surprises, and a sale both sides are committed to
                  from day one.
                </p>
              </div>
            </CardContent>
          </SurveysCard>
        </div>
      </div>
    </section>
  );
};

export default SurveysBento;
