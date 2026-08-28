import { describe, expect, it } from "vitest";
import {
  documentTemplateDtoToTemplateRecord,
  generatedDocumentDtoToGeneratedDocument,
} from "./map";
import type { DocumentTemplateDto, GeneratedDocumentDto } from "./types";

const INST = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

describe("documents map", () => {
  it("maps template dto to TemplateRecord", () => {
    const dto: DocumentTemplateDto = {
      id: "ee111111-1111-4111-8111-111111111111",
      ownerScope: "institute",
      instituteId: INST,
      type: "certificate",
      name: "Achievement",
      description: "School certificate",
      category: "certificates",
      status: "active",
      source: "system",
      version: 2,
      previewAspect: "a4",
      layoutMode: "visual",
      blocks: [{ id: "b1", type: "text", label: "Body" }],
      visualTheme: "achievement_elegant",
      visualFields: { titleMain: "Certificate" },
      tags: ["annual"],
      createdByUserId: null,
      createdAt: "2026-06-01T10:00:00Z",
      updatedAt: "2026-06-02T10:00:00Z",
    };
    const row = documentTemplateDtoToTemplateRecord(dto);
    expect(row.id).toBe(dto.id);
    expect(row.kind).toBe("certificate");
    expect(row.categoryId).toBe("certificates");
    expect(row.blocks).toHaveLength(1);
    expect(row.visualTheme).toBe("achievement_elegant");
    expect(row.usageCount).toBe(0);
  });

  it("maps generated document dto to GeneratedDocument", () => {
    const dto: GeneratedDocumentDto = {
      id: "ff111111-1111-4111-8111-111111111111",
      instituteId: INST,
      templateId: "ee111111-1111-4111-8111-111111111111",
      type: "document",
      title: "Bonafide — Rahul",
      studentId: "aa111111-1111-4111-8111-111111111111",
      teacherId: null,
      recipientName: "Rahul Sharma",
      recipientRef: "Class 10-A",
      status: "ready",
      workflowState: "published",
      certificateNumber: "DOC-001",
      portalVisibility: { student: true, parent: true, teacher: false },
      rejectionReason: null,
      payload: {},
      assetPath: null,
      generatedByUserId: "bb111111-1111-4111-8111-111111111111",
      publishedAt: "2026-06-03T10:00:00Z",
      createdAt: "2026-06-03T09:00:00Z",
      updatedAt: "2026-06-03T10:00:00Z",
    };
    const row = generatedDocumentDtoToGeneratedDocument(dto);
    expect(row.templateName).toBe("Bonafide — Rahul");
    expect(row.workflowState).toBe("published");
    expect(row.portalVisibility.parent).toBe(true);
    expect(row.workflowHistory.some((h) => h.state === "published")).toBe(true);
  });
});
