/**
 * Certificates hub information architecture (Admin route /templates).
 * Exactly two primary sections: Templates | Published.
 */
export const CERT_HUB_VIEWS = ["templates", "published"] as const;

export type CertHubView = (typeof CERT_HUB_VIEWS)[number];

export const CERTIFICATES_VIEW_CONFIG = {
  views: CERT_HUB_VIEWS,
  defaultView: "templates" as const,
  aliases: {
    overview: "templates",
    catalog: "templates",
    issue: "templates",
    generate: "templates",
    issued: "published",
    history: "published",
    verify: "published",
  } satisfies Partial<Record<string, CertHubView>>,
};

export const CERT_HUB_PRIMARY_NAV: {
  view: CertHubView;
  label: string;
  short: string;
}[] = [
  { view: "templates", label: "Templates", short: "Templates" },
  { view: "published", label: "Published", short: "Published" },
];

export const CERT_VIEW_TITLES: Record<CertHubView, string> = {
  templates: "Certificate templates",
  published: "Published certificates",
};

export const CERT_VIEW_SUBTITLES: Record<CertHubView, string> = {
  templates:
    "Select a template, choose students, generate, preview, then publish",
  published:
    "Search, review, and manage issued certificates · verify via Connect when needed",
};
