import React from "react";

/*
 * Gazeal Surveys Hero (Section 1)
 * - Solid primary blue background (#025eba)
 * - Left: Archivo headline, Outfit sub copy (both white)
 * - Right: Scottish kilted-cottage header illustration
 * - Designed so the transparent site header sits on top without visual conflict
 */

const HERO_IMAGE =
  "https://customer-assets.emergentagent.com/job_ce36e598-d2a0-4d72-aaac-d0b490c4438e/artifacts/y0mduhc7_Header%20image.png";

const SurveysHero = () => {
  return (
    <section
      id="hero"
      className="relative w-full overflow-hidden"
      style={{ backgroundColor: "#025eba" }}
      data-testid="surveys-hero"
    >
      {/* Subtle depth: soft radial wash + faint grain, no gradients over the blue */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(120% 80% at 80% 20%, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0) 55%)",
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.06] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.9'/></svg>\")",
        }}
      />

      <div className="relative z-10 max-w-[1400px] mx-auto px-6 lg:px-12 pt-40 pb-20 md:pt-44 md:pb-28 lg:pt-48 lg:pb-32">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          {/* Copy */}
          <div
            className="lg:col-span-6 xl:col-span-6 text-white"
            data-testid="surveys-hero-copy"
          >
            <h1
              className="font-archivo font-bold tracking-[-0.02em] leading-[1.02] text-white text-[44px] sm:text-[56px] lg:text-[68px] xl:text-[76px]"
              data-testid="surveys-hero-heading"
            >
              England, meet how
              <br />
              Scotland sells homes.
            </h1>

            <p
              className="mt-6 md:mt-7 font-outfit text-white/90 text-[17px] sm:text-[18px] lg:text-[20px] leading-[1.55] max-w-[560px]"
              data-testid="surveys-hero-subcopy"
            >
              Gazeal has introduced upfront surveys inspired by the Scottish
              model, so buyers know the condition before they offer.
            </p>
          </div>

          {/* Illustration */}
          <div
            className="lg:col-span-6 xl:col-span-6 flex justify-center lg:justify-end"
            data-testid="surveys-hero-image-wrap"
          >
            <img
              src={HERO_IMAGE}
              alt="A traditional Scottish stone cottage wearing a tartan kilt and sash, with bagpipes resting alongside"
              className="w-[88%] sm:w-[72%] md:w-[60%] lg:w-full max-w-[640px] h-auto select-none"
              draggable={false}
              data-testid="surveys-hero-image"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default SurveysHero;
