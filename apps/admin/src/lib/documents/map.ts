import type {
  GeneratedDocument,
  TemplateBlock,
  TemplateRecord,
  VisualThemeId,
  WorkflowEvent,
} from "@/lib/template-management/types";
import type { DocumentTemplateDto, GeneratedDocumentDto } from "./types";

function shortRef(id: string, prefix: string): string {
  const token = id?.trim().slice(0, 8) || "—";
  return `${prefix} · ${token}`;
}

function formatDisplayDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso.slice(0, 10);
  }
}

function parseTags(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function parseBlocks(value: unknown): TemplateBlock[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is TemplateBlock =>
      !!item &&
      typeof item === "object" &&
      typeof (item as TemplateBlock).id === "string" &&
      typeof (item as TemplateBlock).type === "string",
  );
}

function parseVisualTheme(value: string | null): VisualThemeId | undefined {
  if (!value) return undefined;
  return value as VisualThemeId;
}

function buildWorkflowHistory(dto: GeneratedDocumentDto): WorkflowEvent[] {
  const history: WorkflowEvent[] = [
    {
      state: "draft",
      actor: shortRef(dto.generatedByUserId, "User"),
      at: dto.createdAt,
    },
  ];
  if (dto.workflowState === "published" && dto.publishedAt) {
    history.push({
      state: "published",
      actor: "System",
      at: dto.publishedAt,
    });
  }
  if (dto.workflowState === "rejected") {
    history.push({
      state: "rejected",
      actor: "Admin",
      at: dto.updatedAt,
      comment: dto.rejectionReason ?? undefined,
    });
  }
  return history;
}

export function documentTemplateDtoToTemplateRecord(
  dto: DocumentTemplateDto,
): TemplateRecord {
  return {
    id: dto.id,
    name: dto.name,
    kind: dto.type,
    categoryId: dto.category?.trim() || "uncategorized",
    source: dto.source,
    status: dto.status,
    tags: parseTags(dto.tags),
    favorite: false,
    usageCount: 0,
    version: dto.version,
    updatedAt: formatDisplayDate(dto.updatedAt),
    createdAt: formatDisplayDate(dto.createdAt),
    description: dto.description?.trim() || "",
    blocks: parseBlocks(dto.blocks),
    previewAspect: dto.previewAspect,
    layoutMode: dto.layoutMode,
    visualTheme: parseVisualTheme(dto.visualTheme),
    visualFields:
      dto.visualFields && typeof dto.visualFields === "object"
        ? (dto.visualFields as TemplateRecord["visualFields"])
        : undefined,
  };
}

export function documentTemplateDtosToTemplateRecords(
  rows: DocumentTemplateDto[],
): TemplateRecord[] {
  if (!Array.isArray(rows)) {
    throw new TypeError("Documents templates API response must be an array");
  }
  return rows.map(documentTemplateDtoToTemplateRecord);
}

export function generatedDocumentDtoToGeneratedDocument(
  dto: GeneratedDocumentDto,
): GeneratedDocument {
  return {
    id: dto.id,
    templateId: dto.templateId,
    templateName: dto.title,
    kind: dto.type,
    recipientName: dto.recipientName,
    recipientRef: dto.recipientRef?.trim() || "—",
    generatedAt: dto.createdAt,
    generatedBy: shortRef(dto.generatedByUserId, "User"),
    status: dto.status,
    certificateNumber: dto.certificateNumber ?? undefined,
    workflowState: dto.workflowState,
    workflowHistory: buildWorkflowHistory(dto),
    publishedAt: dto.publishedAt,
    portalVisibility: dto.portalVisibility,
    notificationsSent: false,
    notificationCount: 0,
    rejectionReason: dto.rejectionReason,
    notifications: [],
    documentGroupId: dto.id,
    versionNumber: 1,
    isCurrentVersion: dto.workflowState === "published",
    versionChanges: "",
    versionNote: "",
  };
}

export function generatedDocumentDtosToGeneratedDocuments(
  rows: GeneratedDocumentDto[],
): GeneratedDocument[] {
  if (!Array.isArray(rows)) {
    throw new TypeError("Documents generated API response must be an array");
  }
  return rows.map(generatedDocumentDtoToGeneratedDocument);
}
