import React, { useState, useEffect } from "react";
import { Menu, X, ChevronRight } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

/*
 * Gazeal Surveys Header — fixed, translucent, liquid glass on scroll.
 * Ported from the Gazeal Elite header pattern and rebranded with the
 * Surveys blue gradient (#0C0F25 → #B9BFD6) instead of accent.
 */

const NAV_LINKS = [
  { name: "Home", href: "#" },
  { name: "Seller Surveys", href: "#features" },
  { name: "How it works", href: "#benefits" },
  { name: "Pricing", href: "/exp/pricing" },
  { name: "FAQ", href: "#faq" },
];

const EXP_LOGO =
  "https://customer-assets.emergentagent.com/job_survey-pro-10/artifacts/4lb77dpb_Gazeal%20Linkedin%20Post%20%2863%29.png";

const SurveysHeader = ({ onOrderSurvey }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const isHome = location.pathname === "/exp";

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
    if (href.startsWith("/")) {
      navigate(href);
      return;
    }
    if (href === "#") {
      if (isHome) {
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        navigate("/exp");
      }
      return;
    }
    const id = href.slice(1);
    if (isHome) {
      const el = document.getElementById(id);
      if (!el) return;
      const y = el.getBoundingClientRect().top + window.pageYOffset - 90;
      window.scrollTo({ top: y, behavior: "smooth" });
    } else {
      navigate(`/exp#${id}`);
    }
  };

  const handleOrderSurvey = () => {
    setIsMobileMenuOpen(false);
    if (onOrderSurvey) return onOrderSurvey();
    navigate("/exp/order-survey");
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
                ? "bg-white/[0.03] backdrop-blur-2xl border border-white/[0.08] rounded-full px-6 py-2"
                : "bg-transparent px-2 py-2"
            }`}
            style={
              isScrolled
                ? {
                    background:
                      "linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 50%, rgba(0,0,0,0.1) 100%)",
                    boxShadow:
                      "0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1), inset 0 -1px 0 rgba(0,0,0,0.1)",
                  }
                : {}
            }
          >
            {isScrolled && (
              <div className="absolute inset-0 rounded-full overflow-hidden pointer-events-none">
                <div className="absolute inset-0 bg-gradient-to-b from-white/[0.08] via-transparent to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              </div>
            )}

            <div className="relative flex items-center justify-between h-14">
              {/* Logo */}
              <a
                href="#"
                onClick={(e) => handleNav(e, "#")}
                className="flex items-center gap-3 z-10"
                data-testid="surveys-logo-link"
              >
                <img
                  src={EXP_LOGO}
                  alt="eXp UK"
                  className={`transition-all duration-500 ${
                    isScrolled ? "h-5 md:h-6" : "h-6 md:h-7"
                  } w-auto`}
                  data-testid="surveys-partner-logo-img"
                />
              </a>

              {/* Desktop Nav */}
              <nav className="hidden lg:flex items-center gap-8">
                {NAV_LINKS.map((link) => (
                  <a
                    key={link.name}
                    href={link.href}
                    onClick={(e) => handleNav(e, link.href)}
                    className="text-white/60 hover:text-white transition-all duration-300 text-[14px] font-medium relative group font-outfit"
                    data-testid={`surveys-nav-${link.name
                      .toLowerCase()
                      .replace(/\s+/g, "-")}`}
                  >
                    {link.name}
                    <span className="absolute -bottom-1 left-0 w-0 h-[2px] bg-[#B9BFD6] transition-all duration-300 group-hover:w-full" />
                  </a>
                ))}
              </nav>

              {/* Desktop CTAs */}
              <div className="hidden lg:flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleOrderSurvey}
                  className="text-[14px] px-5 py-2.5 flex items-center gap-2 font-semibold rounded-full bg-white text-[#0C0F25] hover:opacity-90 transition-opacity font-outfit shadow-[0_4px_15px_rgba(12,15,37,0.35)]"
                  data-testid="surveys-nav-order-survey"
                >
                  Order Survey
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Mobile toggle */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="lg:hidden relative z-50 p-2 text-white hover:text-[#B9BFD6] transition-colors"
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
              ? "linear-gradient(180deg, rgba(0,0,0,0.7) 0%, rgba(10,10,10,0.95) 30%, rgba(0,0,0,0.98) 100%)"
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
                "linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 50%, rgba(0,0,0,0.2) 100%)",
              backdropFilter: "blur(40px) saturate(180%)",
              WebkitBackdropFilter: "blur(40px) saturate(180%)",
              border: "1px solid rgba(255,255,255,0.1)",
              boxShadow:
                "0 25px 50px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.15), inset 0 -1px 0 rgba(0,0,0,0.2)",
            }}
          >
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-[#0C0F25]/25 rounded-full blur-3xl animate-pulse" />
            <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-[#B9BFD6]/15 rounded-full blur-3xl" />

            <div className="relative p-6">
              <div className="space-y-2 mb-6">
                {NAV_LINKS.map((link, i) => (
                  <a
                    key={link.name}
                    href={link.href}
                    onClick={(e) => handleNav(e, link.href)}
                    className="block text-white/80 hover:text-white text-xl font-medium py-4 px-4 rounded-2xl transition-all duration-300 hover:bg-white/[0.05] border border-transparent hover:border-white/[0.08] font-outfit"
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

              <div className="h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent mb-6" />

              <button
                type="button"
                onClick={handleOrderSurvey}
                className="w-full text-center py-4 text-lg font-semibold rounded-2xl transition-all duration-300 bg-white text-[#0C0F25] hover:opacity-90 shadow-[0_8px_25px_rgba(12,15,37,0.4)] font-outfit"
                data-testid="surveys-mobile-order-survey"
              >
                Order Survey
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default SurveysHeader;
