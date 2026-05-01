import React, { useState, useEffect } from "react";
import { Menu, X, ChevronRight } from "lucide-react";

/*
 * Gazeal Surveys Header
 * - Fixed, transparent on top, liquid-glass pill on scroll
 * - Mirrors the Gazeal Elite header pattern but with Surveys blue (#025eba)
 *   instead of gold gradient.
 */

const NAV_LINKS = [
  { name: "Home", href: "#" },
  { name: "How it works", href: "#how-it-works" },
  { name: "About", href: "#about" },
  { name: "FAQ", href: "#faq" },
  { name: "Contact", href: "#contact" },
];

const LOGO_SRC =
  "https://customer-assets.emergentagent.com/job_survey-pro-10/artifacts/k9mairc3_Gazeal%20surveys%20logo.png";

const SurveysHeader = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = isMobileMenuOpen ? "hidden" : "unset";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isMobileMenuOpen]);

  const handleNav = (e, href) => {
    e.preventDefault();
    setIsMobileMenuOpen(false);
    if (href === "#") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    const el = document.getElementById(href.slice(1));
    if (!el) return;
    const y = el.getBoundingClientRect().top + window.pageYOffset - 90;
    window.scrollTo({ top: y, behavior: "smooth" });
  };

  const handleCta = () => {
    setIsMobileMenuOpen(false);
    const el = document.getElementById("contact");
    if (el) {
      const y = el.getBoundingClientRect().top + window.pageYOffset - 90;
      window.scrollTo({ top: y, behavior: "smooth" });
    } else {
      window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
    }
  };

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-700 ${
          isScrolled ? "py-3" : "py-4"
        }`}
        data-testid="surveys-header"
      >
        <div
          className={`max-w-[1400px] mx-auto transition-all duration-700 ${
            isScrolled ? "px-4" : "px-6 lg:px-12"
          }`}
        >
          <div
            className={`relative transition-all duration-700 ease-out ${
              isScrolled
                ? "backdrop-blur-2xl border border-white/[0.18] rounded-full px-6 py-2"
                : "bg-transparent px-2 py-2"
            }`}
            style={
              isScrolled
                ? {
                    background:
                      "linear-gradient(135deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.04) 50%, rgba(0,0,0,0.10) 100%)",
                    boxShadow:
                      "0 8px 32px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.15), inset 0 -1px 0 rgba(0,0,0,0.08)",
                  }
                : {}
            }
          >
            {isScrolled && (
              <div className="absolute inset-0 rounded-full overflow-hidden pointer-events-none">
                <div className="absolute inset-0 bg-gradient-to-b from-white/[0.10] via-transparent to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/15 to-transparent" />
              </div>
            )}

            <div className="relative flex items-center justify-between h-14">
              {/* Logo */}
              <a
                href="#"
                onClick={(e) => handleNav(e, "#")}
                className="flex items-center z-10"
                data-testid="surveys-logo-link"
              >
                <img
                  src={LOGO_SRC}
                  alt="Gazeal Surveys"
                  className={`transition-all duration-500 ${
                    isScrolled ? "h-9 md:h-10" : "h-11 md:h-12"
                  } w-auto object-contain`}
                  style={{ mixBlendMode: "screen" }}
                  data-testid="surveys-logo-img"
                />
              </a>

              {/* Desktop Nav */}
              <nav className="hidden lg:flex items-center gap-8">
                {NAV_LINKS.map((link) => (
                  <a
                    key={link.name}
                    href={link.href}
                    onClick={(e) => handleNav(e, link.href)}
                    className="text-white/75 hover:text-white transition-all duration-300 text-[14px] font-medium relative group font-outfit tracking-wide"
                    data-testid={`surveys-nav-${link.name
                      .toLowerCase()
                      .replace(/\s+/g, "-")}`}
                  >
                    {link.name}
                    <span className="absolute -bottom-1 left-0 w-0 h-[2px] bg-white transition-all duration-300 group-hover:w-full" />
                  </a>
                ))}
              </nav>

              {/* Desktop CTA */}
              <div className="hidden lg:flex items-center">
                <button
                  type="button"
                  onClick={handleCta}
                  className="text-[14px] px-5 py-2.5 flex items-center gap-2 font-semibold rounded-full bg-white text-[#025eba] hover:bg-white/90 transition-all duration-300 font-outfit shadow-[0_4px_20px_rgba(255,255,255,0.15)] hover:shadow-[0_6px_24px_rgba(255,255,255,0.25)]"
                  data-testid="surveys-nav-cta"
                >
                  Get Started
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Mobile toggle */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="lg:hidden relative z-50 p-2 text-white hover:text-white/80 transition-colors"
                data-testid="surveys-mobile-menu-button"
                aria-label="Toggle menu"
              >
                {isMobileMenuOpen ? (
                  <X className="w-6 h-6" />
                ) : (
                  <Menu className="w-6 h-6" />
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      <div
        className={`lg:hidden fixed inset-0 z-40 transition-all duration-500 ${
          isMobileMenuOpen
            ? "opacity-100 visible"
            : "opacity-0 invisible pointer-events-none"
        }`}
        data-testid="surveys-mobile-menu"
      >
        <div
          className={`absolute inset-0 transition-all duration-700 ${
            isMobileMenuOpen ? "backdrop-blur-2xl" : "backdrop-blur-none"
          }`}
          style={{
            background: isMobileMenuOpen
              ? "linear-gradient(180deg, rgba(2,94,186,0.72) 0%, rgba(2,60,130,0.95) 30%, rgba(0,20,60,0.98) 100%)"
              : "transparent",
          }}
          onClick={() => setIsMobileMenuOpen(false)}
        />

        <div
          className={`absolute top-24 left-4 right-4 transition-all duration-500 ease-out ${
            isMobileMenuOpen
              ? "translate-y-0 opacity-100 scale-100"
              : "-translate-y-8 opacity-0 scale-95"
          }`}
        >
          <div
            className="relative overflow-hidden rounded-3xl"
            style={{
              background:
                "linear-gradient(135deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.06) 50%, rgba(0,0,0,0.15) 100%)",
              backdropFilter: "blur(40px) saturate(180%)",
              WebkitBackdropFilter: "blur(40px) saturate(180%)",
              border: "1px solid rgba(255,255,255,0.18)",
              boxShadow:
                "0 25px 50px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.2), inset 0 -1px 0 rgba(0,0,0,0.15)",
            }}
          >
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-white/10 rounded-full blur-3xl animate-pulse" />
            <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-white/5 rounded-full blur-3xl" />

            <div className="relative p-6">
              <div className="space-y-2 mb-6">
                {NAV_LINKS.map((link, i) => (
                  <a
                    key={link.name}
                    href={link.href}
                    onClick={(e) => handleNav(e, link.href)}
                    className="block text-white/85 hover:text-white text-xl font-medium py-4 px-4 rounded-2xl transition-all duration-300 hover:bg-white/[0.08] border border-transparent hover:border-white/[0.12] font-outfit"
                    style={{
                      transitionDelay: `${i * 50}ms`,
                      transform: isMobileMenuOpen
                        ? "translateX(0)"
                        : "translateX(-20px)",
                      opacity: isMobileMenuOpen ? 1 : 0,
                    }}
                    data-testid={`surveys-mobile-nav-${link.name
                      .toLowerCase()
                      .replace(/\s+/g, "-")}`}
                  >
                    {link.name}
                  </a>
                ))}
              </div>

              <div className="h-[1px] bg-gradient-to-r from-transparent via-white/15 to-transparent mb-6" />

              <button
                type="button"
                onClick={handleCta}
                className="w-full text-center py-4 text-lg font-semibold rounded-2xl transition-all duration-300 bg-white text-[#025eba] hover:bg-white/90 shadow-[0_8px_25px_rgba(255,255,255,0.2)] font-outfit"
                data-testid="surveys-mobile-cta"
              >
                Get Started
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default SurveysHeader;
