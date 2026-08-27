import type { SupabaseClient } from "@supabase/supabase-js";
import { ensureDbOk } from "../../db/errors.js";
import type {
  CreateTemplateInput,
  GeneratedDocumentRow,
  GeneratedWorkflowState,
  ListGeneratedFilter,
  ListTemplatesFilter,
  TemplateRow,
  TemplateStatus,
  UpdateTemplateInput,
} from "./types.js";

export const TEMPLATE_COLS =
  "id, owner_scope, institute_id, type, name, description, category, status, source, version, preview_aspect, layout_mode, blocks, visual_theme, visual_fields, tags, created_by_user_id, created_at, updated_at, deleted_at";

export const GENERATED_COLS =
  "id, institute_id, template_id, type, title, student_id, teacher_id, recipient_name, recipient_ref, status, workflow_state, certificate_number, portal_student, portal_parent, portal_teacher, rejection_reason, payload, asset_path, generated_by_user_id, published_at, created_at, updated_at, deleted_at";

export async function listTemplates(
  admin: SupabaseClient,
  filter: ListTemplatesFilter,
): Promise<TemplateRow[]> {
  const applyCommon = (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    query: any,
  ) => {
    if (filter.type) query = query.eq("type", filter.type);
    if (filter.status) query = query.eq("status", filter.status);
    return query;
  };

  if (filter.ownerScope === "platform") {
    const result = await applyCommon(
      admin
        .from("template")
        .select(TEMPLATE_COLS)
        .eq("owner_scope", "platform")
        .is("deleted_at", null),
    );
    return ensureDbOk(result) as TemplateRow[];
  }

  if (filter.ownerScope === "institute") {
    const result = await applyCommon(
      admin
        .from("template")
        .select(TEMPLATE_COLS)
        .eq("owner_scope", "institute")
        .eq("institute_id", filter.instituteId)
        .is("deleted_at", null),
    );
    return ensureDbOk(result) as TemplateRow[];
  }

  const instituteResult = await applyCommon(
    admin
      .from("template")
      .select(TEMPLATE_COLS)
      .eq("owner_scope", "institute")
      .eq("institute_id", filter.instituteId)
      .is("deleted_at", null),
  );
  const platformResult = await applyCommon(
    admin
      .from("template")
      .select(TEMPLATE_COLS)
      .eq("owner_scope", "platform")
      .is("deleted_at", null),
  );

  const instituteRows = ensureDbOk(instituteResult) as TemplateRow[];
  const platformRows = ensureDbOk(platformResult) as TemplateRow[];
  return [...instituteRows, ...platformRows];
}

export async function findTemplateById(
  admin: SupabaseClient,
  id: string,
): Promise<TemplateRow | null> {
  const result = await admin
    .from("template")
    .select(TEMPLATE_COLS)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as TemplateRow | null) ?? null;
}

export async function insertTemplate(
  admin: SupabaseClient,
  input: CreateTemplateInput & {
    createdByUserId: string;
    status: TemplateStatus;
  },
): Promise<TemplateRow> {
  const result = await admin
    .from("template")
    .insert({
      owner_scope: "institute",
      institute_id: input.instituteId,
      type: input.type,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      category: input.category?.trim() || null,
      status: input.status,
      source: input.source ?? "custom",
      version: 1,
      preview_aspect: input.previewAspect ?? "a4",
      layout_mode: input.layoutMode ?? "blocks",
      blocks: input.blocks ?? [],
      visual_theme: input.visualTheme ?? null,
      visual_fields: input.visualFields ?? null,
      tags: input.tags ?? [],
      created_by_user_id: input.createdByUserId,
    })
    .select(TEMPLATE_COLS)
    .single();
  return ensureDbOk(result) as TemplateRow;
}

export function toTemplateUpdatePatch(
  input: UpdateTemplateInput,
): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  if (input.name !== undefined) patch.name = input.name.trim();
  if (input.description !== undefined) {
    patch.description = input.description?.trim() || null;
  }
  if (input.category !== undefined) {
    patch.category = input.category?.trim() || null;
  }
  if (input.previewAspect !== undefined) {
    patch.preview_aspect = input.previewAspect;
  }
  if (input.layoutMode !== undefined) patch.layout_mode = input.layoutMode;
  if (input.blocks !== undefined) patch.blocks = input.blocks;
  if (input.visualTheme !== undefined) patch.visual_theme = input.visualTheme;
  if (input.visualFields !== undefined) {
    patch.visual_fields = input.visualFields;
  }
  if (input.tags !== undefined) patch.tags = input.tags;
  return patch;
}

export async function updateTemplateFields(
  admin: SupabaseClient,
  id: string,
  patch: Record<string, unknown>,
): Promise<TemplateRow | null> {
  const result = await admin
    .from("template")
    .update(patch)
    .eq("id", id)
    .is("deleted_at", null)
    .select(TEMPLATE_COLS)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as TemplateRow | null) ?? null;
}

export async function softDeleteTemplate(
  admin: SupabaseClient,
  id: string,
): Promise<TemplateRow | null> {
  const result = await admin
    .from("template")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .is("deleted_at", null)
    .select(TEMPLATE_COLS)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as TemplateRow | null) ?? null;
}

export async function listGeneratedDocuments(
  admin: SupabaseClient,
  filter: ListGeneratedFilter,
): Promise<GeneratedDocumentRow[]> {
  let query = admin
    .from("generated_document")
    .select(GENERATED_COLS)
    .eq("institute_id", filter.instituteId)
    .is("deleted_at", null);

  if (filter.type) query = query.eq("type", filter.type);
  if (filter.workflowState) {
    query = query.eq("workflow_state", filter.workflowState);
  }
  if (filter.studentId) query = query.eq("student_id", filter.studentId);
  if (filter.templateId) query = query.eq("template_id", filter.templateId);

  const result = await query;
  return ensureDbOk(result) as GeneratedDocumentRow[];
}

export async function findGeneratedDocumentById(
  admin: SupabaseClient,
  id: string,
): Promise<GeneratedDocumentRow | null> {
  const result = await admin
    .from("generated_document")
    .select(GENERATED_COLS)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as GeneratedDocumentRow | null) ?? null;
}

export async function insertGeneratedDocument(
  admin: SupabaseClient,
  input: {
    instituteId: string;
    templateId: string;
    type: string;
    title: string;
    studentId?: string | null;
    teacherId?: string | null;
    recipientName: string;
    recipientRef?: string | null;
    certificateNumber?: string | null;
    payload?: unknown;
    generatedByUserId: string;
    workflowState: GeneratedWorkflowState;
  },
): Promise<GeneratedDocumentRow> {
  const result = await admin
    .from("generated_document")
    .insert({
      institute_id: input.instituteId,
      template_id: input.templateId,
      type: input.type,
      title: input.title.trim(),
      student_id: input.studentId ?? null,
      teacher_id: input.teacherId ?? null,
      recipient_name: input.recipientName.trim(),
      recipient_ref: input.recipientRef?.trim() || null,
      status: "ready",
      workflow_state: input.workflowState,
      certificate_number: input.certificateNumber?.trim() || null,
      portal_student: false,
      portal_parent: false,
      portal_teacher: false,
      rejection_reason: null,
      payload: input.payload ?? {},
      asset_path: null,
      generated_by_user_id: input.generatedByUserId,
      published_at: null,
    })
    .select(GENERATED_COLS)
    .single();
  return ensureDbOk(result) as GeneratedDocumentRow;
}

export async function updateGeneratedDocumentFields(
  admin: SupabaseClient,
  id: string,
  patch: Record<string, unknown>,
): Promise<GeneratedDocumentRow | null> {
  const result = await admin
    .from("generated_document")
    .update(patch)
    .eq("id", id)
    .is("deleted_at", null)
    .select(GENERATED_COLS)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as GeneratedDocumentRow | null) ?? null;
}

export async function softDeleteGeneratedDocument(
  admin: SupabaseClient,
  id: string,
): Promise<GeneratedDocumentRow | null> {
  const result = await admin
    .from("generated_document")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .is("deleted_at", null)
    .select(GENERATED_COLS)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as GeneratedDocumentRow | null) ?? null;
}

/** True when teacher has an active assignment on a section where the student is enrolled. */
export async function teacherCoversStudent(
  admin: SupabaseClient,
  input: { instituteId: string; teacherId: string; studentId: string },
): Promise<boolean> {
  const enrollResult = await admin
    .from("enrollment")
    .select("section_id")
    .eq("institute_id", input.instituteId)
    .eq("student_id", input.studentId)
    .eq("status", "active")
    .is("deleted_at", null);
  const enrollments = ensureDbOk(enrollResult) as Array<{ section_id: string }>;
  if (enrollments.length === 0) return false;

  const sectionIds = [...new Set(enrollments.map((e) => e.section_id))];
  const assignResult = await admin
    .from("teacher_assignment")
    .select("id")
    .eq("institute_id", input.instituteId)
    .eq("teacher_id", input.teacherId)
    .eq("status", "active")
    .is("deleted_at", null)
    .in("section_id", sectionIds);
  const assignments = ensureDbOk(assignResult) as Array<{ id: string }>;
  return assignments.length > 0;
}
