/**
 * Authoritative LumenX legal content for the marketing website.
 * Sourced from monorepo packages/legal (PLATFORM_PRIVACY, PLATFORM_TERMS, COOKIE_POLICY, LUMENX_COMPANY).
 * Last updated date and company fields match packages/legal/src/company.ts.
 *
 * Website-specific adaptations (called out in document intros / cookie §2):
 * - Correspondence address wording (no claim of incorporation / registered company).
 * - Marketing Astro site cookie/font behaviour verified against this codebase.
 */

export const LEGAL_COMPANY = {
  displayName: "LumenX",
  legalName: "LumenX",
  addressLine:
    "Door / PIN 534201, Bhimavaram, West Godavari District, Andhra Pradesh, India",
  governingLaw: "Laws of India",
  exclusiveJurisdiction: "Courts at Bhimavaram / West Godavari, Andhra Pradesh, India",
  contactEmail: "lumenxtech.official@gmail.com",
  privacyEmail: "lumenxtech.official@gmail.com",
  grievanceEmail: "lumenxtech.official@gmail.com",
  supportEmail: "lumenxtech.official@gmail.com",
  complianceFocus: "India Digital Personal Data Protection Act, 2023 (DPDP Act) first",
  lastUpdated: "4 September 2026",
  apps: [
    "LumenX Nexus (platform operations)",
    "LumenX Admin (institute administration)",
    "LumenX Connect (parents, teachers, and students)",
    "LumenX Admissions (applications and institute admissions)",
    "LumenX Careers (jobs and hiring)",
    "LumenX Transport (fleet and journey operations)",
  ],
};

const C = LEGAL_COMPANY;

export const COOKIE_POLICY = {
  title: "Cookie Policy — LumenX",
  lastUpdated: C.lastUpdated,
  intro: `This Cookie Policy explains how ${C.legalName} uses cookies, local storage, session storage, and similar technologies across LumenX Nexus, Admin, Connect, Admissions, Careers, Transport, and related websites (including this marketing site).`,
  sections: [
    {
      title: "1. What are cookies and similar technologies?",
      paragraphs: [
        "Cookies are small text files stored on your device by a website or app webview. We also use browser local storage / session storage and similar technologies to keep you signed in, remember preferences, and secure the Services.",
        "In this Policy, “cookies” includes those similar technologies where the context allows.",
      ],
    },
    {
      title: "2. Who sets cookies?",
      paragraphs: [
        `${C.legalName} sets first-party cookies and storage required to operate the Services.`,
        "If we use trusted infrastructure providers (for example authentication or hosting tooling), they may set technical cookies strictly necessary for security or delivery of the Service.",
        "Website-specific note (this Astro marketing site, verified in source): fonts are self-hosted via @fontsource packages (not loaded from fonts.googleapis.com). Theme preference may be stored in localStorage. As of the staging-preparation inspection, this marketing site does not load analytics, advertising, or tracking scripts and does not set analytics or advertising cookies.",
      ],
    },
    {
      title: "3. Types of cookies we use",
      paragraphs: [
        "Strictly necessary: authentication tokens, session continuity, CSRF/security markers, load balancing, and consent/preference records needed for the Service to function. These cannot be switched off in-product without breaking sign-in.",
        "Functional / preference: theme (light/dark), language or UI preferences, and last-used institute or role context where applicable.",
        "Performance / diagnostics (when enabled): limited analytics or error diagnostics to understand reliability. We do not use advertising cookies to sell personal data.",
        "Demo mode may store sample operational data in local browser storage on your device only for preview purposes.",
      ],
    },
    {
      title: "4. Why we use them",
      paragraphs: [
        "To keep you signed in securely and route you to the correct institute and role.",
        "To remember settings and reduce repeated setup.",
        "To protect accounts (for example detecting suspicious sessions) and improve product stability.",
      ],
    },
    {
      title: "5. Duration",
      paragraphs: [
        "Session cookies/storage typically expire when you sign out or close the session.",
        "Persistent items (such as “remember this device” or theme preference) remain until they expire, you clear site data, or you sign out where applicable.",
      ],
    },
    {
      title: "6. Your choices",
      paragraphs: [
        "You can clear cookies and site storage through your browser or device settings. Doing so may sign you out and reset preferences.",
        "Most browsers allow blocking third-party cookies; blocking all cookies may prevent login.",
        "Where we introduce non-essential analytics cookies, we will provide an in-product control or notice as required by applicable law.",
      ],
    },
    {
      title: "7. Personal data and cookies",
      paragraphs: [
        "Cookie identifiers and storage contents may constitute personal data when combined with account information. Such processing is covered by our Privacy Policy and prioritises compliance with India’s DPDP Act.",
      ],
    },
    {
      title: "8. Updates",
      paragraphs: [
        `We may update this Cookie Policy from time to time. The “Last updated” date (${C.lastUpdated} or later) reflects the latest version.`,
      ],
    },
    {
      title: "9. Contact",
      paragraphs: [
        `Questions about cookies or privacy: ${C.privacyEmail}.`,
        `Address: ${C.legalName}, ${C.addressLine}.`,
      ],
    },
  ],
};

export const PLATFORM_PRIVACY = {
  title: "Privacy Policy — LumenX",
  lastUpdated: C.lastUpdated,
  intro: `This Privacy Policy explains how ${C.legalName} collects, uses, shares, and protects personal data across Nexus, Admin, Connect, Admissions, Careers, and Transport. This marketing website also collects information you submit through contact and enquiry forms.`,
  websiteNote:
    "Website limitation: submitting a form on this marketing site creates a support/sales enquiry record. It does not by itself create product accounts or delete institute logins. See /data-request for access, correction, and erasure requests.",
  sections: [
    {
      title: "1. Who we are (Data Fiduciary)",
      paragraphs: [
        `For the LumenX platform and applications listed below, ${C.legalName} acts as a Data Fiduciary (and, where an institute determines the purpose and means of processing student/staff data, LumenX may also act as a Data Processor / service provider on the institute’s instructions).`,
        `Contact for privacy and grievance redressal: ${C.privacyEmail}. Correspondence address: ${C.addressLine}.`,
        `Apps covered: ${C.apps.join("; ")}.`,
        `This Policy is designed with ${C.complianceFocus}. Where other laws apply to specific users, we will honour mandatory rights under those laws to the extent required.`,
        `${C.legalName} is identified here by its trading/display name. This website does not assert company incorporation or registration details beyond the correspondence address above.`,
      ],
    },
    {
      title: "2. Personal data we collect",
      paragraphs: [
        "Account and identity data: name, email address, mobile number, password or authentication secrets (stored using industry-standard hashing/security controls), role, and institute or organisation affiliation.",
        "Profile and service data: academic records inputs, attendance, fees visibility data, homework/diary content, applications, résumés, job posts, documents you upload, transport assignments, and similar education-operations data.",
        "Device and usage data: app/pages used, feature actions, approximate timestamps, device/browser type, IP address (where logged for security), and crash/diagnostic events.",
        "Communications: support messages, in-app notifications, and OTP / verification records.",
        "Marketing website enquiries: name, email, phone/mobile, institute details, and message content you submit via contact, demo, or data-request forms.",
        "Payment and billing records for institutes: plan selections, offline payment confirmations, invoices, and related audit metadata. We do not intend to store full card PAN or UPI credentials in Admin for offline settlement flows.",
      ],
    },
    {
      title: "3. Purpose of processing",
      paragraphs: [
        "To create and manage accounts, authenticate users (including OTP where enabled), and provide requested features.",
        "To operate institute workflows: academics, attendance, fees visibility, documents, admissions, careers hiring, transport operations, alerts, and notifications.",
        "To process offline subscription billing, invoicing, and licence entitlements for institutes.",
        "To respond to marketing-site demos, trials, quotes, partnerships, and privacy requests.",
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
        `You may update certain profile fields in-product. For other requests, email ${C.privacyEmail} with enough detail to verify your identity and locate the data, or use the Data Request page on this website.`,
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
  ],
};

export const PLATFORM_TERMS = {
  title: "Terms & Conditions — LumenX",
  lastUpdated: C.lastUpdated,
  intro: `These Terms govern your use of the LumenX platform operated by ${C.legalName}, including Nexus, Admin, Connect, Admissions, Careers, and Transport, and use of this marketing website.`,
  websiteNote:
    "Website limitation: browsing this marketing site and submitting enquiry forms does not by itself create a paid subscription or product login. Licensed product use is governed by the institute arrangement issued after onboarding.",
  sections: [
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
        `Our correspondence address is: ${C.addressLine}.`,
        `${C.legalName} is referred to by its trading/display name on this website. These Terms do not assert additional company registration particulars beyond that address.`,
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
        "This marketing website does not provide open self-serve registration for Admin, Connect, Transport, Admissions, Careers, or Nexus.",
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
        "Pricing figures shown on this marketing site (per-student rates, campus minimum, billing durations, annual offer, and trial length) reflect current published LumenX rules and may be updated. Booking a demo or starting a verified trial does not create a paid subscription by itself.",
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
  ],
};
