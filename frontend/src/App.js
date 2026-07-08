import "@/App.css";
import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from "react-router-dom";

// ─── Gazeal (default) ───────────────────────────────────────────────────────
import SurveysHeader from "@/components/ui/surveys-header";
import SurveysHero from "@/components/ui/surveys-hero";
import SurveysBento from "@/components/ui/surveys-bento";
import SurveysSaleAgreed from "@/components/ui/surveys-sale-agreed";
import ReservationExplainer from "@/components/ui/reservation-explainer";
import SurveysBenefits from "@/components/ui/surveys-benefits";
import SurveysFAQ from "@/components/ui/surveys-faq";
import SurveysFooterReveal from "@/components/ui/surveys-footer-reveal";
import SurveysLearnMoreModal from "@/components/ui/surveys-learn-more-modal";
import OrderSurveyPage from "@/pages/order-survey";
import AgreementPage from "@/pages/agreement";
import PricingPage from "@/pages/pricing";
import IntroPage from "@/pages/intro";

// ─── Balgores (co-brand) ────────────────────────────────────────────────────
import BSurveysHeader from "@/components/ui/balgores/surveys-header-balgores";
import BSurveysHero from "@/components/ui/balgores/surveys-hero-balgores";
import BSurveysBento from "@/components/ui/balgores/surveys-bento-balgores";
import BSurveysSaleAgreed from "@/components/ui/balgores/surveys-sale-agreed-balgores";
import BReservationExplainer from "@/components/ui/balgores/reservation-explainer-balgores";
import BSurveysBenefits from "@/components/ui/balgores/surveys-benefits-balgores";
import BSurveysFAQ from "@/components/ui/balgores/surveys-faq-balgores";
import BSurveysFooterReveal from "@/components/ui/balgores/surveys-footer-reveal-balgores";
import BSurveysLearnMoreModal from "@/components/ui/balgores/surveys-learn-more-modal-balgores";
import BOrderSurveyPage from "@/pages/balgores/order-survey-balgores";
import BAgreementPage from "@/pages/balgores/agreement-balgores";
import BPricingPage from "@/pages/balgores/pricing-balgores";

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
  const [learnMoreOpen, setLearnMoreOpen] = useState(false);

  const handleOrderSurvey = () => navigate("/balgores/order-survey");
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
      navigate("/balgores", { replace: true });
    }
  }, [location.search, navigate]);

  return (
    <div className="App min-h-screen bg-black" data-testid="balgores-landing">
      <BSurveysHeader onOrderSurvey={handleOrderSurvey} onLearnMore={handleLearnMore} />
      <main className="relative z-10 bg-black">
        <BSurveysHero onOrderSurvey={handleOrderSurvey} onLearnMore={handleLearnMore} />
        <BSurveysBento />
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
        <BSurveysFAQ onOrderSurvey={handleOrderSurvey} onLearnMore={handleLearnMore} />
      </main>
      <BSurveysFooterReveal onOrderSurvey={handleOrderSurvey} onLearnMore={handleLearnMore} />
      <BSurveysLearnMoreModal open={learnMoreOpen} onClose={() => setLearnMoreOpen(false)} />
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
        {/* Unlisted video intro page — not linked from the main nav */}
        <Route path="/intro" element={<IntroPage />} />

        {/* Balgores (separate funnel — duplicated components) */}
        <Route path="/balgores" element={<SurveysLandingBalgores />} />
        <Route path="/balgores/order-survey" element={<BOrderSurveyPage />} />
        <Route path="/balgores/agreement/:token" element={<BAgreementPage />} />
        <Route path="/balgores/pricing" element={<BPricingPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
