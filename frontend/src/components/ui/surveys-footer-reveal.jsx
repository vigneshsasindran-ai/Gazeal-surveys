import React, { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Mail } from "lucide-react";

/*
 * Gazeal Surveys — Footer Reveal
 * Scroll-based reveal with the Gazeal Surveys logo unravelling at the bottom
 * of the page. Ported directly from the Elite footer-reveal pattern,
 * rebranded with the Surveys blue gradient.
 */

const FOOTER_HEIGHT = 600;
const LOGO_SRC =
  "https://customer-assets.emergentagent.com/job_survey-pro-10/artifacts/k9mairc3_Gazeal%20surveys%20logo.png";

const SurveysFooterReveal = ({ onOrderSurvey, onLearnMore }) => {
  const [scrollProgress, setScrollProgress] = useState(0);
  const revealRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => {
      if (!revealRef.current) return;
      const rect = revealRef.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      const visibleAmount = windowHeight - rect.top;
      const progress = Math.min(Math.max(visibleAmount / FOOTER_HEIGHT, 0), 1);
      setScrollProgress(progress);
    };
    window.addEventListener("scroll", handleScroll);
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleNav = (e, sectionId) => {
    e.preventDefault();
    const el = document.getElementById(sectionId);
    if (el) {
      const y = el.getBoundingClientRect().top + window.pageYOffset - 90;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  };

  return (
    <div
      ref={revealRef}
      className="relative"
      style={{ height: `${FOOTER_HEIGHT}px` }}
      data-testid="surveys-footer-reveal"
    >
      {/* Fixed footer underneath */}
      <div
        className="fixed bottom-0 left-0 right-0 bg-black"
        style={{
          height: `${FOOTER_HEIGHT}px`,
          zIndex: 1,
          pointerEvents: scrollProgress > 0.1 ? "auto" : "none",
        }}
      >
        {/* Neon blue glow strip at top */}
        <div
          className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#4FB6FF] via-[#025eba] to-[#4FB6FF]"
          style={{
            boxShadow:
              "0 0 60px 20px rgba(2,94,186,0.55), 0 0 100px 40px rgba(79,182,255,0.30)",
            opacity: scrollProgress,
          }}
        />

        {/* Large logo centered, unravelling on scroll */}
        <div className="flex items-center justify-center h-3/5 pt-10">
          <img
            src={LOGO_SRC}
            alt="Gazeal Surveys"
            className="h-24 md:h-32 lg:h-40 w-auto"
            style={{
              opacity: scrollProgress,
              transform: `scale(${0.8 + scrollProgress * 0.2})`,
              transition: "transform 0.3s ease-out",
              filter: "drop-shadow(0 0 40px rgba(79,182,255,0.45))",
            }}
          />
        </div>

        {/* Footer content */}
        <div
          className="max-w-[1400px] mx-auto px-6 lg:px-12"
          style={{ opacity: scrollProgress }}
        >
          <div className="border-t border-white/10 pt-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              {/* Links */}
              <div className="flex flex-wrap items-center justify-center gap-6 md:gap-8 font-manrope">
                <a
                  href="#features"
                  onClick={(e) => handleNav(e, "features")}
                  className="text-white/60 hover:text-[#4FB6FF] transition-colors text-sm flex items-center gap-1"
                  data-testid="footer-nav-features"
                >
                  Transparency <ArrowUpRight className="w-3 h-3" />
                </a>
                <a
                  href="#faq"
                  onClick={(e) => handleNav(e, "faq")}
                  className="text-white/60 hover:text-[#4FB6FF] transition-colors text-sm flex items-center gap-1"
                  data-testid="footer-nav-faq"
                >
                  FAQ <ArrowUpRight className="w-3 h-3" />
                </a>
                <a
                  href="https://gazeal.co.uk"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/60 hover:text-[#4FB6FF] transition-colors text-sm flex items-center gap-1"
                  data-testid="footer-nav-gazeal"
                >
                  Gazeal Main Site <ArrowUpRight className="w-3 h-3" />
                </a>
                <a
                  href="https://elite.gazeal.co.uk"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/60 hover:text-[#4FB6FF] transition-colors text-sm flex items-center gap-1"
                  data-testid="footer-nav-elite"
                >
                  Gazeal Elite <ArrowUpRight className="w-3 h-3" />
                </a>
              </div>

              {/* CTAs */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onLearnMore}
                  className="text-[13px] px-4 py-2.5 font-medium rounded-full text-white/80 hover:text-white border border-white/15 hover:border-white/35 transition-all font-manrope"
                  data-testid="surveys-footer-learn-more"
                >
                  Learn More
                </button>
                <button
                  type="button"
                  onClick={onOrderSurvey}
                  className="text-[14px] px-5 py-2.5 inline-flex items-center gap-2 font-semibold rounded-full bg-gradient-to-r from-[#4FB6FF] to-[#025eba] text-white hover:opacity-90 transition-opacity font-manrope shadow-[0_4px_15px_rgba(2,94,186,0.4)]"
                  data-testid="surveys-footer-cta"
                >
                  Order Survey
                  <ArrowUpRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Bottom bar */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 mt-8 pt-6 border-t border-white/5 font-manrope">
              <p className="text-white/35 text-sm">
                © {new Date().getFullYear()} Gazeal Surveys. All rights
                reserved.
              </p>
              <div className="flex items-center gap-6">
                <a
                  href="mailto:info@gazeal.co.uk"
                  className="text-white/35 hover:text-white/70 text-sm flex items-center gap-2 transition-colors"
                >
                  <Mail className="w-4 h-4" /> info@gazeal.co.uk
                </a>
                <a
                  href="#"
                  className="text-white/35 hover:text-white/70 text-sm transition-colors"
                >
                  Privacy
                </a>
                <a
                  href="#"
                  className="text-white/35 hover:text-white/70 text-sm transition-colors"
                >
                  Terms
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Slide-up overlay (reveals the fixed footer as the user scrolls) */}
      <div
        className="relative bg-black z-10"
        style={{
          transform: `translateY(-${scrollProgress * 100}%)`,
          transition: "transform 0.1s linear",
        }}
      />
    </div>
  );
};

export default SurveysFooterReveal;
