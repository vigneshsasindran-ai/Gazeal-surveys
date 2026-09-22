import "@/App.css";
import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";

// ─── Gazeal (default) ───────────────────────────────────────────────────────
import SurveysHeader from "@/components/ui/surveys-header";
import SurveysHero from "@/components/ui/surveys-hero";
import SurveysBento from "@/components/ui/surveys-bento";
import SurveysSaleAgreed from "@/components/ui/surveys-sale-agreed";
import ReservationExplainer from "@/components/ui/reservation-explainer";
import SurveysBenefits from "@/components/ui/surveys-benefits";
import SurveyPricingTable from "@/components/ui/survey-pricing-table";
import SurveysFAQ from "@/components/ui/surveys-faq";
import SurveysFooterReveal from "@/components/ui/surveys-footer-reveal";
import SurveysLearnMoreModal from "@/components/ui/surveys-learn-more-modal";
import OrderSurveyPage from "@/pages/order-survey";
import AgreementPage from "@/pages/agreement";
import PricingPage from "@/pages/pricing";
import AdminPage from "@/pages/admin";
import IntroPage from "@/pages/intro";
import LaunchPage from "@/pages/launch";

// ─── Balgores (co-brand) ────────────────────────────────────────────────────
import BSurveysHeader from "@/components/ui/balgores/surveys-header-balgores";
import BSurveysHero from "@/components/ui/balgores/surveys-hero-balgores";
import BSurveysBento from "@/components/ui/balgores/surveys-bento-balgores";
import BSurveysSaleAgreed from "@/components/ui/balgores/surveys-sale-agreed-balgores";
import BReservationExplainer from "@/components/ui/balgores/reservation-explainer-balgores";
import BSurveysBenefits from "@/components/ui/balgores/surveys-benefits-balgores";
import BSellerAdvantage from "@/components/ui/balgores/seller-advantage-balgores";
import BSurveyPricingTable from "@/components/ui/balgores/survey-pricing-table-balgores";
import BSurveysFAQ from "@/components/ui/balgores/surveys-faq-balgores";
import BSurveysFooterReveal from "@/components/ui/balgores/surveys-footer-reveal-balgores";
import BOrderSurveyPage from "@/pages/balgores/order-survey-balgores";
import BAgreementPage from "@/pages/balgores/agreement-balgores";
import BPricingPage from "@/pages/balgores/pricing-balgores";

// ─── eXp UK (co-brand) ──────────────────────────────────────────────────────
import XSurveysHeader from "@/components/ui/exp/surveys-header-exp";
import XSurveysHero from "@/components/ui/exp/surveys-hero-exp";
import XSurveysBento from "@/components/ui/exp/surveys-bento-exp";
import XSurveysSaleAgreed from "@/components/ui/exp/surveys-sale-agreed-exp";
import XReservationExplainer from "@/components/ui/exp/reservation-explainer-exp";
import XSurveysBenefits from "@/components/ui/exp/surveys-benefits-exp";
import XSellerAdvantage from "@/components/ui/exp/seller-advantage-exp";
import XSurveyPricingTable from "@/components/ui/exp/survey-pricing-table-exp";
import XSurveysFAQ from "@/components/ui/exp/surveys-faq-exp";
import XSurveysFooterReveal from "@/components/ui/exp/surveys-footer-reveal-exp";
import XOrderSurveyPage from "@/pages/exp/order-survey-exp";
import XAgreementPage from "@/pages/exp/agreement-exp";
import XPricingPage from "@/pages/exp/pricing-exp";

// ─── David Astburys (co-brand) ──────────────────────────────────────────────
import DSurveysHeader from "@/components/ui/da/surveys-header-da";
import DSurveysHero from "@/components/ui/da/surveys-hero-da";
import DSurveysBento from "@/components/ui/da/surveys-bento-da";
import DSurveysSaleAgreed from "@/components/ui/da/surveys-sale-agreed-da";
import DReservationExplainer from "@/components/ui/da/reservation-explainer-da";
import DSurveysBenefits from "@/components/ui/da/surveys-benefits-da";
import DSellerAdvantage from "@/components/ui/da/seller-advantage-da";
import DSurveyPricingTable from "@/components/ui/da/survey-pricing-table-da";
import DSurveysFAQ from "@/components/ui/da/surveys-faq-da";
import DSurveysFooterReveal from "@/components/ui/da/surveys-footer-reveal-da";
import DOrderSurveyPage from "@/pages/da/order-survey-da";
import DAgreementPage from "@/pages/da/agreement-da";
import DPricingPage from "@/pages/da/pricing-da";

// ─── Harrisons Homes (co-brand, agency-funded survey) ───────────────────────
import HSurveysHeader from "@/components/ui/hh/surveys-header-hh";
import HSurveysHero from "@/components/ui/hh/surveys-hero-hh";
import HSurveysBento from "@/components/ui/hh/surveys-bento-hh";
import HSurveysSaleAgreed from "@/components/ui/hh/surveys-sale-agreed-hh";
import HReservationExplainer from "@/components/ui/hh/reservation-explainer-hh";
import HSurveysBenefits from "@/components/ui/hh/surveys-benefits-hh";
import HSellerAdvantage from "@/components/ui/hh/seller-advantage-hh";
import HSurveysFAQ from "@/components/ui/hh/surveys-faq-hh";
import HSurveysFooterReveal from "@/components/ui/hh/surveys-footer-reveal-hh";
import HOrderSurveyPage from "@/pages/hh/order-survey-hh";
import HAgreementPage from "@/pages/hh/agreement-hh";

const SurveysLanding = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [learnMoreOpen, setLearnMoreOpen] = useState(false);

  const handleOrderSurvey = () => navigate("/order-survey");
  const handleLearnMore = () => setLearnMoreOpen(true);

  useEffect(() => {
    if (location.hash) {
      const id = location.hash.slice(1);
      const t = setTimeout(() => {
        const el = document.getElementById(id);
        if (el) {
          const y = el.getBoundingClientRect().top + window.pageYOffset - 90;
          window.scrollTo({ top: y, behavior: "smooth" });
        }
      }, 100);
      return () => clearTimeout(t);
    }
  }, [location.hash]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("learn") === "1") {
      setLearnMoreOpen(true);
      navigate("/", { replace: true });
    }
  }, [location.search, navigate]);

  return (
    <div className="App min-h-screen bg-black">
      <SurveysHeader onOrderSurvey={handleOrderSurvey} onLearnMore={handleLearnMore} />
      <main className="relative z-10 bg-black">
        <SurveysHero onOrderSurvey={handleOrderSurvey} onLearnMore={handleLearnMore} />
        <SurveysBento />
        <SurveysSaleAgreed onOrderSurvey={handleOrderSurvey} />
        <section
          className="relative bg-black pt-2 pb-20 md:pt-4 md:pb-28"
          data-testid="surveys-reservation-compare-section"
        >
          <div className="relative mx-auto max-w-3xl lg:max-w-6xl px-6">
            <ReservationExplainer variant="agent" />
          </div>
        </section>
        <SurveysBenefits />
        <SurveyPricingTable />
        <SurveysFAQ onOrderSurvey={handleOrderSurvey} onLearnMore={handleLearnMore} />
      </main>
      <SurveysFooterReveal onOrderSurvey={handleOrderSurvey} onLearnMore={handleLearnMore} />
      <SurveysLearnMoreModal open={learnMoreOpen} onClose={() => setLearnMoreOpen(false)} />
    </div>
  );
};

/**
 * Balgores landing — mirrors SurveysLanding, but every child component and
 * page navigation is scoped to `/balgores/*`. Fully separate funnel; no
 * shared components with the Gazeal side.
 */
const SurveysLandingBalgores = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleOrderSurvey = () => navigate("/balgores/order-survey");

  useEffect(() => {
    if (location.hash) {
      const id = location.hash.slice(1);
      const t = setTimeout(() => {
        const el = document.getElementById(id);
        if (el) {
          const y = el.getBoundingClientRect().top + window.pageYOffset - 90;
          window.scrollTo({ top: y, behavior: "smooth" });
        }
      }, 100);
      return () => clearTimeout(t);
    }
  }, [location.hash]);

  return (
    <div className="App min-h-screen bg-black" data-testid="balgores-landing">
      <BSurveysHeader onOrderSurvey={handleOrderSurvey} />
      <main className="relative z-10 bg-black">
        <BSurveysHero onOrderSurvey={handleOrderSurvey} />
        <BSurveysBento />
        <BSellerAdvantage onOrderSurvey={handleOrderSurvey} />
        <BSurveysSaleAgreed onOrderSurvey={handleOrderSurvey} />
        <section
          className="relative bg-black pt-2 pb-20 md:pt-4 md:pb-28"
          data-testid="balgores-reservation-compare-section"
        >
          <div className="relative mx-auto max-w-3xl lg:max-w-6xl px-6">
            <BReservationExplainer variant="agent" />
          </div>
        </section>
        <BSurveysBenefits />
        <BSurveyPricingTable />
        <BSurveysFAQ onOrderSurvey={handleOrderSurvey} />
      </main>
      <BSurveysFooterReveal onOrderSurvey={handleOrderSurvey} />
    </div>
  );
};

/**
 * eXp UK landing — mirrors the Balgores pattern, scoped to `/exp/*`.
 * Fully separate funnel; no shared components with the Gazeal side.
 */
const SurveysLandingExp = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleOrderSurvey = () => navigate("/exp/order-survey");

  useEffect(() => {
    if (location.hash) {
      const id = location.hash.slice(1);
      const t = setTimeout(() => {
        const el = document.getElementById(id);
        if (el) {
          const y = el.getBoundingClientRect().top + window.pageYOffset - 90;
          window.scrollTo({ top: y, behavior: "smooth" });
        }
      }, 100);
      return () => clearTimeout(t);
    }
  }, [location.hash]);

  return (
    <div className="App min-h-screen bg-black" data-testid="exp-landing">
      <XSurveysHeader onOrderSurvey={handleOrderSurvey} />
      <main className="relative z-10 bg-black">
        <XSurveysHero onOrderSurvey={handleOrderSurvey} />
        <XSurveysBento />
        <XSellerAdvantage onOrderSurvey={handleOrderSurvey} />
        <XSurveysSaleAgreed onOrderSurvey={handleOrderSurvey} />
        <section
          className="relative bg-black pt-2 pb-20 md:pt-4 md:pb-28"
          data-testid="exp-reservation-compare-section"
        >
          <div className="relative mx-auto max-w-3xl lg:max-w-6xl px-6">
            <XReservationExplainer variant="agent" />
          </div>
        </section>
        <XSurveysBenefits />
        <XSurveyPricingTable />
        <XSurveysFAQ onOrderSurvey={handleOrderSurvey} />
      </main>
      <XSurveysFooterReveal onOrderSurvey={handleOrderSurvey} />
    </div>
  );
};

/**
 * David Astburys landing — scoped to `/davidastburys/*`. Light brand theme:
 * burgundy #9B2743 hero + advantage band, white bento section, #ccbfb9
 * everywhere else. Fully separate funnel.
 */
const SurveysLandingDa = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleOrderSurvey = () => navigate("/davidastburys/order-survey");

  useEffect(() => {
    if (location.hash) {
      const id = location.hash.slice(1);
      const t = setTimeout(() => {
        const el = document.getElementById(id);
        if (el) {
          const y = el.getBoundingClientRect().top + window.pageYOffset - 90;
          window.scrollTo({ top: y, behavior: "smooth" });
        }
      }, 100);
      return () => clearTimeout(t);
    }
  }, [location.hash]);

  return (
    <div className="App min-h-screen bg-white" data-testid="da-landing">
      <DSurveysHeader onOrderSurvey={handleOrderSurvey} />
      <main className="relative z-10 bg-white">
        <DSurveysHero onOrderSurvey={handleOrderSurvey} />
        <DSurveysBento />
        <DSellerAdvantage onOrderSurvey={handleOrderSurvey} />
        <DSurveysSaleAgreed onOrderSurvey={handleOrderSurvey} />
        <section
          className="relative bg-white pt-2 pb-20 md:pt-4 md:pb-28"
          data-testid="da-reservation-compare-section"
        >
          <div className="relative mx-auto max-w-3xl lg:max-w-6xl px-6">
            <DReservationExplainer variant="agent" />
          </div>
        </section>
        <DSurveysBenefits />
        <DSurveyPricingTable />
        <DSurveysFAQ onOrderSurvey={handleOrderSurvey} />
      </main>
      <DSurveysFooterReveal onOrderSurvey={handleOrderSurvey} />
    </div>
  );
};

/**
 * Harrisons Homes landing — scoped to `/harrisonshomes/*`. Navy #0E1748 base
 * with #DEA39D accents. In this funnel the AGENCY pays the survey fee, so all
 * seller payment wording is removed.
 */
const SurveysLandingHh = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleOrderSurvey = () => navigate("/harrisonshomes/order-survey");

  useEffect(() => {
    if (location.hash) {
      const id = location.hash.slice(1);
      const t = setTimeout(() => {
        const el = document.getElementById(id);
        if (el) {
          const y = el.getBoundingClientRect().top + window.pageYOffset - 90;
          window.scrollTo({ top: y, behavior: "smooth" });
        }
      }, 100);
      return () => clearTimeout(t);
    }
  }, [location.hash]);

  return (
    <div className="App min-h-screen bg-black" data-testid="hh-landing">
      <HSurveysHeader onOrderSurvey={handleOrderSurvey} />
      <main className="relative z-10 bg-black">
        <HSurveysHero onOrderSurvey={handleOrderSurvey} />
        <HSurveysBento />
        <HSellerAdvantage onOrderSurvey={handleOrderSurvey} />
        <HSurveysSaleAgreed onOrderSurvey={handleOrderSurvey} />
        <section
          className="relative bg-black pt-2 pb-20 md:pt-4 md:pb-28"
          data-testid="hh-reservation-compare-section"
        >
          <div className="relative mx-auto max-w-3xl lg:max-w-6xl px-6">
            <HReservationExplainer variant="agent" />
          </div>
        </section>
        <HSurveysBenefits />
        <HSurveysFAQ onOrderSurvey={handleOrderSurvey} />
      </main>
      <HSurveysFooterReveal onOrderSurvey={handleOrderSurvey} />
    </div>
  );
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Gazeal (default) */}
        <Route path="/" element={<SurveysLanding />} />
        <Route path="/order-survey" element={<OrderSurveyPage />} />
        <Route path="/agreement/:token" element={<AgreementPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/admin" element={<AdminPage />} />
        {/* Unlisted video intro page — not linked from the main nav */}
        <Route path="/intro" element={<IntroPage />} />
        <Route path="/launch" element={<LaunchPage />} />

        {/* Balgores (separate funnel — duplicated components) */}
        <Route path="/balgores" element={<SurveysLandingBalgores />} />
        <Route path="/balgores/order-survey" element={<BOrderSurveyPage />} />
        <Route path="/balgores/agreement/:token" element={<BAgreementPage />} />
        <Route path="/balgores/pricing" element={<BPricingPage />} />

        {/* eXp UK (separate funnel — duplicated components) */}
        <Route path="/exp" element={<SurveysLandingExp />} />
        <Route path="/exp/order-survey" element={<XOrderSurveyPage />} />
        <Route path="/exp/agreement/:token" element={<XAgreementPage />} />
        <Route path="/exp/pricing" element={<XPricingPage />} />

        {/* David Astburys (separate funnel — duplicated components) */}
        <Route path="/davidastburys" element={<SurveysLandingDa />} />
        <Route path="/davidastburys/order-survey" element={<DOrderSurveyPage />} />
        <Route path="/davidastburys/agreement/:token" element={<DAgreementPage />} />
        <Route path="/davidastburys/pricing" element={<DPricingPage />} />

        {/* Harrisons Homes (separate funnel — agency pays the survey fee) */}
        <Route path="/harrisonshomes" element={<SurveysLandingHh />} />
        <Route path="/harrisonshomes/order-survey" element={<HOrderSurveyPage />} />
        <Route path="/harrisonshomes/agreement/:token" element={<HAgreementPage />} />
        <Route path="/harrisonshomes/pricing" element={<Navigate to="/harrisonshomes" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
