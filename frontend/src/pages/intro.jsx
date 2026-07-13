import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Check, Play } from "lucide-react";
import axios from "axios";

const API = process.env.REACT_APP_BACKEND_URL;

const LOGO_SRC =
  "https://customer-assets.emergentagent.com/job_survey-pro-10/artifacts/k9mairc3_Gazeal%20surveys%20logo.png";

const VIMEO_SRC =
  "https://player.vimeo.com/video/1208004372?badge=0&autopause=0&player_id=0&app_id=58479&loop=1";

const VIDEO_POSTER =
  "https://i.vimeocdn.com/video/2177618979-46e252210690e1721a6087da6d29072245d1bb6a319d7d1fecba0603753e7fe7-d_1280x720?region=us";

const VideoEmbed = () => {
  const [playing, setPlaying] = useState(false);

  return (
    <div style={{ padding: "56.25% 0 0 0", position: "relative" }}>
      {playing ? (
        <iframe
          src={`${VIMEO_SRC}&autoplay=1`}
          frameBorder="0"
          allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }}
          title="Gazeal Surveys Introduction"
          data-testid="intro-vimeo-iframe"
        />
      ) : (
        <button
          type="button"
          onClick={() => setPlaying(true)}
          className="group/play absolute inset-0 w-full h-full cursor-pointer"
          aria-label="Play the Gazeal Surveys introduction"
          data-testid="intro-video-poster"
        >
          <img
            src={VIDEO_POSTER}
            alt="Gazeal Surveys introduction with Bryan Mansell and Alan Milstein"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <span className="absolute inset-0 bg-[#01223f]/35 group-hover/play:bg-[#01223f]/20 transition-colors duration-300" />
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white shadow-[0_12px_40px_rgba(0,20,50,0.5)] transition-transform duration-300 group-hover/play:scale-110">
              <Play className="w-7 h-7 sm:w-8 sm:h-8 text-[#025eba] translate-x-0.5" fill="currentColor" />
            </span>
          </span>
        </button>
      )}
    </div>
  );
};

export const EmailCapture = ({ buttonLabel = "Get on the waitlist" }) => {
  const [email, setEmail] = useState("");
  const [state, setState] = useState("idle"); // idle | sending | done | error

  const submit = async (e) => {
    e.preventDefault();
    if (!email || state === "sending") return;
    setState("sending");
    try {
      await axios.post(`${API}/api/leads/intro-email`, { email });
      setState("done");
    } catch {
      setState("error");
    }
  };

  if (state === "done") {
    return (
      <div
        className="flex items-center gap-3 rounded-full bg-white/[0.08] border border-white/20 px-6 py-3.5"
        data-testid="intro-email-success"
      >
        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-white shrink-0">
          <Check className="w-3.5 h-3.5 text-[#025eba]" strokeWidth={3} />
        </span>
        <span className="font-outfit text-white text-[15px]">
          Thanks, we&rsquo;ll be in touch shortly.
        </span>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="flex flex-col sm:flex-row items-stretch gap-3 w-full max-w-[480px]"
      data-testid="intro-email-form"
    >
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Enter your work email"
        className="flex-1 min-w-0 rounded-full bg-white/[0.08] border border-white/25 focus:border-white focus:bg-white/[0.12] outline-none px-6 py-3.5 font-outfit text-[15px] text-white placeholder:text-white/50 transition-all duration-300"
        data-testid="intro-email-input"
      />
      <button
        type="submit"
        disabled={state === "sending"}
        className="group inline-flex items-center justify-center gap-2 rounded-full bg-white text-[#025eba] font-outfit font-semibold px-7 py-3.5 text-[15px] shadow-[0_6px_22px_rgba(255,255,255,0.18)] hover:shadow-[0_8px_28px_rgba(255,255,255,0.28)] hover:-translate-y-[1px] transition-all duration-300 disabled:opacity-60 whitespace-nowrap"
        data-testid="intro-email-submit"
      >
        {state === "sending" ? "Sending…" : buttonLabel}
        <ChevronRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5" />
      </button>
      {state === "error" && (
        <p className="sm:hidden font-outfit text-white/80 text-[13px]" data-testid="intro-email-error">
          Something went wrong. Please try again.
        </p>
      )}
    </form>
  );
};

const HeroSubcopy = ({ className = "", testid }) => (
  <div className={`space-y-5 max-w-[500px] ${className}`} data-testid={testid}>
    <div className="rounded-2xl border border-white/20 bg-white/[0.06] p-5 sm:p-6">
      <p className="font-outfit font-semibold text-[11px] tracking-[0.22em] uppercase text-white/60 mb-2.5">
        The Home Insights Survey
      </p>
      <p className="font-outfit text-white/90 text-[15px] lg:text-[16px] leading-[1.6]">
        A full Level 3 inspection by a qualified, insured RPSA surveyor, with
        nothing for the seller to pay upfront, and a report that can be relied
        on by the seller, buyer, agent, and conveyancer.
      </p>
    </div>
    <p className="font-outfit text-white font-medium text-[15px] lg:text-[16px] leading-[1.6]">
      Watch Bryan Mansell and Alan Milstein explain how one upfront survey can
      remove the surprise that so often breaks the deal.
    </p>
  </div>
);

export default function IntroPage({ topSection = null }) {
  return (
    <div className="App min-h-screen bg-black" data-testid="intro-page">
      {/* Minimal header — logo only, links back to the main site */}
      <header className="absolute top-0 left-0 right-0 z-50 py-6">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-12">
          <Link to="/" data-testid="intro-logo-link">
            <img src={LOGO_SRC} alt="Gazeal Surveys" className="h-10 md:h-12 w-auto" />
          </Link>
        </div>
      </header>

      {topSection}

      {/* Hero — same copy as the main site, video in place of the house */}
      <section
        className="relative w-full overflow-hidden"
        style={{ backgroundColor: "#025eba" }}
        data-testid="intro-hero"
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(120% 80% at 80% 20%, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0) 55%)",
          }}
        />
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.06] mix-blend-overlay"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.9'/></svg>\")",
          }}
        />

        <div className="relative z-10 max-w-[1280px] mx-auto px-6 lg:px-12 pt-32 pb-20 md:pt-36 md:pb-24 lg:pt-40 lg:pb-28">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 lg:items-center">
            {/* Copy — quote from the film */}
            <div className="order-1 lg:col-span-6 text-white" data-testid="intro-hero-copy">
              <blockquote data-testid="intro-hero-heading">
                <p className="font-archivo font-black tracking-[-0.02em] leading-[1.18] text-white text-[27px] sm:text-[32px] lg:text-[34px] xl:text-[38px]">
                  For every ten sales, three falls through and six get
                  renegotiated. There&rsquo;s a problem with every sale{" "}
                  <span className="text-[#9FDBFF]">except one in ten.</span>{" "}
                  That&rsquo;s crazy.
                </p>
              </blockquote>

              {/* Desktop only: subcopy stays beside the video */}
              <HeroSubcopy
                className="hidden lg:block mt-8 md:mt-9"
                testid="intro-hero-subcopy"
              />
            </div>

            {/* Video */}
            <div className="order-2 lg:col-span-6" data-testid="intro-video-wrap">
              <div className="group relative">
                {/* Ambient glow behind the frame */}
                <div className="absolute -inset-4 rounded-[28px] bg-white/[0.07] blur-2xl opacity-60 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

                <div className="relative rounded-2xl overflow-hidden ring-1 ring-white/25 group-hover:ring-white/50 shadow-[0_30px_80px_rgba(0,20,50,0.45)] transition-all duration-500 bg-[#01305f]">
                  <VideoEmbed />
                </div>

                {/* Caption bar */}
                <div
                  className="mt-4 flex items-baseline justify-between gap-4 px-1"
                  data-testid="intro-video-caption"
                >
                  <p className="font-outfit text-white/85 text-[13px] sm:text-[14px] leading-snug">
                    Featuring{" "}
                    <span className="text-white font-semibold">Alan Milstein</span>
                    <span className="text-white/60">, Director, Skyline Surveyors Ltd</span>
                  </p>
                  <span className="hidden sm:block font-outfit text-white/45 text-[12px] uppercase tracking-[0.16em] whitespace-nowrap">
                    Gazeal Surveys
                  </span>
                </div>
              </div>
            </div>

            {/* Mobile only: subcopy comes after the video */}
            <HeroSubcopy
              className="order-3 lg:hidden"
              testid="intro-hero-subcopy-mobile"
            />

            {/* CTAs — email capture + learn more */}
            <div
              className="order-4 lg:col-span-12 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-5 lg:mt-2"
              data-testid="intro-cta-row"
            >
              <EmailCapture />
              <Link
                to="/"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-transparent text-white font-outfit font-semibold px-7 py-3.5 text-[15px] border border-white/35 hover:border-white hover:bg-white/[0.06] transition-all duration-300"
                data-testid="intro-learn-more-link"
              >
                Learn More
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Coverage — editorial stat band */}
      <section className="relative bg-black py-16 md:py-24" data-testid="intro-stats">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-12">
          <div className="grid grid-cols-1 md:grid-cols-2">
            <div className="py-8 md:py-4 md:pr-14 border-b md:border-b-0 md:border-r border-white/10">
              <p
                className="font-archivo font-bold tracking-[-0.02em] text-white text-[40px] sm:text-[48px] lg:text-[56px] leading-none"
                data-testid="intro-stat-postcodes"
              >
                Every UK postcode
              </p>
              <p className="mt-4 font-outfit text-white/60 text-[15px] sm:text-[16px] leading-[1.55] max-w-[380px]">
                Gazeal Surveys is available nationwide. Wherever the property
                is, we can survey it.
              </p>
            </div>
            <div className="py-8 md:py-4 md:pl-14">
              <p
                className="font-archivo font-bold tracking-[-0.02em] text-[40px] sm:text-[48px] lg:text-[56px] leading-none"
                data-testid="intro-stat-surveyors"
              >
                <span className="bg-gradient-to-r from-[#4FB6FF] to-[#025eba] bg-clip-text text-transparent">
                  1,000+
                </span>{" "}
                <span className="text-white">surveyors</span>
              </p>
              <p className="mt-4 font-outfit text-white/60 text-[15px] sm:text-[16px] leading-[1.55] max-w-[380px]">
                Already signed up across the country, ready to deliver Level 2
                and Level 3 surveys.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Minimal footer */}
      <footer className="bg-black border-t border-white/10 py-8" data-testid="intro-footer">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-12 flex items-center justify-between gap-4">
          <img src={LOGO_SRC} alt="Gazeal Surveys" className="h-7 w-auto opacity-80" />
          <a
            href="/"
            className="font-outfit text-white/50 hover:text-white text-[13px] transition-colors duration-300"
            data-testid="intro-footer-link"
          >
            survey.gazeal.co.uk
          </a>
        </div>
      </footer>
    </div>
  );
}
