import { LUMENX_COMPANY } from "./company";
import type { LegalDocument, LegalSection } from "./types";

const C = LUMENX_COMPANY;

function basePrivacySections(): LegalSection[] {
  return [
    {
      title: "1. Who we are (Data Fiduciary)",
      paragraphs: [
        `For the LumenX platform and applications listed below, ${C.legalName} acts as a Data Fiduciary (and, where an institute determines the purpose and means of processing student/staff data, LumenX may also act as a Data Processor / service provider on the institute’s instructions).`,
        `Contact for privacy and grievance redressal: ${C.privacyEmail}. Address: ${C.addressLine}.`,
        `Apps covered: ${C.apps.join("; ")}.`,
        `This Policy is designed with ${C.complianceFocus}. Where other laws apply to specific users, we will honour mandatory rights under those laws to the extent required.`,
      ],
    },
    {
      title: "2. Personal data we collect",
      paragraphs: [
        "Account and identity data: name, email address, mobile number, password or authentication secrets (stored using industry-standard hashing/security controls), role, and institute or organisation affiliation.",
        "Profile and service data: academic records inputs, attendance, fees visibility data, homework/diary content, applications, résumés, job posts, documents you upload, transport assignments, and similar education-operations data.",
        "Device and usage data: app/pages used, feature actions, approximate timestamps, device/browser type, IP address (where logged for security), and crash/diagnostic events.",
        "Communications: support messages, in-app notifications, and OTP / verification records.",
        "Payment and billing records for institutes: plan selections, offline payment confirmations, invoices, and related audit metadata. We do not intend to store full card PAN or UPI credentials in Admin for offline settlement flows.",
      ],
    },
    {
      title: "3. Purpose of processing",
      paragraphs: [
        "To create and manage accounts, authenticate users (including OTP where enabled), and provide requested features.",
        "To operate institute workflows: academics, attendance, fees visibility, documents, admissions, careers hiring, transport operations, alerts, and notifications.",
        "To process offline subscription billing, invoicing, and licence entitlements for institutes.",
        "To secure the Services, prevent fraud/abuse, debug incidents, and enforce our Terms.",
        "To comply with applicable law, respond to lawful requests, and handle grievances.",
        "To improve product reliability and user experience using aggregated or de-identified insights where feasible.",
      ],
    },
    {
      title: "4. Legal basis / consent (India DPDP focus)",
      paragraphs: [
        "We process personal data for lawful purposes connected with providing the Services, fulfilling institute contracts, complying with law, and employment/education administration as instructed by institutes.",
        "Where consent is required under the DPDP Act or other applicable law, we will seek it in a clear manner (for example at signup or before a non-essential processing activity). You may withdraw consent for consent-based processing, subject to legal or contractual limits and the need to keep certain records.",
        "Institutes remain responsible for providing necessary notices to students, parents, and staff for school-managed data and for ensuring they have a lawful basis to upload such data into LumenX.",
      ],
    },
    {
      title: "5. How we share information",
      paragraphs: [
        "Within your institute: authorised roles (admins, teachers, coordinators, drivers, etc.) may access data according to permissions configured by the institute.",
        "Across portal workflows: recruiters receive applicant data for jobs you apply to; institutes receive admissions data you submit; parents may receive transport/academic notifications for linked children where enabled.",
        "Service providers: trusted processors for hosting, databases, email/SMS OTP delivery, and similar infrastructure, under confidentiality and security obligations.",
        "Legal and safety: where required by law, court order, or to protect rights, safety, and integrity of users or LumenX.",
        "We do not sell personal data to third-party advertisers.",
      ],
    },
    {
      title: "6. Cross-border transfers",
      paragraphs: [
        "We aim to host and process primary production data in a manner consistent with Indian regulatory expectations for education platforms.",
        "If any processing occurs outside India through a sub-processor, we will take steps required under applicable Indian law (including DPDP transfer conditions when notified/applicable) and contractual safeguards.",
      ],
    },
    {
      title: "7. Retention",
      paragraphs: [
        "We retain personal data only as long as needed for the purposes above, including the life of an institute subscription, account status, dispute resolution, security logs, and legal record-keeping.",
        "Institutes may request deletion or export of tenant data through supported channels, subject to backup cycles, audit requirements, and law.",
        "OTP and short-lived verification records are retained for limited security windows.",
      ],
    },
    {
      title: "8. Security",
      paragraphs: [
        "We implement reasonable technical and organisational measures such as encrypted transport (HTTPS), access controls, hashed passwords, role-based permissions, and operational monitoring.",
        "No method of transmission or storage is perfectly secure. Please protect your devices and credentials and notify us promptly of suspected unauthorised access.",
      ],
    },
    {
      title: "9. Your rights",
      paragraphs: [
        "Subject to the DPDP Act and other applicable law, you may have rights to access, correction, updating, and erasure of personal data; to withdraw consent where processing is consent-based; and to grievance redressal.",
        `You may update certain profile fields in-product. For other requests, email ${C.privacyEmail} with enough detail to verify your identity and locate the data.`,
        "We may decline or limit requests where law allows (for example legal holds, security, or where data is required to provide an active service).",
        "Institute-controlled student data requests may need to be routed through the institute administrator.",
      ],
    },
    {
      title: "10. Children and students",
      paragraphs: [
        "Student accounts and academic data are typically provisioned or managed by institutes. Parents/guardians use Admissions and parent features on behalf of minors where applicable.",
        "We collect only what is needed for educational and operational Services and expect institutes to minimise unnecessary data about children.",
      ],
    },
    {
      title: "11. Cookies and similar technologies",
      paragraphs: [
        "We use cookies, local storage, and similar technologies as described in our Cookie Policy — primarily for authentication, session continuity, and preferences.",
      ],
    },
    {
      title: "12. Automated decisions",
      paragraphs: [
        "Core academic, admission, and hiring decisions are made by institutes or recruiters. LumenX may use automated rules for security (for example rate limits, fraud signals) and operational alerts. Significant decisions about a student’s academic standing or hiring outcome are not intended to be made solely by LumenX automation without human institute/recruiter involvement.",
      ],
    },
    {
      title: "13. Changes to this Policy",
      paragraphs: [
        `We may update this Privacy Policy from time to time. The “Last updated” date (${C.lastUpdated} or later) shows the latest revision. Continued use after an update constitutes acknowledgement of the revised Policy where permitted by law.`,
      ],
    },
    {
      title: "14. Grievance officer / contact",
      paragraphs: [
        `Privacy requests and grievances: ${C.grievanceEmail}.`,
        `Support: ${C.supportEmail}.`,
        `Postal: ${C.legalName}, ${C.addressLine}.`,
        "We will endeavour to acknowledge and address grievances within timelines expected under applicable Indian law.",
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
    sections: [...appSections, ...basePrivacySections()],
  };
}

export const PLATFORM_PRIVACY: LegalDocument = {
  title: "Privacy Policy — LumenX",
  lastUpdated: C.lastUpdated,
  intro: `This Privacy Policy explains how ${C.legalName} collects, uses, shares, and protects personal data across Nexus, Admin, Connect, Admissions, Careers, and Transport.`,
  sections: basePrivacySections(),
};

export const ADMIN_PRIVACY = withAppPreface(
  "Privacy Policy — LumenX Admin",
  "This Privacy Policy describes personal data practices for institute administrators and staff using LumenX Admin.",
  [
    {
      title: "Admin-specific privacy",
      paragraphs: [
        "Admin processes extensive institute operational data (students, parents, teachers, fees, documents, roles). Access should be limited to authorised personnel.",
        "Billing and offline payment records may include administrator identity and acceptance timestamps for audit purposes.",
      ],
    },
  ],
);

export const NEXUS_PRIVACY = withAppPreface(
  "Privacy Policy — LumenX Nexus",
  "This Privacy Policy describes personal data practices for platform operators using LumenX Nexus.",
  [
    {
      title: "Nexus-specific privacy",
      paragraphs: [
        "Nexus may display institute directory, registration, licensing, support, and audit information necessary for platform operations.",
        "Operators must access personal and institute data only for legitimate operational, support, and compliance purposes.",
      ],
    },
  ],
);

export const CONNECT_PRIVACY = withAppPreface(
  "Privacy Policy — LumenX Connect",
  "This Privacy Policy describes personal data practices for parents, teachers, and students using LumenX Connect.",
  [
    {
      title: "Connect-specific privacy",
      paragraphs: [
        "Depending on your role, Connect may show attendance, fees summaries, homework, announcements, messages, and transport-related updates for linked students.",
        "Teachers and staff should avoid posting unnecessary sensitive personal data in open announcements or group channels.",
      ],
    },
  ],
);

export const ADMISSIONS_PRIVACY = withAppPreface(
  "Privacy Policy — LumenX Admissions",
  "This Privacy Policy describes personal data practices for applicants, parents, and institute admissions teams using LumenX Admissions.",
  [
    {
      title: "Admissions-specific privacy",
      paragraphs: [
        "Applications may include identity details, academic history, contact data, and supporting documents shared with the institutes you apply to.",
        "Institutes receive applicant data to evaluate admissions. LumenX hosts and routes that data as part of the Service.",
      ],
    },
  ],
);

export const CAREERS_PRIVACY = withAppPreface(
  "Privacy Policy — LumenX Careers",
  "This Privacy Policy describes personal data practices for job seekers and recruiters using LumenX Careers.",
  [
    {
      title: "Careers-specific privacy",
      paragraphs: [
        "Job seeker profiles may include résumé details, skills, experience, and application history visible to recruiters for roles you apply to.",
        "Recruiters must use candidate data only for hiring related to posted roles and in line with applicable employment law.",
      ],
    },
  ],
);

export const TRANSPORT_PRIVACY = withAppPreface(
  "Privacy Policy — LumenX Transport",
  "This Privacy Policy describes personal data practices for transport staff and related institute users of LumenX Transport.",
  [
    {
      title: "Transport-specific privacy",
      paragraphs: [
        "Transport may process driver accounts, vehicle/route assignments, trip events, boarding records, and location pings used for live tracking and approach notifications.",
        "Location data is processed for school transport operations and authorised guardian notifications, not for unrelated advertising.",
      ],
    },
  ],
);
