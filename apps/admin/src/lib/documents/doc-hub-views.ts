/**
 * Documents hub information architecture.
 * Exactly two primary sections: Templates | Published.
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

export const DOC_HUB_VIEWS = ["templates", "published"] as const;

export type DocHubView = (typeof DOC_HUB_VIEWS)[number];

export const DOCUMENTS_VIEW_CONFIG = {
  views: DOC_HUB_VIEWS,
  defaultView: "templates" as const,
  aliases: {
    overview: "templates",
    dashboard: "templates",
    official: "templates",
    generate: "templates",
    "student-docs": "published",
    archive: "published",
    generated: "published",
    // Demo-only legacy tabs collapse into Templates
    requests: "templates",
    packages: "templates",
    signatures: "templates",
    categories: "templates",
    settings: "templates",
  } satisfies Partial<Record<string, DocHubView>>,
};

export const DOC_HUB_PRIMARY_NAV: {
  view: DocHubView;
  label: string;
  short: string;
}[] = [
  { view: "templates", label: "Templates", short: "Templates" },
  { view: "published", label: "Published", short: "Published" },
];

export const DOC_VIEW_TITLES: Record<DocHubView, string> = {
  templates: "Document templates",
  published: "Published documents",
};

export const DOC_VIEW_SUBTITLES: Record<DocHubView, string> = {
  templates:
    "Select a template, choose students, generate, preview, then publish",
  published:
    "Search, review, edit, and republish previously published documents",
};
