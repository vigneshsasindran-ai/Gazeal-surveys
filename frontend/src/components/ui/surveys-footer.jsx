import React from "react";

/*
 * Footer — light surface, dark text. Three columns on desktop:
 *   1. Logo + tagline + small print
 *   2. Product links
 *   3. Company / regulatory links
 * Bottom row: copyright + legal links + RPSA badge.
 */

const LOGO_SRC =
  "https://customer-assets.emergentagent.com/job_survey-pro-10/artifacts/k9mairc3_Gazeal%20surveys%20logo.png";

const COLS = [
  {
    title: "Product",
    links: [
      { label: "How it works", href: "#how-it-works" },
      { label: "Why we built this", href: "#why-built" },
      { label: "The safety net", href: "#safety-net" },
      { label: "Both sides covered", href: "#both-sides" },
    ],
  },
  {
    title: "Gazeal",
    links: [
      { label: "Gazeal Reservation", href: "https://www.gazeal.co.uk" },
      { label: "Gazeal Elite", href: "https://elite.gazeal.co.uk" },
      { label: "Gazeal Advance", href: "https://advance.gazeal.co.uk" },
      { label: "About Gazeal", href: "https://www.gazeal.co.uk/about" },
    ],
  },
  {
    title: "Contact",
    links: [
      { label: "Apply to join", href: "/request-survey" },
      { label: "support@gazeal.co.uk", href: "mailto:support@gazeal.co.uk" },
      { label: "0330 122 9450", href: "tel:03301229450" },
    ],
  },
];

const SurveysFooter = () => {
  const handleAnchor = (e, href) => {
    if (href.startsWith("#")) {
      e.preventDefault();
      const el = document.getElementById(href.slice(1));
      if (!el) return;
      const y = el.getBoundingClientRect().top + window.pageYOffset - 90;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  };

  return (
    <footer
      className="relative w-full"
      style={{ backgroundColor: "#F2EFE8" }}
      data-testid="surveys-footer"
    >
      <div
        className="h-px w-full"
        style={{ background: "rgba(11,18,32,0.08)" }}
      />

      <div className="max-w-[1280px] mx-auto px-6 lg:px-12 pt-16 lg:pt-20 pb-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Brand block */}
          <div className="lg:col-span-5">
            <div className="flex items-center gap-3">
              <img
                src={LOGO_SRC}
                alt="Gazeal Surveys"
                className="h-10 w-auto"
                style={{ filter: "invert(7%) sepia(53%) saturate(0%) hue-rotate(180deg) brightness(20%) contrast(95%)" }}
              />
            </div>
            <p className="mt-5 font-outfit text-[15px] leading-[1.6] text-[#4A5260] max-w-[44ch]">
              Gazeal Surveys brings the Scottish upfront survey model to England
              and Wales — settling condition before negotiation. Independent.
              RPSA regulated. Pay at completion.
            </p>

            <div
              className="mt-7 inline-flex items-center gap-3 rounded-full px-4 py-2"
              style={{ background: "#ffffff", border: "1px solid rgba(11,18,32,0.08)" }}
            >
              <span
                className="inline-flex h-7 w-7 items-center justify-center rounded-full font-archivo font-bold text-[10px] tracking-[0.05em] text-white"
                style={{ background: "#025eba" }}
              >
                RPSA
              </span>
              <span className="font-outfit text-[12px] text-[#0B1220]">
                Residential Property Surveyors Association
              </span>
            </div>
          </div>

          {/* Link columns */}
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-8">
            {COLS.map((col) => (
              <div key={col.title}>
                <p className="font-archivo font-bold text-[11px] tracking-[0.18em] uppercase text-[#0B1220] mb-4">
                  {col.title}
                </p>
                <ul className="space-y-3">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      <a
                        href={link.href}
                        onClick={(e) => handleAnchor(e, link.href)}
                        className="font-outfit text-[14px] text-[#4A5260] hover:text-[#025eba] transition-colors duration-300"
                        data-testid={`footer-link-${link.label
                          .toLowerCase()
                          .replace(/[^a-z0-9]+/g, "-")}`}
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div
          className="mt-12 h-px w-full"
          style={{ background: "rgba(11,18,32,0.08)" }}
        />

        <div className="mt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <p className="font-outfit text-[12px] text-[#6B7280]">
            © {new Date().getFullYear()} Gazeal Group Ltd. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <a
              href="#"
              className="font-outfit text-[12px] text-[#6B7280] hover:text-[#0B1220] transition-colors"
              data-testid="footer-link-privacy"
            >
              Privacy policy
            </a>
            <a
              href="#"
              className="font-outfit text-[12px] text-[#6B7280] hover:text-[#0B1220] transition-colors"
              data-testid="footer-link-terms"
            >
              Terms
            </a>
            <a
              href="#"
              className="font-outfit text-[12px] text-[#6B7280] hover:text-[#0B1220] transition-colors"
              data-testid="footer-link-cookies"
            >
              Cookies
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default SurveysFooter;
