import React from "react";
import { Wallet, HandshakeIcon, Clock3, BadgeCheck } from "lucide-react";

/*
 * Section 5 — "Both Sides Covered"
 *
 * Cream surface. Two opposing columns: BUYERS (left) and SELLERS (right),
 * separated by a thin vertical hairline on desktop. Each side has its own
 * headline, supporting paragraph, and a stack of value bullets. No identical
 * card grid: the two columns are intentionally distinct in tone.
 */

const Bullet = ({ icon: Icon, title, body, accent }) => (
  <div className="flex items-start gap-4">
    <span
      className="shrink-0 inline-flex h-10 w-10 items-center justify-center rounded-xl"
      style={{
        background: accent === "blue" ? "#EAF2FF" : "#0B1220",
        color: accent === "blue" ? "#025eba" : "#DFFB4A",
      }}
    >
      <Icon className="w-5 h-5" strokeWidth={2.2} />
    </span>
    <div>
      <p className="font-archivo font-semibold text-[15px] sm:text-[16px] text-[#0B1220] tracking-[-0.01em]">
        {title}
      </p>
      <p className="mt-1 font-outfit text-[14px] leading-[1.6] text-[#4A5260] max-w-[36ch]">
        {body}
      </p>
    </div>
  </div>
);

const SurveysBothSides = () => {
  return (
    <section
      id="both-sides"
      className="relative w-full"
      style={{ backgroundColor: "#F7F4EE" }}
      data-testid="surveys-both-sides"
    >
      <div className="max-w-[1280px] mx-auto px-6 lg:px-12 py-20 lg:py-28">
        {/* Header */}
        <div className="max-w-[760px]">
          <div className="flex items-center gap-2 mb-5">
            <span
              className="inline-block h-[6px] w-[6px] rounded-full"
              style={{ background: "#025eba" }}
            />
            <span className="font-outfit text-[12px] font-semibold tracking-[0.18em] uppercase text-[#025eba]">
              Both sides covered
            </span>
          </div>
          <h2
            className="font-archivo font-bold text-[#0B1220] tracking-[-0.025em] leading-[1.04] text-[36px] sm:text-[44px] lg:text-[52px]"
            data-testid="both-sides-headline"
          >
            Buyers save money.
            <br />
            Sellers build trust.
          </h2>
          <p className="mt-6 font-outfit text-[16px] sm:text-[17px] leading-[1.6] text-[#4A5260] max-w-[56ch]">
            Gazeal Surveys is not a tool for one side of the table. It removes
            the largest reason transactions collapse in England &amp; Wales,
            and it puts both parties on the same page from day one.
          </p>
        </div>

        {/* Two columns */}
        <div
          className="mt-14 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 relative"
          data-testid="both-sides-grid"
        >
          {/* Vertical hairline */}
          <span
            className="hidden lg:block absolute top-0 bottom-0 left-1/2 w-px"
            style={{ background: "rgba(11,18,32,0.12)" }}
            aria-hidden="true"
          />

          {/* Buyers */}
          <div data-testid="both-sides-buyers">
            <div className="flex items-center justify-between mb-6">
              <span className="font-archivo font-bold text-[12px] tracking-[0.18em] uppercase text-[#025eba]">
                For buyers
              </span>
              <span
                className="inline-flex items-center gap-1.5 font-outfit text-[11px] tracking-[0.14em] uppercase font-semibold rounded-full px-2.5 py-1"
                style={{ background: "#EAF2FF", color: "#025eba" }}
              >
                Save up to £1,200
              </span>
            </div>

            <h3 className="font-archivo font-semibold text-[26px] sm:text-[30px] leading-[1.12] tracking-[-0.02em] text-[#0B1220] max-w-[18ch]">
              Stop paying for surveys on houses you don&apos;t buy.
            </h3>

            <p className="mt-4 font-outfit text-[15px] leading-[1.6] text-[#4A5260] max-w-[44ch]">
              Buyers in England spend an average of £400–£1,200 on a Level 2
              survey — often on properties they never end up purchasing. With
              Gazeal Surveys the report is already on the listing.
            </p>

            <div className="mt-8 space-y-5">
              <Bullet
                icon={Wallet}
                accent="blue"
                title="No wasted spend on lost deals"
                body="See the report before you offer. If the property is not for you, you've not spent a penny."
              />
              <Bullet
                icon={BadgeCheck}
                accent="blue"
                title="Independent, RPSA regulated"
                body="The surveyor is appointed by Gazeal, not the seller — so the report you read is the report you trust."
              />
              <Bullet
                icon={Clock3}
                accent="blue"
                title="Faster to mortgage offer"
                body="Lenders accept the condition data sooner, so the path from offer to exchange shortens by weeks."
              />
            </div>
          </div>

          {/* Sellers */}
          <div data-testid="both-sides-sellers">
            <div className="flex items-center justify-between mb-6">
              <span className="font-archivo font-bold text-[12px] tracking-[0.18em] uppercase text-[#0B1220]">
                For sellers
              </span>
              <span
                className="inline-flex items-center gap-1.5 font-outfit text-[11px] tracking-[0.14em] uppercase font-semibold rounded-full px-2.5 py-1"
                style={{ background: "#0B1220", color: "#DFFB4A" }}
              >
                Pay at completion
              </span>
            </div>

            <h3 className="font-archivo font-semibold text-[26px] sm:text-[30px] leading-[1.12] tracking-[-0.02em] text-[#0B1220] max-w-[18ch]">
              Show your home is sale-ready, before the first viewing.
            </h3>

            <p className="mt-4 font-outfit text-[15px] leading-[1.6] text-[#4A5260] max-w-[44ch]">
              A condition report on day one filters out tyre-kickers, signals
              confidence and gives serious buyers the data they need to offer
              with conviction — not nerves.
            </p>

            <div className="mt-8 space-y-5">
              <Bullet
                icon={HandshakeIcon}
                accent="dark"
                title="Fewer renegotiations"
                body="Condition is on the record before the offer, so buyers can't use the survey as a late-stage haggling tool."
              />
              <Bullet
                icon={Clock3}
                accent="dark"
                title="Drop weeks off the timeline"
                body="Average completions shorten when condition surveys are completed before offer rather than after."
              />
              <Bullet
                icon={Wallet}
                accent="dark"
                title="Pay only at completion"
                body="No up-front spend. The survey settles out of sale proceeds, and is free if the sale falls through."
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SurveysBothSides;
