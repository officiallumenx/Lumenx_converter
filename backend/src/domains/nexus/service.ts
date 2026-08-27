import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "../../errors/app-error.js";
import type { Actor } from "../../auth/types.js";
import {
  assertPlatformOperator,
  assertPlatformRoles,
} from "../../authorization/index.js";
import { findInstituteById, findProfileById } from "../identity/repository.js";
import {
  clearCurrentPeriods,
  findLicenseById,
  findLicenseByInstituteId,
  findOperatorById,
  findOperatorByUserId,
  findPeriodById,
  findSubscriptionById,
  findSubscriptionByInstituteId,
  insertEntitlements,
  insertLicense,
  insertOperator,
  insertPeriod,
  insertSubscription,
  listEntitlementsForLicense,
  listEntitlementsForLicenses,
  listLicenses,
  listOperators,
  listPeriodsForSubscription,
  listSubscriptions,
  setPeriodCurrent,
  softDeleteEntitlementsForLicense,
  softDeleteLicense,
  softDeleteOperator,
  softDeleteSubscription,
  updateLicenseFields,
  updateOperatorFields,
  updateSubscriptionFields,
} from "./repository.js";
import type {
  CreateOperatorInput,
  CreatePeriodInput,
  EntitlementInput,
  LicenseDto,
  LicenseRow,
  ModuleEntitlementDto,
  ModuleEntitlementRow,
  PlatformOperatorDto,
  PlatformOperatorRow,
  SubscriptionDto,
  SubscriptionPeriodDto,
  SubscriptionPeriodRow,
  SubscriptionRow,
  UpdateOperatorInput,
  UpsertLicenseInput,
  UpsertSubscriptionInput,
} from "./types.js";

export const PLATFORM_ROLE_CODES = [
  "nexus_root",
  "operations",
  "billing",
  "support",
  "analyst",
] as const;

export const NEXUS_ROOT_ROLES = ["nexus_root"] as const;

export const NEXUS_COMMERCIAL_WRITE_ROLES = [
  "nexus_root",
  "operations",
  "billing",
] as const;

export const NEXUS_SUPPORT_WRITE_ROLES = [
  "nexus_root",
  "operations",
  "support",
] as const;

function num(value: number | string): number {
  return typeof value === "number" ? value : Number(value);
}

export function toOperatorDto(row: PlatformOperatorRow): PlatformOperatorDto {
  return {
    id: row.id,
    userId: row.user_id,
    roleCode: row.role_code,
    handle: row.handle,
    displayName: row.display_name,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toEntitlementDto(row: ModuleEntitlementRow): ModuleEntitlementDto {
  return {
    id: row.id,
    scope: row.scope,
    portalId: row.portal_id,
    targetId: row.target_id,
    enabled: row.enabled,
  };
}

export function toLicenseDto(
  row: LicenseRow,
  entitlements: ModuleEntitlementRow[],
): LicenseDto {
  return {
    id: row.id,
    instituteId: row.institute_id,
    plan: row.plan,
    cadence: row.cadence,
    startsOn: row.starts_on,
    reminderDays: row.reminder_days ?? [],
    entitlements: entitlements.map(toEntitlementDto),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toPeriodDto(row: SubscriptionPeriodRow): SubscriptionPeriodDto {
  return {
    id: row.id,
    durationMonths: row.duration_months,
    activeStudentCount: row.active_student_count,
    assignedRateInr: num(row.assigned_rate_inr),
    monthlyPriceInr: num(row.monthly_price_inr),
    regularAmountInr: num(row.regular_amount_inr),
    discountAmountInr: num(row.discount_amount_inr),
    payableAmountInr: num(row.payable_amount_inr),
    freeMonths: row.free_months,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    paymentMethod: row.payment_method,
    paymentStatus: row.payment_status,
    paymentRef: row.payment_ref,
    amountPaidInr: num(row.amount_paid_inr),
    paidAt: row.paid_at,
    isCurrent: row.is_current,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toSubscriptionDto(
  row: SubscriptionRow,
  currentPeriod: SubscriptionPeriodRow | null,
): SubscriptionDto {
  return {
    id: row.id,
    instituteId: row.institute_id,
    lifecycleStatus: row.lifecycle_status,
    assignedRateInr: num(row.assigned_rate_inr),
    activeStudentCount: row.active_student_count,
    trialStartAt: row.trial_start_at,
    trialEndAt: row.trial_end_at,
    graceEndsAt: row.grace_ends_at,
    currentPeriodId: row.current_period_id,
    currentPeriod: currentPeriod ? toPeriodDto(currentPeriod) : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function assertNexusReader(actor: Actor): void {
  assertPlatformOperator(actor);
}

function assertNexusCommercialWriter(actor: Actor): void {
  assertPlatformRoles(actor, [...NEXUS_COMMERCIAL_WRITE_ROLES]);
}

function assertNexusRoot(actor: Actor): void {
  assertPlatformRoles(actor, [...NEXUS_ROOT_ROLES]);
}

function validateEntitlement(e: EntitlementInput): void {
  const targetId = e.targetId.trim();
  if (!targetId) {
    throw AppError.validation("entitlement targetId is required");
  }
  if (e.scope === "connect_module") {
    if (!e.portalId) {
      throw AppError.validation(
        "portalId is required for connect_module entitlements",
      );
    }
  } else if (e.portalId) {
    throw AppError.validation(
      "portalId is only allowed for connect_module entitlements",
    );
  }
}

async function requireActiveInstitute(
  admin: SupabaseClient,
  instituteId: string,
): Promise<void> {
  const institute = await findInstituteById(admin, instituteId);
  if (!institute) throw AppError.notFound("Institute not found");
  if (institute.status !== "active") {
    throw AppError.validation("Institute is not active");
  }
}

async function loadLicenseDto(
  admin: SupabaseClient,
  row: LicenseRow,
): Promise<LicenseDto> {
  const entitlements = await listEntitlementsForLicense(admin, row.id);
  return toLicenseDto(row, entitlements);
}

async function loadSubscriptionDto(
  admin: SupabaseClient,
  row: SubscriptionRow,
): Promise<SubscriptionDto> {
  let period: SubscriptionPeriodRow | null = null;
  if (row.current_period_id) {
    period = await findPeriodById(admin, row.current_period_id);
  }
  return toSubscriptionDto(row, period);
}

export async function listOperatorsForActor(
  admin: SupabaseClient,
  actor: Actor,
): Promise<PlatformOperatorDto[]> {
  assertNexusReader(actor);
  const rows = await listOperators(admin);
  return rows.map(toOperatorDto);
}

export async function getOperatorForActor(
  admin: SupabaseClient,
  actor: Actor,
  id: string,
): Promise<PlatformOperatorDto> {
  assertNexusReader(actor);
  const row = await findOperatorById(admin, id);
  if (!row) throw AppError.notFound("Platform operator not found");
  return toOperatorDto(row);
}

export async function createOperatorForActor(
  admin: SupabaseClient,
  actor: Actor,
  input: CreateOperatorInput,
): Promise<PlatformOperatorDto> {
  assertNexusRoot(actor);

  const handle = input.handle.trim();
  const displayName = input.displayName.trim();
  if (!handle || !displayName) {
    throw AppError.validation("handle and displayName are required");
  }
  if (
    !PLATFORM_ROLE_CODES.includes(
      input.roleCode as (typeof PLATFORM_ROLE_CODES)[number],
    )
  ) {
    throw AppError.validation("Invalid platform roleCode");
  }

  const profile = await findProfileById(admin, input.userId);
  if (!profile || profile.deleted_at) {
    throw AppError.notFound("User profile not found");
  }

  const existing = await findOperatorByUserId(admin, input.userId);
  if (existing) {
    throw AppError.conflict("User is already a platform operator");
  }

  const row = await insertOperator(admin, {
    ...input,
    handle,
    displayName,
  });
  return toOperatorDto(row);
}

export async function updateOperatorForActor(
  admin: SupabaseClient,
  actor: Actor,
  id: string,
  patch: UpdateOperatorInput,
): Promise<PlatformOperatorDto> {
  assertNexusRoot(actor);

  const existing = await findOperatorById(admin, id);
  if (!existing) throw AppError.notFound("Platform operator not found");

  const fields: Record<string, unknown> = {};
  if (patch.roleCode !== undefined) {
    if (
      !PLATFORM_ROLE_CODES.includes(
        patch.roleCode as (typeof PLATFORM_ROLE_CODES)[number],
      )
    ) {
      throw AppError.validation("Invalid platform roleCode");
    }
    fields.role_code = patch.roleCode;
  }
  if (patch.handle !== undefined) {
    const handle = patch.handle.trim();
    if (!handle) throw AppError.validation("handle cannot be empty");
    fields.handle = handle;
  }
  if (patch.displayName !== undefined) {
    const displayName = patch.displayName.trim();
    if (!displayName) throw AppError.validation("displayName cannot be empty");
    fields.display_name = displayName;
  }
  if (patch.status !== undefined) {
    fields.status = patch.status;
  }

  if (Object.keys(fields).length === 0) {
    return toOperatorDto(existing);
  }

  const updated = await updateOperatorFields(admin, id, fields);
  if (!updated) throw AppError.notFound("Platform operator not found");
  return toOperatorDto(updated);
}

export async function deleteOperatorForActor(
  admin: SupabaseClient,
  actor: Actor,
  id: string,
): Promise<void> {
  assertNexusRoot(actor);
  const existing = await findOperatorById(admin, id);
  if (!existing) throw AppError.notFound("Platform operator not found");
  if (existing.user_id === actor.userId) {
    throw AppError.forbidden("Cannot delete your own platform operator record");
  }
  const deleted = await softDeleteOperator(admin, id);
  if (!deleted) throw AppError.conflict("Operator was already deleted");
}

export async function listLicensesForActor(
  admin: SupabaseClient,
  actor: Actor,
  instituteId?: string,
): Promise<LicenseDto[]> {
  assertNexusReader(actor);
  const rows = await listLicenses(admin, instituteId);
  const entitlements = await listEntitlementsForLicenses(
    admin,
    rows.map((r) => r.id),
  );
  const byLicense = new Map<string, ModuleEntitlementRow[]>();
  for (const e of entitlements) {
    const list = byLicense.get(e.license_id) ?? [];
    list.push(e);
    byLicense.set(e.license_id, list);
  }
  return rows.map((r) => toLicenseDto(r, byLicense.get(r.id) ?? []));
}

export async function getLicenseForActor(
  admin: SupabaseClient,
  actor: Actor,
  id: string,
): Promise<LicenseDto> {
  assertNexusReader(actor);
  const row = await findLicenseById(admin, id);
  if (!row) throw AppError.notFound("License not found");
  return loadLicenseDto(admin, row);
}

export async function upsertLicenseForActor(
  admin: SupabaseClient,
  actor: Actor,
  input: UpsertLicenseInput,
): Promise<LicenseDto> {
  assertNexusCommercialWriter(actor);
  await requireActiveInstitute(admin, input.instituteId);

  if (input.entitlements) {
    for (const e of input.entitlements) validateEntitlement(e);
  }

  const existing = await findLicenseByInstituteId(admin, input.instituteId);
  let row: LicenseRow;

  if (existing) {
    const updated = await updateLicenseFields(admin, existing.id, {
      plan: input.plan,
      cadence: input.cadence,
      starts_on: input.startsOn ?? null,
      reminder_days: input.reminderDays ?? existing.reminder_days,
    });
    if (!updated) throw AppError.notFound("License not found");
    row = updated;

    if (input.entitlements) {
      await softDeleteEntitlementsForLicense(admin, row.id);
      await insertEntitlements(admin, {
        instituteId: row.institute_id,
        licenseId: row.id,
        entitlements: input.entitlements,
      });
    }
  } else {
    row = await insertLicense(admin, input);
    if (input.entitlements?.length) {
      await insertEntitlements(admin, {
        instituteId: row.institute_id,
        licenseId: row.id,
        entitlements: input.entitlements,
      });
    }
  }

  return loadLicenseDto(admin, row);
}

export async function deleteLicenseForActor(
  admin: SupabaseClient,
  actor: Actor,
  id: string,
): Promise<void> {
  assertNexusCommercialWriter(actor);
  const existing = await findLicenseById(admin, id);
  if (!existing) throw AppError.notFound("License not found");
  await softDeleteEntitlementsForLicense(admin, id);
  const deleted = await softDeleteLicense(admin, id);
  if (!deleted) throw AppError.conflict("License was already deleted");
}

export async function listSubscriptionsForActor(
  admin: SupabaseClient,
  actor: Actor,
  instituteId?: string,
): Promise<SubscriptionDto[]> {
  assertNexusReader(actor);
  const rows = await listSubscriptions(admin, instituteId);
  return Promise.all(rows.map((r) => loadSubscriptionDto(admin, r)));
}

export async function getSubscriptionForActor(
  admin: SupabaseClient,
  actor: Actor,
  id: string,
): Promise<SubscriptionDto> {
  assertNexusReader(actor);
  const row = await findSubscriptionById(admin, id);
  if (!row) throw AppError.notFound("Subscription not found");
  return loadSubscriptionDto(admin, row);
}

export async function upsertSubscriptionForActor(
  admin: SupabaseClient,
  actor: Actor,
  input: UpsertSubscriptionInput,
): Promise<SubscriptionDto> {
  assertNexusCommercialWriter(actor);
  await requireActiveInstitute(admin, input.instituteId);

  if (input.assignedRateInr < 0) {
    throw AppError.validation("assignedRateInr must be >= 0");
  }
  if (
    input.activeStudentCount !== undefined &&
    input.activeStudentCount < 0
  ) {
    throw AppError.validation("activeStudentCount must be >= 0");
  }

  const existing = await findSubscriptionByInstituteId(
    admin,
    input.instituteId,
  );

  let row: SubscriptionRow;
  if (existing) {
    const updated = await updateSubscriptionFields(admin, existing.id, {
      lifecycle_status: input.lifecycleStatus,
      assigned_rate_inr: input.assignedRateInr,
      active_student_count:
        input.activeStudentCount ?? existing.active_student_count,
      trial_start_at:
        input.trialStartAt !== undefined
          ? input.trialStartAt
          : existing.trial_start_at,
      trial_end_at:
        input.trialEndAt !== undefined
          ? input.trialEndAt
          : existing.trial_end_at,
      grace_ends_at:
        input.graceEndsAt !== undefined
          ? input.graceEndsAt
          : existing.grace_ends_at,
    });
    if (!updated) throw AppError.notFound("Subscription not found");
    row = updated;
  } else {
    row = await insertSubscription(admin, input);
  }

  return loadSubscriptionDto(admin, row);
}

export async function deleteSubscriptionForActor(
  admin: SupabaseClient,
  actor: Actor,
  id: string,
): Promise<void> {
  assertNexusCommercialWriter(actor);
  const existing = await findSubscriptionById(admin, id);
  if (!existing) throw AppError.notFound("Subscription not found");
  // Clear FK pointer before soft-delete so period rows can remain historical.
  await updateSubscriptionFields(admin, id, { current_period_id: null });
  const deleted = await softDeleteSubscription(admin, id);
  if (!deleted) throw AppError.conflict("Subscription was already deleted");
}

export async function listPeriodsForActor(
  admin: SupabaseClient,
  actor: Actor,
  subscriptionId: string,
): Promise<SubscriptionPeriodDto[]> {
  assertNexusReader(actor);
  const sub = await findSubscriptionById(admin, subscriptionId);
  if (!sub) throw AppError.notFound("Subscription not found");
  const rows = await listPeriodsForSubscription(admin, subscriptionId);
  return rows.map(toPeriodDto);
}

export async function createPeriodForActor(
  admin: SupabaseClient,
  actor: Actor,
  input: CreatePeriodInput,
): Promise<SubscriptionPeriodDto> {
  assertNexusCommercialWriter(actor);

  const sub = await findSubscriptionById(admin, input.subscriptionId);
  if (!sub) throw AppError.notFound("Subscription not found");

  if (new Date(input.endsAt) < new Date(input.startsAt)) {
    throw AppError.validation("endsAt must be >= startsAt");
  }

  let period = await insertPeriod(admin, {
    ...input,
    instituteId: sub.institute_id,
  });

  const makeCurrent = input.makeCurrent !== false;
  if (makeCurrent) {
    await clearCurrentPeriods(admin, sub.id);
    period = (await setPeriodCurrent(admin, period.id)) ?? period;
    await updateSubscriptionFields(admin, sub.id, {
      current_period_id: period.id,
    });
  }

  return toPeriodDto(period);
}
