import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import SurveysHeader from "@/components/ui/surveys-header";
import SurveysHero from "@/components/ui/surveys-hero";
import SurveysBento from "@/components/ui/surveys-bento";
import SurveysFAQ from "@/components/ui/surveys-faq";
import SurveysFooterReveal from "@/components/ui/surveys-footer-reveal";

const SurveysLanding = () => (
  <div className="App min-h-screen bg-black">
    <SurveysHeader />
    <main className="relative z-10 bg-black">
      <SurveysHero />
      <SurveysBento />
      <SurveysFAQ />
    </main>
    <SurveysFooterReveal />
  </div>
);

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<SurveysLanding />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
