/**
 * Documents write API — templates + generated documents. API auth mode only.
 */
import { getAdminApiClient } from "@/lib/admin-api";
import type { AdminApiClient } from "@/lib/api";
import { isApiAuthMode } from "@/auth/auth-mode";
import { isInstituteUuid } from "@/lib/active-institute";
import type {
  DocumentTemplateDto,
  DocumentTemplateLayoutMode,
  DocumentTemplatePreviewAspect,
  DocumentTemplateSource,
  DocumentTemplateType,
  GeneratedDocumentDto,
  GeneratedWorkflowState,
} from "./types";

function assertApiMode(): void {
  if (!isApiAuthMode()) {
    throw new Error("Documents API is only available in API auth mode");
  }
}

export type CreateDocumentTemplateInput = {
  instituteId: string;
  type: DocumentTemplateType;
  name: string;
  description?: string | null;
  category?: string | null;
  source?: DocumentTemplateSource;
  previewAspect?: DocumentTemplatePreviewAspect;
  layoutMode?: DocumentTemplateLayoutMode;
  blocks?: unknown;
  visualTheme?: string | null;
  visualFields?: unknown | null;
  tags?: unknown;
  activateNow?: boolean;
};

export type UpdateDocumentTemplateInput = Partial<
  Omit<CreateDocumentTemplateInput, "instituteId" | "type" | "source" | "activateNow">
>;

export type CreateGeneratedDocumentInput = {
  instituteId: string;
  templateId: string;
  title?: string;
  studentId?: string | null;
  teacherId?: string | null;
  recipientName: string;
  recipientRef?: string | null;
  certificateNumber?: string | null;
  payload?: unknown;
};

export type TransitionGeneratedDocumentInput = {
  workflowState: GeneratedWorkflowState;
  rejectionReason?: string | null;
};

export async function createDocumentTemplate(
  input: CreateDocumentTemplateInput,
  client: AdminApiClient = getAdminApiClient(),
): Promise<DocumentTemplateDto> {
  assertApiMode();
  if (!isInstituteUuid(input.instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }
  return client.post<DocumentTemplateDto>("/api/v1/documents/templates", {
    institute_id: input.instituteId.trim(),
    type: input.type,
    name: input.name.trim(),
    description: input.description,
    category: input.category,
    source: input.source,
    preview_aspect: input.previewAspect,
    layout_mode: input.layoutMode,
    blocks: input.blocks,
    visual_theme: input.visualTheme,
    visual_fields: input.visualFields,
    tags: input.tags,
    activate_now: input.activateNow,
  });
}

export async function updateDocumentTemplate(
  templateId: string,
  input: UpdateDocumentTemplateInput,
  client: AdminApiClient = getAdminApiClient(),
): Promise<DocumentTemplateDto> {
  assertApiMode();
  if (!isInstituteUuid(templateId)) {
    throw new Error("template_id must be a valid UUID");
  }
  const body: Record<string, unknown> = {};
  if (input.name !== undefined) body.name = input.name.trim();
  if (input.description !== undefined) body.description = input.description;
  if (input.category !== undefined) body.category = input.category;
  if (input.previewAspect !== undefined) body.preview_aspect = input.previewAspect;
  if (input.layoutMode !== undefined) body.layout_mode = input.layoutMode;
  if (input.blocks !== undefined) body.blocks = input.blocks;
  if (input.visualTheme !== undefined) body.visual_theme = input.visualTheme;
  if (input.visualFields !== undefined) body.visual_fields = input.visualFields;
  if (input.tags !== undefined) body.tags = input.tags;
  return client.patch<DocumentTemplateDto>(
    `/api/v1/documents/templates/${templateId.trim()}`,
    body,
  );
}

export async function activateDocumentTemplate(
  templateId: string,
  client: AdminApiClient = getAdminApiClient(),
): Promise<DocumentTemplateDto> {
  assertApiMode();
  if (!isInstituteUuid(templateId)) {
    throw new Error("template_id must be a valid UUID");
  }
  return client.post<DocumentTemplateDto>(
    `/api/v1/documents/templates/${templateId.trim()}/activate`,
  );
}

export async function archiveDocumentTemplate(
  templateId: string,
  client: AdminApiClient = getAdminApiClient(),
): Promise<DocumentTemplateDto> {
  assertApiMode();
  if (!isInstituteUuid(templateId)) {
    throw new Error("template_id must be a valid UUID");
  }
  return client.post<DocumentTemplateDto>(
    `/api/v1/documents/templates/${templateId.trim()}/archive`,
  );
}

export async function deleteDocumentTemplate(
  templateId: string,
  client: AdminApiClient = getAdminApiClient(),
): Promise<void> {
  assertApiMode();
  if (!isInstituteUuid(templateId)) {
    throw new Error("template_id must be a valid UUID");
  }
  await client.delete(`/api/v1/documents/templates/${templateId.trim()}`);
}

export async function createGeneratedDocument(
  input: CreateGeneratedDocumentInput,
  client: AdminApiClient = getAdminApiClient(),
): Promise<GeneratedDocumentDto> {
  assertApiMode();
  if (!isInstituteUuid(input.instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }
  if (!isInstituteUuid(input.templateId)) {
    throw new Error("template_id must be a valid UUID");
  }
  return client.post<GeneratedDocumentDto>("/api/v1/documents/generated", {
    institute_id: input.instituteId.trim(),
    template_id: input.templateId.trim(),
    title: input.title,
    student_id: input.studentId,
    teacher_id: input.teacherId,
    recipient_name: input.recipientName.trim(),
    recipient_ref: input.recipientRef,
    certificate_number: input.certificateNumber,
    payload: input.payload,
  });
}

export async function transitionGeneratedDocument(
  generatedId: string,
  input: TransitionGeneratedDocumentInput,
  client: AdminApiClient = getAdminApiClient(),
): Promise<GeneratedDocumentDto> {
  assertApiMode();
  if (!isInstituteUuid(generatedId)) {
    throw new Error("generated_document_id must be a valid UUID");
  }
  return client.post<GeneratedDocumentDto>(
    `/api/v1/documents/generated/${generatedId.trim()}/transition`,
    {
      workflow_state: input.workflowState,
      rejection_reason: input.rejectionReason,
    },
  );
}

export async function deleteGeneratedDocument(
  generatedId: string,
  client: AdminApiClient = getAdminApiClient(),
): Promise<void> {
  assertApiMode();
  if (!isInstituteUuid(generatedId)) {
    throw new Error("generated_document_id must be a valid UUID");
  }
  await client.delete(`/api/v1/documents/generated/${generatedId.trim()}`);
}
