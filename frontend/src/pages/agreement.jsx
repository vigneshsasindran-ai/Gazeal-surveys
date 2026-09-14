import React, { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Check, X, ChevronDown, ArrowUpRight, Mail, Printer } from "lucide-react";
import SurveysHeader from "@/components/ui/surveys-header";
import ReservationExplainer from "@/components/ui/reservation-explainer";
import PricingCalculator from "@/components/ui/pricing-calculator";
import SellerAdvantage from "@/components/ui/seller-advantage";
import AgreementTimeline from "@/components/ui/agreement-timeline";
import SurveyGuide from "@/components/ui/survey-guide";

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
  { no: "01", title: "The Contract and meanings", body: "These Home Insight Survey Service Terms, your Order and the Appointment Confirmation together form the Contract. The Order identifies the Property and sets out the fee, funding, payment, cancellation and refund arrangements. The Appointment Confirmation names the Surveyor or Surveying Practice (the Surveyor) responsible for the inspection and the Report, together with the inspection date and the Surveyor's contact details. The contract for the professional survey between you and the Surveyor is formed when the Appointment Confirmation identifies the Surveyor and confirms the Surveyor's acceptance of the instruction. In these Terms, the Report means the written Home Insight Survey report prepared following the inspection, delivered in PDF format unless otherwise agreed; and the first successful purchaser means the buyer who proceeds to completion in the transaction for which the Report was prepared, having read the Report in full before exchange of contracts. Communications between the parties will be in writing, which includes email." },
  { no: "02", title: "Who you are contracting with", body: "Your contract for the professional survey is with the Surveyor named in the Appointment Confirmation. It is not with Gazeal or the Residential Property Surveyors Association (RPSA). Gazeal provides the platform through which the survey is arranged. The RPSA arranges and administers the instruction and allocates an appropriately qualified panel Surveyor whose professional indemnity insurance it has verified as meeting the panel's minimum requirements and whose work is subject to the RPSA's quality assurance. The RPSA is not the contracting surveyor and does not accept professional responsibility for the inspection, the professional advice or the Report." },
  { no: "03", title: "The fee and survey arrangements", body: "The fee, who funds it, when it becomes payable, and your cancellation and refund rights are set out in your Order. Once the Order is in place, the RPSA allocates a suitably qualified panel Surveyor and issues the Appointment Confirmation, so that you may contact the Surveyor before the inspection if you wish. Inspection dates and times are estimates and may need to change. The inspection depends on safe and adequate access to the Property; where access cannot be provided as arranged, any charge for additional costs reasonably incurred, and any refund, are dealt with in the Order. The Report is delivered through your account after the inspection." },
  { no: "04", title: "The nature and standard of the survey", body: "The Home Insight Survey is a professional, visual and non-invasive inspection of the Property, delivered as a concise, condition-rated Report recording the Property's visible condition on the day of inspection, with general advice on ongoing maintenance where relevant. The Surveyor will provide the Service with reasonable skill and care in accordance with the version of the RPSA Survey Inspection and Reporting Standards stated in the Appointment Confirmation (the Survey Standards). The inspection will be carried out by the individual named in the Appointment Confirmation or, where the contracting party is a Surveying Practice, by another suitably competent surveyor acting on its behalf. The contracting Surveyor or Surveying Practice remains fully responsible for the Report. The Report is a professional opinion, not a guarantee, warranty or insurance against future defects, and it does not provide the depth of investigation, extended narrative or repair specification of a full Building Survey. Where that greater level of detail is needed, a Building Survey is the appropriate route." },
  { no: "05", title: "Scope and exclusions", body: "The survey reports significant visible defects, safety matters, above-average maintenance needs, and matters needing further investigation. It does not include a market valuation, mortgage valuation advice, an insurance reinstatement or rebuild cost assessment, or any costing of repairs or improvements, unless specifically agreed in writing and stated in the Order. It does not include specialist testing or specialist surveys, including asbestos inspection under the Control of Asbestos Regulations 2012, Japanese knotweed or other invasive plant assessment, drainage, gas or electrical testing, or cladding or external wall system assessment, unless expressly agreed in writing; obvious plants or trees presenting a structural risk will be noted, but the Surveyor is not acting as an asbestos inspector or invasive-plant specialist. The Report does not record minor defects, cosmetic issues or routine wear and tear consistent with the age, type and use of the Property, and it is not a snagging list. The Service does not cover areas that are inaccessible, not visible using normal and accepted surveying practices, or that cannot be reached safely. It does not include legal advice, advice on presenting, pricing, marketing or selling the Property, or any prediction of a mortgage lender's decision or the Property's mortgageability." },
  { no: "06", title: "How the inspection is carried out, and its limitations", body: "The inspection includes a desk-top study of publicly available information relevant to the Property, and covers the inside and outside of the main building and permanent outbuildings, recording the construction, condition and visible defects of each main element as far as reasonably accessible; where access is restricted, the Report explains this. The Surveyor uses standard surveying equipment and may, where it is safe to do so, use a ladder to access or view areas no more than 3 metres above ground level externally or above floor surfaces internally, and, where safe and legal, an extended camera pole or drone at their discretion. Grounds, boundaries and areas in common use are inspected by walking the grounds and any adjoining public property where access is available. During the inspection the Surveyor will not force or open up the fabric of the Property or make any physical changes to it; take up fitted carpets, fitted floor coverings or floorboards; move furniture or valuable or delicate objects; remove the contents of cupboards, wardrobes or roof spaces; operate old, damaged, corroded or delicate fixtures and fittings where doing so may cause damage or presents a safety risk; remove secured panels or hatches, or open electrical fittings; or inspect under-floor areas unless there is safe and clear access. Where the Property is a flat, the reasonably accessible communal areas and the services within the identifiable boundary of the flat are assessed, but external wall systems and cladding are not assessed for their nature, safety or suitability, for which specialist advice is required." },
  { no: "07", title: "Services", body: "Services are generally concealed within the construction of the Property, so only their visible parts are inspected and, where safe and practicable, they are observed in normal operation in everyday use. No specialist tests are carried out. The inspection cannot confirm or certify the safety, efficiency or regulatory compliance of electrical, gas or other energy sources, the plumbing, heating or drainage installations, or the internal condition of any chimney, boiler or flue. Intermittent faults may not be apparent on the day. Any service that is turned off at the time of inspection will not be turned on, for safety reasons, and the Report will say so." },
  { no: "08", title: "The Report", body: "The Report sets out the Surveyor's professional opinion on the construction and condition of each main element of the Property as observed on the day of inspection, with a condition rating for each element inspected, as defined in the Report, a summary of the main issues, information of use to your conveyancer, any health and safety matters observed, any limitations experienced during the inspection, and whether further specialist investigation is needed. It is not legal advice, and it does not comment on any legal documents relating to the Property; matters that may require legal investigation are noted with a recommendation to consult a legal adviser." },
  { no: "09", title: "Who may rely on the Report, and the report date", body: (<><span className="block mb-3">The Report is prepared for use by you, the seller, and the first successful purchaser, together referred to as “the Reliance Parties”. It may be shown to more than one prospective purchaser during marketing, but only the purchaser who proceeds to completion, and who has read the Report in full before exchange of contracts, is entitled to rely on it. No other person may rely on the Report, including any subsequent buyer after the Property has first been sold, any mortgage lender or valuer, or any other third party who has not been given the Surveyor's express written permission. The Surveyor will not be liable to anyone who relies on the Report otherwise than as set out here, or for any purpose other than that for which it was prepared. Permitted reliance does not prevent a prospective purchaser from commissioning their own independent survey. The Surveyor may discuss the Report with the first successful purchaser, but any request going beyond it may require a separate instruction; the scope of the Service will not be expanded informally.</span><span className="block mb-3">The Report reflects the condition of the Property at the date of inspection only. The longer the period between inspection and exchange of contracts, the greater the possibility that the condition of the Property may have changed. Where a significant period has passed, or where there has been damage, deterioration, repair work, severe weather, water escape, fire or other material change, an update or reinspection may be appropriate. The date of the Report is stated clearly in the Report, and any purchaser relying on it should check that date carefully before exchange.</span></>) },
  { no: "10", title: "Assumptions, hazardous materials and leasehold properties", body: (<><span className="block mb-3">Unless the Report states otherwise, it is assumed that no dangerous, harmful or hazardous materials or techniques have been used in the construction of the Property or during any subsequent alterations; where, in the Surveyor's view, there is a likelihood that hazardous material has been used, the Surveyor will advise that specific enquiries should be made or specialist tests carried out. Materials commonly known to contain asbestos are noted where clearly visible in an accessible area, but are not tested, and where the Property is a flat it is assumed that a dutyholder with an asbestos register and management plan is in place. It is also assumed that the Property is not subject to any unusual or onerous restrictions, obligations or covenants; that all planning permissions, building regulations approvals and other consents required for the Property and any works to it have been obtained, which the Surveyor does not verify and which are matters for you or your legal advisers; that drawings, specifications and technical documentation are not inspected unless specifically agreed in writing; that the Property is unaffected by any matter that would be revealed by a local search, replies to standard pre-contract enquiries or any statutory notice, and that neither the Property, its condition, its use nor its intended use is or will be unlawful; and that the Property is offered with vacant possession and is connected to mains services. The Surveyor will not be liable to either Reliance Party where an error is made or something is not reported as a result of any of these assumptions proving incorrect.</span><span className="block mb-3">If the Property is leasehold, the Report does not confirm the adequacy of the lease, the repairing obligations of the landlord or management company, the level of any reserve fund, the reasonableness of service charges, the existence of any major works proposals, or the adequacy of the building insurance. These matters should be checked by your legal adviser before exchange of contracts.</span></>) },
  { no: "11", title: "Your responsibilities", body: "Provide safe and adequate access to the Property, and give the Surveyor any information you hold that is relevant to its construction, condition, alterations, history, or any past defects or repairs. If you provide the Report to a prospective buyer, provide it in full and without alteration, summary, selective extract or added commentary that may change its meaning, and make clear that they may rely on it only if they read it in full before exchange of contracts. Where the Report recommends further investigation or specialist advice, either arrange it or make the recommendation clear to any prospective buyer. If the investigation is carried out, disclose its outcome to the prospective buyer. Disclose to any prospective buyer, before exchange and where relevant before completion, any new defects, damage, repairs, further investigations, contractor reports, quotations or other information relevant to the condition of the Property that comes to light after the Report is issued. If you decide not to act on the advice or recommendations in the Report, you do so at your own risk. You are responsible for the accuracy and completeness of the information you give the Surveyor; the Surveyor is not liable for any loss arising from deliberate concealment of a defect or from false or incomplete information you provide." },
  { no: "12", title: "Limitation of liability", body: (<><span className="block mb-3">The Surveyor is responsible to the Reliance Parties for foreseeable loss and damage caused by the Surveyor's failure to use reasonable skill and care in providing the Service. The Surveyor is not responsible for loss or damage that is not foreseeable. Loss or damage is foreseeable if it is obvious that it will happen, or if, at the time the Contract was made, both you and the Surveyor knew it might happen, for example if you discussed it with the Surveyor during the instruction process.</span><span className="block mb-3">The Surveyor will not be liable to either Reliance Party where an error is made or something is not reported as a result of the Surveyor's inability to inspect an area of the Property; where the Surveyor relies on incorrect or incomplete information provided by you or on your behalf; where loss arises from reliance on the Report by a person who is not entitled to rely on it under clause 09; or where loss arises from the decision of either Reliance Party not to act on advice or recommendations in the Report.</span><span className="block mb-3">The Surveyor's maximum liability to the Reliance Parties for negligence or any other breach or fault arising in connection with the Service is limited to the reasonable cost of rectifying a defect which should have been, but was not, reported or was not adequately reported in the Report.</span><span className="block mb-3">Nothing in these Terms excludes or limits the Surveyor's liability where it would be unlawful to do so. This includes liability for death or personal injury caused by the Surveyor's negligence or that of the Surveyor's employees, agents or subcontractors; liability for fraud or fraudulent misrepresentation; and any other liability that cannot be excluded or limited by law.</span><span className="block mb-3">The Surveyor's liability for any loss or damage will be reduced proportionately to the extent that it was caused or contributed to by something another person has done or failed to do. Where the Service is provided by an employee or subcontractor, the Surveyor accepts full responsibility for the Report, and no employee or subcontractor will have personal liability to either Reliance Party in respect of it. The RPSA's administrative role is as described in clause 02.</span></>) },
  { no: "13", title: "Declining or reallocating the survey", body: "The Surveyor may decline to proceed with, or end, the Contract if they are not given safe and adequate access to the Property, or if on attending they determine that they lack sufficient specialist knowledge of the construction method or materials to survey the Property competently. The Surveyor may also give you notice, of at least 5 working days before the agreed inspection date, that they are unable to carry out the Service. Where the allocated Surveyor cannot carry out the survey, the RPSA may, with your agreement, allocate an alternative panel Surveyor. Any consequences for the fee, or any refund, are dealt with in the Order." },
  { no: "14", title: "Records, personal data and complaints", body: (<>The Surveyor retains the Report and related records for at least 15 years from its date, and longer where insurance or legal obligations require; copies requested in that period may attract a reasonable charge. The Surveyor, the RPSA and Gazeal each process your personal data as explained in their respective privacy policies, the Surveyor's available on request, the RPSA's at <a href="https://www.rpsa.org.uk/gdpr-2018-privacy-notice/" target="_blank" rel="noopener noreferrer" className="text-[#4FB6FF] hover:text-white underline underline-offset-2 transition-colors" data-testid="privacy-link-rpsa">rpsa.org.uk</a>, and Gazeal's on <a href="https://www.gazeal.co.uk/privacy-policy?hsLang=en" target="_blank" rel="noopener noreferrer" className="text-[#4FB6FF] hover:text-white underline underline-offset-2 transition-colors" data-testid="privacy-link-gazeal">its website</a>. Any complaint about the Service, the Report or the Surveyor's advice should be raised with the Surveyor first, who will handle it under their Complaints Handling Procedure, available on request. If it cannot be resolved, you may refer it to The Property Ombudsman through the redress arrangements applying to the Surveyor under the RPSA panel. A first successful purchaser entitled to rely on the Report should also raise any concern with the Surveyor in the first instance. The RPSA can help with administrative matters, but the redress route for the survey sits with the Surveyor and The Property Ombudsman.</>) },
  { no: "15", title: "General", body: "Except for the permitted reliance expressly granted to the first successful purchaser, the Contract is between you and the Surveyor, and no other person has any right to enforce its terms under the Contracts (Rights of Third Parties) Act 1999. Each provision operates independently; if any is found to be unlawful, unenforceable or invalid, the remaining provisions continue in full force. The Contract is governed by the law of England and Wales, and any dispute may be brought in the courts of England and Wales; if you live in Scotland or Northern Ireland, you may bring proceedings in your local courts or the English courts. Nothing in these Terms or the Order removes or limits any right you have under applicable consumer protection legislation, including the Consumer Rights Act 2015 and the Consumer Contracts (Information, Cancellation and Additional Charges) Regulations 2013; where any provision conflicts with such legislation, the legislation prevails. These Terms are issued by the RPSA for use with panel instructions, and the Surveyor is responsible for providing the Service in accordance with them." },
];

const addSixMonths = (from) => {
  const d = new Date(from);
  const day = d.getDate();
  d.setMonth(d.getMonth() + 6);
  if (d.getDate() !== day) d.setDate(0);
  return d;
};

const fmtLongDate = (d) =>
  d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

const daysUntil = (d) =>
  Math.ceil((d.getTime() - Date.now()) / 86400000);

const parseAskingPrice = (raw) => {
  if (!raw) return null;
  const m = String(raw).toLowerCase().replace(/,/g, "").match(/(\d+(?:\.\d+)?)\s*(k|m)?/);
  if (!m) return null;
  let n = parseFloat(m[1]);
  if (m[2] === "k") n *= 1_000;
  if (m[2] === "m") n *= 1_000_000;
  return n >= 10_000 && n <= 100_000_000 ? Math.round(n) : null;
};

const money = (n) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(n);

const AgreementPage = () => {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [loadErr, setLoadErr] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionErr, setActionErr] = useState("");
  const [pricingSnapshot, setPricingSnapshot] = useState(null);
  const sentinelRef = useRef(null);

  // Confidential page — tell search engines never to index or follow
  useEffect(() => {
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex, nofollow, noarchive";
    document.head.appendChild(meta);
    return () => document.head.removeChild(meta);
  }, []);

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

  const [confirmStep, setConfirmStep] = useState(null);
  const [moreInfo, setMoreInfo] = useState(false);
  const [detailsOk, setDetailsOk] = useState(false);
  const [paymentOk, setPaymentOk] = useState(false);
  const calcRef = useRef(null);

  const post = async (action) => {
    setBusy(true);
    setActionErr("");
    try {
      const res = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}/api/agreements/${token}/${action}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            action === "accept"
              ? { risk_ack: true, payment_ack: true, ...(pricingSnapshot ? { pricing_snapshot: { ...pricingSnapshot, details_confirmed: true } } : {}) }
              : {}
          ),
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
  const sixMonthIfToday = fmtLongDate(addSixMonths(new Date()));
  const feeDueDate = data.fee_due_at ? new Date(data.fee_due_at) : null;
  const feeDaysLeft = feeDueDate ? daysUntil(feeDueDate) : 0;

  return (
    <div className="min-h-screen bg-black text-white" data-testid="agreement-page">
      <SurveysHeader />

      <main className="relative">
        <div className="absolute inset-x-0 top-0 h-[480px] pointer-events-none"
             style={{ background: "radial-gradient(60% 60% at 50% 0%, rgba(2,94,186,0.22) 0%, rgba(2,94,186,0) 60%)" }} />

        <div className="relative max-w-3xl mx-auto px-6 pt-32 lg:pt-40">
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
                      <p className="text-white/50 uppercase tracking-[0.12em] text-[10px] font-semibold mb-0.5">Registered Listed Building</p>
                      <p className="text-white font-semibold">{data.pricing_snapshot.listed_status || "-"}</p>
                    </div>
                    <div>
                      <p className="text-white/50 uppercase tracking-[0.12em] text-[10px] font-semibold mb-0.5">Estimated fee</p>
                      <p className="text-white font-semibold">
                        {data.pricing_snapshot.quote ? "Bespoke quote" :
                          new Intl.NumberFormat("en-GB",{style:"currency",currency:"GBP",minimumFractionDigits:0,maximumFractionDigits:0}).format(Math.round(data.pricing_snapshot.price || 0))}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          {/* Fee countdown — shown once signed, included in print */}
          {accepted && feeDueDate && (
            <div
              className="mb-8 rounded-2xl border border-white/10 bg-white/[0.03] p-5"
              data-testid="agreement-fee-countdown"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="font-outfit text-[11px] font-semibold tracking-[0.22em] uppercase text-[#4FB6FF]">
                    Survey fee
                  </p>
                  <p className="mt-2 font-archivo font-bold text-white text-2xl sm:text-[28px] leading-none tracking-[-0.02em]"
                     data-testid="agreement-fee-due-date">
                    Payable by {fmtLongDate(feeDueDate)}
                  </p>
                  <p className="mt-2 font-outfit text-[13px] text-white/70">
                    Or on completion of your sale, whichever comes first. You paid nothing today.
                  </p>
                </div>
                <span
                  className="shrink-0 rounded-full px-3.5 py-1.5 font-outfit font-semibold text-[12px] border"
                  style={feeDaysLeft < 0
                    ? { borderColor: "rgba(255,138,138,0.55)", color: "#FF8A8A", background: "rgba(255,138,138,0.10)" }
                    : feeDaysLeft <= 30
                    ? { borderColor: "rgba(245,183,107,0.55)", color: "#F5B76B", background: "rgba(245,183,107,0.10)" }
                    : { borderColor: "rgba(93,201,141,0.55)", color: "#5DC98D", background: "rgba(93,201,141,0.10)" }}
                  data-testid="agreement-fee-countdown-pill"
                >
                  {feeDaysLeft < 0
                    ? "Fee overdue"
                    : feeDaysLeft === 0
                    ? "Due today"
                    : `${feeDaysLeft} day${feeDaysLeft === 1 ? "" : "s"} remaining`}
                </span>
              </div>
              {data.terms_pdf_available && (
                <div className={`mt-4 pt-4 border-t ${"border-white/[0.08]"} flex flex-wrap items-center justify-between gap-3`}>
                  <p className="font-outfit text-[12px] text-white/50">
                    Signed copy: {data.terms_version}
                    {data.terms_sha256 ? (
                      <> · SHA-256 <span className="font-mono">{data.terms_sha256.slice(0, 16)}…</span></>
                    ) : null}
                  </p>
                  <a
                    href={`${process.env.REACT_APP_BACKEND_URL}/api/agreements/${token}/terms.pdf`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="print-hide inline-flex items-center gap-2 rounded-full border px-4 py-2 font-outfit font-semibold text-[12px] text-white/70 hover:text-white transition-all"
                    style={{ borderColor: "#4FB6FF" }}
                    data-testid="agreement-terms-pdf-link"
                  >
                    Download signed terms (PDF)
                  </a>
                </div>
              )}
            </div>
          )}
          {declined && (
            <div className="mb-8 rounded-2xl border border-[#FF8A8A]/30 bg-[#FF8A8A]/[0.07] p-5"
                 data-testid="agreement-status-declined">
              <p className="font-archivo font-bold text-[15px] text-white">
                You declined these terms{data.declined_at ? ` on ${new Date(data.declined_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}` : ""}
              </p>
              <p className="font-outfit text-[13px] text-white/70 mt-1">
                Changed your mind? You can review the terms again and accept them below. If you have any questions, please contact your agent.
              </p>
              <button
                type="button"
                onClick={() => post("reopen")}
                disabled={busy}
                className="mt-4 inline-flex items-center gap-2 rounded-full px-5 py-2.5 font-outfit font-semibold text-[13px] text-white disabled:opacity-50 transition-all hover:opacity-90"
                style={{ background: "linear-gradient(135deg,#4FB6FF,#025eba)", boxShadow: "0 6px 22px rgba(2,94,186,0.4)" }}
                data-testid="agreement-reopen"
              >
                Review the terms again
              </button>
              {actionErr && (
                <p className="font-outfit text-[12px] text-[#FF8A8A] mt-3" data-testid="agreement-reopen-error">{actionErr}</p>
              )}
            </div>
          )}

          <div className="flex items-center justify-between gap-4 mb-4">
            <p className="font-outfit text-[11px] font-semibold tracking-[0.22em] uppercase text-[#4FB6FF]">Seller Survey Agreement</p>
            <button
              type="button"
              onClick={() => window.print()}
              className="print-hide inline-flex items-center gap-2 rounded-full border border-white/25 px-4 py-2 font-outfit font-semibold text-[12px] text-white/80 hover:text-white hover:border-white/60 transition-all shrink-0"
              data-testid="agreement-print-btn"
            >
              <Printer className="w-3.5 h-3.5" /> Print / Save PDF
            </button>
          </div>
          <h1 className="font-archivo font-bold text-3xl sm:text-4xl lg:text-[44px] leading-[1.1] tracking-[-0.025em] text-white">
            <span className="text-white">Home Insight Survey </span>
            <span className="bg-gradient-to-r from-[#4FB6FF] to-[#025eba] bg-clip-text text-transparent">Service Terms.</span>
          </h1>

          {/* Hi panel */}
          <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <p className="font-outfit text-[15px] text-white/80 leading-relaxed">
              Hi <span className="text-white font-semibold">{data.seller?.first_name}</span>, these are the Service Terms for your
              <strong className="text-white"> RPSA Home Insight Survey</strong> for{" "}
              <span className="text-white font-semibold">{address || "your property"}</span>, arranged on your behalf by
              <span className="text-white font-semibold"> {data.agent?.name}</span> at
              <span className="text-white font-semibold"> {data.agent?.agency}</span>.
            </p>
            <p className="mt-4 pt-4 border-t border-white/10 font-outfit text-[13px] text-white/60 leading-relaxed" data-testid="agreement-about-summary">
              These Service Terms explain the Home Insight Survey, what the Surveyor will inspect and report
              upon, who may rely on the Report, and the limits of the Service.{" "}
              <span className="text-white/85 font-semibold">Version 1.1, dated 13th September 2026.</span>
            </p>
          </div>

          <AgreementTimeline data={data} />
        </div>

        {/* Why order your survey before you sell? — read before the terms */}
        <div className="print-hide mt-14 lg:mt-16">
          <SellerAdvantage eyebrow="You pay nothing today when ordering the survey" />
        </div>

        <div className="relative max-w-3xl mx-auto px-6">
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
            {/* Fee, payment and cancellation — part of the terms, included in print */}
            <section
              className="rounded-xl border-2 border-[#4FB6FF]/35 bg-[#4FB6FF]/[0.06] p-5 sm:p-6"
              data-testid="agreement-payment-terms"
            >
              <h2 className="flex items-baseline gap-3 mb-2">
                <span className="font-archivo font-bold text-[#4FB6FF] text-[14px]">Fee</span>
                <span className="font-archivo font-bold text-white text-[16px] tracking-[-0.01em]">
                  The fee, when you pay, and cancellation
                </span>
              </h2>
              <div className="pl-8 space-y-2.5 font-outfit text-[14px] leading-[1.7] text-white/70">
                <p>
                  <span className="text-white font-semibold">Nothing is payable today.</span> The fee is
                  payable to Gazeal on completion of the sale of the Property, or six months from the
                  date you accept these terms, whichever comes first.
                </p>
                <p>
                  The fee remains payable if the sale does not complete, unless a Gazeal Reservation
                  Agreement applies and the sale falls through no fault of the seller, as per the terms
                  set in the Gazeal Reservation Agreement.
                </p>
                <p>
                  All prices include VAT. Gazeal will invoice you at the point the fee becomes payable,
                  using the contact details on your Order. If the Property is sold and completion takes
                  place before the six month date, the fee becomes payable on completion.
                </p>
                <p className="text-white/50 text-[13px] pt-1" data-testid="agreement-payment-date-note">
                  {pending ? (
                    <>Accept today and the six month date is{" "}
                    <span className="text-white font-semibold">{sixMonthIfToday}</span>.</>
                  ) : feeDueDate ? (
                    <>Fee payable by{" "}
                    <span className="text-white font-semibold">{fmtLongDate(feeDueDate)}</span>, or on
                    completion of your sale, whichever comes first.</>
                  ) : null}
                </p>
              </div>
            </section>
            <p className="font-outfit text-[12px] text-white/45 pl-8 pt-2 border-t border-white/[0.06]">
              By accepting, you confirm that you have read and agree to these Home Insight Survey Service
              Terms <span className="text-white/70 font-semibold">(Version 1.1, dated 13 September 2026)</span> and
              your Order.
            </p>
            {/* Sentinel for the unlock observer */}
            <div ref={sentinelRef} data-testid="agreement-sentinel" className="h-1 w-full" />
          </div>

          {/* Reference footer */}
          <p className="mt-10 font-outfit text-[12px] text-white/40">
            Reference: <span className="font-mono text-white/60">{data.reference_number || data.token}</span> · This link is unique to your property submission and remains live for your records.
          </p>
        </div>

        {/* Survey guide (what the survey covers) */}
        <div className="print-hide relative max-w-3xl lg:max-w-6xl mx-auto px-6 mt-16 lg:mt-20">
          <SurveyGuide testidPrefix="agreement-survey-guide" />
        </div>

        {/* Pricing calculator (wider container so the £ figure never crops) */}
        <div ref={calcRef} className="print-hide relative max-w-3xl lg:max-w-6xl mx-auto px-6 mt-16 lg:mt-20 scroll-mt-24">
          <div className="max-w-2xl mb-8">
            <h2 className="font-archivo font-bold text-white text-3xl sm:text-4xl leading-[1.1] tracking-[-0.025em]">
              See what your survey costs.
            </h2>
            {pending && (
              <p className="mt-4 font-outfit text-[14px] text-white/70" data-testid="agreement-pricing-note">
                {(data.pricing_snapshot?.property_value || parseAskingPrice(data.property?.asking_price)) ? (
                  <>We've pre-filled your property value from your order.{" "}
                  <span className="text-white font-semibold">Please check the details below are correct.</span></>
                ) : (
                  <>Please <span className="text-white font-semibold">set your property value below</span>{" "}
                  so your survey fee is estimated correctly.</>
                )}
              </p>
            )}
          </div>
          <PricingCalculator
            testidPrefix="agreement-pricing"
            initialValue={data.pricing_snapshot?.property_value || parseAskingPrice(data.property?.asking_price) || undefined}
            initialBeds={data.pricing_snapshot?.bedrooms || data.property?.bedrooms || undefined}
            initialListed={data.pricing_snapshot?.listed_status || data.property?.listed_status || undefined}
            requireTouch={pending && !data.pricing_snapshot?.property_value && !parseAskingPrice(data.property?.asking_price)}
            onChange={setPricingSnapshot}
          />
        </div>

        {/* Reservation Agreement explainer + interest checkbox */}
        <div className={`print-hide relative max-w-3xl mx-auto px-6 mt-16 lg:mt-20 ${pending ? "pb-44" : "pb-24"}`}>
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
                    pricingSnapshot ? (
                      <span className="text-[#4FB6FF]">You're ready. Click Agree to confirm.</span>
                    ) : (
                      <span className="text-white/70">Please set your property value in the calculator above to enable Agree.</span>
                    )
                  ) : (
                    <>
                      <ChevronDown className="w-3.5 h-3.5" />
                      Please scroll to the end of the terms to enable Agree.
                    </>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button type="button" onClick={() => setConfirmStep("decline")} disabled={busy}
                          className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 hover:border-white/35 text-white px-6 py-3 font-outfit font-semibold text-[14px] disabled:opacity-50"
                          data-testid="agreement-decline">
                    <X className="w-4 h-4" /> Disagree
                  </button>
                  <button type="button" onClick={() => { setDetailsOk(false); setPaymentOk(false); setConfirmStep("accept"); }} disabled={busy || !unlocked || !pricingSnapshot}
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
        {/* Confirm modals — acknowledgement is part of the Agree action */}
        {pending && confirmStep && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" data-testid="agreement-confirm-modal">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setConfirmStep(null)} />
            <div className="relative w-full max-w-md rounded-2xl border border-white/15 bg-[#0b0b0d] p-6">
              {confirmStep === "accept" ? (
                <>
                  <h3 className="font-archivo font-bold text-white text-[18px]">One thing to confirm</h3>
                  <p className="mt-3 font-outfit text-[14px] text-white/80 leading-relaxed" data-testid="agreement-risk-statement">
                    Proceeding with your sale{" "}
                    <span className="text-white font-semibold">without a Gazeal Reservation Agreement</span>{" "}
                    allows your buyer to walk away or renegotiate at any point, without any protection for you.
                    Remember to ask your agent to secure your sale when a buyer is found.
                  </p>
                  <div className="mt-4 rounded-xl border border-white/12 bg-white/[0.03] p-4" data-testid="agreement-details-summary">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-outfit font-semibold text-[11px] tracking-[0.18em] uppercase text-white/55">Your property details</p>
                      <button
                        type="button"
                        onClick={() => { setConfirmStep(null); calcRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }}
                        className="font-outfit text-[12px] font-semibold text-[#4FB6FF] hover:underline"
                        data-testid="agreement-edit-details"
                      >
                        Edit details
                      </button>
                    </div>
                    <div className="space-y-1 font-outfit text-[13px] text-white/80">
                      <div className="flex justify-between"><span>Property value</span><span className="text-white font-semibold">{pricingSnapshot?.property_value ? money(pricingSnapshot.property_value) : "—"}</span></div>
                      <div className="flex justify-between"><span>Bedrooms</span><span className="text-white font-semibold">{pricingSnapshot?.bedrooms || "—"}</span></div>
                      <div className="flex justify-between"><span>Listed building</span><span className="text-white font-semibold">{pricingSnapshot?.listed_status || "—"}</span></div>
                      <div className="flex justify-between"><span>Estimated fee</span><span className="text-white font-semibold">{pricingSnapshot?.quote ? "Bespoke quote" : pricingSnapshot?.price ? money(pricingSnapshot.price) : "—"}</span></div>
                    </div>
                  </div>
                  <label
                    className={`mt-4 flex items-start gap-3 cursor-pointer rounded-xl border p-3.5 transition-colors ${
                      detailsOk ? "border-[#4FB6FF]/50 bg-[#4FB6FF]/[0.05]" : "border-white/15 bg-white/[0.02] hover:border-white/30"
                    }`}
                    data-testid="agreement-details-ok-label"
                  >
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={detailsOk}
                      onChange={(e) => setDetailsOk(e.target.checked)}
                      data-testid="agreement-details-ok-checkbox"
                    />
                    <span
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
                        detailsOk ? "border-transparent" : "border-white/35"
                      }`}
                      style={detailsOk ? { background: "linear-gradient(135deg,#4FB6FF,#025eba)" } : {}}
                    >
                      {detailsOk && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                    </span>
                    <span className="font-outfit text-[13px] text-white/75 leading-relaxed">
                      I confirm these property details are correct.
                    </span>
                  </label>
                  <label
                    className={`mt-3 flex items-start gap-3 cursor-pointer rounded-xl border p-3.5 transition-colors ${
                      paymentOk ? "border-[#4FB6FF]/50 bg-[#4FB6FF]/[0.05]" : "border-white/15 bg-white/[0.02] hover:border-white/30"
                    }`}
                    data-testid="agreement-payment-ok-label"
                  >
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={paymentOk}
                      onChange={(e) => setPaymentOk(e.target.checked)}
                      data-testid="agreement-payment-ok-checkbox"
                    />
                    <span
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
                        paymentOk ? "border-transparent" : "border-white/35"
                      }`}
                      style={paymentOk ? { background: "linear-gradient(135deg,#4FB6FF,#025eba)" } : {}}
                    >
                      {paymentOk && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                    </span>
                    <span className="font-outfit text-[13px] text-white/70 leading-relaxed">
                      <span className="text-white font-semibold">I pay nothing today.</span> I understand the
                      survey fee is payable on completion of my sale, or by{" "}
                      <span className="text-white font-semibold">{sixMonthIfToday}</span>, whichever comes
                      first.
                    </span>
                  </label>
                  {!data.reservation_interest && (
                    <label
                      className={`mt-4 flex items-start gap-3 cursor-pointer rounded-xl border p-3.5 transition-colors ${
                        moreInfo ? "border-[#4FB6FF]/50 bg-[#4FB6FF]/[0.05]" : "border-white/15 bg-white/[0.02] hover:border-white/30"
                      }`}
                      data-testid="agreement-more-info-label"
                    >
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={moreInfo}
                        onChange={(e) => setMoreInfo(e.target.checked)}
                        data-testid="agreement-more-info-checkbox"
                      />
                      <span
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
                          moreInfo ? "border-transparent" : "border-white/35"
                        }`}
                        style={moreInfo ? { background: "linear-gradient(135deg,#4FB6FF,#025eba)" } : {}}
                      >
                        {moreInfo && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                      </span>
                      <span className="font-outfit text-[13px] text-white/75 leading-relaxed">
                        Send me more information about Gazeal Reservation Agreements.
                      </span>
                    </label>
                  )}
                  <div className="mt-6 flex flex-col sm:flex-row-reverse gap-3">
                    <button type="button"
                            onClick={async () => {
                              setConfirmStep(null);
                              if (moreInfo && !data.reservation_interest) {
                                try {
                                  await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/agreements/${token}/express-interest`, { method: "POST" });
                                } catch {}
                              }
                              post("accept");
                            }}
                            disabled={busy || !detailsOk || !paymentOk}
                            className="inline-flex items-center justify-center gap-2 rounded-full text-white px-6 py-3 font-outfit font-semibold text-[14px] disabled:opacity-50"
                            style={{ background: "linear-gradient(135deg,#4FB6FF,#025eba)", boxShadow: "0 6px 22px rgba(2,94,186,0.4)" }}
                            data-testid="agreement-confirm-accept">
                      <Check className="w-4 h-4" /> I understand, agree to the terms
                    </button>
                    <button type="button" onClick={() => setConfirmStep(null)}
                            className="inline-flex items-center justify-center rounded-full border border-white/20 hover:border-white/40 text-white/80 hover:text-white px-6 py-3 font-outfit font-semibold text-[14px]"
                            data-testid="agreement-confirm-back">
                      Go back
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <h3 className="font-archivo font-bold text-white text-[18px]">Decline the survey terms?</h3>
                  <p className="mt-3 font-outfit text-[14px] text-white/75 leading-relaxed">
                    If you decline, your survey will not go ahead. This link stays live, so you can come back and reconsider at any time.
                  </p>
                  <div className="mt-6 flex flex-col sm:flex-row-reverse gap-3">
                    <button type="button" onClick={() => setConfirmStep(null)}
                            className="inline-flex items-center justify-center gap-2 rounded-full text-white px-6 py-3 font-outfit font-semibold text-[14px]"
                            style={{ background: "linear-gradient(135deg,#4FB6FF,#025eba)", boxShadow: "0 6px 22px rgba(2,94,186,0.4)" }}
                            data-testid="agreement-decline-back">
                      Go back
                    </button>
                    <button type="button" onClick={() => { setConfirmStep(null); post("decline"); }} disabled={busy}
                            className="inline-flex items-center justify-center gap-2 rounded-full border border-red-400/30 hover:border-red-400/60 text-red-300 px-6 py-3 font-outfit font-semibold text-[14px] disabled:opacity-50"
                            data-testid="agreement-confirm-decline">
                      <X className="w-4 h-4" /> Yes, decline
                    </button>
                  </div>
                </>
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
