"""Home Insight Survey Service Terms — single source of truth.

The text below is the authoritative wording. It is rendered on the seller
agreement pages, sealed into the PDF issued at acceptance, and hashed so the
exact wording a seller agreed to can always be proven.
"""
from __future__ import annotations

import hashlib

TERMS_VERSION = "1.1"
TERMS_DATE = "13 September 2026"
TERMS_LABEL = f"Version {TERMS_VERSION}, dated {TERMS_DATE}"

CLAUSES = [
    {
        "no": '01',
        "title": 'The Contract and meanings',
        "paragraphs": [
            "These Home Insight Survey Service Terms, your Order and the Appointment Confirmation together form the Contract. The Order identifies the Property and sets out the fee, funding, payment, cancellation and refund arrangements. The Appointment Confirmation names the Surveyor or Surveying Practice (the Surveyor) responsible for the inspection and the Report, together with the inspection date and the Surveyor's contact details. The contract for the professional survey between you and the Surveyor is formed when the Appointment Confirmation identifies the Surveyor and confirms the Surveyor's acceptance of the instruction. In these Terms, the Report means the written Home Insight Survey report prepared following the inspection, delivered in PDF format unless otherwise agreed; and the first successful purchaser means the buyer who proceeds to completion in the transaction for which the Report was prepared, having read the Report in full before exchange of contracts. Communications between the parties will be in writing, which includes email.",
        ],
    },
    {
        "no": '02',
        "title": 'Who you are contracting with',
        "paragraphs": [
            "Your contract for the professional survey is with the Surveyor named in the Appointment Confirmation. It is not with Gazeal or the Residential Property Surveyors Association (RPSA). Gazeal provides the platform through which the survey is arranged. The RPSA arranges and administers the instruction and allocates an appropriately qualified panel Surveyor whose professional indemnity insurance it has verified as meeting the panel's minimum requirements and whose work is subject to the RPSA's quality assurance. The RPSA is not the contracting surveyor and does not accept professional responsibility for the inspection, the professional advice or the Report.",
        ],
    },
    {
        "no": '03',
        "title": 'The fee and survey arrangements',
        "paragraphs": [
            'The fee, who funds it, when it becomes payable, and your cancellation and refund rights are set out in your Order. Once the Order is in place, the RPSA allocates a suitably qualified panel Surveyor and issues the Appointment Confirmation, so that you may contact the Surveyor before the inspection if you wish. Inspection dates and times are estimates and may need to change. The inspection depends on safe and adequate access to the Property; where access cannot be provided as arranged, any charge for additional costs reasonably incurred, and any refund, are dealt with in the Order. The Report is delivered through your account after the inspection.',
        ],
    },
    {
        "no": '04',
        "title": 'The nature and standard of the survey',
        "paragraphs": [
            "The Home Insight Survey is a professional, visual and non-invasive inspection of the Property, delivered as a concise, condition-rated Report recording the Property's visible condition on the day of inspection, with general advice on ongoing maintenance where relevant. The Surveyor will provide the Service with reasonable skill and care in accordance with the version of the RPSA Survey Inspection and Reporting Standards stated in the Appointment Confirmation (the Survey Standards). The inspection will be carried out by the individual named in the Appointment Confirmation or, where the contracting party is a Surveying Practice, by another suitably competent surveyor acting on its behalf. The contracting Surveyor or Surveying Practice remains fully responsible for the Report. The Report is a professional opinion, not a guarantee, warranty or insurance against future defects, and it does not provide the depth of investigation, extended narrative or repair specification of a full Building Survey. Where that greater level of detail is needed, a Building Survey is the appropriate route.",
        ],
    },
    {
        "no": '05',
        "title": 'Scope and exclusions',
        "paragraphs": [
            "The survey reports significant visible defects, safety matters, above-average maintenance needs, and matters needing further investigation. It does not include a market valuation, mortgage valuation advice, an insurance reinstatement or rebuild cost assessment, or any costing of repairs or improvements, unless specifically agreed in writing and stated in the Order. It does not include specialist testing or specialist surveys, including asbestos inspection under the Control of Asbestos Regulations 2012, Japanese knotweed or other invasive plant assessment, drainage, gas or electrical testing, or cladding or external wall system assessment, unless expressly agreed in writing; obvious plants or trees presenting a structural risk will be noted, but the Surveyor is not acting as an asbestos inspector or invasive-plant specialist. The Report does not record minor defects, cosmetic issues or routine wear and tear consistent with the age, type and use of the Property, and it is not a snagging list. The Service does not cover areas that are inaccessible, not visible using normal and accepted surveying practices, or that cannot be reached safely. It does not include legal advice, advice on presenting, pricing, marketing or selling the Property, or any prediction of a mortgage lender's decision or the Property's mortgageability.",
        ],
    },
    {
        "no": '06',
        "title": 'How the inspection is carried out, and its limitations',
        "paragraphs": [
            'The inspection includes a desk-top study of publicly available information relevant to the Property, and covers the inside and outside of the main building and permanent outbuildings, recording the construction, condition and visible defects of each main element as far as reasonably accessible; where access is restricted, the Report explains this. The Surveyor uses standard surveying equipment and may, where it is safe to do so, use a ladder to access or view areas no more than 3 metres above ground level externally or above floor surfaces internally, and, where safe and legal, an extended camera pole or drone at their discretion. Grounds, boundaries and areas in common use are inspected by walking the grounds and any adjoining public property where access is available. During the inspection the Surveyor will not force or open up the fabric of the Property or make any physical changes to it; take up fitted carpets, fitted floor coverings or floorboards; move furniture or valuable or delicate objects; remove the contents of cupboards, wardrobes or roof spaces; operate old, damaged, corroded or delicate fixtures and fittings where doing so may cause damage or presents a safety risk; remove secured panels or hatches, or open electrical fittings; or inspect under-floor areas unless there is safe and clear access. Where the Property is a flat, the reasonably accessible communal areas and the services within the identifiable boundary of the flat are assessed, but external wall systems and cladding are not assessed for their nature, safety or suitability, for which specialist advice is required.',
        ],
    },
    {
        "no": '07',
        "title": 'Services',
        "paragraphs": [
            'Services are generally concealed within the construction of the Property, so only their visible parts are inspected and, where safe and practicable, they are observed in normal operation in everyday use. No specialist tests are carried out. The inspection cannot confirm or certify the safety, efficiency or regulatory compliance of electrical, gas or other energy sources, the plumbing, heating or drainage installations, or the internal condition of any chimney, boiler or flue. Intermittent faults may not be apparent on the day. Any service that is turned off at the time of inspection will not be turned on, for safety reasons, and the Report will say so.',
        ],
    },
    {
        "no": '08',
        "title": 'The Report',
        "paragraphs": [
            "The Report sets out the Surveyor's professional opinion on the construction and condition of each main element of the Property as observed on the day of inspection, with a condition rating for each element inspected, as defined in the Report, a summary of the main issues, information of use to your conveyancer, any health and safety matters observed, any limitations experienced during the inspection, and whether further specialist investigation is needed. It is not legal advice, and it does not comment on any legal documents relating to the Property; matters that may require legal investigation are noted with a recommendation to consult a legal adviser.",
        ],
    },
    {
        "no": '09',
        "title": 'Who may rely on the Report, and the report date',
        "paragraphs": [
            "The Report is prepared for use by you, the seller, and the first successful purchaser, together referred to as “the Reliance Parties”. It may be shown to more than one prospective purchaser during marketing, but only the purchaser who proceeds to completion, and who has read the Report in full before exchange of contracts, is entitled to rely on it. No other person may rely on the Report, including any subsequent buyer after the Property has first been sold, any mortgage lender or valuer, or any other third party who has not been given the Surveyor's express written permission. The Surveyor will not be liable to anyone who relies on the Report otherwise than as set out here, or for any purpose other than that for which it was prepared. Permitted reliance does not prevent a prospective purchaser from commissioning their own independent survey. The Surveyor may discuss the Report with the first successful purchaser, but any request going beyond it may require a separate instruction; the scope of the Service will not be expanded informally.",
            'The Report reflects the condition of the Property at the date of inspection only. The longer the period between inspection and exchange of contracts, the greater the possibility that the condition of the Property may have changed. Where a significant period has passed, or where there has been damage, deterioration, repair work, severe weather, water escape, fire or other material change, an update or reinspection may be appropriate. The date of the Report is stated clearly in the Report, and any purchaser relying on it should check that date carefully before exchange.',
        ],
    },
    {
        "no": '10',
        "title": 'Assumptions, hazardous materials and leasehold properties',
        "paragraphs": [
            "Unless the Report states otherwise, it is assumed that no dangerous, harmful or hazardous materials or techniques have been used in the construction of the Property or during any subsequent alterations; where, in the Surveyor's view, there is a likelihood that hazardous material has been used, the Surveyor will advise that specific enquiries should be made or specialist tests carried out. Materials commonly known to contain asbestos are noted where clearly visible in an accessible area, but are not tested, and where the Property is a flat it is assumed that a dutyholder with an asbestos register and management plan is in place. It is also assumed that the Property is not subject to any unusual or onerous restrictions, obligations or covenants; that all planning permissions, building regulations approvals and other consents required for the Property and any works to it have been obtained, which the Surveyor does not verify and which are matters for you or your legal advisers; that drawings, specifications and technical documentation are not inspected unless specifically agreed in writing; that the Property is unaffected by any matter that would be revealed by a local search, replies to standard pre-contract enquiries or any statutory notice, and that neither the Property, its condition, its use nor its intended use is or will be unlawful; and that the Property is offered with vacant possession and is connected to mains services. The Surveyor will not be liable to either Reliance Party where an error is made or something is not reported as a result of any of these assumptions proving incorrect.",
            'If the Property is leasehold, the Report does not confirm the adequacy of the lease, the repairing obligations of the landlord or management company, the level of any reserve fund, the reasonableness of service charges, the existence of any major works proposals, or the adequacy of the building insurance. These matters should be checked by your legal adviser before exchange of contracts.',
        ],
    },
    {
        "no": '11',
        "title": 'Your responsibilities',
        "paragraphs": [
            'Provide safe and adequate access to the Property, and give the Surveyor any information you hold that is relevant to its construction, condition, alterations, history, or any past defects or repairs. If you provide the Report to a prospective buyer, provide it in full and without alteration, summary, selective extract or added commentary that may change its meaning, and make clear that they may rely on it only if they read it in full before exchange of contracts. Where the Report recommends further investigation or specialist advice, either arrange it or make the recommendation clear to any prospective buyer. If the investigation is carried out, disclose its outcome to the prospective buyer. Disclose to any prospective buyer, before exchange and where relevant before completion, any new defects, damage, repairs, further investigations, contractor reports, quotations or other information relevant to the condition of the Property that comes to light after the Report is issued. If you decide not to act on the advice or recommendations in the Report, you do so at your own risk. You are responsible for the accuracy and completeness of the information you give the Surveyor; the Surveyor is not liable for any loss arising from deliberate concealment of a defect or from false or incomplete information you provide.',
        ],
    },
    {
        "no": '12',
        "title": 'Limitation of liability',
        "paragraphs": [
            "The Surveyor is responsible to the Reliance Parties for foreseeable loss and damage caused by the Surveyor's failure to use reasonable skill and care in providing the Service. The Surveyor is not responsible for loss or damage that is not foreseeable. Loss or damage is foreseeable if it is obvious that it will happen, or if, at the time the Contract was made, both you and the Surveyor knew it might happen, for example if you discussed it with the Surveyor during the instruction process.",
            "The Surveyor will not be liable to either Reliance Party where an error is made or something is not reported as a result of the Surveyor's inability to inspect an area of the Property; where the Surveyor relies on incorrect or incomplete information provided by you or on your behalf; where loss arises from reliance on the Report by a person who is not entitled to rely on it under clause 09; or where loss arises from the decision of either Reliance Party not to act on advice or recommendations in the Report.",
            "The Surveyor's maximum liability to the Reliance Parties for negligence or any other breach or fault arising in connection with the Service is limited to the reasonable cost of rectifying a defect which should have been, but was not, reported or was not adequately reported in the Report.",
            "Nothing in these Terms excludes or limits the Surveyor's liability where it would be unlawful to do so. This includes liability for death or personal injury caused by the Surveyor's negligence or that of the Surveyor's employees, agents or subcontractors; liability for fraud or fraudulent misrepresentation; and any other liability that cannot be excluded or limited by law.",
            "The Surveyor's liability for any loss or damage will be reduced proportionately to the extent that it was caused or contributed to by something another person has done or failed to do. Where the Service is provided by an employee or subcontractor, the Surveyor accepts full responsibility for the Report, and no employee or subcontractor will have personal liability to either Reliance Party in respect of it. The RPSA's administrative role is as described in clause 02.",
        ],
    },
    {
        "no": '13',
        "title": 'Declining or reallocating the survey',
        "paragraphs": [
            'The Surveyor may decline to proceed with, or end, the Contract if they are not given safe and adequate access to the Property, or if on attending they determine that they lack sufficient specialist knowledge of the construction method or materials to survey the Property competently. The Surveyor may also give you notice, of at least 5 working days before the agreed inspection date, that they are unable to carry out the Service. Where the allocated Surveyor cannot carry out the survey, the RPSA may, with your agreement, allocate an alternative panel Surveyor. Any consequences for the fee, or any refund, are dealt with in the Order.',
        ],
    },
    {
        "no": '14',
        "title": 'Records, personal data and complaints',
        "paragraphs": [
            "The Surveyor retains the Report and related records for at least 15 years from its date, and longer where insurance or legal obligations require; copies requested in that period may attract a reasonable charge. The Surveyor, the RPSA and Gazeal each process your personal data as explained in their respective privacy policies, the Surveyor's available on request, the RPSA's at rpsa.org.uk (https://www.rpsa.org.uk/gdpr-2018-privacy-notice/), and Gazeal's on its website (https://www.gazeal.co.uk/privacy-policy?hsLang=en). Any complaint about the Service, the Report or the Surveyor's advice should be raised with the Surveyor first, who will handle it under their Complaints Handling Procedure, available on request. If it cannot be resolved, you may refer it to The Property Ombudsman through the redress arrangements applying to the Surveyor under the RPSA panel. A first successful purchaser entitled to rely on the Report should also raise any concern with the Surveyor in the first instance. The RPSA can help with administrative matters, but the redress route for the survey sits with the Surveyor and The Property Ombudsman.)",
        ],
    },
    {
        "no": '15',
        "title": 'General',
        "paragraphs": [
            'Except for the permitted reliance expressly granted to the first successful purchaser, the Contract is between you and the Surveyor, and no other person has any right to enforce its terms under the Contracts (Rights of Third Parties) Act 1999. Each provision operates independently; if any is found to be unlawful, unenforceable or invalid, the remaining provisions continue in full force. The Contract is governed by the law of England and Wales, and any dispute may be brought in the courts of England and Wales; if you live in Scotland or Northern Ireland, you may bring proceedings in your local courts or the English courts. Nothing in these Terms or the Order removes or limits any right you have under applicable consumer protection legislation, including the Consumer Rights Act 2015 and the Consumer Contracts (Information, Cancellation and Additional Charges) Regulations 2013; where any provision conflicts with such legislation, the legislation prevails. These Terms are issued by the RPSA for use with panel instructions, and the Surveyor is responsible for providing the Service in accordance with them.',
        ],
    },
]

PAYMENT_SECTION = {
    "title": 'The fee, when you pay, and cancellation',
    "paragraphs": [
        'Nothing is payable today. The fee is payable to Gazeal on completion of the sale of the Property, or six months from the date you accept these terms, whichever comes first.',
        'The fee remains payable if the sale does not complete, unless a Gazeal Reservation Agreement applies and the sale falls through no fault of the seller, as per the terms set in the Gazeal Reservation Agreement.',
        'All prices include VAT. Gazeal will invoice you at the point the fee becomes payable, using the contact details on your Order. If the Property is sold and completion takes place before the six month date, the fee becomes payable on completion.',
    ],
}


def terms_plain_text() -> str:
    """Flatten the terms into the exact text that is sealed and hashed."""
    out = [
        "HOME INSIGHT SURVEY SERVICE TERMS",
        TERMS_LABEL,
        "",
    ]
    for c in CLAUSES:
        out.append(f"{c['no']} {c['title']}")
        out.extend(c["paragraphs"])
        out.append("")
    out.append(PAYMENT_SECTION["title"].upper())
    out.extend(PAYMENT_SECTION["paragraphs"])
    return "\n".join(out).strip() + "\n"


def terms_sha256(text: str | None = None) -> str:
    return hashlib.sha256((text or terms_plain_text()).encode("utf-8")).hexdigest()
