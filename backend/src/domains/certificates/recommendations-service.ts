import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "../../errors/app-error.js";
import type { Actor } from "../../auth/types.js";
import {
  actorHasInstituteRole,
  requireInstituteId,
} from "../../authorization/index.js";
import { findStudentById } from "../students/repository.js";
import {
  findCertificateRecommendationById,
  findPendingRecommendationByAchievement,
  insertCertificateRecommendation,
  listCertificateRecommendations,
  updateCertificateRecommendationFields,
} from "./recommendations-repository.js";
import type {
  CertificateRecommendationDto,
  CertificateRecommendationRow,
  CreateCertificateRecommendationInput,
  UpdateCertificateRecommendationInput,
} from "./recommendations-types.js";
import { CERTIFICATE_WRITE_ROLES, CERTIFICATE_STAFF_READ_ROLES } from "./service.js";

export const CERTIFICATE_RECOMMENDATION_WRITE_ROLES = [
  ...CERTIFICATE_WRITE_ROLES,
  "teacher",
] as const;

function toRecommendationDto(
  row: CertificateRecommendationRow,
): CertificateRecommendationDto {
  return {
    id: row.id,
    instituteId: row.institute_id,
    achievementId: row.achievement_id,
    achievementTitle: row.achievement_title,
    achievementType: row.achievement_type,
    studentId: row.student_id,
    studentName: row.student_name,
    studentClassLabel: row.student_class_label,
    recommendedByUserId: row.recommended_by_user_id,
    recommendedByName: row.recommended_by_name,
    note: row.note,
    status: row.status,
    issuedCertificateId: row.issued_certificate_id,
    issuedAt: row.issued_at,
    dismissedAt: row.dismissed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function isStaffReader(actor: Actor, instituteId: string): boolean {
  if (actor.isPlatformOperator) return true;
  return CERTIFICATE_STAFF_READ_ROLES.some((role) =>
    actorHasInstituteRole(actor, instituteId, role),
  );
}

function canRecommend(actor: Actor, instituteId: string): boolean {
  if (actor.isPlatformOperator) return true;
  return CERTIFICATE_RECOMMENDATION_WRITE_ROLES.some((role) =>
    actorHasInstituteRole(actor, instituteId, role),
  );
}

function canManageRecommendations(actor: Actor, instituteId: string): boolean {
  if (actor.isPlatformOperator) return true;
  return CERTIFICATE_WRITE_ROLES.some((role) =>
    actorHasInstituteRole(actor, instituteId, role),
  );
}

export async function listCertificateRecommendationsForActor(
  admin: SupabaseClient,
  actor: Actor,
  instituteIdRaw: string,
  status?: "pending" | "issued" | "dismissed",
): Promise<CertificateRecommendationDto[]> {
  const instituteId = requireInstituteId(actor, instituteIdRaw);
  if (!isStaffReader(actor, instituteId)) {
    throw AppError.forbidden("Insufficient access to certificate recommendations");
  }
  const rows = await listCertificateRecommendations(admin, instituteId, status);
  return rows.map(toRecommendationDto);
}

export async function createCertificateRecommendationForActor(
  admin: SupabaseClient,
  actor: Actor,
  input: CreateCertificateRecommendationInput,
): Promise<CertificateRecommendationDto> {
  const instituteId = requireInstituteId(actor, input.instituteId);
  if (!canRecommend(actor, instituteId)) {
    throw AppError.forbidden("Insufficient access to create certificate recommendations");
  }

  const student = await findStudentById(admin, input.studentId);
  if (!student || student.institute_id !== instituteId) {
    throw AppError.validation("Referenced resource is invalid", {
      student_id: ["Student not found in this institute"],
    });
  }

  const achievementId = input.achievementId?.trim() || null;
  if (achievementId) {
    const existing = await findPendingRecommendationByAchievement(
      admin,
      instituteId,
      achievementId,
    );
    if (existing) return toRecommendationDto(existing);
  }

  const row = await insertCertificateRecommendation(admin, {
    id: crypto.randomUUID(),
    instituteId,
    achievementId,
    achievementTitle: input.achievementTitle.trim(),
    achievementType: input.achievementType.trim(),
    studentId: input.studentId,
    studentName: input.studentName.trim(),
    studentClassLabel: input.studentClassLabel?.trim() || null,
    recommendedByUserId: actor.userId,
    recommendedByName: input.recommendedByName?.trim() || "Activity Teacher",
    note: input.note?.trim() || null,
  });

  return toRecommendationDto(row);
}

export async function updateCertificateRecommendationForActor(
  admin: SupabaseClient,
  actor: Actor,
  id: string,
  input: UpdateCertificateRecommendationInput,
): Promise<CertificateRecommendationDto> {
  const existing = await findCertificateRecommendationById(admin, id);
  if (!existing || !canManageRecommendations(actor, existing.institute_id)) {
    throw AppError.notFound("Certificate recommendation not found");
  }

  if (existing.status !== "pending") {
    throw AppError.conflict("Only pending recommendations can be updated");
  }

  const now = new Date().toISOString();
  const fields: Record<string, unknown> = { status: input.status };
  if (input.status === "issued") {
    fields.issued_at = now;
    fields.issued_certificate_id = input.issuedCertificateId ?? null;
  } else {
    fields.dismissed_at = now;
  }

  const updated = await updateCertificateRecommendationFields(admin, id, fields);
  if (!updated) throw AppError.notFound("Certificate recommendation not found");
  return toRecommendationDto(updated);
}

export type PublicCertificateVerifyDto = {
  valid: boolean;
  instituteId: string;
  instituteName: string;
  certificateNumber: string;
  title: string;
  recipientName: string;
  category: string | null;
  templateName: string;
  status: string;
  issuedAt: string | null;
  revokedAt: string | null;
  revokeReason: string | null;
};

export async function verifyIssuedCertificatePublic(
  admin: SupabaseClient,
  instituteId: string,
  certificateNumber: string,
): Promise<PublicCertificateVerifyDto> {
  const { findIssuedCertificateByNumber } = await import("./repository.js");
  const { findInstituteById } = await import("../identity/repository.js");

  const number = certificateNumber.trim();
  if (!number) {
    throw AppError.validation("Referenced resource is invalid", {
      certificate_number: ["Required"],
    });
  }

  const institute = await findInstituteById(admin, instituteId);
  if (!institute) {
    throw AppError.notFound("Institute not found");
  }

  const row = await findIssuedCertificateByNumber(admin, instituteId, number);
  if (!row) {
    throw AppError.notFound("Certificate not found");
  }

  const valid = row.status === "issued";

  return {
    valid,
    instituteId: row.institute_id,
    instituteName: institute.name,
    certificateNumber: row.certificate_number,
    title: row.title,
    recipientName: row.recipient_name,
    category: row.category,
    templateName: row.template_name,
    status: row.status,
    issuedAt: row.issued_at,
    revokedAt: row.revoked_at,
    revokeReason: row.revoke_reason,
  };
}

export function buildCertificateVerifyUrl(
  connectOrigin: string,
  instituteId: string,
  certificateNumber: string,
): string {
  const base = connectOrigin.replace(/\/+$/, "");
  const query = new URLSearchParams({
    institute_id: instituteId,
    number: certificateNumber,
  });
  return `${base}/verify-certificate?${query.toString()}`;
}
