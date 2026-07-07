import React from "react";
import { ChevronRight } from "lucide-react";

/*
 * "Survey It. Reserve It." — paired-product section
 *
 * Mirrors the Gazeal Elite "Advance" section pattern:
 *   • Left column: headline + paragraph + CTA
 *   • Right column: 3D illustration (house + survey clipboard)
 *
 * Rebranded with the Surveys blue gradient (var(--brand-primary) → var(--brand-primary-dark)).
 */

const SCENE_IMAGE =
  "https://customer-assets.emergentagent.com/job_survey-pro-10/artifacts/7vehcl9u_Gazeal%20Linkedin%20Post%20%2811%29.png";

const SurveysSaleAgreed = ({ onOrderSurvey }) => {
  return (
    <section
      id="sale-agreed"
      className="relative bg-black pt-4 pb-20 md:pt-6 md:pb-28 overflow-hidden"
      data-testid="surveys-sale-agreed-section"
    >
      {/* Ambient blue glow */}
      <div className="pointer-events-none absolute -left-32 top-1/3 h-[420px] w-[420px] rounded-full bg-[color:var(--brand-primary-dark)]/15 blur-3xl opacity-60" />
      <div className="pointer-events-none absolute right-0 bottom-0 h-[360px] w-[360px] rounded-full bg-[color:var(--brand-primary)]/10 blur-3xl opacity-50" />

      <div className="relative mx-auto max-w-3xl lg:max-w-6xl px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-center">
          {/* Left — headline + body + CTA */}
          <div className="lg:col-span-7 order-2 lg:order-1 lg:pt-4">
            <h2
              className="font-archivo font-bold tracking-[-0.025em] leading-[1.1] text-white text-4xl sm:text-5xl lg:text-[56px]"
              data-testid="sale-agreed-heading"
            >
              Survey It. Reserve It.
              <br />
              <span className="bg-gradient-to-r from-[color:var(--brand-primary)] to-[color:var(--brand-primary-dark)] bg-clip-text text-transparent">
                Now It&apos;s as Good as Sold.
              </span>
            </h2>

            <p
              className="mt-6 text-base sm:text-lg text-white/65 font-outfit leading-relaxed max-w-xl"
              data-testid="sale-agreed-body"
            >
              A survey gives both parties confidence in the property,
              and the Gazeal Reservation Agreement gives both parties
              confidence in each other. Put the two together and the
              sale becomes far more certain.
            </p>

            <div className="mt-8">
              <button
                type="button"
                onClick={onOrderSurvey}
                className="inline-flex items-center gap-2 rounded-full px-6 py-3 font-outfit font-semibold text-[14px] text-white hover:opacity-90 transition-all"
                style={{
                  background:
                    "linear-gradient(135deg, var(--brand-primary) 0%, var(--brand-primary-dark) 100%)",
                  boxShadow: "0 6px 22px rgba(var(--brand-primary-dark-rgb),0.4)",
                }}
                data-testid="sale-agreed-cta"
              >
                Order Survey
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Right — illustration */}
          <div className="lg:col-span-5 order-1 lg:order-2 flex justify-center lg:justify-end">
            <div className="relative w-full max-w-[420px]">
              <div className="pointer-events-none absolute -inset-6 rounded-[2rem] bg-gradient-to-br from-[color:var(--brand-primary)]/15 via-transparent to-[color:var(--brand-primary-dark)]/15 blur-2xl" />

              <div className="relative rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-sm p-4 sm:p-6">
                <img
                  src={SCENE_IMAGE}
                  alt="A 3D illustration of a blue and white house with a magnifying glass held up to the front door and a 'Transparency' label alongside."
                  className="w-full h-auto rounded-xl object-contain surveys-bento-icon"
                  loading="lazy"
                  style={{
                    filter: "drop-shadow(0 18px 40px rgba(var(--brand-primary-dark-rgb),0.35))",
                  }}
                  data-testid="sale-agreed-image"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SurveysSaleAgreed;
