import type { SupabaseClient } from "@supabase/supabase-js";
import { ensureDbOk } from "../../db/errors.js";
import type {
  StudentTransferRequestRow,
  TransferRequestStatus,
  TransferSharedFields,
} from "./types.js";

const COLS =
  "id, source_institute_id, destination_institute_id, source_student_id, destination_student_id, destination_academic_year_id, destination_class_id, destination_section_id, status, effective_on, initiated_by_user_id, decided_by_user_id, decision_reason, shared_fields, client_request_id, created_at, updated_at, deleted_at";

export async function findTransferById(
  admin: SupabaseClient,
  id: string,
): Promise<StudentTransferRequestRow | null> {
  const result = await admin
    .from("student_transfer_request")
    .select(COLS)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as StudentTransferRequestRow | null) ?? null;
}

export async function findTransferByClientRequestId(
  admin: SupabaseClient,
  sourceInstituteId: string,
  clientRequestId: string,
): Promise<StudentTransferRequestRow | null> {
  const result = await admin
    .from("student_transfer_request")
    .select(COLS)
    .eq("source_institute_id", sourceInstituteId)
    .eq("client_request_id", clientRequestId)
    .is("deleted_at", null)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as StudentTransferRequestRow | null) ?? null;
}

export async function findPendingTransferForStudent(
  admin: SupabaseClient,
  sourceStudentId: string,
): Promise<StudentTransferRequestRow | null> {
  const result = await admin
    .from("student_transfer_request")
    .select(COLS)
    .eq("source_student_id", sourceStudentId)
    .eq("status", "pending")
    .is("deleted_at", null)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as StudentTransferRequestRow | null) ?? null;
}

export async function listTransfersForInstitute(
  admin: SupabaseClient,
  instituteId: string,
  status?: TransferRequestStatus,
): Promise<StudentTransferRequestRow[]> {
  let asSource = admin
    .from("student_transfer_request")
    .select(COLS)
    .eq("source_institute_id", instituteId)
    .is("deleted_at", null);
  let asDest = admin
    .from("student_transfer_request")
    .select(COLS)
    .eq("destination_institute_id", instituteId)
    .is("deleted_at", null);
  if (status) {
    asSource = asSource.eq("status", status);
    asDest = asDest.eq("status", status);
  }
  const [src, dest] = await Promise.all([asSource, asDest]);
  const a = ensureDbOk(src) as StudentTransferRequestRow[];
  const b = ensureDbOk(dest) as StudentTransferRequestRow[];
  const byId = new Map<string, StudentTransferRequestRow>();
  for (const row of [...a, ...b]) byId.set(row.id, row);
  return [...byId.values()].sort((x, y) =>
    y.created_at.localeCompare(x.created_at),
  );
}

export async function insertTransferRequest(
  admin: SupabaseClient,
  input: {
    sourceInstituteId: string;
    destinationInstituteId: string;
    sourceStudentId: string;
    effectiveOn: string | null;
    initiatedByUserId: string;
    sharedFields: TransferSharedFields;
    clientRequestId: string | null;
  },
): Promise<StudentTransferRequestRow> {
  const result = await admin
    .from("student_transfer_request")
    .insert({
      source_institute_id: input.sourceInstituteId,
      destination_institute_id: input.destinationInstituteId,
      source_student_id: input.sourceStudentId,
      status: "pending",
      effective_on: input.effectiveOn,
      initiated_by_user_id: input.initiatedByUserId,
      shared_fields: input.sharedFields,
      client_request_id: input.clientRequestId,
    })
    .select(COLS)
    .single();
  return ensureDbOk(result) as StudentTransferRequestRow;
}

export async function updateTransferFields(
  admin: SupabaseClient,
  id: string,
  patch: Record<string, unknown>,
): Promise<StudentTransferRequestRow | null> {
  const result = await admin
    .from("student_transfer_request")
    .update(patch)
    .eq("id", id)
    .is("deleted_at", null)
    .select(COLS)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as StudentTransferRequestRow | null) ?? null;
}
