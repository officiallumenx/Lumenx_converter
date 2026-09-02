import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "../../errors/app-error.js";
import type { Actor } from "../../auth/types.js";
import {
  assertInstituteRoles,
  assertPlatformOperator,
  assertPlatformRoles,
  requireInstituteId,
} from "../../authorization/index.js";
import { findInstituteById } from "../identity/repository.js";
import {
  clearCurrentPeriods,
  findSubscriptionById,
  findSubscriptionByInstituteId,
  insertPeriod,
  setPeriodCurrent,
  updateSubscriptionFields,
} from "../nexus/repository.js";
import { NEXUS_COMMERCIAL_WRITE_ROLES } from "../nexus/service.js";
import { addUtcDays, DEFAULT_GRACE_DAYS } from "../subscriptions/pricing.js";
import {
  deriveDurationMonths,
  deriveFreeMonths,
  toOfflineSubmission,
} from "../subscriptions/service.js";
import {
  findAdjustmentById,
  findPaymentById,
  findRenewalById,
  findRenewalByInstituteInvoice,
  insertAdjustment,
  insertPayment,
  insertRenewal,
  listAdjustmentsByInstitute,
  listPaymentsByInstitute,
  listRecordedPayments,
  listRenewalsByInstitute,
  updateAdjustmentFields,
  updatePaymentFields,
  updateRenewalFields,
} from "./repository.js";
import type { OfflinePaymentSubmissionDto } from "../subscriptions/types.js";
import {
  calculateSubscriptionQuote,
  parseSubscriptionDuration,
  type SubscriptionDurationMonths,
} from "../subscriptions/pricing.js";
import { persistInstitutePdfAsset } from "../documents/persist-file.js";
import { listAssets } from "../assets/repository.js";
import { getAssetSignedUrlForActor } from "../assets/service.js";
import { renderInvoicePdf } from "./render-invoice-pdf.js";
import type {
  BillingAdjustmentDto,
  BillingAdjustmentRow,
  CreateAdjustmentInput,
  CreatePaymentInput,
  CreateRenewalInput,
  InvoicePdfSignedUrlDto,
  IssueInvoiceFromSubscriptionInput,
  IssueInvoiceResultDto,
  PaymentDto,
  PaymentRow,
  RenewalRecordDto,
  RenewalRecordRow,
  RenewalStatus,
  UpdateAdjustmentInput,
  UpdateRenewalInput,
} from "./types.js";

const RENEWAL_STATUSES: RenewalStatus[] = [
  "draft",
  "issued",
  "pending",
  "paid",
  "overdue",
  "cancelled",
];

function num(value: number | string): number {
  return typeof value === "number" ? value : Number(value);
}

function assertBillingReader(actor: Actor): void {
  assertPlatformOperator(actor);
}

function assertBillingWriter(actor: Actor): void {
  assertPlatformRoles(actor, [...NEXUS_COMMERCIAL_WRITE_ROLES]);
}

export function toRenewalDto(row: RenewalRecordRow): RenewalRecordDto {
  return {
    id: row.id,
    instituteId: row.institute_id,
    subscriptionId: row.subscription_id,
    subscriptionPeriodId: row.subscription_period_id,
    invoiceNumber: row.invoice_number,
    status: row.status,
    periodStartsAt: row.period_starts_at,
    periodEndsAt: row.period_ends_at,
    dueAt: row.due_at,
    issuedAt: row.issued_at,
    activeStudentCount: row.active_student_count,
    assignedRateInr: num(row.assigned_rate_inr),
    regularAmountInr: num(row.regular_amount_inr),
    discountAmountInr: num(row.discount_amount_inr),
    payableAmountInr: num(row.payable_amount_inr),
    amountPaidInr: num(row.amount_paid_inr),
    notes: row.notes,
    createdByUserId: row.created_by_user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toAdjustmentDto(
  row: BillingAdjustmentRow,
): BillingAdjustmentDto {
  return {
    id: row.id,
    instituteId: row.institute_id,
    subscriptionId: row.subscription_id,
    renewalRecordId: row.renewal_record_id,
    kind: row.kind,
    status: row.status,
    purchaseStudentCount: row.purchase_student_count,
    liveStudentCount: row.live_student_count,
    additionalStudentCount: row.additional_student_count,
    additionalMonthlyInr: num(row.additional_monthly_inr),
    remainingMonths: row.remaining_months,
    payableAmountInr: num(row.payable_amount_inr),
    note: row.note,
    createdByUserId: row.created_by_user_id,
    appliedAt: row.applied_at,
    appliedByUserId: row.applied_by_user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toPaymentDto(row: PaymentRow): PaymentDto {
  return {
    id: row.id,
    instituteId: row.institute_id,
    subscriptionId: row.subscription_id,
    renewalRecordId: row.renewal_record_id,
    billingAdjustmentId: row.billing_adjustment_id,
    amountInr: num(row.amount_inr),
    method: row.method,
    status: row.status,
    provider: row.provider,
    providerRef: row.provider_ref,
    note: row.note,
    recordedByUserId: row.recorded_by_user_id,
    recordedAt: row.recorded_at,
    verifiedByUserId: row.verified_by_user_id,
    verifiedAt: row.verified_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function requireLiveSubscription(
  admin: SupabaseClient,
  subscriptionId: string,
  instituteId: string,
) {
  const sub = await findSubscriptionById(admin, subscriptionId);
  if (!sub) throw AppError.notFound("Subscription not found");
  if (sub.institute_id !== instituteId) {
    throw AppError.validation("Subscription does not belong to institute");
  }
  return sub;
}

function newNexusInvoiceNumber(): string {
  return `LX-INV-${Date.now().toString(36).toUpperCase()}-${Math.random()
    .toString(36)
    .slice(2, 6)
    .toUpperCase()}`;
}

async function ensureRenewalInvoicePdf(
  admin: SupabaseClient,
  actor: Actor,
  renewal: RenewalRecordRow,
): Promise<InvoicePdfSignedUrlDto> {
  const existingAssets = await listAssets(admin, {
    instituteId: renewal.institute_id,
    linkedEntityKind: "other",
    linkedEntityId: renewal.id,
    category: "generated_document",
  });
  let assetId = existingAssets[0]?.id ?? null;

  if (!assetId) {
    const institute = await findInstituteById(admin, renewal.institute_id);
    const pdfBytes = renderInvoicePdf({
      invoiceNumber: renewal.invoice_number,
      instituteName: institute?.name ?? renewal.institute_id,
      instituteId: renewal.institute_id,
      status: renewal.status,
      periodStartsAt: renewal.period_starts_at,
      periodEndsAt: renewal.period_ends_at,
      dueAt: renewal.due_at,
      issuedAt: renewal.issued_at,
      activeStudentCount: renewal.active_student_count,
      assignedRateInr: num(renewal.assigned_rate_inr),
      regularAmountInr: num(renewal.regular_amount_inr),
      discountAmountInr: num(renewal.discount_amount_inr),
      payableAmountInr: num(renewal.payable_amount_inr),
      amountPaidInr: num(renewal.amount_paid_inr),
      notes: renewal.notes,
    });
    const safeName = renewal.invoice_number.replace(/[^\w.-]+/g, "-");
    const file = await persistInstitutePdfAsset(admin, actor, {
      instituteId: renewal.institute_id,
      bucket: "generated-documents",
      category: "generated_document",
      fileName: `${safeName}.pdf`,
      body: pdfBytes,
      linkedEntityKind: "other",
      linkedEntityId: renewal.id,
    });
    assetId = file.assetId;
  }

  const signed = await getAssetSignedUrlForActor(admin, actor, assetId);
  return {
    signedUrl: signed.signedUrl,
    expiresAt: signed.expiresAt,
    assetId: signed.assetId,
    renewalId: renewal.id,
    invoiceNumber: renewal.invoice_number,
  };
}

async function activateSubscriptionFromPaidRenewal(
  admin: SupabaseClient,
  renewal: RenewalRecordRow,
  payment: PaymentRow,
): Promise<void> {
  if (renewal.subscription_period_id) return;

  const sub = await findSubscriptionById(admin, renewal.subscription_id);
  if (!sub) return;

  const durationMonths = deriveDurationMonths(renewal);
  const monthlyPriceInr =
    renewal.active_student_count > 0
      ? Math.max(
          8_000,
          Math.round(
            renewal.active_student_count * num(renewal.assigned_rate_inr),
          ),
        )
      : num(renewal.regular_amount_inr);
  const freeMonths = deriveFreeMonths(renewal, monthlyPriceInr);

  const startAt = new Date().toISOString();
  const endAt = addUtcDays(startAt, durationMonths * 30);
  const graceEndsAt = addUtcDays(endAt, DEFAULT_GRACE_DAYS);

  let period = await insertPeriod(admin, {
    subscriptionId: sub.id,
    instituteId: sub.institute_id,
    durationMonths,
    activeStudentCount: renewal.active_student_count,
    assignedRateInr: num(renewal.assigned_rate_inr),
    monthlyPriceInr,
    regularAmountInr: num(renewal.regular_amount_inr),
    discountAmountInr: num(renewal.discount_amount_inr),
    payableAmountInr: num(renewal.payable_amount_inr),
    freeMonths,
    startsAt: startAt,
    endsAt: endAt,
    paymentMethod: "offline",
    paymentStatus: "paid",
    paymentRef: payment.provider_ref,
    amountPaidInr: num(payment.amount_inr),
    paidAt: payment.verified_at ?? startAt,
    makeCurrent: true,
  });

  await clearCurrentPeriods(admin, sub.id);
  period = (await setPeriodCurrent(admin, period.id)) ?? period;

  await updateSubscriptionFields(admin, sub.id, {
    lifecycle_status: "active",
    current_period_id: period.id,
    grace_ends_at: graceEndsAt,
    active_student_count: renewal.active_student_count,
    assigned_rate_inr: num(renewal.assigned_rate_inr),
  });

  await updateRenewalFields(admin, renewal.id, {
    status: "paid",
    subscription_period_id: period.id,
    period_starts_at: startAt,
    period_ends_at: endAt,
    amount_paid_inr: num(renewal.payable_amount_inr),
  });
}

// ── Renewals ─────────────────────────────────────────────────

export async function listRenewalsForActor(
  admin: SupabaseClient,
  actor: Actor,
  instituteId: string,
): Promise<RenewalRecordDto[]> {
  assertBillingReader(actor);
  const rows = await listRenewalsByInstitute(admin, instituteId);
  return rows.map(toRenewalDto);
}

export async function getRenewalForActor(
  admin: SupabaseClient,
  actor: Actor,
  id: string,
): Promise<RenewalRecordDto> {
  assertBillingReader(actor);
  const row = await findRenewalById(admin, id);
  if (!row) throw AppError.notFound("Renewal record not found");
  return toRenewalDto(row);
}

export async function createRenewalForActor(
  admin: SupabaseClient,
  actor: Actor,
  input: CreateRenewalInput,
): Promise<RenewalRecordDto> {
  assertBillingWriter(actor);

  const invoiceNumber = input.invoiceNumber.trim();
  if (!invoiceNumber) {
    throw AppError.validation("invoiceNumber is required");
  }
  if (new Date(input.periodEndsAt) < new Date(input.periodStartsAt)) {
    throw AppError.validation("periodEndsAt must be >= periodStartsAt");
  }

  await requireLiveSubscription(
    admin,
    input.subscriptionId,
    input.instituteId,
  );

  const duplicate = await findRenewalByInstituteInvoice(
    admin,
    input.instituteId,
    invoiceNumber,
  );
  if (duplicate) {
    throw AppError.conflict("Invoice number already exists for institute");
  }

  const row = await insertRenewal(admin, {
    ...input,
    invoiceNumber,
    createdByUserId: actor.userId,
  });
  return toRenewalDto(row);
}

export async function updateRenewalForActor(
  admin: SupabaseClient,
  actor: Actor,
  id: string,
  patch: UpdateRenewalInput,
): Promise<RenewalRecordDto> {
  assertBillingWriter(actor);

  const existing = await findRenewalById(admin, id);
  if (!existing) throw AppError.notFound("Renewal record not found");

  const fields: Record<string, unknown> = {};
  if (patch.status !== undefined) {
    if (!RENEWAL_STATUSES.includes(patch.status)) {
      throw AppError.validation("Invalid renewal status");
    }
    if (patch.status === "paid") {
      const amountPaid =
        patch.amountPaidInr !== undefined
          ? patch.amountPaidInr
          : num(existing.amount_paid_inr);
      const payable =
        patch.payableAmountInr !== undefined
          ? patch.payableAmountInr
          : num(existing.payable_amount_inr);
      if (amountPaid < payable) {
        throw AppError.validation(
          "Cannot mark paid until amountPaidInr >= payableAmountInr",
        );
      }
    }
    fields.status = patch.status;
  }
  if (patch.dueAt !== undefined) fields.due_at = patch.dueAt;
  if (patch.activeStudentCount !== undefined) {
    fields.active_student_count = patch.activeStudentCount;
  }
  if (patch.assignedRateInr !== undefined) {
    fields.assigned_rate_inr = patch.assignedRateInr;
  }
  if (patch.regularAmountInr !== undefined) {
    fields.regular_amount_inr = patch.regularAmountInr;
  }
  if (patch.discountAmountInr !== undefined) {
    fields.discount_amount_inr = patch.discountAmountInr;
  }
  if (patch.payableAmountInr !== undefined) {
    fields.payable_amount_inr = patch.payableAmountInr;
  }
  if (patch.amountPaidInr !== undefined) {
    fields.amount_paid_inr = patch.amountPaidInr;
  }
  if (patch.notes !== undefined) fields.notes = patch.notes;

  if (Object.keys(fields).length === 0) {
    return toRenewalDto(existing);
  }

  const updated = await updateRenewalFields(admin, id, fields);
  if (!updated) throw AppError.notFound("Renewal record not found");
  return toRenewalDto(updated);
}

export async function issueRenewalForActor(
  admin: SupabaseClient,
  actor: Actor,
  id: string,
): Promise<IssueInvoiceResultDto> {
  assertBillingWriter(actor);

  const existing = await findRenewalById(admin, id);
  if (!existing) throw AppError.notFound("Renewal record not found");
  if (existing.status !== "draft") {
    throw AppError.conflict("Only draft renewals can be issued");
  }

  const updated = await updateRenewalFields(admin, id, {
    status: "issued",
    issued_at: new Date().toISOString(),
  });
  if (!updated) throw AppError.notFound("Renewal record not found");

  const pdf = await ensureRenewalInvoicePdf(admin, actor, updated);
  return { renewal: toRenewalDto(updated), pdf };
}

export async function issueInvoiceFromSubscriptionForActor(
  admin: SupabaseClient,
  actor: Actor,
  input: IssueInvoiceFromSubscriptionInput,
): Promise<IssueInvoiceResultDto> {
  assertBillingWriter(actor);

  const durationMonths = parseSubscriptionDuration(input.durationMonths);
  if (!durationMonths) {
    throw AppError.validation("durationMonths must be 1, 6, or 12");
  }

  const institute = await findInstituteById(admin, input.instituteId);
  if (!institute) throw AppError.notFound("Institute not found");

  const sub = await findSubscriptionByInstituteId(admin, input.instituteId);
  if (!sub) throw AppError.notFound("Subscription not found for institute");

  const quote = calculateSubscriptionQuote({
    activeStudentCount: sub.active_student_count,
    assignedRateInr: num(sub.assigned_rate_inr),
    durationMonths: durationMonths as SubscriptionDurationMonths,
  });

  const startAt = new Date().toISOString();
  const endAt = addUtcDays(startAt, durationMonths * 30);
  const dueAt =
    input.dueAt ?? addUtcDays(startAt, 14);

  const draft = await insertRenewal(admin, {
    instituteId: input.instituteId,
    subscriptionId: sub.id,
    invoiceNumber: newNexusInvoiceNumber(),
    periodStartsAt: startAt,
    periodEndsAt: endAt,
    dueAt,
    activeStudentCount: quote.activeStudentCount,
    assignedRateInr: quote.assignedRateInr,
    regularAmountInr: quote.regularAmountInr,
    discountAmountInr: quote.discountAmountInr,
    payableAmountInr: quote.payableAmountInr,
    notes: input.notes ?? null,
    createdByUserId: actor.userId,
  });

  return issueRenewalForActor(admin, actor, draft.id);
}

export async function getRenewalInvoicePdfForActor(
  admin: SupabaseClient,
  actor: Actor,
  renewalId: string,
): Promise<InvoicePdfSignedUrlDto> {
  assertBillingReader(actor);
  const renewal = await findRenewalById(admin, renewalId);
  if (!renewal) throw AppError.notFound("Renewal record not found");
  if (renewal.status === "draft") {
    throw AppError.conflict("Invoice PDF is available after the renewal is issued");
  }
  return ensureRenewalInvoicePdf(admin, actor, renewal);
}

/** Institute staff / admin download of an issued invoice PDF. */
export async function getInstituteRenewalInvoicePdfForActor(
  admin: SupabaseClient,
  actor: Actor,
  renewalId: string,
): Promise<InvoicePdfSignedUrlDto> {
  const renewal = await findRenewalById(admin, renewalId);
  if (!renewal) throw AppError.notFound("Renewal record not found");
  requireInstituteId(actor, renewal.institute_id);
  if (!actor.isPlatformOperator) {
    assertInstituteRoles(actor, renewal.institute_id, [
      "institute_admin",
      "principal",
      "vice_principal",
      "coordinator",
      "it_admin",
      "accountant",
      "staff",
    ]);
  }
  if (renewal.status === "draft") {
    throw AppError.conflict("Invoice PDF is available after the renewal is issued");
  }
  return ensureRenewalInvoicePdf(admin, actor, renewal);
}

// ── Adjustments ──────────────────────────────────────────────

export async function listAdjustmentsForActor(
  admin: SupabaseClient,
  actor: Actor,
  instituteId: string,
): Promise<BillingAdjustmentDto[]> {
  assertBillingReader(actor);
  const rows = await listAdjustmentsByInstitute(admin, instituteId);
  return rows.map(toAdjustmentDto);
}

export async function getAdjustmentForActor(
  admin: SupabaseClient,
  actor: Actor,
  id: string,
): Promise<BillingAdjustmentDto> {
  assertBillingReader(actor);
  const row = await findAdjustmentById(admin, id);
  if (!row) throw AppError.notFound("Billing adjustment not found");
  return toAdjustmentDto(row);
}

export async function createAdjustmentForActor(
  admin: SupabaseClient,
  actor: Actor,
  input: CreateAdjustmentInput,
): Promise<BillingAdjustmentDto> {
  assertBillingWriter(actor);

  await requireLiveSubscription(
    admin,
    input.subscriptionId,
    input.instituteId,
  );

  if (input.renewalRecordId) {
    const renewal = await findRenewalById(admin, input.renewalRecordId);
    if (!renewal) throw AppError.notFound("Renewal record not found");
    if (renewal.institute_id !== input.instituteId) {
      throw AppError.validation("Renewal does not belong to institute");
    }
  }

  const row = await insertAdjustment(admin, {
    ...input,
    createdByUserId: actor.userId,
  });
  return toAdjustmentDto(row);
}

export async function updateAdjustmentForActor(
  admin: SupabaseClient,
  actor: Actor,
  id: string,
  patch: UpdateAdjustmentInput,
): Promise<BillingAdjustmentDto> {
  assertBillingWriter(actor);

  const existing = await findAdjustmentById(admin, id);
  if (!existing) throw AppError.notFound("Billing adjustment not found");

  const fields: Record<string, unknown> = {};
  if (patch.status !== undefined) {
    fields.status = patch.status;
    if (patch.status === "applied") {
      fields.applied_at = new Date().toISOString();
      fields.applied_by_user_id = actor.userId;
    }
  }
  if (patch.purchaseStudentCount !== undefined) {
    fields.purchase_student_count = patch.purchaseStudentCount;
  }
  if (patch.liveStudentCount !== undefined) {
    fields.live_student_count = patch.liveStudentCount;
  }
  if (patch.additionalStudentCount !== undefined) {
    fields.additional_student_count = patch.additionalStudentCount;
  }
  if (patch.additionalMonthlyInr !== undefined) {
    fields.additional_monthly_inr = patch.additionalMonthlyInr;
  }
  if (patch.remainingMonths !== undefined) {
    fields.remaining_months = patch.remainingMonths;
  }
  if (patch.payableAmountInr !== undefined) {
    fields.payable_amount_inr = patch.payableAmountInr;
  }
  if (patch.note !== undefined) fields.note = patch.note;

  if (Object.keys(fields).length === 0) {
    return toAdjustmentDto(existing);
  }

  const updated = await updateAdjustmentFields(admin, id, fields);
  if (!updated) throw AppError.notFound("Billing adjustment not found");
  return toAdjustmentDto(updated);
}

// ── Payments ─────────────────────────────────────────────────

export async function listPaymentsForActor(
  admin: SupabaseClient,
  actor: Actor,
  instituteId: string,
): Promise<PaymentDto[]> {
  assertBillingReader(actor);
  const rows = await listPaymentsByInstitute(admin, instituteId);
  return rows.map(toPaymentDto);
}

export async function getPaymentForActor(
  admin: SupabaseClient,
  actor: Actor,
  id: string,
): Promise<PaymentDto> {
  assertBillingReader(actor);
  const row = await findPaymentById(admin, id);
  if (!row) throw AppError.notFound("Payment not found");
  return toPaymentDto(row);
}

export async function createPaymentForActor(
  admin: SupabaseClient,
  actor: Actor,
  input: CreatePaymentInput,
): Promise<PaymentDto> {
  assertBillingWriter(actor);

  if (!input.renewalRecordId && !input.billingAdjustmentId) {
    throw AppError.validation(
      "renewalRecordId or billingAdjustmentId is required",
    );
  }
  if (!(input.amountInr > 0)) {
    throw AppError.validation("amountInr must be > 0");
  }

  let subscriptionId = input.subscriptionId ?? null;

  if (input.renewalRecordId) {
    const renewal = await findRenewalById(admin, input.renewalRecordId);
    if (!renewal) throw AppError.notFound("Renewal record not found");
    if (renewal.institute_id !== input.instituteId) {
      throw AppError.validation("Renewal does not belong to institute");
    }
    subscriptionId = subscriptionId ?? renewal.subscription_id;
  }

  if (input.billingAdjustmentId) {
    const adjustment = await findAdjustmentById(
      admin,
      input.billingAdjustmentId,
    );
    if (!adjustment) throw AppError.notFound("Billing adjustment not found");
    if (adjustment.institute_id !== input.instituteId) {
      throw AppError.validation("Adjustment does not belong to institute");
    }
    subscriptionId = subscriptionId ?? adjustment.subscription_id;
  }

  const row = await insertPayment(admin, {
    ...input,
    subscriptionId,
    recordedByUserId: actor.userId,
  });
  return toPaymentDto(row);
}

export async function verifyPaymentForActor(
  admin: SupabaseClient,
  actor: Actor,
  id: string,
): Promise<PaymentDto> {
  assertBillingWriter(actor);

  const existing = await findPaymentById(admin, id);
  if (!existing) throw AppError.notFound("Payment not found");
  if (existing.status !== "recorded") {
    throw AppError.conflict("Only recorded payments can be verified");
  }

  const now = new Date().toISOString();
  const updated = await updatePaymentFields(admin, id, {
    status: "verified",
    verified_at: now,
    verified_by_user_id: actor.userId,
  });
  if (!updated) throw AppError.notFound("Payment not found");

  if (existing.renewal_record_id) {
    const renewal = await findRenewalById(admin, existing.renewal_record_id);
    if (renewal) {
      const nextPaid =
        num(renewal.amount_paid_inr) + num(existing.amount_inr);
      const payable = num(renewal.payable_amount_inr);
      const patch: Record<string, unknown> = {
        amount_paid_inr: nextPaid,
      };
      if (nextPaid >= payable) {
        patch.status = "paid";
      }
      const updatedRenewal = await updateRenewalFields(admin, renewal.id, patch);
      if (updatedRenewal && nextPaid >= payable) {
        await activateSubscriptionFromPaidRenewal(
          admin,
          updatedRenewal,
          updated,
        );
      }
    }
  }

  return toPaymentDto(updated);
}

export async function rejectPaymentForActor(
  admin: SupabaseClient,
  actor: Actor,
  id: string,
  reason?: string,
): Promise<PaymentDto> {
  assertBillingWriter(actor);

  const existing = await findPaymentById(admin, id);
  if (!existing) throw AppError.notFound("Payment not found");
  if (existing.status !== "recorded") {
    throw AppError.conflict("Only recorded payments can be rejected");
  }

  const rejectionNote = reason?.trim()
    ? `rejected: ${reason.trim()}`
    : existing.note;

  const updated = await updatePaymentFields(admin, id, {
    status: "rejected",
    note: rejectionNote,
  });
  if (!updated) throw AppError.notFound("Payment not found");

  if (existing.renewal_record_id) {
    const renewal = await findRenewalById(admin, existing.renewal_record_id);
    if (renewal && renewal.status === "pending") {
      await updateRenewalFields(admin, renewal.id, { status: "cancelled" });
    }
  }

  return toPaymentDto(updated);
}

/** Platform inbox — offline payments awaiting Nexus verification. */
export async function listPendingOfflinePaymentsForActor(
  admin: SupabaseClient,
  actor: Actor,
): Promise<OfflinePaymentSubmissionDto[]> {
  assertBillingReader(actor);

  const recorded = await listRecordedPayments(admin);
  const offline = recorded.filter((p) => p.method === "offline");
  const results: OfflinePaymentSubmissionDto[] = [];

  for (const payment of offline) {
    if (!payment.renewal_record_id) continue;
    const renewal = await findRenewalById(admin, payment.renewal_record_id);
    if (!renewal || renewal.status !== "pending") continue;
    const institute = await findInstituteById(admin, payment.institute_id);
    results.push(
      toOfflineSubmission(
        renewal,
        payment,
        institute?.name ?? payment.institute_id,
      ),
    );
  }

  return results.sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
}
