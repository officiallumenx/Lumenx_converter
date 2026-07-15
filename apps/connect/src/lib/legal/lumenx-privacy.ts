import type { LegalDocument } from "./types";

const sharedSections = [
  {
    title: "1. Information we collect",
    paragraphs: [
      "Account data: name, email, mobile number, password (stored securely), role, and organization or institute affiliation.",
      "Profile and application data: employment history, education, documents, preferences, and content you submit through forms.",
      "Usage data: pages visited, actions taken, device/browser type, and timestamps to improve reliability and security.",
      "Communications: support messages, notifications, and OTP verification records.",
    ],
  },
  {
    title: "2. How we use information",
    paragraphs: [
      "To create and manage your account, authenticate you, and provide portal features you request.",
      "To match job seekers with roles, route applications to recruiters, and process admission applications for institutes.",
      "To send service notifications, security alerts, and (where permitted) product updates.",
      "To detect fraud, enforce terms, and comply with legal obligations.",
    ],
  },
  {
    title: "3. Sharing and disclosure",
    paragraphs: [
      "Recruiters receive applicant data for jobs you apply to. Institutes receive admission data you submit to them.",
      "School staff may access student and parent data according to institute permissions and policies.",
      "We use trusted infrastructure providers for hosting and may share data when required by law or to protect rights and safety.",
      "We do not sell personal information to third-party advertisers.",
    ],
  },
  {
    title: "4. Storage and security",
    paragraphs: [
      "Data is stored on secure servers with access controls. Passwords are hashed; sensitive operations may require OTP verification.",
      "Demo environments may store data locally in your browser for preview purposes. Production deployments should follow your organization's data retention policy.",
      "No method of transmission over the internet is 100% secure; we work to protect data but cannot guarantee absolute security.",
    ],
  },
  {
    title: "5. Your rights and choices",
    paragraphs: [
      "You may update profile information in account settings where available.",
      "You may request account deletion or data export by contacting support@lumenx.app or your institute administrator.",
      "You can opt out of non-essential communications in notification settings where provided.",
      "Depending on your jurisdiction, you may have additional rights (access, correction, erasure, portability). Contact us to exercise them.",
    ],
  },
  {
    title: "6. Cookies and local storage",
    paragraphs: [
      "We use browser local storage and session tokens to keep you signed in and remember preferences such as theme.",
      "Essential cookies/storage are required for authentication. Analytics cookies, if used, will be disclosed in product settings.",
    ],
  },
  {
    title: "7. Children and minors",
    paragraphs: [
      "Student accounts may be provisioned by schools. Parents or guardians register for admissions and parent portal access on behalf of minors where applicable.",
      "We collect only information necessary for educational services and process it according to institute policies and applicable law.",
    ],
  },
  {
    title: "8. Changes and contact",
    paragraphs: [
      "We may update this Privacy Policy periodically. The \"Last updated\" date at the top reflects the latest revision.",
      "Questions or privacy requests: support@lumenx.app. For school-specific data practices, also contact your institute's data protection officer or administrator.",
    ],
  },
];

export const CAREERS_PRIVACY: LegalDocument = {
  title: "Privacy Policy — LumenX Careers",
  lastUpdated: "June 20, 2026",
  intro:
    "This Privacy Policy describes how LumenX Careers collects, uses, and protects personal information for job seekers and recruiters.",
  sections: [
    {
      title: "Careers-specific privacy",
      paragraphs: [
        "Job seeker profiles may include résumé details, skills, salary expectations, and application history visible to recruiters for roles you apply to.",
        "Recruiter accounts include organization details and hiring activity. Applicant pipelines are visible only to authorized users within your organization.",
        "Saved jobs, application status, and interview schedules are stored to provide your dashboard and notifications.",
      ],
    },
    ...sharedSections,
  ],
};

export const ADMISSIONS_PRIVACY: LegalDocument = {
  title: "Privacy Policy — LumenX Admissions",
  lastUpdated: "June 20, 2026",
  intro:
    "This Privacy Policy describes how LumenX Admissions handles personal information for parents, applicants, and institute administrators.",
  sections: [
    {
      title: "Admissions-specific privacy",
      paragraphs: [
        "Applications include student details, parent/guardian contact information, academic records, and uploaded documents shared with institutes you apply to.",
        "Institute administrators access applicant data for review, interviews, and admission decisions within their organization.",
        "Inquiry forms and program browsing activity may be stored to improve institute communication and follow-up.",
      ],
    },
    ...sharedSections,
  ],
};

export const CONNECT_PRIVACY: LegalDocument = {
  title: "Privacy Policy — LumenX Connect",
  lastUpdated: "June 20, 2026",
  intro:
    "This Privacy Policy describes how LumenX Connect handles information for parents, teachers, and students in the school community portal.",
  sections: [
    {
      title: "Connect-specific privacy",
      paragraphs: [
        "Student data (attendance, marks, fees, transport, ID cards) is visible to authorized parents, teachers, and students according to school role permissions.",
        "Teacher and parent contact details may be used for school communications and leave or fee notifications.",
        "Complaints submitted through the private channel are routed separately and are not shared with unauthorized roles.",
      ],
    },
    ...sharedSections,
  ],
};
