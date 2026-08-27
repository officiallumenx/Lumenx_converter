import type { SupabaseClient } from "@supabase/supabase-js";
import { ensureDbOk } from "../../db/errors.js";
import type {
  CreateOperatorInput,
  CreatePeriodInput,
  EntitlementInput,
  LicenseRow,
  ModuleEntitlementRow,
  PlatformOperatorRow,
  SubscriptionPeriodRow,
  SubscriptionRow,
  UpsertLicenseInput,
  UpsertSubscriptionInput,
} from "./types.js";

const OPERATOR_COLS =
  "id, user_id, role_code, handle, display_name, status, created_at, updated_at, deleted_at";

const LICENSE_COLS =
  "id, institute_id, plan, cadence, starts_on, reminder_days, created_at, updated_at, deleted_at";

const ENTITLEMENT_COLS =
  "id, institute_id, license_id, scope, portal_id, target_id, enabled, created_at, updated_at, deleted_at";

const SUBSCRIPTION_COLS =
  "id, institute_id, lifecycle_status, assigned_rate_inr, active_student_count, trial_start_at, trial_end_at, grace_ends_at, current_period_id, created_at, updated_at, deleted_at";

const PERIOD_COLS =
  "id, institute_id, subscription_id, duration_months, active_student_count, assigned_rate_inr, monthly_price_inr, regular_amount_inr, discount_amount_inr, payable_amount_inr, free_months, starts_at, ends_at, payment_method, payment_status, payment_ref, amount_paid_inr, paid_at, is_current, created_at, updated_at, deleted_at";

export async function listOperators(
  admin: SupabaseClient,
): Promise<PlatformOperatorRow[]> {
  const result = await admin
    .from("platform_operator")
    .select(OPERATOR_COLS)
    .is("deleted_at", null);
  return ensureDbOk(result) as PlatformOperatorRow[];
}

export async function findOperatorById(
  admin: SupabaseClient,
  id: string,
): Promise<PlatformOperatorRow | null> {
  const result = await admin
    .from("platform_operator")
    .select(OPERATOR_COLS)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as PlatformOperatorRow | null) ?? null;
}

export async function findOperatorByUserId(
  admin: SupabaseClient,
  userId: string,
): Promise<PlatformOperatorRow | null> {
  const result = await admin
    .from("platform_operator")
    .select(OPERATOR_COLS)
    .eq("user_id", userId)
    .is("deleted_at", null)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as PlatformOperatorRow | null) ?? null;
}

export async function insertOperator(
  admin: SupabaseClient,
  input: CreateOperatorInput,
): Promise<PlatformOperatorRow> {
  const result = await admin
    .from("platform_operator")
    .insert({
      user_id: input.userId,
      role_code: input.roleCode,
      handle: input.handle,
      display_name: input.displayName,
      status: input.status ?? "active",
    })
    .select(OPERATOR_COLS)
    .single();
  return ensureDbOk(result) as PlatformOperatorRow;
}

export async function updateOperatorFields(
  admin: SupabaseClient,
  id: string,
  patch: Record<string, unknown>,
): Promise<PlatformOperatorRow | null> {
  const result = await admin
    .from("platform_operator")
    .update(patch)
    .eq("id", id)
    .is("deleted_at", null)
    .select(OPERATOR_COLS)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as PlatformOperatorRow | null) ?? null;
}

export async function softDeleteOperator(
  admin: SupabaseClient,
  id: string,
): Promise<PlatformOperatorRow | null> {
  const result = await admin
    .from("platform_operator")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .is("deleted_at", null)
    .select(OPERATOR_COLS)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as PlatformOperatorRow | null) ?? null;
}

export async function findLicenseById(
  admin: SupabaseClient,
  id: string,
): Promise<LicenseRow | null> {
  const result = await admin
    .from("license")
    .select(LICENSE_COLS)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as LicenseRow | null) ?? null;
}

export async function findLicenseByInstituteId(
  admin: SupabaseClient,
  instituteId: string,
): Promise<LicenseRow | null> {
  const result = await admin
    .from("license")
    .select(LICENSE_COLS)
    .eq("institute_id", instituteId)
    .is("deleted_at", null)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as LicenseRow | null) ?? null;
}

export async function listLicenses(
  admin: SupabaseClient,
  instituteId?: string,
): Promise<LicenseRow[]> {
  let query = admin.from("license").select(LICENSE_COLS).is("deleted_at", null);
  if (instituteId) query = query.eq("institute_id", instituteId);
  const result = await query;
  return ensureDbOk(result) as LicenseRow[];
}

export async function insertLicense(
  admin: SupabaseClient,
  input: UpsertLicenseInput,
): Promise<LicenseRow> {
  const result = await admin
    .from("license")
    .insert({
      institute_id: input.instituteId,
      plan: input.plan,
      cadence: input.cadence,
      starts_on: input.startsOn ?? null,
      reminder_days: input.reminderDays ?? [30, 14, 7, 3, 1],
    })
    .select(LICENSE_COLS)
    .single();
  return ensureDbOk(result) as LicenseRow;
}

export async function updateLicenseFields(
  admin: SupabaseClient,
  id: string,
  patch: Record<string, unknown>,
): Promise<LicenseRow | null> {
  const result = await admin
    .from("license")
    .update(patch)
    .eq("id", id)
    .is("deleted_at", null)
    .select(LICENSE_COLS)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as LicenseRow | null) ?? null;
}

export async function softDeleteLicense(
  admin: SupabaseClient,
  id: string,
): Promise<LicenseRow | null> {
  const result = await admin
    .from("license")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .is("deleted_at", null)
    .select(LICENSE_COLS)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as LicenseRow | null) ?? null;
}

export async function listEntitlementsForLicense(
  admin: SupabaseClient,
  licenseId: string,
): Promise<ModuleEntitlementRow[]> {
  const result = await admin
    .from("module_entitlement")
    .select(ENTITLEMENT_COLS)
    .eq("license_id", licenseId)
    .is("deleted_at", null);
  return ensureDbOk(result) as ModuleEntitlementRow[];
}

export async function listEntitlementsForLicenses(
  admin: SupabaseClient,
  licenseIds: string[],
): Promise<ModuleEntitlementRow[]> {
  if (licenseIds.length === 0) return [];
  const result = await admin
    .from("module_entitlement")
    .select(ENTITLEMENT_COLS)
    .in("license_id", licenseIds)
    .is("deleted_at", null);
  return ensureDbOk(result) as ModuleEntitlementRow[];
}

export async function softDeleteEntitlementsForLicense(
  admin: SupabaseClient,
  licenseId: string,
): Promise<void> {
  const result = await admin
    .from("module_entitlement")
    .update({ deleted_at: new Date().toISOString() })
    .eq("license_id", licenseId)
    .is("deleted_at", null);
  ensureDbOk(result);
}

export async function insertEntitlements(
  admin: SupabaseClient,
  input: {
    instituteId: string;
    licenseId: string;
    entitlements: EntitlementInput[];
  },
): Promise<ModuleEntitlementRow[]> {
  if (input.entitlements.length === 0) return [];
  const result = await admin
    .from("module_entitlement")
    .insert(
      input.entitlements.map((e) => ({
        institute_id: input.instituteId,
        license_id: input.licenseId,
        scope: e.scope,
        portal_id: e.portalId ?? null,
        target_id: e.targetId,
        enabled: e.enabled ?? true,
      })),
    )
    .select(ENTITLEMENT_COLS);
  return ensureDbOk(result) as ModuleEntitlementRow[];
}

export async function findSubscriptionById(
  admin: SupabaseClient,
  id: string,
): Promise<SubscriptionRow | null> {
  const result = await admin
    .from("subscription")
    .select(SUBSCRIPTION_COLS)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as SubscriptionRow | null) ?? null;
}

export async function findSubscriptionByInstituteId(
  admin: SupabaseClient,
  instituteId: string,
): Promise<SubscriptionRow | null> {
  const result = await admin
    .from("subscription")
    .select(SUBSCRIPTION_COLS)
    .eq("institute_id", instituteId)
    .is("deleted_at", null)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as SubscriptionRow | null) ?? null;
}

export async function listSubscriptions(
  admin: SupabaseClient,
  instituteId?: string,
): Promise<SubscriptionRow[]> {
  let query = admin
    .from("subscription")
    .select(SUBSCRIPTION_COLS)
    .is("deleted_at", null);
  if (instituteId) query = query.eq("institute_id", instituteId);
  const result = await query;
  return ensureDbOk(result) as SubscriptionRow[];
}

export async function insertSubscription(
  admin: SupabaseClient,
  input: UpsertSubscriptionInput,
): Promise<SubscriptionRow> {
  const result = await admin
    .from("subscription")
    .insert({
      institute_id: input.instituteId,
      lifecycle_status: input.lifecycleStatus,
      assigned_rate_inr: input.assignedRateInr,
      active_student_count: input.activeStudentCount ?? 0,
      trial_start_at: input.trialStartAt ?? null,
      trial_end_at: input.trialEndAt ?? null,
      grace_ends_at: input.graceEndsAt ?? null,
    })
    .select(SUBSCRIPTION_COLS)
    .single();
  return ensureDbOk(result) as SubscriptionRow;
}

export async function updateSubscriptionFields(
  admin: SupabaseClient,
  id: string,
  patch: Record<string, unknown>,
): Promise<SubscriptionRow | null> {
  const result = await admin
    .from("subscription")
    .update(patch)
    .eq("id", id)
    .is("deleted_at", null)
    .select(SUBSCRIPTION_COLS)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as SubscriptionRow | null) ?? null;
}

export async function softDeleteSubscription(
  admin: SupabaseClient,
  id: string,
): Promise<SubscriptionRow | null> {
  const result = await admin
    .from("subscription")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .is("deleted_at", null)
    .select(SUBSCRIPTION_COLS)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as SubscriptionRow | null) ?? null;
}

export async function findPeriodById(
  admin: SupabaseClient,
  id: string,
): Promise<SubscriptionPeriodRow | null> {
  const result = await admin
    .from("subscription_period")
    .select(PERIOD_COLS)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as SubscriptionPeriodRow | null) ?? null;
}

export async function listPeriodsForSubscription(
  admin: SupabaseClient,
  subscriptionId: string,
): Promise<SubscriptionPeriodRow[]> {
  const result = await admin
    .from("subscription_period")
    .select(PERIOD_COLS)
    .eq("subscription_id", subscriptionId)
    .is("deleted_at", null);
  return ensureDbOk(result) as SubscriptionPeriodRow[];
}

export async function clearCurrentPeriods(
  admin: SupabaseClient,
  subscriptionId: string,
): Promise<void> {
  const result = await admin
    .from("subscription_period")
    .update({ is_current: false })
    .eq("subscription_id", subscriptionId)
    .eq("is_current", true)
    .is("deleted_at", null);
  ensureDbOk(result);
}

export async function insertPeriod(
  admin: SupabaseClient,
  input: CreatePeriodInput & { instituteId: string },
): Promise<SubscriptionPeriodRow> {
  const result = await admin
    .from("subscription_period")
    .insert({
      institute_id: input.instituteId,
      subscription_id: input.subscriptionId,
      duration_months: input.durationMonths,
      active_student_count: input.activeStudentCount,
      assigned_rate_inr: input.assignedRateInr,
      monthly_price_inr: input.monthlyPriceInr,
      regular_amount_inr: input.regularAmountInr,
      discount_amount_inr: input.discountAmountInr ?? 0,
      payable_amount_inr: input.payableAmountInr,
      free_months: input.freeMonths ?? 0,
      starts_at: input.startsAt,
      ends_at: input.endsAt,
      payment_method: input.paymentMethod,
      payment_status: input.paymentStatus ?? "none",
      payment_ref: input.paymentRef ?? null,
      amount_paid_inr: input.amountPaidInr ?? 0,
      paid_at: input.paidAt ?? null,
      is_current: false,
    })
    .select(PERIOD_COLS)
    .single();
  return ensureDbOk(result) as SubscriptionPeriodRow;
}

export async function setPeriodCurrent(
  admin: SupabaseClient,
  periodId: string,
): Promise<SubscriptionPeriodRow | null> {
  const result = await admin
    .from("subscription_period")
    .update({ is_current: true })
    .eq("id", periodId)
    .is("deleted_at", null)
    .select(PERIOD_COLS)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as SubscriptionPeriodRow | null) ?? null;
}
