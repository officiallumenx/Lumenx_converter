import type { SupabaseClient } from "@supabase/supabase-js";
import { ensureDbOk } from "../../db/errors.js";
import type {
  ConcessionRow,
  CreateFeeComponentInput,
  CreateFeePlanInput,
  FeeComponentRow,
  FeePaymentRow,
  FeePlanRow,
  StudentFeeRow,
  UpsertConcessionInput,
} from "./types.js";

const PLAN_COLS =
  "id, institute_id, academic_year_id, status, publish_scope, published_class_ids, published_at, created_at, updated_at, deleted_at";

const COMPONENT_COLS =
  "id, institute_id, fee_plan_id, kind, name, active, assigned_to_all, assigned_class_ids, class_amounts, created_at, updated_at, deleted_at";

const STUDENT_FEE_COLS =
  "id, institute_id, fee_plan_id, student_id, billed_amount, paid_amount, status, created_at, updated_at, deleted_at";

const PAYMENT_COLS =
  "id, institute_id, fee_plan_id, student_fee_id, student_id, amount, method, receipt_no, paid_on, note, recorded_by_user_id, created_at, updated_at, deleted_at";

const CONCESSION_COLS =
  "id, institute_id, fee_plan_id, student_id, fee_component_id, amount, note, created_at, updated_at, deleted_at";

function normalizeClassAmounts(
  value: unknown,
): Record<string, number> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    const n = typeof v === "number" ? v : Number(v);
    if (Number.isFinite(n)) out[k] = n;
  }
  return out;
}

function mapComponent(row: FeeComponentRow): FeeComponentRow {
  return {
    ...row,
    class_amounts: normalizeClassAmounts(row.class_amounts),
    assigned_class_ids: row.assigned_class_ids ?? [],
  };
}

export async function findFeePlanById(
  admin: SupabaseClient,
  id: string,
): Promise<FeePlanRow | null> {
  const result = await admin
    .from("fee_plan")
    .select(PLAN_COLS)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  const row = result.data as FeePlanRow | null;
  if (!row) return null;
  return { ...row, published_class_ids: row.published_class_ids ?? [] };
}

export async function findFeePlanByInstituteYear(
  admin: SupabaseClient,
  instituteId: string,
  academicYearId: string,
): Promise<FeePlanRow | null> {
  const result = await admin
    .from("fee_plan")
    .select(PLAN_COLS)
    .eq("institute_id", instituteId)
    .eq("academic_year_id", academicYearId)
    .is("deleted_at", null)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  const row = result.data as FeePlanRow | null;
  if (!row) return null;
  return { ...row, published_class_ids: row.published_class_ids ?? [] };
}

export async function listFeePlans(
  admin: SupabaseClient,
  instituteId: string,
): Promise<FeePlanRow[]> {
  const result = await admin
    .from("fee_plan")
    .select(PLAN_COLS)
    .eq("institute_id", instituteId)
    .is("deleted_at", null);
  const rows = ensureDbOk(result) as FeePlanRow[];
  return rows.map((r) => ({
    ...r,
    published_class_ids: r.published_class_ids ?? [],
  }));
}

export async function insertFeePlan(
  admin: SupabaseClient,
  input: CreateFeePlanInput,
): Promise<FeePlanRow> {
  const result = await admin
    .from("fee_plan")
    .insert({
      institute_id: input.instituteId,
      academic_year_id: input.academicYearId,
      status: "draft",
      publish_scope: "institute",
      published_class_ids: [],
      published_at: null,
    })
    .select(PLAN_COLS)
    .single();
  const row = ensureDbOk(result) as FeePlanRow;
  return { ...row, published_class_ids: row.published_class_ids ?? [] };
}

export async function updateFeePlanFields(
  admin: SupabaseClient,
  id: string,
  patch: Record<string, unknown>,
): Promise<FeePlanRow | null> {
  const result = await admin
    .from("fee_plan")
    .update(patch)
    .eq("id", id)
    .is("deleted_at", null)
    .select(PLAN_COLS)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  const row = result.data as FeePlanRow | null;
  if (!row) return null;
  return { ...row, published_class_ids: row.published_class_ids ?? [] };
}

export async function listComponentsForPlan(
  admin: SupabaseClient,
  feePlanId: string,
): Promise<FeeComponentRow[]> {
  const result = await admin
    .from("fee_component")
    .select(COMPONENT_COLS)
    .eq("fee_plan_id", feePlanId)
    .is("deleted_at", null);
  return (ensureDbOk(result) as FeeComponentRow[]).map(mapComponent);
}

export async function findComponentById(
  admin: SupabaseClient,
  id: string,
): Promise<FeeComponentRow | null> {
  const result = await admin
    .from("fee_component")
    .select(COMPONENT_COLS)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  const row = result.data as FeeComponentRow | null;
  return row ? mapComponent(row) : null;
}

export async function insertComponent(
  admin: SupabaseClient,
  input: CreateFeeComponentInput & { instituteId: string },
): Promise<FeeComponentRow> {
  const result = await admin
    .from("fee_component")
    .insert({
      institute_id: input.instituteId,
      fee_plan_id: input.feePlanId,
      kind: input.kind,
      name: input.name,
      active: input.active ?? true,
      assigned_to_all: input.assignedToAll ?? true,
      assigned_class_ids: input.assignedClassIds ?? [],
      class_amounts: input.classAmounts ?? {},
    })
    .select(COMPONENT_COLS)
    .single();
  return mapComponent(ensureDbOk(result) as FeeComponentRow);
}

export async function updateComponentFields(
  admin: SupabaseClient,
  id: string,
  patch: Record<string, unknown>,
): Promise<FeeComponentRow | null> {
  const result = await admin
    .from("fee_component")
    .update(patch)
    .eq("id", id)
    .is("deleted_at", null)
    .select(COMPONENT_COLS)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  const row = result.data as FeeComponentRow | null;
  return row ? mapComponent(row) : null;
}

export async function softDeleteComponent(
  admin: SupabaseClient,
  id: string,
): Promise<FeeComponentRow | null> {
  const result = await admin
    .from("fee_component")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .is("deleted_at", null)
    .select(COMPONENT_COLS)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  const row = result.data as FeeComponentRow | null;
  return row ? mapComponent(row) : null;
}

export async function listConcessionsForPlan(
  admin: SupabaseClient,
  feePlanId: string,
  studentId?: string,
): Promise<ConcessionRow[]> {
  let query = admin
    .from("concession")
    .select(CONCESSION_COLS)
    .eq("fee_plan_id", feePlanId)
    .is("deleted_at", null);
  if (studentId) query = query.eq("student_id", studentId);
  return ensureDbOk(await query) as ConcessionRow[];
}

export async function findConcessionById(
  admin: SupabaseClient,
  id: string,
): Promise<ConcessionRow | null> {
  const result = await admin
    .from("concession")
    .select(CONCESSION_COLS)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as ConcessionRow | null) ?? null;
}

export async function findConcessionTriple(
  admin: SupabaseClient,
  input: { feePlanId: string; studentId: string; feeComponentId: string },
): Promise<ConcessionRow | null> {
  const result = await admin
    .from("concession")
    .select(CONCESSION_COLS)
    .eq("fee_plan_id", input.feePlanId)
    .eq("student_id", input.studentId)
    .eq("fee_component_id", input.feeComponentId)
    .is("deleted_at", null)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as ConcessionRow | null) ?? null;
}

export async function insertConcession(
  admin: SupabaseClient,
  input: UpsertConcessionInput & { instituteId: string },
): Promise<ConcessionRow> {
  const result = await admin
    .from("concession")
    .insert({
      institute_id: input.instituteId,
      fee_plan_id: input.feePlanId,
      student_id: input.studentId,
      fee_component_id: input.feeComponentId,
      amount: input.amount,
      note: input.note ?? null,
    })
    .select(CONCESSION_COLS)
    .single();
  return ensureDbOk(result) as ConcessionRow;
}

export async function updateConcessionFields(
  admin: SupabaseClient,
  id: string,
  patch: Record<string, unknown>,
): Promise<ConcessionRow | null> {
  const result = await admin
    .from("concession")
    .update(patch)
    .eq("id", id)
    .is("deleted_at", null)
    .select(CONCESSION_COLS)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as ConcessionRow | null) ?? null;
}

export async function softDeleteConcession(
  admin: SupabaseClient,
  id: string,
): Promise<ConcessionRow | null> {
  const result = await admin
    .from("concession")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .is("deleted_at", null)
    .select(CONCESSION_COLS)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as ConcessionRow | null) ?? null;
}

export async function findStudentFee(
  admin: SupabaseClient,
  feePlanId: string,
  studentId: string,
): Promise<StudentFeeRow | null> {
  const result = await admin
    .from("student_fee")
    .select(STUDENT_FEE_COLS)
    .eq("fee_plan_id", feePlanId)
    .eq("student_id", studentId)
    .is("deleted_at", null)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as StudentFeeRow | null) ?? null;
}

export async function upsertStudentFeeLedger(
  admin: SupabaseClient,
  input: {
    instituteId: string;
    feePlanId: string;
    studentId: string;
    billedAmount: number;
    paidAmount: number;
    status: string;
  },
): Promise<StudentFeeRow> {
  const existing = await findStudentFee(admin, input.feePlanId, input.studentId);
  if (existing) {
    const result = await admin
      .from("student_fee")
      .update({
        billed_amount: input.billedAmount,
        paid_amount: input.paidAmount,
        status: input.status,
      })
      .eq("id", existing.id)
      .is("deleted_at", null)
      .select(STUDENT_FEE_COLS)
      .single();
    return ensureDbOk(result) as StudentFeeRow;
  }
  const result = await admin
    .from("student_fee")
    .insert({
      institute_id: input.instituteId,
      fee_plan_id: input.feePlanId,
      student_id: input.studentId,
      billed_amount: input.billedAmount,
      paid_amount: input.paidAmount,
      status: input.status,
    })
    .select(STUDENT_FEE_COLS)
    .single();
  return ensureDbOk(result) as StudentFeeRow;
}

export async function listStudentFeesForInstitute(
  admin: SupabaseClient,
  instituteId: string,
): Promise<StudentFeeRow[]> {
  const result = await admin
    .from("student_fee")
    .select(STUDENT_FEE_COLS)
    .eq("institute_id", instituteId)
    .is("deleted_at", null);
  return ensureDbOk(result) as StudentFeeRow[];
}

export async function listPaymentsForInstitute(
  admin: SupabaseClient,
  instituteId: string,
): Promise<FeePaymentRow[]> {
  const result = await admin
    .from("fee_payment")
    .select(PAYMENT_COLS)
    .eq("institute_id", instituteId)
    .is("deleted_at", null);
  return ensureDbOk(result) as FeePaymentRow[];
}

export async function listPaymentsForPlan(
  admin: SupabaseClient,
  feePlanId: string,
  studentId?: string,
): Promise<FeePaymentRow[]> {
  let query = admin
    .from("fee_payment")
    .select(PAYMENT_COLS)
    .eq("fee_plan_id", feePlanId)
    .is("deleted_at", null);
  if (studentId) query = query.eq("student_id", studentId);
  return ensureDbOk(await query) as FeePaymentRow[];
}

export async function insertPayment(
  admin: SupabaseClient,
  input: {
    instituteId: string;
    feePlanId: string;
    studentFeeId: string;
    studentId: string;
    amount: number;
    method: string;
    receiptNo: string;
    paidOn: string;
    note: string | null;
    recordedByUserId: string;
  },
): Promise<FeePaymentRow> {
  const result = await admin
    .from("fee_payment")
    .insert({
      institute_id: input.instituteId,
      fee_plan_id: input.feePlanId,
      student_fee_id: input.studentFeeId,
      student_id: input.studentId,
      amount: input.amount,
      method: input.method,
      receipt_no: input.receiptNo,
      paid_on: input.paidOn,
      note: input.note,
      recorded_by_user_id: input.recordedByUserId,
    })
    .select(PAYMENT_COLS)
    .single();
  return ensureDbOk(result) as FeePaymentRow;
}

export async function sumPaymentsForStudent(
  admin: SupabaseClient,
  feePlanId: string,
  studentId: string,
): Promise<number> {
  const rows = await listPaymentsForPlan(admin, feePlanId, studentId);
  return rows.reduce((sum, r) => sum + Number(r.amount), 0);
}

export async function findActiveEnrollmentForStudentYear(
  admin: SupabaseClient,
  input: { studentId: string; academicYearId: string; instituteId: string },
): Promise<{ id: string; class_id: string } | null> {
  const result = await admin
    .from("enrollment")
    .select("id, class_id")
    .eq("student_id", input.studentId)
    .eq("academic_year_id", input.academicYearId)
    .eq("institute_id", input.instituteId)
    .eq("status", "active")
    .is("deleted_at", null)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as { id: string; class_id: string } | null) ?? null;
}

export async function findClassInInstituteYear(
  admin: SupabaseClient,
  input: { classId: string; instituteId: string; academicYearId: string },
): Promise<{ id: string } | null> {
  const result = await admin
    .from("class")
    .select("id")
    .eq("id", input.classId)
    .eq("institute_id", input.instituteId)
    .eq("academic_year_id", input.academicYearId)
    .is("deleted_at", null)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as { id: string } | null) ?? null;
}
