import { LUMENX_COMPANY } from "./company";
import type { LegalDocument } from "./types";

const C = LUMENX_COMPANY;

/** Shared Cookie Policy for all LumenX apps. */
export const COOKIE_POLICY: LegalDocument = {
  title: "Cookie Policy — LumenX",
  lastUpdated: C.lastUpdated,
  intro: `This Cookie Policy explains how ${C.legalName} uses cookies, local storage, session storage, and similar technologies across LumenX Nexus, Admin, Connect, Admissions, Careers, Transport, and related websites.`,
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

/** Plain-text rendering for embeds (e.g. Transport dialogs). */
export function legalDocumentToPlainText(doc: LegalDocument): string {
  const parts = [
    doc.title,
    `Last updated: ${doc.lastUpdated}`,
    "",
    doc.intro,
    "",
  ];
  for (const section of doc.sections) {
    parts.push(section.title);
    for (const p of section.paragraphs) parts.push(p);
    parts.push("");
  }
  return parts.join("\n").trim();
}
