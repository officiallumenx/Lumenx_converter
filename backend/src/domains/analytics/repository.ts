import type { SupabaseClient } from "@supabase/supabase-js";
import { ensureDbOk } from "../../db/errors.js";

const MARK_COLS =
  "id, institute_id, register_id, student_id, enrollment_id, status, created_at, updated_at, deleted_at";

const PAYMENT_COLS =
  "id, institute_id, fee_plan_id, student_fee_id, student_id, amount, method, receipt_no, paid_on, note, recorded_by_user_id, created_at, updated_at, deleted_at";

export type AttendanceMarkFactRow = {
  id: string;
  institute_id: string;
  register_id: string;
  student_id: string;
  status: string;
};

export type FeePaymentFactRow = {
  id: string;
  institute_id: string;
  fee_plan_id: string;
  amount: number | string;
  paid_on: string;
};

/** Batch-load marks for submitted registers (always institute-filtered). */
export async function listMarksForRegisterIds(
  admin: SupabaseClient,
  registerIds: string[],
  instituteId: string,
): Promise<AttendanceMarkFactRow[]> {
  if (registerIds.length === 0) return [];
  const chunkSize = 100;
  const out: AttendanceMarkFactRow[] = [];
  for (let i = 0; i < registerIds.length; i += chunkSize) {
    const chunk = registerIds.slice(i, i + chunkSize);
    const result = await admin
      .from("attendance_mark")
      .select(MARK_COLS)
      .eq("institute_id", instituteId)
      .in("register_id", chunk)
      .is("deleted_at", null);
    out.push(...(ensureDbOk(result) as AttendanceMarkFactRow[]));
  }
  return out;
}

/** Institute-wide fee payments (all plans). */
export async function listFeePaymentsForInstitute(
  admin: SupabaseClient,
  instituteId: string,
): Promise<FeePaymentFactRow[]> {
  const result = await admin
    .from("fee_payment")
    .select(PAYMENT_COLS)
    .eq("institute_id", instituteId)
    .is("deleted_at", null);
  return ensureDbOk(result) as FeePaymentFactRow[];
}
