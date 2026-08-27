import type { SupabaseClient } from "@supabase/supabase-js";
import { ensureDbOk } from "../../db/errors.js";
import type {
  BillingAdjustmentRow,
  CreateAdjustmentInput,
  CreatePaymentInput,
  CreateRenewalInput,
  PaymentRow,
  RenewalRecordRow,
} from "./types.js";

const RENEWAL_COLS =
  "id, institute_id, subscription_id, subscription_period_id, invoice_number, status, period_starts_at, period_ends_at, due_at, issued_at, active_student_count, assigned_rate_inr, regular_amount_inr, discount_amount_inr, payable_amount_inr, amount_paid_inr, notes, created_by_user_id, created_at, updated_at, deleted_at";

const ADJUSTMENT_COLS =
  "id, institute_id, subscription_id, renewal_record_id, kind, status, purchase_student_count, live_student_count, additional_student_count, additional_monthly_inr, remaining_months, payable_amount_inr, note, created_by_user_id, applied_at, applied_by_user_id, created_at, updated_at, deleted_at";

const PAYMENT_COLS =
  "id, institute_id, subscription_id, renewal_record_id, billing_adjustment_id, amount_inr, method, status, provider, provider_ref, note, recorded_by_user_id, recorded_at, verified_by_user_id, verified_at, created_at, updated_at, deleted_at";

export async function listRenewalsByInstitute(
  admin: SupabaseClient,
  instituteId: string,
): Promise<RenewalRecordRow[]> {
  const result = await admin
    .from("renewal_record")
    .select(RENEWAL_COLS)
    .eq("institute_id", instituteId)
    .is("deleted_at", null);
  return ensureDbOk(result) as RenewalRecordRow[];
}

export async function findRenewalById(
  admin: SupabaseClient,
  id: string,
): Promise<RenewalRecordRow | null> {
  const result = await admin
    .from("renewal_record")
    .select(RENEWAL_COLS)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as RenewalRecordRow | null) ?? null;
}

export async function findRenewalByInstituteInvoice(
  admin: SupabaseClient,
  instituteId: string,
  invoiceNumber: string,
): Promise<RenewalRecordRow | null> {
  const result = await admin
    .from("renewal_record")
    .select(RENEWAL_COLS)
    .eq("institute_id", instituteId)
    .eq("invoice_number", invoiceNumber)
    .is("deleted_at", null)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as RenewalRecordRow | null) ?? null;
}

export async function insertRenewal(
  admin: SupabaseClient,
  input: CreateRenewalInput & { createdByUserId: string },
): Promise<RenewalRecordRow> {
  const result = await admin
    .from("renewal_record")
    .insert({
      institute_id: input.instituteId,
      subscription_id: input.subscriptionId,
      subscription_period_id: input.subscriptionPeriodId ?? null,
      invoice_number: input.invoiceNumber,
      status: "draft",
      period_starts_at: input.periodStartsAt,
      period_ends_at: input.periodEndsAt,
      due_at: input.dueAt ?? null,
      active_student_count: input.activeStudentCount ?? 0,
      assigned_rate_inr: input.assignedRateInr ?? 0,
      regular_amount_inr: input.regularAmountInr ?? 0,
      discount_amount_inr: input.discountAmountInr ?? 0,
      payable_amount_inr: input.payableAmountInr ?? 0,
      amount_paid_inr: 0,
      notes: input.notes ?? null,
      created_by_user_id: input.createdByUserId,
    })
    .select(RENEWAL_COLS)
    .single();
  return ensureDbOk(result) as RenewalRecordRow;
}

export async function updateRenewalFields(
  admin: SupabaseClient,
  id: string,
  patch: Record<string, unknown>,
): Promise<RenewalRecordRow | null> {
  const result = await admin
    .from("renewal_record")
    .update(patch)
    .eq("id", id)
    .is("deleted_at", null)
    .select(RENEWAL_COLS)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as RenewalRecordRow | null) ?? null;
}

export async function listAdjustmentsByInstitute(
  admin: SupabaseClient,
  instituteId: string,
): Promise<BillingAdjustmentRow[]> {
  const result = await admin
    .from("billing_adjustment")
    .select(ADJUSTMENT_COLS)
    .eq("institute_id", instituteId)
    .is("deleted_at", null);
  return ensureDbOk(result) as BillingAdjustmentRow[];
}

export async function findAdjustmentById(
  admin: SupabaseClient,
  id: string,
): Promise<BillingAdjustmentRow | null> {
  const result = await admin
    .from("billing_adjustment")
    .select(ADJUSTMENT_COLS)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as BillingAdjustmentRow | null) ?? null;
}

export async function insertAdjustment(
  admin: SupabaseClient,
  input: CreateAdjustmentInput & { createdByUserId: string },
): Promise<BillingAdjustmentRow> {
  const result = await admin
    .from("billing_adjustment")
    .insert({
      institute_id: input.instituteId,
      subscription_id: input.subscriptionId,
      renewal_record_id: input.renewalRecordId ?? null,
      kind: input.kind ?? "headcount_increase",
      status: "pending",
      purchase_student_count: input.purchaseStudentCount ?? 0,
      live_student_count: input.liveStudentCount ?? 0,
      additional_student_count: input.additionalStudentCount ?? 0,
      additional_monthly_inr: input.additionalMonthlyInr ?? 0,
      remaining_months: input.remainingMonths ?? 0,
      payable_amount_inr: input.payableAmountInr ?? 0,
      note: input.note ?? null,
      created_by_user_id: input.createdByUserId,
    })
    .select(ADJUSTMENT_COLS)
    .single();
  return ensureDbOk(result) as BillingAdjustmentRow;
}

export async function updateAdjustmentFields(
  admin: SupabaseClient,
  id: string,
  patch: Record<string, unknown>,
): Promise<BillingAdjustmentRow | null> {
  const result = await admin
    .from("billing_adjustment")
    .update(patch)
    .eq("id", id)
    .is("deleted_at", null)
    .select(ADJUSTMENT_COLS)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as BillingAdjustmentRow | null) ?? null;
}

export async function listPaymentsByInstitute(
  admin: SupabaseClient,
  instituteId: string,
): Promise<PaymentRow[]> {
  const result = await admin
    .from("payment")
    .select(PAYMENT_COLS)
    .eq("institute_id", instituteId)
    .is("deleted_at", null);
  return ensureDbOk(result) as PaymentRow[];
}

export async function findPaymentById(
  admin: SupabaseClient,
  id: string,
): Promise<PaymentRow | null> {
  const result = await admin
    .from("payment")
    .select(PAYMENT_COLS)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as PaymentRow | null) ?? null;
}

export async function insertPayment(
  admin: SupabaseClient,
  input: CreatePaymentInput & { recordedByUserId: string },
): Promise<PaymentRow> {
  const result = await admin
    .from("payment")
    .insert({
      institute_id: input.instituteId,
      subscription_id: input.subscriptionId ?? null,
      renewal_record_id: input.renewalRecordId ?? null,
      billing_adjustment_id: input.billingAdjustmentId ?? null,
      amount_inr: input.amountInr,
      method: input.method ?? "offline",
      status: "recorded",
      provider: input.provider ?? null,
      provider_ref: input.providerRef ?? null,
      note: input.note ?? null,
      recorded_by_user_id: input.recordedByUserId,
    })
    .select(PAYMENT_COLS)
    .single();
  return ensureDbOk(result) as PaymentRow;
}

export async function updatePaymentFields(
  admin: SupabaseClient,
  id: string,
  patch: Record<string, unknown>,
): Promise<PaymentRow | null> {
  const result = await admin
    .from("payment")
    .update(patch)
    .eq("id", id)
    .is("deleted_at", null)
    .select(PAYMENT_COLS)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as PaymentRow | null) ?? null;
}
