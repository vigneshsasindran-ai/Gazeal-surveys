import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import SurveysHeader from "@/components/ui/surveys-header";
import SurveysHero from "@/components/ui/surveys-hero";

const SurveysLanding = () => (
  <div className="App min-h-screen" style={{ backgroundColor: "#025eba" }}>
    <SurveysHeader />
    <main className="relative z-10">
      <SurveysHero />
    </main>
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
