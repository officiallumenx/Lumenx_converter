import type { LegalDocument } from "./types";

const sharedSections = [
  {
    title: "1. Acceptance of terms",
    paragraphs: [
      "By creating an account, signing in, or using any LumenX portal, you confirm that you have read, understood, and agree to these Terms & Conditions and our Privacy Policy.",
      "If you do not agree, you must not use the service or create an account.",
    ],
  },
  {
    title: "2. About LumenX",
    paragraphs: [
      "LumenX is an education technology platform operated for schools, institutes, job seekers, recruiters, parents, and students. Portals include Connect (school community), Careers (job board), and Admissions (applications).",
      "Demo and preview environments may use sample data. Production deployments are governed by your institute or organization agreement with LumenX.",
    ],
  },
  {
    title: "3. Eligibility and accounts",
    paragraphs: [
      "You must provide accurate registration information and keep your credentials confidential. You are responsible for all activity under your account.",
      "You must be at least 18 years old to register as a recruiter or institute administrator. Parents or guardians may register on behalf of minors for admissions and school-related services.",
      "We may suspend or terminate accounts that violate these terms, provide false information, or misuse the platform.",
    ],
  },
  {
    title: "4. Acceptable use",
    paragraphs: [
      "You agree not to upload unlawful, abusive, discriminatory, or misleading content; impersonate others; scrape or reverse-engineer the service; or attempt unauthorized access to data or systems.",
      "Recruiters and institute admins must post accurate job and program information. Job seekers and applicants must submit truthful profiles and applications.",
      "We may remove content or restrict features that breach these rules or applicable law.",
    ],
  },
  {
    title: "5. Content and intellectual property",
    paragraphs: [
      "LumenX retains ownership of the platform, branding, and software. You retain ownership of content you submit (profiles, applications, job posts) but grant LumenX a limited license to host, display, and process it to operate the service.",
      "You must not copy, resell, or redistribute platform materials except as permitted in writing.",
    ],
  },
  {
    title: "6. Privacy and data",
    paragraphs: [
      "Our Privacy Policy explains what personal data we collect, how we use it, and your choices. By using LumenX you consent to data handling as described there.",
      "Schools and institutes may have additional policies governing student and parent data beyond what LumenX publishes centrally.",
    ],
  },
  {
    title: "7. Disclaimers and liability",
    paragraphs: [
      "The service is provided on an \"as is\" basis. We do not guarantee uninterrupted access, hiring outcomes, admission decisions, or accuracy of third-party listings.",
      "To the fullest extent permitted by law, LumenX is not liable for indirect, incidental, or consequential damages arising from use of the platform.",
    ],
  },
  {
    title: "8. Changes and contact",
    paragraphs: [
      "We may update these Terms from time to time. Continued use after changes are posted constitutes acceptance of the revised Terms.",
      "For questions about these Terms, contact support@lumenx.app or your institute administrator.",
    ],
  },
];

export const CAREERS_TERMS: LegalDocument = {
  title: "Terms & Conditions — LumenX Admissions",
  lastUpdated: "June 20, 2026",
  intro:
    "These Terms govern your use of the LumenX Admissions portal, including job seeker accounts, recruiter workspaces, job listings, applications, and related features.",
  sections: [
    {
      title: "Careers-specific terms",
      paragraphs: [
        "Job seekers may browse listings, save jobs, apply, and manage profiles. Recruiters may post roles, review applicants, and manage hiring pipelines for their organization.",
        "Recruiters represent that they have authority to post jobs on behalf of their organization. Misleading job posts, discriminatory hiring practices, or collection of unnecessary personal data through listings is prohibited.",
        "Applications and candidate data shared with recruiters are provided for legitimate hiring purposes only.",
      ],
    },
    ...sharedSections,
  ],
};

export const ADMISSIONS_TERMS: LegalDocument = {
  title: "Terms & Conditions — LumenX Admissions",
  lastUpdated: "June 20, 2026",
  intro:
    "These Terms govern your use of the LumenX Admissions portal, including parent/applicant accounts, institute administration, applications, inquiries, and related features.",
  sections: [
    {
      title: "Admissions-specific terms",
      paragraphs: [
        "Parents and applicants may browse institutes, submit applications, upload documents, and track admission status. Institute administrators may manage programs, review applications, and configure admission workflows.",
        "Application information must be accurate. Institutes make independent admission decisions; LumenX does not guarantee placement or acceptance.",
        "Document uploads must relate to the admission process and must not contain unlawful or unrelated personal data about third parties without consent.",
      ],
    },
    ...sharedSections,
  ],
};

export const CONNECT_TERMS: LegalDocument = {
  title: "Terms & Conditions — LumenX Connect",
  lastUpdated: "June 20, 2026",
  intro:
    "These Terms govern your use of LumenX Connect for parents, teachers, and students, including attendance, fees, assignments, messaging, and school community features.",
  sections: [
    {
      title: "Connect-specific terms",
      paragraphs: [
        "Access is provided through your school or institute. Role-based features (parent, teacher, student) are assigned by the institution.",
        "You must use Connect only for legitimate school-related purposes and respect the privacy of students, staff, and other community members.",
        "Complaints and sensitive communications routed through Connect are handled according to your school's policies.",
      ],
    },
    ...sharedSections,
  ],
};
