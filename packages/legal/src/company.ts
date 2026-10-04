/** Canonical company identity for LumenX legal documents. */
export const LUMENX_COMPANY = {
  displayName: "LumenX",
  legalName: "LumenX",
  addressLine:
    "Door / PIN 534201, Bhimavaram, West Godavari District, Andhra Pradesh, India",
  city: "Bhimavaram",
  district: "West Godavari",
  state: "Andhra Pradesh",
  country: "India",
  pincode: "534201",
  governingLaw: "Laws of India",
  exclusiveJurisdiction: "Courts at Bhimavaram / West Godavari, Andhra Pradesh, India",
  contactEmail: "official.lumenx@gmail.com",
  privacyEmail: "official.lumenx@gmail.com",
  grievanceEmail: "official.lumenx@gmail.com",
  supportEmail: "official.lumenx@gmail.com",
  websiteNote: "LumenX education technology platform",
  /**
   * Public privacy policy URLs for Play Console / store listings.
   * Hosted as proper HTML pages on GitHub Pages (raw gist URLs are rejected by Play).
   */
  privacyPolicyUrl: "https://officiallumenx.github.io/lumenx-privacy/",
  privacyPolicyUrls: {
    platform: "https://officiallumenx.github.io/lumenx-privacy/",
    transport: "https://officiallumenx.github.io/lumenx-privacy/transport.html",
    admin: "https://officiallumenx.github.io/lumenx-privacy/admin.html",
    connect: "https://officiallumenx.github.io/lumenx-privacy/connect.html",
  },

  apps: [
    "LumenX Nexus (platform operations)",
    "LumenX Admin (institute administration)",
    "LumenX Connect (parents, teachers, and students)",
    "LumenX Admissions (applications and institute admissions)",
    "LumenX Careers (jobs and hiring)",
    "LumenX Transport (fleet and journey operations)",
  ] as const,
  paymentMode: "offline" as const,
  complianceFocus: "India Digital Personal Data Protection Act, 2023 (DPDP Act) first",
  lastUpdated: "4 September 2026",
} as const;
