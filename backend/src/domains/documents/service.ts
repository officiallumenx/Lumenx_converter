import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "../../errors/app-error.js";
import type { Actor } from "../../auth/types.js";
import {
  assertInstituteAccess,
  actorHasInstituteRole,
  requireInstituteId,
} from "../../authorization/index.js";
import {
  findStudentById,
  listGuardianStudentIds,
} from "../students/repository.js";
import { listLinksForStudent, findParentById } from "../parents/repository.js";
import { findTeacherById } from "../teachers/repository.js";
import {
  findGeneratedDocumentById,
  findTemplateById,
  insertGeneratedDocument,
  insertTemplate,
  listGeneratedDocuments,
  listTemplates,
  softDeleteGeneratedDocument,
  softDeleteTemplate,
  teacherCoversStudent,
  toTemplateUpdatePatch,
  updateGeneratedDocumentFields,
  updateTemplateFields,
} from "./repository.js";
import {
  persistInstitutePdfAsset,
  resolveLinkedAssetSignedUrl,
} from "./persist-file.js";
import { renderDocumentPdf } from "./render-pdf.js";
import type { AssetSignedUrlDto } from "../assets/service.js";
import type {
  CreateGeneratedInput,
  CreateTemplateInput,
  GeneratedDocumentDto,
  GeneratedDocumentRow,
  GeneratedWorkflowState,
  ListGeneratedFilter,
  ListTemplatesFilter,
  TemplateDto,
  TemplateRow,
  TemplateType,
  TransitionGeneratedInput,
  UpdateTemplateInput,
} from "./types.js";

export const DOCUMENT_WRITE_ROLES = [
  "institute_admin",
  "principal",
  "vice_principal",
  "coordinator",
  "it_admin",
] as const;

export const DOCUMENT_STAFF_READ_ROLES = [
  "institute_admin",
  "principal",
  "vice_principal",
  "coordinator",
  "it_admin",
  "teacher",
  "accountant",
  "admissions_officer",
  "staff",
] as const;

const REPORT_FLOW: GeneratedWorkflowState[] = [
  "draft",
  "teacher_review",
  "admin_review",
  "published",
];

const SIMPLE_FLOW: GeneratedWorkflowState[] = ["draft", "published"];

export function toTemplateDto(row: TemplateRow): TemplateDto {
  return {
    id: row.id,
    ownerScope: row.owner_scope,
    instituteId: row.institute_id,
    type: row.type,
    name: row.name,
    description: row.description,
    category: row.category,
    status: row.status,
    source: row.source,
    version: row.version,
    previewAspect: row.preview_aspect,
    layoutMode: row.layout_mode,
    blocks: row.blocks,
    visualTheme: row.visual_theme,
    visualFields: row.visual_fields,
    tags: row.tags,
    createdByUserId: row.created_by_user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toGeneratedDocumentDto(
  row: GeneratedDocumentRow,
): GeneratedDocumentDto {
  return {
    id: row.id,
    instituteId: row.institute_id,
    templateId: row.template_id,
    type: row.type,
    title: row.title,
    studentId: row.student_id,
    teacherId: row.teacher_id,
    recipientName: row.recipient_name,
    recipientRef: row.recipient_ref,
    status: row.status,
    workflowState: row.workflow_state,
    certificateNumber: row.certificate_number,
    portalVisibility: {
      student: row.portal_student,
      parent: row.portal_parent,
      teacher: row.portal_teacher,
    },
    rejectionReason: row.rejection_reason,
    payload: row.payload,
    assetPath: row.asset_path,
    generatedByUserId: row.generated_by_user_id,
    publishedAt: row.published_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function isWriter(actor: Actor, instituteId: string): boolean {
  if (actor.isPlatformOperator) return true;
  return DOCUMENT_WRITE_ROLES.some((role) =>
    actorHasInstituteRole(actor, instituteId, role),
  );
}

function isStaffReader(actor: Actor, instituteId: string): boolean {
  if (actor.isPlatformOperator) return true;
  return DOCUMENT_STAFF_READ_ROLES.some((role) =>
    actorHasInstituteRole(actor, instituteId, role),
  );
}

async function resolveLinkedStudentIds(
  admin: SupabaseClient,
  actor: Actor,
  instituteId: string,
): Promise<Set<string>> {
  const ids = new Set<string>();
  for (const s of actor.students) {
    if (s.instituteId === instituteId) ids.add(s.studentId);
  }
  for (const p of actor.parents) {
    if (p.instituteId !== instituteId) continue;
    const linked = await listGuardianStudentIds(admin, p.parentId, instituteId);
    for (const sid of linked) ids.add(sid);
  }
  return ids;
}

function defaultPortalVisibility(type: TemplateType): {
  student: boolean;
  parent: boolean;
  teacher: boolean;
} {
  switch (type) {
    case "id_card":
      return { student: true, parent: true, teacher: false };
    case "report":
      return { student: true, parent: true, teacher: true };
    case "certificate":
    case "document":
    default:
      return { student: true, parent: true, teacher: false };
  }
}

function canReadTemplate(actor: Actor, row: TemplateRow): boolean {
  if (actor.isPlatformOperator) return true;

  if (row.owner_scope === "platform") {
    return row.status === "active";
  }

  if (!row.institute_id) return false;
  const instituteId = row.institute_id;
  const member = actor.memberships.some(
    (m) => m.instituteId === instituteId && m.status === "active",
  );
  if (!member && !actor.isPlatformOperator) return false;

  if (row.status === "active") {
    return isStaffReader(actor, instituteId) || member;
  }

  // draft / archived — writers only
  return isWriter(actor, instituteId);
}

async function canReadGenerated(
  admin: SupabaseClient,
  actor: Actor,
  row: GeneratedDocumentRow,
): Promise<boolean> {
  const member = actor.memberships.some(
    (m) => m.instituteId === row.institute_id && m.status === "active",
  );
  if (!member && !actor.isPlatformOperator) return false;

  if (isStaffReader(actor, row.institute_id)) return true;

  if (row.workflow_state !== "published" || row.status !== "ready") {
    return false;
  }

  if (row.portal_student && row.student_id) {
    if (
      actor.students.some(
        (s) =>
          s.studentId === row.student_id &&
          s.instituteId === row.institute_id,
      )
    ) {
      return true;
    }
  }

  if (row.portal_parent && row.student_id) {
    if (actor.parents.some((p) => p.instituteId === row.institute_id)) {
      const linked = await resolveLinkedStudentIds(
        admin,
        actor,
        row.institute_id,
      );
      if (linked.has(row.student_id)) return true;
    }
  }

  if (
    row.portal_teacher &&
    actorHasInstituteRole(actor, row.institute_id, "teacher")
  ) {
    return true;
  }

  return false;
}

function assertWritableInstituteTemplate(
  actor: Actor,
  row: TemplateRow,
): void {
  if (row.owner_scope === "platform") {
    throw AppError.forbidden("Platform templates cannot be modified here");
  }
  if (!row.institute_id) {
    throw AppError.forbidden("Template has no institute");
  }
  assertInstituteAccess(actor, row.institute_id);
  if (!isWriter(actor, row.institute_id)) {
    throw AppError.forbidden("Insufficient document write access");
  }
}

export async function listTemplatesForActor(
  admin: SupabaseClient,
  actor: Actor,
  filter: ListTemplatesFilter,
): Promise<TemplateDto[]> {
  const instituteId = requireInstituteId(actor, filter.instituteId);
  const rows = await listTemplates(admin, { ...filter, instituteId });
  return rows.filter((row) => canReadTemplate(actor, row)).map(toTemplateDto);
}

export async function getTemplateForActor(
  admin: SupabaseClient,
  actor: Actor,
  id: string,
): Promise<TemplateDto> {
  const row = await findTemplateById(admin, id);
  if (!row) throw AppError.notFound("Template not found");
  if (!canReadTemplate(actor, row)) {
    throw AppError.forbidden("Insufficient template access");
  }
  return toTemplateDto(row);
}

export async function createTemplateForActor(
  admin: SupabaseClient,
  actor: Actor,
  input: CreateTemplateInput,
): Promise<TemplateDto> {
  const instituteId = requireInstituteId(actor, input.instituteId);
  if (!isWriter(actor, instituteId)) {
    throw AppError.forbidden("Insufficient document write access");
  }
  const name = input.name.trim();
  if (name.length < 1) {
    throw AppError.validation("Referenced resource is invalid", {
      name: ["Required"],
    });
  }

  const row = await insertTemplate(admin, {
    ...input,
    instituteId,
    name,
    createdByUserId: actor.userId,
    status: input.activateNow ? "active" : "draft",
  });
  return toTemplateDto(row);
}

export async function updateTemplateForActor(
  admin: SupabaseClient,
  actor: Actor,
  id: string,
  input: UpdateTemplateInput,
): Promise<TemplateDto> {
  const existing = await findTemplateById(admin, id);
  if (!existing) throw AppError.notFound("Template not found");
  assertWritableInstituteTemplate(actor, existing);

  if (existing.status === "archived") {
    throw AppError.conflict("Archived templates cannot be edited");
  }
  if (input.name !== undefined && input.name.trim().length < 1) {
    throw AppError.validation("Referenced resource is invalid", {
      name: ["Required"],
    });
  }

  const patch = toTemplateUpdatePatch(input);
  if (Object.keys(patch).length === 0) return toTemplateDto(existing);

  if (existing.status === "active") {
    patch.version = existing.version + 1;
  }

  const updated = await updateTemplateFields(admin, id, patch);
  if (!updated) throw AppError.notFound("Template not found");
  return toTemplateDto(updated);
}

export async function activateTemplateForActor(
  admin: SupabaseClient,
  actor: Actor,
  id: string,
): Promise<TemplateDto> {
  const existing = await findTemplateById(admin, id);
  if (!existing) throw AppError.notFound("Template not found");
  assertWritableInstituteTemplate(actor, existing);

  if (existing.status === "active") return toTemplateDto(existing);
  if (existing.status === "archived") {
    throw AppError.conflict("Restore archived templates before activating");
  }

  const updated = await updateTemplateFields(admin, id, { status: "active" });
  if (!updated) throw AppError.notFound("Template not found");
  return toTemplateDto(updated);
}

export async function archiveTemplateForActor(
  admin: SupabaseClient,
  actor: Actor,
  id: string,
): Promise<TemplateDto> {
  const existing = await findTemplateById(admin, id);
  if (!existing) throw AppError.notFound("Template not found");
  assertWritableInstituteTemplate(actor, existing);

  if (existing.status === "archived") return toTemplateDto(existing);

  const updated = await updateTemplateFields(admin, id, {
    status: "archived",
  });
  if (!updated) throw AppError.notFound("Template not found");
  return toTemplateDto(updated);
}

export async function deleteTemplateForActor(
  admin: SupabaseClient,
  actor: Actor,
  id: string,
): Promise<void> {
  const existing = await findTemplateById(admin, id);
  if (!existing) throw AppError.notFound("Template not found");
  assertWritableInstituteTemplate(actor, existing);

  if (existing.status === "active") {
    throw AppError.conflict("Archive template before deleting");
  }

  const deleted = await softDeleteTemplate(admin, id);
  if (!deleted) throw AppError.notFound("Template not found");

  const { recordEntitySoftDeleteInRecycleBin } = await import(
    "../recycle/on-soft-delete.js"
  );
  await recordEntitySoftDeleteInRecycleBin(admin, actor, {
    instituteId: existing.institute_id,
    entityKind: "template",
    entityId: id,
    module: "Templates",
    title: existing.name?.trim() || "Template",
    subtitle: existing.type,
  });
}

export async function listGeneratedForActor(
  admin: SupabaseClient,
  actor: Actor,
  filter: ListGeneratedFilter,
): Promise<GeneratedDocumentDto[]> {
  const instituteId = requireInstituteId(actor, filter.instituteId);
  const rows = await listGeneratedDocuments(admin, { ...filter, instituteId });
  const out: GeneratedDocumentDto[] = [];
  for (const row of rows) {
    if (await canReadGenerated(admin, actor, row)) {
      out.push(toGeneratedDocumentDto(row));
    }
  }
  return out;
}

export async function getGeneratedForActor(
  admin: SupabaseClient,
  actor: Actor,
  id: string,
): Promise<GeneratedDocumentDto> {
  const row = await findGeneratedDocumentById(admin, id);
  if (!row) throw AppError.notFound("Generated document not found");
  if (!(await canReadGenerated(admin, actor, row))) {
    throw AppError.forbidden("Insufficient document access");
  }
  return toGeneratedDocumentDto(row);
}

export async function createGeneratedForActor(
  admin: SupabaseClient,
  actor: Actor,
  input: CreateGeneratedInput,
): Promise<GeneratedDocumentDto> {
  const instituteId = requireInstituteId(actor, input.instituteId);
  if (!isWriter(actor, instituteId)) {
    throw AppError.forbidden("Insufficient document write access");
  }

  const template = await findTemplateById(admin, input.templateId);
  if (!template || template.deleted_at) {
    throw AppError.validation("Referenced resource is invalid", {
      template_id: ["Template not found"],
    });
  }
  if (template.status !== "active") {
    throw AppError.conflict("Only active templates can be used to generate");
  }
  if (
    template.owner_scope === "institute" &&
    template.institute_id !== instituteId
  ) {
    throw AppError.forbidden("Template does not belong to this institute");
  }

  const recipientName = input.recipientName.trim();
  if (recipientName.length < 1) {
    throw AppError.validation("Referenced resource is invalid", {
      recipient_name: ["Required"],
    });
  }

  let studentId = input.studentId ?? null;
  let teacherId = input.teacherId ?? null;

  if (studentId) {
    const student = await findStudentById(admin, studentId);
    if (!student || student.institute_id !== instituteId) {
      throw AppError.validation("Referenced resource is invalid", {
        student_id: ["Student not found in this institute"],
      });
    }
  }
  if (teacherId) {
    const teacher = await findTeacherById(admin, teacherId);
    if (!teacher || teacher.institute_id !== instituteId) {
      throw AppError.validation("Referenced resource is invalid", {
        teacher_id: ["Teacher not found in this institute"],
      });
    }
  }

  const title = (input.title?.trim() || template.name).trim();

  const row = await insertGeneratedDocument(admin, {
    instituteId,
    templateId: template.id,
    type: template.type,
    title,
    studentId,
    teacherId,
    recipientName,
    recipientRef: input.recipientRef,
    certificateNumber: input.certificateNumber,
    payload: input.payload,
    generatedByUserId: actor.userId,
    workflowState: "draft",
  });
  return toGeneratedDocumentDto(row);
}

function nextAllowedStates(
  type: TemplateType,
  current: GeneratedWorkflowState,
): GeneratedWorkflowState[] {
  if (current === "rejected" || current === "published") return [];

  const flow = type === "report" ? REPORT_FLOW : SIMPLE_FLOW;
  const idx = flow.indexOf(current);
  if (idx < 0 || idx >= flow.length - 1) return [];
  const forward = flow[idx + 1]!;
  return [forward, "rejected"];
}

async function canTransitionGenerated(
  admin: SupabaseClient,
  actor: Actor,
  row: GeneratedDocumentRow,
  next: GeneratedWorkflowState,
): Promise<boolean> {
  const allowed = nextAllowedStates(row.type, row.workflow_state);
  if (!allowed.includes(next)) return false;

  if (isWriter(actor, row.institute_id)) return true;

  // Teachers may approve report teacher_review → admin_review only when
  // assigned to the student's section(s).
  if (
    row.type === "report" &&
    row.workflow_state === "teacher_review" &&
    next === "admin_review" &&
    row.student_id &&
    actorHasInstituteRole(actor, row.institute_id, "teacher")
  ) {
    const identity = actor.teachers.find(
      (t) => t.instituteId === row.institute_id && t.status === "active",
    );
    if (!identity) return false;
    return teacherCoversStudent(admin, {
      instituteId: row.institute_id,
      teacherId: identity.teacherId,
      studentId: row.student_id,
    });
  }

  return false;
}

export async function transitionGeneratedForActor(
  admin: SupabaseClient,
  actor: Actor,
  id: string,
  input: TransitionGeneratedInput,
): Promise<GeneratedDocumentDto> {
  const existing = await findGeneratedDocumentById(admin, id);
  if (!existing) throw AppError.notFound("Generated document not found");
  assertInstituteAccess(actor, existing.institute_id);

  if (!(await canTransitionGenerated(admin, actor, existing, input.workflowState))) {
    throw AppError.forbidden("Transition not allowed");
  }

  if (input.workflowState === "rejected") {
    const reason = input.rejectionReason?.trim();
    if (!reason) {
      throw AppError.validation("Referenced resource is invalid", {
        rejection_reason: ["Required when rejecting"],
      });
    }
  }

  const patch: Record<string, unknown> = {
    workflow_state: input.workflowState,
  };

  if (input.workflowState === "published") {
    const visibility = defaultPortalVisibility(existing.type);
    patch.portal_student = visibility.student;
    patch.portal_parent = visibility.parent;
    patch.portal_teacher = visibility.teacher;
    patch.published_at = new Date().toISOString();
    patch.rejection_reason = null;

    if (!existing.asset_path) {
      const template = await findTemplateById(admin, existing.template_id);
      if (!template) {
        throw AppError.validation("Referenced resource is invalid", {
          template_id: ["Template not found"],
        });
      }
      const pdfBytes = renderDocumentPdf({
        title: existing.title,
        templateName: template.name,
        recipientName: existing.recipient_name,
        recipientRef: existing.recipient_ref,
        category: template.category,
        documentType: existing.type,
        payload: existing.payload,
      });
      const file = await persistInstitutePdfAsset(admin, actor, {
        instituteId: existing.institute_id,
        bucket: "generated-documents",
        category: "generated_document",
        fileName: `${existing.id}.pdf`,
        body: pdfBytes,
        linkedEntityKind: "generated_document",
        linkedEntityId: existing.id,
      });
      patch.asset_path = file.objectPath;
    }
  } else if (input.workflowState === "rejected") {
    patch.rejection_reason = input.rejectionReason!.trim();
    patch.portal_student = false;
    patch.portal_parent = false;
    patch.portal_teacher = false;
    patch.published_at = null;
  }

  const updated = await updateGeneratedDocumentFields(admin, id, patch);
  if (!updated) throw AppError.notFound("Generated document not found");

  if (input.workflowState === "published") {
    await emitGeneratedDocumentPublishedNotification(admin, actor, updated);
  }

  return toGeneratedDocumentDto(updated);
}

async function emitGeneratedDocumentPublishedNotification(
  admin: SupabaseClient,
  actor: Actor,
  row: Awaited<ReturnType<typeof updateGeneratedDocumentFields>> & object,
): Promise<void> {
  if (!row) return;
  const recipientIds = new Set<string>();

  if (row.student_id) {
    const student = await findStudentById(admin, row.student_id);
    if (student?.user_profile_id && row.portal_student) {
      recipientIds.add(student.user_profile_id);
    }
    if (row.portal_parent) {
      const links = await listLinksForStudent(admin, row.student_id, row.institute_id);
      for (const link of links) {
        const parent = await findParentById(admin, link.parent_id);
        if (parent?.user_profile_id) recipientIds.add(parent.user_profile_id);
      }
    }
  }

  if (recipientIds.size === 0) return;

  const { emitNotificationForInstituteSystem } = await import(
    "../notifications/service.js"
  );

  try {
    await emitNotificationForInstituteSystem(admin, actor.userId, {
      instituteId: row.institute_id,
      recipientUserIds: [...recipientIds],
      category: "documents",
      priority: "normal",
      title: "Document ready",
      body: `${row.title?.trim() || "Document"} for ${row.recipient_name} is ready to download.`,
      deepLink: "/documents",
      dedupeKey: `gen-doc-published:${row.id}`,
    });
  } catch {
    /* notification delivery must not block publish */
  }
}

export async function deleteGeneratedForActor(
  admin: SupabaseClient,
  actor: Actor,
  id: string,
): Promise<void> {
  const existing = await findGeneratedDocumentById(admin, id);
  if (!existing) throw AppError.notFound("Generated document not found");
  assertInstituteAccess(actor, existing.institute_id);

  if (!isWriter(actor, existing.institute_id)) {
    throw AppError.forbidden("Insufficient document write access");
  }
  if (existing.workflow_state === "published") {
    throw AppError.conflict("Published documents cannot be deleted");
  }

  const deleted = await softDeleteGeneratedDocument(admin, id);
  if (!deleted) throw AppError.notFound("Generated document not found");

  const { recordEntitySoftDeleteInRecycleBin } = await import(
    "../recycle/on-soft-delete.js"
  );
  await recordEntitySoftDeleteInRecycleBin(admin, actor, {
    instituteId: existing.institute_id,
    entityKind: "generated_document",
    entityId: id,
    module: "Documents",
    title: existing.title?.trim() || "Document",
    subtitle: existing.recipient_name,
  });
}

export async function getGeneratedDocumentSignedUrlForActor(
  admin: SupabaseClient,
  actor: Actor,
  id: string,
  expiresInSec?: number,
): Promise<AssetSignedUrlDto> {
  const row = await findGeneratedDocumentById(admin, id);
  if (!row) throw AppError.notFound("Generated document not found");
  if (!(await canReadGenerated(admin, actor, row))) {
    throw AppError.forbidden("Insufficient document access");
  }
  if (!row.asset_path) {
    throw AppError.notFound("Document file not generated yet");
  }

  return resolveLinkedAssetSignedUrl(admin, actor, {
    instituteId: row.institute_id,
    linkedEntityKind: "generated_document",
    linkedEntityId: row.id,
    bucket: "generated-documents",
    objectPath: row.asset_path,
    expiresInSec,
  });
}
