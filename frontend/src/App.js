import "@/App.css";
import { useState } from "react";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import SurveysHeader from "@/components/ui/surveys-header";
import SurveysHero from "@/components/ui/surveys-hero";
import SurveysWhyBuilt from "@/components/ui/surveys-why-built";
import SurveysHowItWorks from "@/components/ui/surveys-how-it-works";
import SurveysSafetyNet from "@/components/ui/surveys-safety-net";
import SurveysBothSides from "@/components/ui/surveys-both-sides";
import SurveysCta from "@/components/ui/surveys-cta";
import SurveysFooter from "@/components/ui/surveys-footer";
import SurveysLearnMoreModal from "@/components/ui/surveys-learn-more-modal";
import RequestSurveyPage from "@/pages/request-survey";

const SurveysLanding = () => {
  const navigate = useNavigate();
  const [learnMoreOpen, setLearnMoreOpen] = useState(false);

  const handleApply = () => navigate("/request-survey");
  const handleLearnMore = () => setLearnMoreOpen(true);

  return (
    <div className="App min-h-screen" style={{ backgroundColor: "#025eba" }}>
      <SurveysHeader onApply={handleApply} />
      <main className="relative z-10">
        <SurveysHero onApply={handleApply} onLearnMore={handleLearnMore} />
        <SurveysWhyBuilt />
        <SurveysHowItWorks />
        <SurveysSafetyNet />
        <SurveysBothSides />
        <SurveysCta onApply={handleApply} onLearnMore={handleLearnMore} />
        <SurveysFooter />
      </main>
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
        <Route path="/request-survey" element={<RequestSurveyPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
