import { describe, expect, it } from "vitest";
import {
  deriveDocumentCategories,
  summarizeDocumentsHub,
} from "./hub-summary";
import type { GeneratedDocument, TemplateRecord } from "@/lib/template-management/types";

function tpl(
  partial: Partial<TemplateRecord> & Pick<TemplateRecord, "id" | "name" | "categoryId" | "status" | "kind">,
): TemplateRecord {
  return {
    source: "custom",
    tags: [],
    favorite: false,
    usageCount: 0,
    version: 1,
    updatedAt: "1 Jan 2026",
    createdAt: "1 Jan 2026",
    description: "",
    blocks: [],
    previewAspect: "a4",
    layoutMode: "blocks",
    ...partial,
  };
}

function doc(
  partial: Partial<GeneratedDocument> &
    Pick<GeneratedDocument, "id" | "workflowState" | "templateName">,
): GeneratedDocument {
  return {
    templateId: "t1",
    kind: "document",
    recipientName: "Ada",
    recipientRef: "A1",
    generatedAt: "2026-01-01T00:00:00Z",
    generatedBy: "User",
    status: "ready",
    workflowHistory: [],
    publishedAt: null,
    portalVisibility: { student: false, parent: false, teacher: false },
    notificationsSent: false,
    notificationCount: 0,
    rejectionReason: null,
    notifications: [],
    documentGroupId: partial.id,
    versionNumber: 1,
    isCurrentVersion: false,
    versionChanges: "",
    versionNote: "",
    ...partial,
  };
}

describe("documents hub-summary", () => {
  it("summarizes KPIs from templates and generated docs", () => {
    const kpis = summarizeDocumentsHub({
      templates: [
        tpl({
          id: "1",
          name: "A",
          categoryId: "official",
          status: "active",
          kind: "document",
        }),
        tpl({
          id: "2",
          name: "B",
          categoryId: "official",
          status: "draft",
          kind: "certificate",
        }),
      ],
      generated: [
        doc({ id: "g1", templateName: "A", workflowState: "published" }),
        doc({ id: "g2", templateName: "A", workflowState: "admin_review" }),
        doc({ id: "g3", templateName: "B", workflowState: "rejected" }),
      ],
    });
    expect(kpis.activeTemplates).toBe(1);
    expect(kpis.draftTemplates).toBe(1);
    expect(kpis.totalGenerated).toBe(3);
    expect(kpis.publishedCount).toBe(1);
    expect(kpis.inReviewCount).toBe(1);
    expect(kpis.rejectedCount).toBe(1);
  });

  it("derives categories from template.categoryId", () => {
    const rows = deriveDocumentCategories([
      tpl({
        id: "1",
        name: "A",
        categoryId: "official",
        status: "active",
        kind: "document",
      }),
      tpl({
        id: "2",
        name: "B",
        categoryId: "official",
        status: "draft",
        kind: "certificate",
      }),
      tpl({
        id: "3",
        name: "C",
        categoryId: "",
        status: "active",
        kind: "report",
      }),
    ]);
    expect(rows).toHaveLength(2);
    const official = rows.find((r) => r.category === "official");
    expect(official?.templateCount).toBe(2);
    expect(official?.activeCount).toBe(1);
    expect(official?.types).toEqual(["certificate", "document"]);
    expect(rows.some((r) => r.category === "Uncategorized")).toBe(true);
  });
});
