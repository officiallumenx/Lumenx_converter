import type {
  TemplateKind,
  TemplateRecord,
  TemplateSource,
  TemplateStatus,
} from "./types";
import { categoryLabel } from "./categories";

export type TemplateLibraryKindFilter = TemplateKind | "all";
export type TemplateLibrarySourceFilter = TemplateSource | "all";
export type TemplateLibraryStatusFilter = TemplateStatus | "all";
export type TemplateLibrarySortKey = "popular" | "newest" | "az" | "favorites";

export type TemplateLibraryKpis = {
  total: number;
  certificates: number;
  reports: number;
  documents: number;
  id_cards: number;
  system: number;
  imported: number;
  custom: number;
  favorites: number;
  active: number;
  draft: number;
  archived: number;
};

export function computeTemplateLibraryKpis(
  templates: TemplateRecord[],
): TemplateLibraryKpis {
  const visible = templates.filter((t) => t.status !== "archived");
  return {
    total: visible.length,
    certificates: visible.filter((t) => t.kind === "certificate").length,
    reports: visible.filter((t) => t.kind === "report").length,
    documents: visible.filter((t) => t.kind === "document").length,
    id_cards: visible.filter((t) => t.kind === "id_card").length,
    system: visible.filter((t) => t.source === "system").length,
    imported: visible.filter((t) => t.source === "imported").length,
    custom: visible.filter((t) => t.source === "custom").length,
    favorites: visible.filter((t) => t.favorite).length,
    active: templates.filter((t) => t.status === "active").length,
    draft: templates.filter((t) => t.status === "draft").length,
    archived: templates.filter((t) => t.status === "archived").length,
  };
}

export function filterAndSortTemplates(
  templates: TemplateRecord[],
  filters: {
    status: TemplateLibraryStatusFilter;
    kind: TemplateLibraryKindFilter;
    routeKind?: TemplateKind;
    source: TemplateLibrarySourceFilter;
    q: string;
    sort: TemplateLibrarySortKey;
  },
): TemplateRecord[] {
  let list = templates;

  if (filters.status === "all") {
    list = list.filter((t) => t.status !== "archived");
  } else {
    list = list.filter((t) => t.status === filters.status);
  }

  if (filters.routeKind) list = list.filter((t) => t.kind === filters.routeKind);
  else if (filters.kind !== "all") list = list.filter((t) => t.kind === filters.kind);

  if (filters.source !== "all") list = list.filter((t) => t.source === filters.source);

  if (filters.q.trim()) {
    const lq = filters.q.toLowerCase();
    list = list.filter(
      (t) =>
        t.name.toLowerCase().includes(lq) ||
        t.description.toLowerCase().includes(lq) ||
        t.tags.some((tag) => tag.toLowerCase().includes(lq)) ||
        categoryLabel(t.categoryId).toLowerCase().includes(lq),
    );
  }

  return [...list].sort((a, b) => {
    if (filters.sort === "popular") return b.usageCount - a.usageCount;
    if (filters.sort === "newest") return b.updatedAt.localeCompare(a.updatedAt);
    if (filters.sort === "az") return a.name.localeCompare(b.name);
    if (filters.sort === "favorites") return (b.favorite ? 1 : 0) - (a.favorite ? 1 : 0);
    return 0;
  });
}

export function groupTemplatesByKind(
  list: TemplateRecord[],
  kindOrder: TemplateKind[] = ["certificate", "report", "document", "id_card"],
): Record<TemplateKind, TemplateRecord[]> {
  const out = Object.fromEntries(kindOrder.map((k) => [k, [] as TemplateRecord[]])) as Record<
    TemplateKind,
    TemplateRecord[]
  >;
  for (const t of list) {
    if (!out[t.kind]) out[t.kind] = [];
    out[t.kind].push(t);
  }
  return out;
}
