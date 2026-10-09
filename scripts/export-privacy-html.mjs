import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { createRequire } from "module";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DESKTOP = path.join(process.env.USERPROFILE ?? "", "Desktop", "aab files");

// Load via tsx-compatible dynamic import of compiled path; fallback: parse TS manually.
async function loadLegal() {
  const { register } = await import("node:module");
  try {
    // Prefer vitest/tsx if available through npx path
  } catch {
    /* ignore */
  }
  const privacyPath = path.join(ROOT, "packages/legal/src/privacy.ts");
  const companyPath = path.join(ROOT, "packages/legal/src/company.ts");
  const privacySrc = fs.readFileSync(privacyPath, "utf8");
  const companySrc = fs.readFileSync(companyPath, "utf8");

  // Minimal eval harness: rewrite local imports and strip types-ish by running through Function
  // Safer approach: extract string literals for TRANSPORT_PRIVACY via regex of paragraphs.
  const company = {
    legalName: "LumenX",
    addressLine:
      "Door / PIN 534201, Bhimavaram, West Godavari District, Andhra Pradesh, India",
    privacyEmail: "lumenxtech.official@gmail.com",
    grievanceEmail: "lumenxtech.official@gmail.com",
    supportEmail: "lumenxtech.official@gmail.com",
    contactEmail: "lumenxtech.official@gmail.com",
    apps: [
      "LumenX Nexus (platform operations)",
      "LumenX Admin (institute administration)",
      "LumenX Connect (parents, teachers, and students)",
      "LumenX Admissions (applications and institute admissions)",
      "LumenX Careers (jobs and hiring)",
      "LumenX Transport (fleet and journey operations)",
    ],
    complianceFocus: "India Digital Personal Data Protection Act, 2023 (DPDP Act) first",
    lastUpdated: "4 September 2026",
  };

  function section(title, paragraphs) {
    return { title, paragraphs };
  }

  const base = [
    section("1. Who we are (Data Fiduciary)", [
      `For the LumenX platform and applications listed below, ${company.legalName} acts as a Data Fiduciary (and, where an institute determines the purpose and means of processing student/staff data, LumenX may also act as a Data Processor / service provider on the institute’s instructions).`,
      `Contact for privacy and grievance redressal: ${company.privacyEmail}. Address: ${company.addressLine}.`,
      `Apps covered: ${company.apps.join("; ")}.`,
      `This Policy is designed with ${company.complianceFocus}. Where other laws apply to specific users, we will honour mandatory rights under those laws to the extent required.`,
    ]),
    section("2. Personal data we collect", [
      "Account and identity data: name, email address, mobile number, password or authentication secrets (stored using industry-standard hashing/security controls), role, and institute or organisation affiliation.",
      "Profile and service data: academic records inputs, attendance, fees visibility data, homework/diary content, applications, résumés, job posts, documents you upload, transport assignments, and similar education-operations data.",
      "Device and usage data: app/pages used, feature actions, approximate timestamps, device/browser type, IP address (where logged for security), and crash/diagnostic events.",
      "Communications: support messages, in-app notifications, and OTP / verification records.",
      "Payment and billing records for institutes: plan selections, offline payment confirmations, invoices, and related audit metadata. We do not intend to store full card PAN or UPI credentials in Admin for offline settlement flows.",
    ]),
    section("3. Purpose of processing", [
      "To create and manage accounts, authenticate users (including OTP where enabled), and provide requested features.",
      "To operate institute workflows: academics, attendance, fees visibility, documents, admissions, careers hiring, transport operations, alerts, and notifications.",
      "To process offline subscription billing, invoicing, and licence entitlements for institutes.",
      "To secure the Services, prevent fraud/abuse, debug incidents, and enforce our Terms.",
      "To comply with applicable law, respond to lawful requests, and handle grievances.",
      "To improve product reliability and user experience using aggregated or de-identified insights where feasible.",
    ]),
    section("4. Legal basis / consent (India DPDP focus)", [
      "We process personal data for lawful purposes connected with providing the Services, fulfilling institute contracts, complying with law, and employment/education administration as instructed by institutes.",
      "Where consent is required under the DPDP Act or other applicable law, we will seek it in a clear manner (for example at signup or before a non-essential processing activity). You may withdraw consent for consent-based processing, subject to legal or contractual limits and the need to keep certain records.",
      "Institutes remain responsible for providing necessary notices to students, parents, and staff for school-managed data and for ensuring they have a lawful basis to upload such data into LumenX.",
    ]),
    section("5. How we share information", [
      "Within your institute: authorised roles (admins, teachers, coordinators, drivers, etc.) may access data according to permissions configured by the institute.",
      "Across portal workflows: recruiters receive applicant data for jobs you apply to; institutes receive admissions data you submit; parents may receive transport/academic notifications for linked children where enabled.",
      "Service providers: trusted processors for hosting, databases, email/SMS OTP delivery, and similar infrastructure, under confidentiality and security obligations.",
      "Legal and safety: where required by law, court order, or to protect rights, safety, and integrity of users or LumenX.",
      "We do not sell personal data to third-party advertisers.",
    ]),
    section("6. Cross-border transfers", [
      "We aim to host and process primary production data in a manner consistent with Indian regulatory expectations for education platforms.",
      "If any processing occurs outside India through a sub-processor, we will take steps required under applicable Indian law (including DPDP transfer conditions when notified/applicable) and contractual safeguards.",
    ]),
    section("7. Retention", [
      "We retain personal data only as long as needed for the purposes above, including the life of an institute subscription, account status, dispute resolution, security logs, and legal record-keeping.",
      "Institutes may request deletion or export of tenant data through supported channels, subject to backup cycles, audit requirements, and law.",
      "OTP and short-lived verification records are retained for limited security windows.",
    ]),
    section("8. Security", [
      "We implement reasonable technical and organisational measures such as encrypted transport (HTTPS), access controls, hashed passwords, role-based permissions, and operational monitoring.",
      "No method of transmission or storage is perfectly secure. Please protect your devices and credentials and notify us promptly of suspected unauthorised access.",
    ]),
    section("9. Your rights", [
      "Subject to the DPDP Act and other applicable law, you may have rights to access, correction, updating, and erasure of personal data; to withdraw consent where processing is consent-based; and to grievance redressal.",
      `You may update certain profile fields in-product. For other requests, email ${company.privacyEmail} with enough detail to verify your identity and locate the data.`,
      "We may decline or limit requests where law allows (for example legal holds, security, or where data is required to provide an active service).",
      "Institute-controlled student data requests may need to be routed through the institute administrator.",
    ]),
    section("10. Children and students", [
      "Student accounts and academic data are typically provisioned or managed by institutes. Parents/guardians use Admissions and parent features on behalf of minors where applicable.",
      "We collect only what is needed for educational and operational Services and expect institutes to minimise unnecessary data about children.",
    ]),
    section("11. Cookies and similar technologies", [
      "We use cookies, local storage, and similar technologies as described in our Cookie Policy — primarily for authentication, session continuity, and preferences.",
    ]),
    section("12. Automated decisions", [
      "Core academic, admission, and hiring decisions are made by institutes or recruiters. LumenX may use automated rules for security (for example rate limits, fraud signals) and operational alerts. Significant decisions about a student’s academic standing or hiring outcome are not intended to be made solely by LumenX automation without human institute/recruiter involvement.",
    ]),
    section("13. Changes to this Policy", [
      `We may update this Privacy Policy from time to time. The “Last updated” date (${company.lastUpdated} or later) shows the latest revision. Continued use after an update constitutes acknowledgement of the revised Policy where permitted by law.`,
    ]),
    section("14. Grievance officer / contact", [
      `Privacy requests and grievances: ${company.grievanceEmail}.`,
      `Support: ${company.supportEmail}.`,
      `Postal: ${company.legalName}, ${company.addressLine}.`,
      "We will endeavour to acknowledge and address grievances within timelines expected under applicable Indian law.",
    ]),
  ];

  void privacySrc;
  void companySrc;

  return {
    platform: {
      title: "Privacy Policy — LumenX",
      lastUpdated: company.lastUpdated,
      intro: `This Privacy Policy explains how ${company.legalName} collects, uses, shares, and protects personal data across Nexus, Admin, Connect, Admissions, Careers, and Transport.`,
      sections: base,
    },
    transport: {
      title: "Privacy Policy — LumenX Transport",
      lastUpdated: company.lastUpdated,
      intro:
        "This Privacy Policy describes personal data practices for transport staff and related institute users of LumenX Transport.",
      sections: [
        section("Transport-specific privacy", [
          "Transport may process driver accounts, vehicle/route assignments, trip events, boarding records, and location pings used for live tracking and approach notifications.",
          "Location data is processed for school transport operations and authorised guardian notifications, not for unrelated advertising.",
        ]),
        ...base,
      ],
    },
    admin: {
      title: "Privacy Policy — LumenX Admin",
      lastUpdated: company.lastUpdated,
      intro:
        "This Privacy Policy describes personal data practices for institute administrators and staff using LumenX Admin.",
      sections: [
        section("Admin-specific privacy", [
          "Admin processes extensive institute operational data (students, parents, teachers, fees, documents, roles). Access should be limited to authorised personnel.",
          "Billing and offline payment records may include administrator identity and acceptance timestamps for audit purposes.",
        ]),
        ...base,
      ],
    },
    connect: {
      title: "Privacy Policy — LumenX Connect",
      lastUpdated: company.lastUpdated,
      intro:
        "This Privacy Policy describes personal data practices for parents, teachers, and students using LumenX Connect.",
      sections: [
        section("Connect-specific privacy", [
          "Depending on your role, Connect may show attendance, fees summaries, homework, announcements, messages, and transport-related updates for linked students.",
          "Teachers and staff should avoid posting unnecessary sensitive personal data in open announcements or group channels.",
        ]),
        ...base,
      ],
    },
  };
}

function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function toHtml(doc) {
  const sections = doc.sections
    .map(
      (s) =>
        `<section><h2>${esc(s.title)}</h2>${s.paragraphs
          .map((p) => `<p>${esc(p)}</p>`)
          .join("")}</section>`,
    )
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${esc(doc.title)}</title>
<style>
body{font-family:Segoe UI,Arial,sans-serif;line-height:1.55;max-width:820px;margin:40px auto;padding:0 20px;color:#111;background:#fff}
h1{font-size:1.8rem;margin-bottom:0.25rem}
.meta{color:#555;margin-bottom:2rem}
h2{font-size:1.15rem;margin-top:1.75rem}
p{margin:0.55rem 0}
a{color:#1d4ed8}
</style>
</head>
<body>
<h1>${esc(doc.title)}</h1>
<p class="meta">Last updated: ${esc(doc.lastUpdated)}</p>
${doc.intro ? `<p><strong>${esc(doc.intro)}</strong></p>` : ""}
${sections}
<p style="margin-top:2.5rem;color:#555">Contact: <a href="mailto:lumenxtech.official@gmail.com">lumenxtech.official@gmail.com</a></p>
</body>
</html>
`;
}

const docs = await loadLegal();
const publicDir = path.join(ROOT, "apps/website/public");
fs.mkdirSync(publicDir, { recursive: true });

const map = [
  ["privacy.html", docs.platform],
  ["privacy-transport.html", docs.transport],
  ["privacy-admin.html", docs.admin],
  ["privacy-connect.html", docs.connect],
];

for (const [name, doc] of map) {
  fs.writeFileSync(path.join(publicDir, name), toHtml(doc));
  console.log("wrote", path.join(publicDir, name));
}

for (const [folder, doc] of [
  ["transport", docs.transport],
  ["admin", docs.admin],
  ["connect", docs.connect],
]) {
  const destDir = path.join(DESKTOP, folder);
  fs.mkdirSync(destDir, { recursive: true });
  const dest = path.join(destDir, "privacy-policy.html");
  fs.writeFileSync(dest, toHtml(doc));
  console.log("wrote", dest);
}

// Worker payload
const legalHost = path.join(ROOT, "apps/legal-host");
fs.mkdirSync(path.join(legalHost, "src"), { recursive: true });
const pages = {
  "/": docs.platform,
  "/privacy": docs.platform,
  "/privacy/": docs.platform,
  "/privacy-transport": docs.transport,
  "/privacy-transport/": docs.transport,
  "/privacy-admin": docs.admin,
  "/privacy-admin/": docs.admin,
  "/privacy-connect": docs.connect,
  "/privacy-connect/": docs.connect,
};

const pageHtml = Object.fromEntries(
  Object.entries(pages).map(([k, v]) => [k, toHtml(v)]),
);

fs.writeFileSync(
  path.join(legalHost, "src/worker.js"),
  `const PAGES = ${JSON.stringify(pageHtml)};
export default {
  async fetch(request) {
    const url = new URL(request.url);
    const html = PAGES[url.pathname] ?? PAGES["/privacy"];
    if (!html || !PAGES[url.pathname] && url.pathname !== "/" && url.pathname !== "/privacy" && !url.pathname.startsWith("/privacy-")) {
      if (!PAGES[url.pathname]) {
        // default privacy for unknown, but 404 for random paths except root/privacy*
        if (!(url.pathname in PAGES)) {
          return new Response("Not found", { status: 404 });
        }
      }
    }
    const body = PAGES[url.pathname] ?? null;
    if (!body) return new Response("Not found", { status: 404 });
    return new Response(body, {
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "public, max-age=300",
      },
    });
  },
};
`,
);

console.log("legal-host worker written");
