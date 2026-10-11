/**
 * Documents hub information architecture.
 * Legacy view query params are aliased so old bookmarks keep working.
 */

/**
 * Template kinds creatable/generatable from the Documents hub UI.
 * Award certificates and ID cards belong to the Certificates hub / Connect.
 * Transfer Certificates use `document` (Official docs).
 */
export const DOCUMENTS_HUB_TEMPLATE_TYPES = ["document", "report"] as const;

export type DocumentsHubTemplateType =
  (typeof DOCUMENTS_HUB_TEMPLATE_TYPES)[number];

export function isDocumentsHubTemplateType(
  type: string,
): type is DocumentsHubTemplateType {
  return (DOCUMENTS_HUB_TEMPLATE_TYPES as readonly string[]).includes(type);
}

/** Filter TemplateRecord-like rows to Documents-hub kinds. */
export function filterDocumentsHubTemplates<
  T extends { kind: string; status?: string },
>(templates: T[], options?: { activeOnly?: boolean }): T[] {
  return templates.filter((t) => {
    if (options?.activeOnly && t.status != null && t.status !== "active") {
      return false;
    }
    return isDocumentsHubTemplateType(t.kind);
  });
}

export const DOC_HUB_VIEWS = [
  "overview",
  "official",
  "student-docs",
  "templates",
  "archive",
  // Legacy / demo-only surfaces (not in primary nav for API mode)
  "requests",
  "packages",
  "signatures",
  "categories",
  "settings",
] as const;

export type DocHubView = (typeof DOC_HUB_VIEWS)[number];

export const DOCUMENTS_VIEW_CONFIG = {
  views: DOC_HUB_VIEWS,
  defaultView: "overview" as const,
  aliases: {
    dashboard: "overview",
    generate: "official",
    published: "official",
    generated: "archive",
  } satisfies Partial<Record<string, DocHubView>>,
};

export const DOC_HUB_PRIMARY_NAV: {
  view: DocHubView;
  label: string;
  short: string;
  highlight?: boolean;
}[] = [
  { view: "overview", label: "Overview", short: "Home" },
  { view: "official", label: "Official docs", short: "Official", highlight: true },
  { view: "student-docs", label: "Student docs", short: "Students" },
  { view: "templates", label: "Templates", short: "Templates" },
  { view: "archive", label: "Archive", short: "Archive" },
];

/** Demo-only extras kept for localStore mode; hidden from API primary nav. */
export const DOC_HUB_DEMO_EXTRA_NAV: {
  view: DocHubView;
  label: string;
  short: string;
}[] = [
  { view: "requests", label: "Requests (demo)", short: "Requests" },
  { view: "packages", label: "Packages (demo)", short: "Packages" },
  { view: "signatures", label: "Signatures (demo)", short: "Sigs" },
  { view: "categories", label: "Categories", short: "Cats" },
  { view: "settings", label: "Settings (demo)", short: "Settings" },
];

export const DOC_VIEW_TITLES: Record<DocHubView, string> = {
  overview: "Documents",
  official: "Official school documents",
  "student-docs": "Student documents",
  templates: "Document templates",
  archive: "Document archive",
  requests: "Document requests",
  packages: "Document packages",
  signatures: "Signatures",
  categories: "Categories",
  settings: "Studio settings",
};

export const DOC_VIEW_SUBTITLES: Record<DocHubView, string> = {
  overview: "Issue, track, and retrieve official school documents",
  official:
    "Transfer certificates, bonafides, study certificates, and other school documents",
  "student-docs": "Student-linked documents · review, download, and track status",
  templates: "Layouts used for official school documents (not award certificates)",
  archive: "Search previously generated and published documents",
  requests: "Request intake is demo-only until a real workflow is enabled",
  packages: "Document packages are demo-only",
  signatures: "Signature capture is demo-only",
  categories: "Categories derived from templates",
  settings: "Studio settings are demo-only",
};
