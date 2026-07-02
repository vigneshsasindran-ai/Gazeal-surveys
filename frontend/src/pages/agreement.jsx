import React, { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Check, X, ChevronDown, ArrowUpRight, Mail } from "lucide-react";
import SurveysHeader from "@/components/ui/surveys-header";
import ReservationExplainer from "@/components/ui/reservation-explainer";
import PricingCalculator from "@/components/ui/pricing-calculator";

/*
 * Hosted seller agreement page — branded with the same Archivo + Outfit
 * design language as the rest of the Surveys site. Reuses the existing
 * header but renders its OWN compact static footer (the scroll-reveal
 * footer used on the landing page would otherwise translate upward and
 * cover the clauses while the seller is reading). Persistent URL: once
 * accepted, the page stays live and shows the recorded acceptance state
 * forever.
 *
 * Clauses flow inline with the page scroll (no nested scroll box). The
 * Agree button unlocks via IntersectionObserver on a sentinel placed
 * after the final clause — i.e. the seller must scroll to the end of the
 * terms before they can accept.
 */

const LOGO_SRC =
  "https://customer-assets.emergentagent.com/job_survey-pro-10/artifacts/k9mairc3_Gazeal%20surveys%20logo.png";

const AgreementFooter = () => (
  <footer className="relative bg-black border-t border-white/10 mt-12" data-testid="agreement-footer">
    <div className="max-w-3xl mx-auto px-6 py-12 flex flex-col items-center gap-6">
      <img src={LOGO_SRC} alt="Gazeal Surveys" className="h-10 w-auto opacity-70" />
      <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 font-outfit text-[13px]">
        <a href="https://gazeal.co.uk" target="_blank" rel="noopener noreferrer"
           className="text-white/55 hover:text-[#4FB6FF] transition-colors inline-flex items-center gap-1">
          Gazeal Main Site <ArrowUpRight className="w-3 h-3" />
        </a>
        <a href="https://elite.gazeal.co.uk" target="_blank" rel="noopener noreferrer"
           className="text-white/55 hover:text-[#4FB6FF] transition-colors inline-flex items-center gap-1">
          Gazeal Elite <ArrowUpRight className="w-3 h-3" />
        </a>
        <a href="mailto:info@gazeal.co.uk"
           className="text-white/55 hover:text-[#4FB6FF] transition-colors inline-flex items-center gap-1">
          <Mail className="w-3.5 h-3.5" /> info@gazeal.co.uk
        </a>
      </div>
      <p className="font-outfit text-[12px] text-white/35 text-center">
        © {new Date().getFullYear()} Gazeal Surveys. All rights reserved.
      </p>
    </div>
  </footer>
);

const CLAUSES = [
  { no: "01", title: "The parties and the survey", body: "You are commissioning a Home Insight Survey, a survey designed for sellers and buyers and carried out by an accredited RPSA panel surveyor. The buyer can rely on it with the assurance of cover under the surveyor's professional indemnity insurance. Gazeal Surveys provides the service through the RPSA, and Gazeal Limited, the leading provider of reservation agreements, acts as their agent for these purposes." },
  { no: "02", title: "The fee, and when you pay", body: "You commission the survey now but pay only if a sale is achieved, and on completion. Gazeal Surveys will invoice you the agreed fee. The fee becomes payable on completion of a sale secured by a Gazeal Reservation Agreement, if you withdraw unreasonably as determined by the Independent Expert, or if you do not accept an offer secured by a Gazeal Reservation Agreement within six months of this agreement. The fee is not payable if a sale secured by a Gazeal Reservation Agreement does not reach exchange because the buyer withdrew unreasonably, or because either party withdrew for a reasonable cause." },
  { no: "03", title: "How it works", body: "Gazeal creates a secure account for you and you provide the details the RPSA needs to arrange a surveyor. The RPSA allocates a suitably qualified panel surveyor, confirms the name, date and contact details in an Appointment Confirmation, and after the inspection uploads the report to your account, where Gazeal notifies you that it is ready." },
  { no: "04", title: "What the survey is", body: "A professional, visual and non-invasive inspection of the property, delivered as a concise, condition-rated report at a Level 2 standard. It records the property's visible condition on the day of inspection and offers general maintenance advice where relevant. It is a professional opinion, not a guarantee, warranty or insurance against future defects, and it does not provide the depth of a full Building Survey." },
  { no: "05", title: "Who you are contracting with", body: "Your contract for the survey itself is with the Surveyor named in your Appointment Confirmation, not with the RPSA. The RPSA arranges and administers the instruction and selects an accredited surveyor whose insurance it has verified, but it does not carry professional responsibility for the inspection, advice or report." },
  { no: "06", title: "Who can rely on the report", body: "The report is for you, the seller, and the first successful purchaser who reads it in full before exchange of contracts. It may be shown to more than one prospective buyer during marketing, but only the buyer who completes, and who read it before exchange, may rely on it. No subsequent buyer, mortgage lender or valuer may rely on it. A buyer remains free to commission their own independent survey." },
  { no: "07", title: "Scope and limits", body: "The survey reports significant visible defects, safety matters, above-average maintenance needs, and areas needing further investigation. It does not include market or mortgage valuation, reinstatement or rebuild costs, or any costing of repairs unless agreed in writing; specialist tests including asbestos, knotweed, drainage, gas, electrical or cladding; or legal advice. It does not record minor or cosmetic defects or routine wear and tear, and it is not a snagging list." },
  { no: "08", title: "What the surveyor will not do", body: "During the inspection the surveyor will not open up or alter the fabric of the property, lift fitted carpets or floorboards, move furniture or delicate objects, empty cupboards, wardrobes or roof spaces, operate damaged or delicate fittings where that risks damage, remove secured panels or hatches, open electrical fittings, or enter under-floor areas without safe and clear access." },
  { no: "09", title: "Services", body: "Services such as heating, plumbing, electrics and drainage are largely concealed, so only their visible parts are inspected and they are observed in normal operation rather than specialist tested. The survey cannot assess their efficiency, safety or compliance with current regulations. Intermittent faults may not show on the day, and any service that is turned off will be left off and noted as such." },
  { no: "10", title: "The report", body: "The report gives the surveyor's professional opinion on the construction and condition of each main element, with condition ratings, a summary of the main issues, relevant environmental and conveyancing information, health and safety matters, maintenance considerations, any limitations on the day, and whether further specialist investigation is needed. It reflects the condition only at the date of inspection. It is not legal advice." },
  { no: "11", title: "Assumptions and hazardous materials", body: "Unless the report says otherwise, the surveyor assumes there are no hazardous materials, that all necessary planning and building consents have been obtained, that no onerous restrictions apply, and that the property has vacant possession and mains services. The surveyor does not verify these and is not liable if an assumption proves incorrect. Visible asbestos materials are noted but not tested." },
  { no: "12", title: "Your responsibilities", body: "Provide safe and adequate access and share any relevant information about the property's condition, history or past repairs. If you give the report to a buyer, provide it in full and unaltered, and make clear they may rely on it only if they read it before exchange. Arrange any further investigation the report recommends, or disclose its outcome to a buyer. Disclose any new defects, damage or repairs that come to light after the report is issued." },
  { no: "13", title: "Limitation of liability", body: "The surveyor is responsible for foreseeable loss caused by a failure to use reasonable skill and care. The surveyor is not liable for an inability to inspect, for incorrect information you supply, for reliance by anyone who is not a permitted party, or for your decision not to act on the report. The surveyor's maximum liability is the reasonable cost of rectifying a defect that should have been, but was not, reported. Total damages under this agreement will not exceed the fee." },
  { no: "14", title: "Changes, records, data and complaints", body: "A surveyor may decline or end the instruction without safe access or sufficient specialist knowledge, on at least five working days' notice, and the RPSA may allocate an alternative with your agreement. The surveyor retains the report for at least 15 years. Your personal data is processed only to provide and administer the service. Raise any complaint with the surveyor first; if unresolved, you may refer it to The Property Ombudsman." },
  { no: "15", title: "General", body: "This agreement is governed by the law of England and Wales, whose courts have jurisdiction, though residents of Scotland or Northern Ireland may use their local courts. Except for the reliance granted to the first successful purchaser, no third party may enforce it. Nothing in this agreement removes your rights under the Consumer Rights Act 2015 or the Consumer Contracts Regulations 2013." },
];

const AgreementPage = () => {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [loadErr, setLoadErr] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionErr, setActionErr] = useState("");
  const [pricingSnapshot, setPricingSnapshot] = useState(null);
  const sentinelRef = useRef(null);

  useEffect(() => {
    fetch(`${process.env.REACT_APP_BACKEND_URL}/api/agreements/${token}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.statusText)))
      .then(setData)
      .catch(() => setLoadErr("We couldn't find this agreement."));
  }, [token]);

  // Unlock Agree only when the sentinel (placed after the last clause)
  // scrolls into view in the main window — i.e. the seller has read to
  // the bottom of the terms.
  useEffect(() => {
    if (!data || data.status !== "pending") return;
    const node = sentinelRef.current;
    if (!node) return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setUnlocked(true);
        });
      },
      { rootMargin: "0px 0px -80px 0px", threshold: 0.01 }
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, [data]);

  const post = async (action) => {
    setBusy(true);
    setActionErr("");
    try {
      const res = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}/api/agreements/${token}/${action}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(action === "accept" && pricingSnapshot ? { pricing_snapshot: pricingSnapshot } : {}),
        }
      );
      if (!res.ok) {
        if (res.status === 409) {
          setActionErr("This agreement has already been recorded with a different decision.");
        } else {
          throw new Error(await res.text());
        }
      }
      const ctx = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}/api/agreements/${token}`
      ).then((r) => r.json());
      setData(ctx);
      // Scroll the user back to the top so they see the new banner state.
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setActionErr("We couldn't record that. Please try again in a moment.");
    } finally {
      setBusy(false);
    }
  };

  if (loadErr) {
    return (
      <div className="min-h-screen bg-black text-white">
        <SurveysHeader />
        <main className="max-w-2xl mx-auto px-6 pt-40 pb-32 text-center">
          <h1 className="font-archivo font-bold text-3xl mb-4">Agreement not found</h1>
          <p className="font-outfit text-white/65">{loadErr} Please check the link in your email or contact your agent.</p>
        </main>
        <AgreementFooter />
      </div>
    );
  }
  if (!data) {
    return (
      <div className="min-h-screen bg-black text-white">
        <SurveysHeader />
        <main className="max-w-2xl mx-auto px-6 pt-40 pb-32 text-center font-outfit text-white/65">Loading…</main>
      </div>
    );
  }

  const address = [data.property?.address_line_1, data.property?.postcode].filter(Boolean).join(", ");
  const accepted = data.status === "accepted";
  const declined = data.status === "declined";
  const stampDate = accepted ? new Date(data.accepted_at).toLocaleString("en-GB", { dateStyle: "long", timeStyle: "short" }) : null;
  const pending = !accepted && !declined;

  return (
    <div className="min-h-screen bg-black text-white" data-testid="agreement-page">
      <SurveysHeader />

      <main className="relative">
        <div className="absolute inset-x-0 top-0 h-[480px] pointer-events-none"
             style={{ background: "radial-gradient(60% 60% at 50% 0%, rgba(2,94,186,0.22) 0%, rgba(2,94,186,0) 60%)" }} />

        <div className={`relative max-w-3xl mx-auto px-6 pt-32 lg:pt-40 ${pending ? "pb-44" : "pb-24"}`}>
          {/* Status banner */}
          {accepted && (
            <div className="mb-8 rounded-2xl border border-[#4FB6FF]/35 bg-gradient-to-br from-[#4FB6FF]/[0.12] to-[#025eba]/[0.06] p-5 flex items-start gap-4"
                 data-testid="agreement-status-accepted">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full shrink-0"
                    style={{ background: "linear-gradient(135deg,#4FB6FF,#025eba)" }}>
                <Check className="w-5 h-5 text-white" strokeWidth={3} />
              </span>
              <div className="min-w-0">
                <p className="font-archivo font-bold text-[15px] text-white">Seller has agreed to the terms</p>
                <p className="font-outfit text-[13px] text-white/70 mt-0.5">Accepted on {stampDate}. This page remains live for your reference.</p>
                {data.accepted_ip && (
                  <p className="font-outfit text-[12px] text-white/55 mt-1.5" data-testid="agreement-accepted-ip">
                    Recorded from IP <span className="font-mono text-white/75">{data.accepted_ip}</span> &middot; Reference <span className="font-mono text-white/75">{data.reference_number || data.token}</span>
                  </p>
                )}
                {data.pricing_snapshot && (
                  <div className="mt-3 pt-3 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-3 font-outfit text-[12px]"
                       data-testid="agreement-pricing-snapshot">
                    <div>
                      <p className="text-white/50 uppercase tracking-[0.12em] text-[10px] font-semibold mb-0.5">Property value</p>
                      <p className="text-white font-semibold">
                        {new Intl.NumberFormat("en-GB",{style:"currency",currency:"GBP",maximumFractionDigits:0}).format(data.pricing_snapshot.property_value || 0)}
                      </p>
                    </div>
                    <div>
                      <p className="text-white/50 uppercase tracking-[0.12em] text-[10px] font-semibold mb-0.5">Bedrooms</p>
                      <p className="text-white font-semibold">{data.pricing_snapshot.bedrooms || "-"}</p>
                    </div>
                    <div>
                      <p className="text-white/50 uppercase tracking-[0.12em] text-[10px] font-semibold mb-0.5">Listed status</p>
                      <p className="text-white font-semibold">{data.pricing_snapshot.listed_status || "-"}</p>
                    </div>
                    <div>
                      <p className="text-white/50 uppercase tracking-[0.12em] text-[10px] font-semibold mb-0.5">Estimated fee</p>
                      <p className="text-white font-semibold">
                        {data.pricing_snapshot.quote ? "Bespoke quote" :
                          new Intl.NumberFormat("en-GB",{style:"currency",currency:"GBP",minimumFractionDigits:2,maximumFractionDigits:2}).format(data.pricing_snapshot.price || 0)}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          {declined && (
            <div className="mb-8 rounded-2xl border border-[#FF8A8A]/30 bg-[#FF8A8A]/[0.07] p-5"
                 data-testid="agreement-status-declined">
              <p className="font-archivo font-bold text-[15px] text-white">Agreement was declined</p>
              <p className="font-outfit text-[13px] text-white/70 mt-1">Please contact your agent if you'd like to revisit the terms.</p>
            </div>
          )}

          <p className="font-outfit text-[11px] font-semibold tracking-[0.22em] uppercase text-[#4FB6FF] mb-4">Seller Survey Agreement</p>
          <h1 className="font-archivo font-bold text-3xl sm:text-4xl lg:text-[44px] leading-[1.1] tracking-[-0.025em] text-white">
            <span className="text-white">Your agreement, </span>
            <span className="bg-gradient-to-r from-[#4FB6FF] to-[#025eba] bg-clip-text text-transparent">in plain English.</span>
          </h1>

          {/* Hi panel */}
          <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <p className="font-outfit text-[15px] text-white/80 leading-relaxed">
              Hi <span className="text-white font-semibold">{data.seller?.first_name}</span>, this agreement is between you,
              <strong className="text-white"> Gazeal Surveys</strong> and the
              <strong className="text-white"> Residential Property Surveyors Association (RPSA)</strong>.
              It covers your RPSA Home Insight Survey for{" "}
              <span className="text-white font-semibold">{address || "your property"}</span>, ordered by
              <span className="text-white font-semibold"> {data.agent?.name}</span> at
              <span className="text-white font-semibold"> {data.agent?.agency}</span>.
              Please read it in full before you accept.
            </p>
          </div>

          {/* Clauses — flow inline with page scroll (no nested scroll box) */}
          <div className="mt-10 space-y-7" data-testid="agreement-clauses">
            {CLAUSES.map((c) => (
              <section key={c.no} data-testid={`agreement-clause-${c.no}`}
                       className="rounded-xl border border-white/[0.06] bg-white/[0.015] p-5 sm:p-6">
                <h2 className="flex items-baseline gap-3 mb-2">
                  <span className="font-archivo font-bold text-[#4FB6FF] text-[14px]">{c.no}</span>
                  <span className="font-archivo font-bold text-white text-[16px] tracking-[-0.01em]">{c.title}</span>
                </h2>
                <p className="font-outfit text-[14px] leading-[1.7] text-white/70 pl-8">{c.body}</p>
              </section>
            ))}
            <p className="font-outfit text-[12px] text-white/45 pl-8 pt-2 border-t border-white/[0.06]">
              By accepting, you confirm you have read and agree to the terms above.
            </p>
            {/* Sentinel for the unlock observer */}
            <div ref={sentinelRef} data-testid="agreement-sentinel" className="h-1 w-full" />
          </div>

          {/* Reference footer */}
          <p className="mt-10 font-outfit text-[12px] text-white/40">
            Reference: <span className="font-mono text-white/60">{data.reference_number || data.token}</span> · This link is unique to your property submission and remains live for your records.
          </p>
        </div>

        {/* Pricing calculator (wider container so the £ figure never crops) */}
        <div className="relative max-w-3xl lg:max-w-6xl mx-auto px-6 mt-16 lg:mt-20">
          <div className="max-w-2xl mb-8">
            <h2 className="font-archivo font-bold text-white text-3xl sm:text-4xl leading-[1.1] tracking-[-0.025em]">
              See what your survey costs.
            </h2>
          </div>
          <PricingCalculator
            testidPrefix="agreement-pricing"
            initialValue={data.pricing_snapshot?.property_value || 600_000}
            initialBeds={data.pricing_snapshot?.bedrooms || undefined}
            initialListed={data.pricing_snapshot?.listed_status || undefined}
            onChange={setPricingSnapshot}
          />
        </div>

        {/* Reservation Agreement explainer + interest checkbox */}
        <div className={`relative max-w-3xl mx-auto px-6 mt-16 lg:mt-20 ${pending ? "pb-44" : "pb-24"}`}>
          <ReservationExplainer
            variant="seller"
            token={data.token}
            initialInterest={!!data.reservation_interest}
          />
        </div>

        {/* Sticky action bar — only shown while pending */}
        {pending && (
          <div className="fixed bottom-0 inset-x-0 z-30 pointer-events-none">
            <div className="pointer-events-auto bg-gradient-to-t from-black via-black/95 to-black/0 backdrop-blur-sm">
              <div className="max-w-3xl mx-auto px-6 py-5 flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
                <div className="flex items-center gap-2 text-[12px] font-outfit text-white/55"
                     data-testid="agreement-scroll-hint">
                  {unlocked ? (
                    <span className="text-[#4FB6FF]">Thank you — you're ready to confirm.</span>
                  ) : (
                    <>
                      <ChevronDown className="w-3.5 h-3.5" />
                      Please scroll to the end of the terms to enable Agree.
                    </>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button type="button" onClick={() => post("decline")} disabled={busy}
                          className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 hover:border-white/35 text-white px-6 py-3 font-outfit font-semibold text-[14px] disabled:opacity-50"
                          data-testid="agreement-decline">
                    <X className="w-4 h-4" /> Disagree
                  </button>
                  <button type="button" onClick={() => post("accept")} disabled={busy || !unlocked}
                          className="inline-flex items-center justify-center gap-2 rounded-full text-white px-6 py-3 font-outfit font-semibold text-[14px] disabled:opacity-40 disabled:cursor-not-allowed"
                          style={{ background: "linear-gradient(135deg,#4FB6FF,#025eba)", boxShadow: "0 6px 22px rgba(2,94,186,0.4)" }}
                          data-testid="agreement-accept">
                    <Check className="w-4 h-4" /> Agree to the terms
                  </button>
                </div>
              </div>
              {actionErr && (
                <div className="max-w-3xl mx-auto px-6 pb-4">
                  <p className="font-outfit text-[12px] text-[#FF8A8A]" data-testid="agreement-error">{actionErr}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <AgreementFooter />
    </div>
  );
};

export default AgreementPage;
