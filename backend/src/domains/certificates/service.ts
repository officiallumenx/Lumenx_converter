import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "../../errors/app-error.js";
import type { Actor } from "../../auth/types.js";
import {
  actorHasInstituteRole,
  requireInstituteId,
} from "../../authorization/index.js";
import {
  findStudentById,
  listGuardianStudentIds,
} from "../students/repository.js";
import { findTeacherById } from "../teachers/repository.js";
import {
  findGeneratedDocumentById,
  findTemplateById,
  updateGeneratedDocumentFields,
} from "../documents/repository.js";
import {
  findIssuedByGeneratedDocumentId,
  findIssuedCertificateById,
  findIssuedCertificateByNumber,
  insertIssuedCertificate,
  listIssuedCertificates,
  nextCertificateSequence,
  updateIssuedCertificateFields,
} from "./repository.js";
import type {
  IssueCertificateInput,
  IssuedCertificateDto,
  IssuedCertificateRow,
  ListIssuedCertificatesFilter,
  RevokeCertificateInput,
} from "./types.js";

export const CERTIFICATE_WRITE_ROLES = [
  "institute_admin",
  "principal",
  "vice_principal",
  "coordinator",
  "it_admin",
] as const;

export const CERTIFICATE_STAFF_READ_ROLES = [
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

export function toIssuedCertificateDto(
  row: IssuedCertificateRow,
): IssuedCertificateDto {
  return {
    id: row.id,
    instituteId: row.institute_id,
    generatedDocumentId: row.generated_document_id,
    templateId: row.template_id,
    studentId: row.student_id,
    teacherId: row.teacher_id,
    certificateNumber: row.certificate_number,
    sequence: row.sequence,
    year: row.year,
    title: row.title,
    category: row.category,
    templateName: row.template_name,
    templateVersion: row.template_version,
    recipientName: row.recipient_name,
    recipientRef: row.recipient_ref,
    status: row.status,
    issuedAt: row.issued_at,
    issuedByUserId: row.issued_by_user_id,
    revokedAt: row.revoked_at,
    revokedByUserId: row.revoked_by_user_id,
    revokeReason: row.revoke_reason,
    assetPath: row.asset_path,
    fileKind: row.file_kind,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function isWriter(actor: Actor, instituteId: string): boolean {
  if (actor.isPlatformOperator) return true;
  return CERTIFICATE_WRITE_ROLES.some((role) =>
    actorHasInstituteRole(actor, instituteId, role),
  );
}

function isStaffReader(actor: Actor, instituteId: string): boolean {
  if (actor.isPlatformOperator) return true;
  return CERTIFICATE_STAFF_READ_ROLES.some((role) =>
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

async function canReadIssued(
  admin: SupabaseClient,
  actor: Actor,
  row: IssuedCertificateRow,
): Promise<boolean> {
  const member = actor.memberships.some(
    (m) => m.instituteId === row.institute_id && m.status === "active",
  );
  if (!member && !actor.isPlatformOperator) return false;

  if (isStaffReader(actor, row.institute_id)) return true;

  // Learners only see live issued rows for linked students
  if (row.status !== "issued" || !row.student_id) return false;

  const linked = await resolveLinkedStudentIds(admin, actor, row.institute_id);
  return linked.has(row.student_id);
}

function formatCertificateNumber(year: number, sequence: number): string {
  return `CERT/${year}/${String(sequence).padStart(4, "0")}`;
}

export async function listIssuedCertificatesForActor(
  admin: SupabaseClient,
  actor: Actor,
  filter: ListIssuedCertificatesFilter,
): Promise<IssuedCertificateDto[]> {
  const instituteId = requireInstituteId(actor, filter.instituteId);
  const rows = await listIssuedCertificates(admin, { ...filter, instituteId });
  const out: IssuedCertificateDto[] = [];
  for (const row of rows) {
    if (await canReadIssued(admin, actor, row)) {
      out.push(toIssuedCertificateDto(row));
    }
  }
  return out;
}

export async function getIssuedCertificateForActor(
  admin: SupabaseClient,
  actor: Actor,
  id: string,
): Promise<IssuedCertificateDto> {
  const row = await findIssuedCertificateById(admin, id);
  if (!row || !(await canReadIssued(admin, actor, row))) {
    throw AppError.notFound("Issued certificate not found");
  }
  return toIssuedCertificateDto(row);
}

export async function lookupIssuedCertificateForActor(
  admin: SupabaseClient,
  actor: Actor,
  instituteIdRaw: string,
  certificateNumber: string,
): Promise<IssuedCertificateDto> {
  const instituteId = requireInstituteId(actor, instituteIdRaw);
  const number = certificateNumber.trim();
  if (!number) {
    throw AppError.validation("Referenced resource is invalid", {
      certificate_number: ["Required"],
    });
  }
  const row = await findIssuedCertificateByNumber(admin, instituteId, number);
  if (!row || !(await canReadIssued(admin, actor, row))) {
    throw AppError.notFound("Issued certificate not found");
  }
  return toIssuedCertificateDto(row);
}

export async function issueCertificateForActor(
  admin: SupabaseClient,
  actor: Actor,
  input: IssueCertificateInput,
): Promise<IssuedCertificateDto> {
  const instituteId = requireInstituteId(actor, input.instituteId);
  if (!isWriter(actor, instituteId)) {
    throw AppError.forbidden("Insufficient certificate write access");
  }

  let templateId = input.templateId ?? null;
  let generatedDocumentId: string | null = input.generatedDocumentId ?? null;
  let studentId = input.studentId ?? null;
  let teacherId = input.teacherId ?? null;
  let title = input.title?.trim() || "";
  let category = input.category ?? null;
  let recipientName = input.recipientName?.trim() || "";
  let recipientRef = input.recipientRef ?? null;
  let templateName = "";
  let templateVersion = 1;
  let assetPath = input.assetPath ?? null;

  if (generatedDocumentId) {
    const doc = await findGeneratedDocumentById(admin, generatedDocumentId);
    if (!doc || doc.institute_id !== instituteId) {
      throw AppError.validation("Referenced resource is invalid", {
        generated_document_id: ["Generated document not found in this institute"],
      });
    }
    if (doc.type !== "certificate") {
      throw AppError.conflict("Only certificate documents can be issued");
    }
    if (doc.workflow_state !== "published" || doc.status !== "ready") {
      throw AppError.conflict("Document must be published before issuing");
    }

    const existingIssue = await findIssuedByGeneratedDocumentId(
      admin,
      generatedDocumentId,
    );
    if (existingIssue) {
      throw AppError.conflict("Document already has an issued certificate");
    }

    templateId = doc.template_id;
    studentId = doc.student_id;
    teacherId = doc.teacher_id;
    title = title || doc.title;
    recipientName = recipientName || doc.recipient_name;
    recipientRef = recipientRef ?? doc.recipient_ref;
    assetPath = assetPath ?? doc.asset_path;

    const template = await findTemplateById(admin, doc.template_id);
    if (!template) {
      throw AppError.validation("Referenced resource is invalid", {
        template_id: ["Template not found"],
      });
    }
    templateName = template.name;
    templateVersion = template.version;
    category = category ?? template.category;
  } else {
    if (!templateId) {
      throw AppError.validation("Referenced resource is invalid", {
        template_id: ["Required when not issuing from a generated document"],
      });
    }
    const template = await findTemplateById(admin, templateId);
    if (!template) {
      throw AppError.validation("Referenced resource is invalid", {
        template_id: ["Template not found"],
      });
    }
    if (template.status !== "active") {
      throw AppError.conflict("Only active templates can be used to issue");
    }
    if (
      template.owner_scope === "institute" &&
      template.institute_id !== instituteId
    ) {
      throw AppError.forbidden("Template does not belong to this institute");
    }
    if (template.type !== "certificate") {
      throw AppError.conflict("Only certificate templates can be issued");
    }
    templateName = template.name;
    templateVersion = template.version;
    category = category ?? template.category;
    title = title || template.name;
  }

  if (!recipientName) {
    throw AppError.validation("Referenced resource is invalid", {
      recipient_name: ["Required"],
    });
  }
  if (!title) {
    throw AppError.validation("Referenced resource is invalid", {
      title: ["Required"],
    });
  }

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

  const year = input.year ?? new Date().getUTCFullYear();
  if (year < 2000 || year > 2100) {
    throw AppError.validation("Referenced resource is invalid", {
      year: ["Must be between 2000 and 2100"],
    });
  }

  const sequence = await nextCertificateSequence(admin, instituteId, year);
  const certificateNumber = (
    input.certificateNumber?.trim() || formatCertificateNumber(year, sequence)
  ).trim();

  const clash = await findIssuedCertificateByNumber(
    admin,
    instituteId,
    certificateNumber,
  );
  if (clash) {
    throw AppError.conflict("Certificate number already issued");
  }

  const row = await insertIssuedCertificate(admin, {
    instituteId,
    generatedDocumentId,
    templateId: templateId!,
    studentId,
    teacherId,
    certificateNumber,
    sequence,
    year,
    title,
    category,
    templateName,
    templateVersion,
    recipientName,
    recipientRef,
    issuedByUserId: actor.userId,
    assetPath,
    fileKind: input.fileKind ?? null,
  });

  if (generatedDocumentId) {
    await updateGeneratedDocumentFields(admin, generatedDocumentId, {
      certificate_number: certificateNumber,
    });
  }

  return toIssuedCertificateDto(row);
}

export async function revokeIssuedCertificateForActor(
  admin: SupabaseClient,
  actor: Actor,
  id: string,
  input: RevokeCertificateInput,
): Promise<IssuedCertificateDto> {
  const existing = await findIssuedCertificateById(admin, id);
  const canRevoke =
    !!existing &&
    (actor.isPlatformOperator ||
      (actor.memberships.some(
        (m) =>
          m.instituteId === existing.institute_id && m.status === "active",
      ) &&
        isWriter(actor, existing.institute_id)));

  if (!canRevoke || !existing) {
    throw AppError.notFound("Issued certificate not found");
  }

  if (existing.status !== "issued") {
    throw AppError.conflict("Only issued certificates can be revoked");
  }

  const reason = input.reason.trim();
  if (!reason) {
    throw AppError.validation("Referenced resource is invalid", {
      reason: ["Required"],
    });
  }

  const status = input.status ?? "revoked";
  const updated = await updateIssuedCertificateFields(admin, id, {
    status,
    revoked_at: new Date().toISOString(),
    revoked_by_user_id: actor.userId,
    revoke_reason: reason,
  });
  if (!updated) throw AppError.notFound("Issued certificate not found");
  return toIssuedCertificateDto(updated);
}
