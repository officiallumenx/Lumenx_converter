import type { SupabaseClient } from "@supabase/supabase-js";
import { ensureDbOk } from "../../db/errors.js";
import type {
  IssuedCertificateFileKind,
  IssuedCertificateRow,
  IssuedCertificateStatus,
  ListIssuedCertificatesFilter,
} from "./types.js";

export const ISSUED_CERTIFICATE_COLS =
  "id, institute_id, generated_document_id, template_id, student_id, teacher_id, certificate_number, sequence, year, title, category, template_name, template_version, recipient_name, recipient_ref, status, issued_at, issued_by_user_id, revoked_at, revoked_by_user_id, revoke_reason, asset_path, file_kind, created_at, updated_at, deleted_at";

export async function listIssuedCertificates(
  admin: SupabaseClient,
  filter: ListIssuedCertificatesFilter,
): Promise<IssuedCertificateRow[]> {
  let query = admin
    .from("issued_certificate")
    .select(ISSUED_CERTIFICATE_COLS)
    .eq("institute_id", filter.instituteId)
    .is("deleted_at", null);

  if (filter.studentId) query = query.eq("student_id", filter.studentId);
  if (filter.status) query = query.eq("status", filter.status);
  if (filter.templateId) query = query.eq("template_id", filter.templateId);

  const result = await query;
  return ensureDbOk(result) as IssuedCertificateRow[];
}

export async function findIssuedCertificateById(
  admin: SupabaseClient,
  id: string,
): Promise<IssuedCertificateRow | null> {
  const result = await admin
    .from("issued_certificate")
    .select(ISSUED_CERTIFICATE_COLS)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as IssuedCertificateRow | null) ?? null;
}

export async function findIssuedCertificateByNumber(
  admin: SupabaseClient,
  instituteId: string,
  certificateNumber: string,
): Promise<IssuedCertificateRow | null> {
  const result = await admin
    .from("issued_certificate")
    .select(ISSUED_CERTIFICATE_COLS)
    .eq("institute_id", instituteId)
    .eq("certificate_number", certificateNumber)
    .is("deleted_at", null)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as IssuedCertificateRow | null) ?? null;
}

export async function findIssuedByGeneratedDocumentId(
  admin: SupabaseClient,
  generatedDocumentId: string,
): Promise<IssuedCertificateRow | null> {
  const result = await admin
    .from("issued_certificate")
    .select(ISSUED_CERTIFICATE_COLS)
    .eq("generated_document_id", generatedDocumentId)
    .is("deleted_at", null)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as IssuedCertificateRow | null) ?? null;
}

export async function nextCertificateSequence(
  admin: SupabaseClient,
  instituteId: string,
  year: number,
): Promise<number> {
  const result = await admin
    .from("issued_certificate")
    .select("sequence")
    .eq("institute_id", instituteId)
    .eq("year", year)
    .is("deleted_at", null);
  const rows = ensureDbOk(result) as Array<{ sequence: number }>;
  let max = 0;
  for (const row of rows) {
    if (row.sequence > max) max = row.sequence;
  }
  return max + 1;
}

export async function insertIssuedCertificate(
  admin: SupabaseClient,
  input: {
    instituteId: string;
    generatedDocumentId: string | null;
    templateId: string;
    studentId: string | null;
    teacherId: string | null;
    certificateNumber: string;
    sequence: number;
    year: number;
    title: string;
    category: string | null;
    templateName: string;
    templateVersion: number;
    recipientName: string;
    recipientRef: string | null;
    issuedByUserId: string;
    assetPath: string | null;
    fileKind: IssuedCertificateFileKind | null;
  },
): Promise<IssuedCertificateRow> {
  const result = await admin
    .from("issued_certificate")
    .insert({
      institute_id: input.instituteId,
      generated_document_id: input.generatedDocumentId,
      template_id: input.templateId,
      student_id: input.studentId,
      teacher_id: input.teacherId,
      certificate_number: input.certificateNumber.trim(),
      sequence: input.sequence,
      year: input.year,
      title: input.title.trim(),
      category: input.category?.trim() || null,
      template_name: input.templateName.trim(),
      template_version: input.templateVersion,
      recipient_name: input.recipientName.trim(),
      recipient_ref: input.recipientRef?.trim() || null,
      status: "issued" satisfies IssuedCertificateStatus,
      issued_at: new Date().toISOString(),
      issued_by_user_id: input.issuedByUserId,
      revoked_at: null,
      revoked_by_user_id: null,
      revoke_reason: null,
      asset_path: input.assetPath,
      file_kind: input.fileKind,
    })
    .select(ISSUED_CERTIFICATE_COLS)
    .single();
  return ensureDbOk(result) as IssuedCertificateRow;
}

export async function updateIssuedCertificateFields(
  admin: SupabaseClient,
  id: string,
  patch: Record<string, unknown>,
): Promise<IssuedCertificateRow | null> {
  const result = await admin
    .from("issued_certificate")
    .update(patch)
    .eq("id", id)
    .is("deleted_at", null)
    .select(ISSUED_CERTIFICATE_COLS)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as IssuedCertificateRow | null) ?? null;
}
