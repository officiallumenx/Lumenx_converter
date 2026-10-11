/**
 * Certificates hub information architecture (Admin route /templates).
 */
export const CERT_HUB_VIEWS = [
  "overview",
  "templates",
  "issue",
  "issued",
  "verify",
] as const;

export type CertHubView = (typeof CERT_HUB_VIEWS)[number];

export const CERTIFICATES_VIEW_CONFIG = {
  views: CERT_HUB_VIEWS,
  defaultView: "overview" as const,
  aliases: {
    catalog: "templates",
    history: "issued",
    generate: "issue",
  } satisfies Partial<Record<string, CertHubView>>,
};

export const CERT_HUB_PRIMARY_NAV: {
  view: CertHubView;
  label: string;
  short: string;
  highlight?: boolean;
}[] = [
  { view: "overview", label: "Overview", short: "Home" },
  { view: "templates", label: "Templates", short: "Templates" },
  { view: "issue", label: "Generate & issue", short: "Issue", highlight: true },
  { view: "issued", label: "Issued", short: "Issued" },
  { view: "verify", label: "Verify", short: "Verify" },
];

export const CERT_VIEW_TITLES: Record<CertHubView, string> = {
  overview: "Certificates",
  templates: "Certificate templates",
  issue: "Generate & issue",
  issued: "Issued certificates",
  verify: "Verify a certificate",
};

export const CERT_VIEW_SUBTITLES: Record<CertHubView, string> = {
  overview: "Issue academic certificates, review pending work, and retrieve issued records",
  templates: "Active certificate templates for this institute",
  issue: "Select a student and template, preview, then issue with an official number",
  issued: "Search and manage issued certificate records · download or revoke when permitted",
  verify: "Public verification uses the Connect verify page · does not expose the PDF",
};
