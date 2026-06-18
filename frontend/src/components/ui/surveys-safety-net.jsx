import React from "react";
import { ShieldCheck, Sparkles } from "lucide-react";

/*
 * Section 4 — "The Safety Net"
 *
 * Inverted section: full-bleed navy panel sitting between the cream sections.
 * It is the emotional anchor of the page — "Free survey if the buyer walks".
 * Layout is asymmetric (a wide statement on the left, a small guarantee chip
 * on the right). No purple/blue gradients — solid navy with a subtle radial
 * spotlight and grain, matching the hero's depth language.
 */

const SurveysSafetyNet = () => {
  return (
    <section
      id="safety-net"
      className="relative w-full overflow-hidden"
      style={{ backgroundColor: "#0B1220" }}
      data-testid="surveys-safety-net"
    >
      {/* Spotlight */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(80% 70% at 25% 30%, rgba(2,94,186,0.35) 0%, rgba(2,94,186,0) 60%)",
        }}
      />
      {/* Grain */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.07] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.9'/></svg>\")",
        }}
      />

      <div className="relative z-10 max-w-[1280px] mx-auto px-6 lg:px-12 py-20 lg:py-28">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          {/* Left — headline + body */}
          <div className="lg:col-span-7">
            <div className="flex items-center gap-2 mb-5">
              <ShieldCheck
                className="w-4 h-4"
                style={{ color: "#DFFB4A" }}
                strokeWidth={2.3}
              />
              <span className="font-outfit text-[12px] font-semibold tracking-[0.18em] uppercase text-[#DFFB4A]">
                The safety net
              </span>
            </div>

            <h2
              className="font-archivo font-bold text-white tracking-[-0.025em] leading-[1.04] text-[36px] sm:text-[44px] lg:text-[56px]"
              data-testid="safety-net-headline"
            >
              If the buyer walks,
              <br />
              the survey is on us.
            </h2>

            <p className="mt-6 font-outfit text-white/85 text-[16px] sm:text-[17px] leading-[1.6] max-w-[54ch]">
              Sellers should never be punished for a buyer changing their mind.
              If a sale falls through after the survey is published, Gazeal
              covers the cost — and the same report stays on the listing,
              ready for the next serious offer.
            </p>

            <ul className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-4 max-w-[640px]">
              {[
                "Zero out-of-pocket if the chain breaks",
                "Report is reused for the next buyer",
                "RPSA regulated, independent surveyor",
                "No tie-in beyond the property listing",
              ].map((line) => (
                <li
                  key={line}
                  className="flex items-start gap-3 font-outfit text-[15px] text-white/90"
                >
                  <span
                    className="mt-[6px] inline-flex h-2 w-2 rounded-full"
                    style={{ background: "#DFFB4A" }}
                  />
                  {line}
                </li>
              ))}
            </ul>
          </div>

          {/* Right — guarantee chip */}
          <div className="lg:col-span-5 flex lg:justify-end">
            <div
              className="relative w-full max-w-[380px] rounded-[28px] p-7 sm:p-8"
              style={{
                background:
                  "linear-gradient(140deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)",
                border: "1px solid rgba(255,255,255,0.12)",
                boxShadow:
                  "0 30px 60px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.08)",
              }}
              data-testid="safety-net-guarantee-card"
            >
              <div
                className="absolute -top-3 -right-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5"
                style={{ background: "#DFFB4A" }}
              >
                <Sparkles className="w-3.5 h-3.5 text-[#0B1220]" strokeWidth={2.4} />
                <span className="font-archivo font-bold text-[10px] tracking-[0.14em] uppercase text-[#0B1220]">
                  Gazeal guarantee
                </span>
              </div>

              <p className="font-archivo font-bold text-[40px] sm:text-[44px] leading-none tracking-[-0.03em] text-white">
                £0
              </p>
              <p className="mt-2 font-outfit text-[13px] tracking-[0.14em] uppercase text-white/60">
                Seller pays on fall-through
              </p>

              <div
                className="my-6 h-px w-full"
                style={{ background: "rgba(255,255,255,0.12)" }}
              />

              <p className="font-outfit text-[15px] leading-[1.55] text-white/85">
                One report, multiple buyers. Sellers stay in the market with
                their condition certificate intact and zero new spend.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SurveysSafetyNet;
