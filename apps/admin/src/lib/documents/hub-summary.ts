/**
 * Derived Documents hub summaries from template + generated lists.
 * No separate backend tables for dashboard/categories.
 */
import type { GeneratedDocument, TemplateRecord } from "@/lib/template-management/types";

export type DocumentsHubKpis = {
  activeTemplates: number;
  draftTemplates: number;
  totalGenerated: number;
  publishedCount: number;
  inReviewCount: number;
  rejectedCount: number;
};

export type DocumentsCategoryRow = {
  category: string;
  templateCount: number;
  activeCount: number;
  types: string[];
};

export function summarizeDocumentsHub(input: {
  templates: TemplateRecord[];
  generated: GeneratedDocument[];
}): DocumentsHubKpis {
  const templates = input.templates;
  const generated = input.generated;
  return {
    activeTemplates: templates.filter((t) => t.status === "active").length,
    draftTemplates: templates.filter((t) => t.status === "draft").length,
    totalGenerated: generated.length,
    publishedCount: generated.filter((d) => d.workflowState === "published")
      .length,
    inReviewCount: generated.filter(
      (d) =>
        d.workflowState === "teacher_review" ||
        d.workflowState === "admin_review",
    ).length,
    rejectedCount: generated.filter((d) => d.workflowState === "rejected")
      .length,
  };
}

export function deriveDocumentCategories(
  templates: TemplateRecord[],
): DocumentsCategoryRow[] {
  const map = new Map<
    string,
    { templateCount: number; activeCount: number; types: Set<string> }
  >();

  for (const t of templates) {
    const key = (t.categoryId ?? "").trim() || "Uncategorized";
    let row = map.get(key);
    if (!row) {
      row = { templateCount: 0, activeCount: 0, types: new Set() };
      map.set(key, row);
    }
    row.templateCount += 1;
    if (t.status === "active") row.activeCount += 1;
    row.types.add(t.kind);
  }

  return [...map.entries()]
    .map(([category, row]) => ({
      category,
      templateCount: row.templateCount,
      activeCount: row.activeCount,
      types: [...row.types].sort(),
    }))
    .sort((a, b) => a.category.localeCompare(b.category));
}
