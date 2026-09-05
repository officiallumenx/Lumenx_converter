import { LUMENX_COMPANY } from "./company";
import type { LegalDocument, LegalSection } from "./types";

const C = LUMENX_COMPANY;

function baseTermsSections(): LegalSection[] {
  return [
    {
      title: "1. Acceptance of these Terms",
      paragraphs: [
        `These Terms & Conditions (“Terms”) form a binding agreement between you and ${C.legalName} (“LumenX”, “we”, “us”, or “our”) governing access to and use of the LumenX platform and all related applications, websites, APIs, and services (collectively, the “Services”).`,
        "By creating an account, signing in, clicking “I agree”, accepting during registration, or otherwise using the Services, you confirm that you have read, understood, and agree to these Terms and our Privacy Policy and Cookie Policy.",
        "If you do not agree, you must not access or use the Services.",
      ],
    },
    {
      title: "2. About LumenX and the Services",
      paragraphs: [
        `${C.legalName} provides education technology software for institutes, administrators, teachers, parents, students, applicants, job seekers, and recruiters.`,
        `The Services currently include: ${C.apps.join("; ")}.`,
        `Our registered / correspondence address is: ${C.addressLine}.`,
        "Demo or preview environments may display sample data for evaluation. Production use by an institute is additionally governed by any written commercial or subscription arrangement with LumenX.",
      ],
    },
    {
      title: "3. Eligibility and account registration",
      paragraphs: [
        "You must provide accurate, complete, and current registration information and keep it updated.",
        "You are responsible for safeguarding login credentials, OTPs, PINs, and devices used to access the Services, and for all activity under your account.",
        "Institute administrators, Nexus operators, recruiters, and similarly privileged roles must be authorised by their organisation. You represent that you have such authority when acting on behalf of an institute or employer.",
        "Parents or legal guardians may create or manage accounts relating to minors for school, admissions, and parent-portal purposes. Users under 18 should use student features only as provisioned by their institute or guardian.",
        "We may refuse registration, suspend access, or terminate accounts that provide false information, violate these Terms, or present security or legal risk.",
      ],
    },
    {
      title: "4. Roles and institute responsibility",
      paragraphs: [
        "Many features are role-based (for example: Nexus operator, institute admin, teacher, parent, student, recruiter, driver).",
        "Institutes remain responsible for their internal policies, staff permissions, academic decisions, admission decisions, fee policies, transport operations, and how they instruct LumenX to process personal data as an educational service provider.",
        "LumenX does not replace the institute’s legal duties as an educational institution or employer.",
      ],
    },
    {
      title: "5. Acceptable use",
      paragraphs: [
        "You agree to use the Services only for lawful, education-related, and authorised purposes.",
        "You must not: upload unlawful, harmful, defamatory, discriminatory, or misleading content; impersonate others; harvest or scrape data without authorisation; attempt to gain unauthorised access to systems or other users’ data; interfere with security or integrity of the Services; reverse engineer the platform except where mandatory law permits; or use the Services to send spam or malware.",
        "Recruiters and institute admins must publish accurate job and program information. Applicants and job seekers must submit truthful profiles and documents.",
        "We may remove content, restrict features, or suspend accounts that breach these rules or applicable law.",
      ],
    },
    {
      title: "6. Content, licences, and intellectual property",
      paragraphs: [
        "LumenX and its licensors own the Services, software, branding, documentation, and related intellectual property.",
        "You retain ownership of content you submit (such as profiles, applications, documents, announcements, and job posts). You grant LumenX a worldwide, non-exclusive, royalty-free licence to host, store, process, transmit, and display that content solely to operate, secure, and improve the Services and to comply with law.",
        "You must not copy, resell, sublicense, or redistribute the Services or LumenX materials except as expressly permitted in writing.",
        "Feedback you provide may be used by LumenX to improve the product without obligation to you.",
      ],
    },
    {
      title: "7. Subscriptions, offline payments, and invoices",
      paragraphs: [
        "Institute access to paid plans may be subject to subscription fees, module entitlements, and billing periods configured in LumenX Admin / Nexus.",
        "At present, LumenX accepts offline payments (for example bank transfer, cheque, UPI collected offline, or other institute-arranged settlement). Online card/UPI gateway checkout may be introduced later and will be disclosed in product settings when enabled.",
        "You agree that offline payment confirmation, invoice generation, and plan activation may require verification by LumenX or an authorised Nexus operator. Failure to pay when due may result in restricted or read-only access after any applicable grace period.",
        "Displayed prices are exclusive of applicable GST unless stated otherwise. Keep tax invoices for your records.",
        "Refunds, if any, are handled under LumenX’s commercial policy and applicable Indian law. Chargebacks or disputed settlements without prior notice may lead to suspension of the institute licence.",
      ],
    },
    {
      title: "8. Privacy, cookies, and data protection",
      paragraphs: [
        "Our Privacy Policy explains how we collect and process personal data, with priority to the Digital Personal Data Protection Act, 2023 (India) and related rules.",
        "Our Cookie Policy explains cookies, local storage, and similar technologies used for authentication and preferences.",
        "By using the Services you acknowledge data handling as described in those policies. Institutes may impose additional policies for students and staff.",
      ],
    },
    {
      title: "9. Third-party services",
      paragraphs: [
        "The Services may integrate hosting, authentication, messaging, analytics, maps, or other infrastructure providers. Their processing is limited to what is needed to deliver the Services.",
        "Links to third-party sites or tools are provided for convenience. LumenX is not responsible for third-party content or practices.",
      ],
    },
    {
      title: "10. Availability, changes, and demos",
      paragraphs: [
        "We aim for reliable availability but do not guarantee uninterrupted or error-free operation. Maintenance, upgrades, or events beyond our reasonable control may affect access.",
        "We may modify features, modules, or interfaces. Material changes to these Terms will be reflected by updating the “Last updated” date and, where appropriate, in-product notice.",
        "Demo mode may use sample or locally stored data and is not a substitute for a production agreement.",
      ],
    },
    {
      title: "11. Disclaimers",
      paragraphs: [
        'THE SERVICES ARE PROVIDED ON AN “AS IS” AND “AS AVAILABLE” BASIS TO THE MAXIMUM EXTENT PERMITTED BY LAW.',
        "LumenX does not guarantee hiring outcomes, admission decisions, academic results, transport arrival times, or the accuracy of information entered by institutes or users.",
        "Nothing in the Services constitutes legal, financial, or medical advice.",
      ],
    },
    {
      title: "12. Limitation of liability",
      paragraphs: [
        "To the fullest extent permitted by applicable law, LumenX and its directors, employees, and agents shall not be liable for any indirect, incidental, special, consequential, exemplary, or punitive damages, or for loss of profits, data, goodwill, or business opportunity, arising from use of or inability to use the Services.",
        "To the extent liability cannot be excluded, LumenX’s aggregate liability arising out of these Terms or the Services shall not exceed the fees paid by the relevant institute to LumenX for the Services in the three (3) months preceding the claim (or INR 5,000 if no fees were paid), except where mandatory law provides otherwise for proven wilful misconduct or fraud.",
      ],
    },
    {
      title: "13. Indemnity",
      paragraphs: [
        "You agree to indemnify and hold harmless LumenX from claims, losses, and expenses (including reasonable legal fees) arising from your misuse of the Services, your content, your breach of these Terms, or your violation of applicable law or third-party rights, except to the extent caused by LumenX’s wilful misconduct.",
      ],
    },
    {
      title: "14. Suspension and termination",
      paragraphs: [
        "You may stop using the Services at any time. Institute administrators may request account or tenant deactivation through supported channels.",
        "We may suspend or terminate access for Terms violations, non-payment, security incidents, legal requirements, or prolonged inactivity.",
        "Provisions that by nature should survive (including intellectual property, disclaimers, liability limits, indemnity, and governing law) will survive termination.",
      ],
    },
    {
      title: "15. Governing law and disputes",
      paragraphs: [
        `These Terms are governed by the ${C.governingLaw}, without regard to conflict-of-law principles.`,
        `Subject to mandatory protections available under Indian law, courts at ${C.exclusiveJurisdiction} shall have exclusive jurisdiction over disputes arising from these Terms or the Services.`,
        "Before filing a formal dispute, parties should attempt to resolve the matter in good faith by contacting us at the email below.",
      ],
    },
    {
      title: "16. Grievance and contact",
      paragraphs: [
        `For Terms questions, support, privacy, or grievance redressal related to the Services, contact: ${C.contactEmail}.`,
        `Postal correspondence: ${C.legalName}, ${C.addressLine}.`,
        "We will endeavour to acknowledge grievance communications within a reasonable period and address them in accordance with applicable Indian law.",
      ],
    },
    {
      title: "17. General",
      paragraphs: [
        "If any provision of these Terms is held unenforceable, the remaining provisions continue in effect.",
        "Failure to enforce a provision is not a waiver. You may not assign these Terms without our prior written consent; we may assign them in connection with a merger, acquisition, or corporate reorganisation.",
        "These Terms, together with the Privacy Policy, Cookie Policy, and any written institute agreement, constitute the entire agreement regarding the Services and supersede prior informal understandings on the same subject.",
      ],
    },
  ];
}

function withAppPreface(
  title: string,
  intro: string,
  appSections: LegalSection[],
): LegalDocument {
  return {
    title,
    lastUpdated: C.lastUpdated,
    intro,
    sections: [...appSections, ...baseTermsSections()],
  };
}

export const PLATFORM_TERMS: LegalDocument = {
  title: "Terms & Conditions — LumenX",
  lastUpdated: C.lastUpdated,
  intro: `These Terms govern your use of the LumenX platform operated by ${C.legalName}, including Nexus, Admin, Connect, Admissions, Careers, and Transport.`,
  sections: baseTermsSections(),
};

export const ADMIN_TERMS = withAppPreface(
  "Terms & Conditions — LumenX Admin",
  "These Terms govern institute administrators using LumenX Admin for academic operations, billing acceptance, roles, and related workflows.",
  [
    {
      title: "Admin-specific terms",
      paragraphs: [
        "Admin access is granted to authorised institute staff. You must configure roles and permissions carefully and only grant access to people who need it.",
        "Offline subscription payments, invoices, and plan changes require an authorised administrator. You confirm you are empowered to bind your institute when accepting billing terms.",
        "Operational data you enter (students, staff, fees, attendance, documents) must be accurate and collected lawfully by your institute.",
      ],
    },
  ],
);

export const NEXUS_TERMS = withAppPreface(
  "Terms & Conditions — LumenX Nexus",
  "These Terms govern platform operators using LumenX Nexus for institute directory, licensing, support, registrations, and platform oversight.",
  [
    {
      title: "Nexus-specific terms",
      paragraphs: [
        "Nexus is a privileged operations console. Access is restricted to authorised LumenX or platform personnel.",
        "Operators must use institute and registration data only for legitimate platform administration, support, compliance, and licensing purposes.",
        "Misuse of operator privileges, including unauthorised disclosure of institute data, is strictly prohibited.",
      ],
    },
  ],
);

export const CONNECT_TERMS = withAppPreface(
  "Terms & Conditions — LumenX Connect",
  "These Terms govern parents, teachers, and students using LumenX Connect for school community features such as attendance, fees visibility, homework, messaging, and related services.",
  [
    {
      title: "Connect-specific terms",
      paragraphs: [
        "Access is provided through your school or institute. Role-based features are assigned by the institution.",
        "Use Connect only for legitimate school-related purposes and respect the privacy of students, staff, and families.",
        "Complaints and sensitive communications are handled according to your school’s policies in addition to these Terms.",
      ],
    },
  ],
);

export const ADMISSIONS_TERMS = withAppPreface(
  "Terms & Conditions — LumenX Admissions",
  "These Terms govern applicants, parents, and institute admissions staff using LumenX Admissions for programs, applications, inquiries, and related workflows.",
  [
    {
      title: "Admissions-specific terms",
      paragraphs: [
        "Application information and supporting documents must be true and complete. False or misleading applications may be rejected by the institute and may lead to account restrictions.",
        "Institutes make independent admission decisions. LumenX does not guarantee seats, scholarships, or outcomes.",
        "Upload only documents relevant to the admission process and do not share third-party personal data without lawful basis or consent where required.",
      ],
    },
  ],
);

export const CAREERS_TERMS = withAppPreface(
  "Terms & Conditions — LumenX Careers",
  "These Terms govern job seekers and recruiters using LumenX Careers for listings, applications, interviews, and hiring workflows.",
  [
    {
      title: "Careers-specific terms",
      paragraphs: [
        "Job seekers may browse roles, apply, and manage profiles. Recruiters may post roles and review applicants for authorised organisations.",
        "Recruiters represent that they have authority to post jobs and must not publish discriminatory or misleading listings.",
        "Candidate data shared with recruiters may be used only for legitimate hiring purposes related to the roles applied for.",
      ],
    },
  ],
);

export const TRANSPORT_TERMS = withAppPreface(
  "Terms & Conditions — LumenX Transport",
  "These Terms govern drivers, transport staff, and authorised institute users of LumenX Transport for routes, trips, boarding, and live journey features.",
  [
    {
      title: "Transport-specific terms",
      paragraphs: [
        "Transport features support operational awareness (routes, trips, boarding, alerts). They do not replace safe driving practices, traffic law, or institute transport SOPs.",
        "Location and trip data must be used only for authorised school transport operations and parent/guardian notifications where enabled.",
        "Emergency and SOS features should be used only for genuine safety situations.",
      ],
    },
  ],
);
