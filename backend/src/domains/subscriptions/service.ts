import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "../../errors/app-error.js";
import type { Actor } from "../../auth/types.js";
import {
  assertInstituteRoles,
  requireInstituteId,
} from "../../authorization/index.js";
import { findInstituteById } from "../identity/repository.js";
import {
  findPeriodById,
  findSubscriptionByInstituteId,
  findLicenseByInstituteId,
  listEntitlementsForLicense,
} from "../nexus/repository.js";
import { toPeriodDto } from "../nexus/service.js";
import { STUDENT_STAFF_READ_ROLES } from "../students/service.js";
import {
  findPaymentById,
  findRenewalById,
  insertPayment,
  insertRenewal,
  listPaymentsByInstitute,
  listRenewalsByInstitute,
  updateRenewalFields,
} from "../billing/repository.js";
import type { PaymentRow, RenewalRecordRow } from "../billing/types.js";
import {
  addUtcDays,
  calculateSubscriptionQuote,
  parseSubscriptionDuration,
  quoteAllDurations,
  type SubscriptionDurationMonths,
  type SubscriptionQuoteDto,
} from "./pricing.js";
import type {
  InstituteSubscriptionCurrentDto,
  InstituteSubscriptionDetailDto,
  InstituteSubscriptionHistoryDto,
  InstituteSubscriptionPeriodDto,
  OfflinePaymentSubmissionDto,
  SubmitOfflinePaymentInput,
} from "./types.js";

const DEFAULT_MODULES: Record<string, boolean> = {
  students: true,
  teachers: true,
  parents: true,
  attendance: true,
  fees: true,
  analytics: true,
  reports: true,
  alerts: true,
};

const INSTITUTE_BILLING_WRITE_ROLES = ["institute_admin"] as const;

function num(value: number | string): number {
  return typeof value === "number" ? value : Number(value);
}

function assertSubscriptionReader(actor: Actor, instituteId: string): void {
  requireInstituteId(actor, instituteId);
  if (actor.isPlatformOperator) return;
  assertInstituteRoles(actor, instituteId, [...STUDENT_STAFF_READ_ROLES]);
}

function assertSubscriptionBillingWriter(actor: Actor, instituteId: string): void {
  requireInstituteId(actor, instituteId);
  if (actor.isPlatformOperator) return;
  assertInstituteRoles(actor, instituteId, [...INSTITUTE_BILLING_WRITE_ROLES]);
}

function toPeriodSummary(
  row: Awaited<ReturnType<typeof findPeriodById>>,
): InstituteSubscriptionPeriodDto | null {
  if (!row) return null;
  const dto = toPeriodDto(row);
  return {
    id: dto.id,
    durationMonths: dto.durationMonths,
    activeStudentCount: dto.activeStudentCount,
    assignedRateInr: dto.assignedRateInr,
    monthlyPriceInr: dto.monthlyPriceInr,
    regularAmountInr: dto.regularAmountInr,
    discountAmountInr: dto.discountAmountInr,
    payableAmountInr: dto.payableAmountInr,
    freeMonths: dto.freeMonths,
    startsAt: dto.startsAt,
    endsAt: dto.endsAt,
    paymentMethod: dto.paymentMethod,
    paymentStatus: dto.paymentStatus,
    paymentRef: dto.paymentRef,
    amountPaidInr: dto.amountPaidInr,
    paidAt: dto.paidAt,
    isCurrent: dto.isCurrent,
  };
}

function deriveDurationMonths(renewal: RenewalRecordRow): SubscriptionDurationMonths {
  const monthlyPrice =
    renewal.active_student_count > 0
      ? Math.max(
          8_000,
          Math.round(renewal.active_student_count * num(renewal.assigned_rate_inr)),
        )
      : num(renewal.regular_amount_inr);
  if (monthlyPrice <= 0) return 1;
  const raw = Math.round(num(renewal.regular_amount_inr) / monthlyPrice);
  return parseSubscriptionDuration(raw) ?? 1;
}

function deriveFreeMonths(
  renewal: RenewalRecordRow,
  monthlyPriceInr: number,
): number {
  if (monthlyPriceInr <= 0) return 0;
  return Math.round(num(renewal.discount_amount_inr) / monthlyPriceInr);
}

function toOfflineSubmission(
  renewal: RenewalRecordRow,
  payment: PaymentRow,
  instituteName: string,
): OfflinePaymentSubmissionDto {
  const monthlyPrice =
    renewal.active_student_count > 0
      ? Math.max(
          8_000,
          Math.round(renewal.active_student_count * num(renewal.assigned_rate_inr)),
        )
      : num(renewal.regular_amount_inr);
  const durationMonths = deriveDurationMonths(renewal);
  const freeMonths = deriveFreeMonths(renewal, monthlyPrice);

  let status: OfflinePaymentSubmissionDto["status"] = "verification_pending";
  if (payment.status === "verified") status = "paid";
  if (payment.status === "rejected") status = "rejected";

  return {
    paymentId: payment.id,
    renewalId: renewal.id,
    instituteId: renewal.institute_id,
    instituteName,
    durationMonths,
    activeStudentCount: renewal.active_student_count,
    assignedRateInr: num(renewal.assigned_rate_inr),
    monthlyPriceInr: monthlyPrice,
    regularAmountInr: num(renewal.regular_amount_inr),
    discountAmountInr: num(renewal.discount_amount_inr),
    payableAmountInr: num(renewal.payable_amount_inr),
    freeMonths,
    referenceId: payment.provider_ref ?? "",
    proofLabel: payment.note?.startsWith("proof:")
      ? payment.note.slice("proof:".length)
      : null,
    status,
    submittedAt: payment.recorded_at,
    reviewedAt: payment.verified_at,
    reviewedBy: null,
    rejectionReason:
      payment.status === "rejected" ? (payment.note ?? "Payment rejected") : null,
  };
}

function findPendingOfflinePair(
  renewals: RenewalRecordRow[],
  payments: PaymentRow[],
): { renewal: RenewalRecordRow; payment: PaymentRow } | null {
  for (const renewal of renewals) {
    if (renewal.status !== "pending") continue;
    const payment = payments.find(
      (p) =>
        p.renewal_record_id === renewal.id &&
        p.status === "recorded" &&
        p.method === "offline",
    );
    if (payment) return { renewal, payment };
  }
  return null;
}

function newInvoiceNumber(): string {
  return `OFF-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

/**
 * Read current institute subscription for Admin modules page.
 */
export async function getCurrentSubscriptionForActor(
  admin: SupabaseClient,
  actor: Actor,
  instituteIdRaw: string,
): Promise<InstituteSubscriptionCurrentDto> {
  const instituteId = requireInstituteId(actor, instituteIdRaw);
  assertSubscriptionReader(actor, instituteId);

  try {
    const [sub, license] = await Promise.all([
      findSubscriptionByInstituteId(admin, instituteId),
      findLicenseByInstituteId(admin, instituteId),
    ]);

    let modules = { ...DEFAULT_MODULES };
    if (license) {
      const entitlements = await listEntitlementsForLicense(admin, license.id);
      const adminMods = entitlements.filter((e) => e.scope === "admin_module");
      if (adminMods.length > 0) {
        modules = {};
        for (const e of adminMods) {
          modules[e.target_id] = e.enabled;
        }
      }
    }

    return {
      plan: license?.plan ?? "core",
      status: sub?.lifecycle_status ?? "registered",
      modules,
      studentLimit: sub?.active_student_count ?? 0,
    };
  } catch {
    return {
      plan: "core",
      status: "registered",
      modules: { ...DEFAULT_MODULES },
      studentLimit: 0,
    };
  }
}

export async function getSubscriptionDetailForActor(
  admin: SupabaseClient,
  actor: Actor,
  instituteIdRaw: string,
): Promise<InstituteSubscriptionDetailDto> {
  const instituteId = requireInstituteId(actor, instituteIdRaw);
  assertSubscriptionReader(actor, instituteId);

  const institute = await findInstituteById(admin, instituteId);
  if (!institute) throw AppError.notFound("Institute not found");

  const sub = await findSubscriptionByInstituteId(admin, instituteId);
  if (!sub) {
    return {
      instituteId,
      instituteName: institute.name,
      subscriptionId: null,
      lifecycleStatus: "registered",
      assignedRateInr: 12,
      activeStudentCount: 0,
      trialStartAt: null,
      trialEndAt: null,
      graceEndsAt: null,
      currentPeriod: null,
      pendingOfflinePayment: null,
    };
  }

  const [currentPeriodRow, renewals, payments] = await Promise.all([
    sub.current_period_id
      ? findPeriodById(admin, sub.current_period_id)
      : Promise.resolve(null),
    listRenewalsByInstitute(admin, instituteId),
    listPaymentsByInstitute(admin, instituteId),
  ]);

  const pendingPair = findPendingOfflinePair(renewals, payments);

  return {
    instituteId,
    instituteName: institute.name,
    subscriptionId: sub.id,
    lifecycleStatus: sub.lifecycle_status,
    assignedRateInr: num(sub.assigned_rate_inr),
    activeStudentCount: sub.active_student_count,
    trialStartAt: sub.trial_start_at,
    trialEndAt: sub.trial_end_at,
    graceEndsAt: sub.grace_ends_at,
    currentPeriod: toPeriodSummary(currentPeriodRow),
    pendingOfflinePayment: pendingPair
      ? toOfflineSubmission(pendingPair.renewal, pendingPair.payment, institute.name)
      : null,
  };
}

export async function getSubscriptionQuoteForActor(
  admin: SupabaseClient,
  actor: Actor,
  instituteIdRaw: string,
  durationMonthsRaw: SubscriptionDurationMonths | null,
): Promise<SubscriptionQuoteDto | SubscriptionQuoteDto[]> {
  const instituteId = requireInstituteId(actor, instituteIdRaw);
  assertSubscriptionReader(actor, instituteId);

  const sub = await findSubscriptionByInstituteId(admin, instituteId);
  if (!sub) {
    throw AppError.notFound("Subscription not found for institute");
  }

  const base = {
    activeStudentCount: sub.active_student_count,
    assignedRateInr: num(sub.assigned_rate_inr),
  };

  if (durationMonthsRaw == null) {
    return quoteAllDurations(base);
  }

  const durationMonths = parseSubscriptionDuration(durationMonthsRaw);
  if (!durationMonths) {
    throw AppError.validation("duration_months must be 1, 6, or 12");
  }

  return calculateSubscriptionQuote({ ...base, durationMonths });
}

export async function getSubscriptionHistoryForActor(
  admin: SupabaseClient,
  actor: Actor,
  instituteIdRaw: string,
): Promise<InstituteSubscriptionHistoryDto> {
  const instituteId = requireInstituteId(actor, instituteIdRaw);
  assertSubscriptionReader(actor, instituteId);

  const [renewals, payments] = await Promise.all([
    listRenewalsByInstitute(admin, instituteId),
    listPaymentsByInstitute(admin, instituteId),
  ]);

  return {
    renewals: renewals
      .filter((r) => r.status !== "draft")
      .map((r) => ({
        id: r.id,
        invoiceNumber: r.invoice_number,
        status: r.status,
        periodStartsAt: r.period_starts_at,
        periodEndsAt: r.period_ends_at,
        activeStudentCount: r.active_student_count,
        assignedRateInr: num(r.assigned_rate_inr),
        payableAmountInr: num(r.payable_amount_inr),
        amountPaidInr: num(r.amount_paid_inr),
        issuedAt: r.issued_at,
        createdAt: r.created_at,
      }))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    payments: payments
      .filter((p) => p.status === "verified" || p.status === "rejected")
      .map((p) => ({
        id: p.id,
        renewalId: p.renewal_record_id,
        amountInr: num(p.amount_inr),
        method: p.method,
        status: p.status,
        providerRef: p.provider_ref,
        recordedAt: p.recorded_at,
        verifiedAt: p.verified_at,
      }))
      .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt)),
  };
}

/**
 * Institute admin submits offline bank/UPI payment for Nexus verification.
 * Creates pending renewal + recorded payment — never activates subscription.
 */
export async function submitOfflinePaymentForActor(
  admin: SupabaseClient,
  actor: Actor,
  input: SubmitOfflinePaymentInput,
): Promise<OfflinePaymentSubmissionDto> {
  const instituteId = requireInstituteId(actor, input.instituteId);
  assertSubscriptionBillingWriter(actor, instituteId);

  const referenceId = input.referenceId.trim();
  if (!referenceId) {
    throw AppError.validation("reference_id is required");
  }

  const durationMonths = parseSubscriptionDuration(input.durationMonths);
  if (!durationMonths) {
    throw AppError.validation("duration_months must be 1, 6, or 12");
  }

  const institute = await findInstituteById(admin, instituteId);
  if (!institute) throw AppError.notFound("Institute not found");

  const sub = await findSubscriptionByInstituteId(admin, instituteId);
  if (!sub) throw AppError.notFound("Subscription not found for institute");

  const [renewals, payments] = await Promise.all([
    listRenewalsByInstitute(admin, instituteId),
    listPaymentsByInstitute(admin, instituteId),
  ]);

  if (findPendingOfflinePair(renewals, payments)) {
    throw AppError.conflict(
      "An offline payment is already awaiting verification",
    );
  }

  const quote = calculateSubscriptionQuote({
    activeStudentCount: sub.active_student_count,
    assignedRateInr: num(sub.assigned_rate_inr),
    durationMonths,
  });

  const startAt = new Date().toISOString();
  const endAt = addUtcDays(startAt, durationMonths * 30);

  const renewal = await insertRenewal(admin, {
    instituteId,
    subscriptionId: sub.id,
    invoiceNumber: newInvoiceNumber(),
    periodStartsAt: startAt,
    periodEndsAt: endAt,
    activeStudentCount: quote.activeStudentCount,
    assignedRateInr: quote.assignedRateInr,
    regularAmountInr: quote.regularAmountInr,
    discountAmountInr: quote.discountAmountInr,
    payableAmountInr: quote.payableAmountInr,
    notes: input.proofLabel?.trim()
      ? `proof:${input.proofLabel.trim()}`
      : null,
    createdByUserId: actor.userId,
  });

  await updateRenewalFields(admin, renewal.id, { status: "pending" });

  const note = input.proofLabel?.trim()
    ? `proof:${input.proofLabel.trim()}`
    : null;

  const payment = await insertPayment(admin, {
    instituteId,
    subscriptionId: sub.id,
    renewalRecordId: renewal.id,
    amountInr: quote.payableAmountInr,
    method: "offline",
    providerRef: referenceId,
    note,
    recordedByUserId: actor.userId,
  });

  const updatedRenewal = (await findRenewalById(admin, renewal.id)) ?? renewal;
  const updatedPayment = (await findPaymentById(admin, payment.id)) ?? payment;

  return toOfflineSubmission(updatedRenewal, updatedPayment, institute.name);
}

export {
  deriveDurationMonths,
  deriveFreeMonths,
  toOfflineSubmission,
  findPendingOfflinePair,
};
