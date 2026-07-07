import "@/App.css";
import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from "react-router-dom";
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
import { BrandProvider, useBrand, brandPath } from "@/brand/BrandContext";

const SurveysLanding = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const brand = useBrand();
  const [learnMoreOpen, setLearnMoreOpen] = useState(false);

  const handleOrderSurvey = () => navigate(brandPath(brand, "/order-survey"));
  const handleLearnMore = () => setLearnMoreOpen(true);

  // Handle hash-based navigation from other pages (e.g. /#faq)
  // and `?learn=1` query flag to auto-open the Learn More modal.
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
      navigate(brandPath(brand, "/"), { replace: true });
    }
    // brandPath is derived from `brand` so we scope it as a dep.
  }, [location.search, navigate, brand]);

  return (
    <div className="App min-h-screen bg-black">
      <SurveysHeader
        onOrderSurvey={handleOrderSurvey}
        onLearnMore={handleLearnMore}
      />
      <main className="relative z-10 bg-black">
        <SurveysHero
          onOrderSurvey={handleOrderSurvey}
          onLearnMore={handleLearnMore}
        />
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
        <SurveysFAQ
          onOrderSurvey={handleOrderSurvey}
          onLearnMore={handleLearnMore}
        />
      </main>
      <SurveysFooterReveal
        onOrderSurvey={handleOrderSurvey}
        onLearnMore={handleLearnMore}
      />
      <SurveysLearnMoreModal
        open={learnMoreOpen}
        onClose={() => setLearnMoreOpen(false)}
      />
    </div>
  );
};

// Wrap page routes in <BrandProvider brand="..."> so all downstream
// components (header, hero, forms, calculator) pick up the correct
// theme class + partner logo automatically.
const G = ({ children }) => <BrandProvider brand="gazeal">{children}</BrandProvider>;
const B = ({ children }) => <BrandProvider brand="balgores">{children}</BrandProvider>;

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Gazeal (default) */}
        <Route path="/" element={<G><SurveysLanding /></G>} />
        <Route path="/order-survey" element={<G><OrderSurveyPage /></G>} />
        <Route path="/agreement/:token" element={<G><AgreementPage /></G>} />
        <Route path="/pricing" element={<G><PricingPage /></G>} />

        {/* Balgores */}
        <Route path="/balgores" element={<B><SurveysLanding /></B>} />
        <Route path="/balgores/order-survey" element={<B><OrderSurveyPage /></B>} />
        <Route path="/balgores/agreement/:token" element={<B><AgreementPage /></B>} />
        <Route path="/balgores/pricing" element={<B><PricingPage /></B>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
