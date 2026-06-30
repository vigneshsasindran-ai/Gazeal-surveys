import "@/App.css";
import { useState } from "react";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
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

const SurveysLanding = () => {
  const navigate = useNavigate();
  const [learnMoreOpen, setLearnMoreOpen] = useState(false);

  const handleOrderSurvey = () => navigate("/order-survey");
  const handleLearnMore = () => setLearnMoreOpen(true);

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

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<SurveysLanding />} />
        <Route path="/order-survey" element={<OrderSurveyPage />} />
        <Route path="/agreement/:token" element={<AgreementPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
