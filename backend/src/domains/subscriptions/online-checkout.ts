import type { SupabaseClient } from "@supabase/supabase-js";
import { timingSafeEqual } from "node:crypto";
import { randomUUID } from "node:crypto";
import { AppError } from "../../errors/app-error.js";
import type { Actor } from "../../auth/types.js";
import { requireInstituteId } from "../../authorization/index.js";
import { loadEnv } from "../../config/env.js";
import { findInstituteById } from "../identity/repository.js";
import { findSubscriptionByInstituteId } from "../nexus/repository.js";
import {
  findPaymentById,
  findPaymentByProviderRef,
  findRenewalById,
  insertPayment,
  insertRenewal,
  listPaymentsByInstitute,
  listRenewalsByInstitute,
  updateRenewalFields,
} from "../billing/repository.js";
import { verifyPaymentInternal } from "../billing/service.js";
import type { PaymentDto } from "../billing/types.js";
import {
  addUtcDays,
  calculateSubscriptionQuote,
  parseSubscriptionDuration,
} from "./pricing.js";
import { SYSTEM_WORKER_USER_ID } from "../jobs/system-actor.js";
import {
  assertSubscriptionBillingWriter,
  findPendingOfflinePair,
  newInvoiceNumber,
  toOfflineSubmission,
} from "./service.js";
import type { OfflinePaymentSubmissionDto } from "./types.js";

export type OnlineCheckoutDto = {
  paymentId: string;
  renewalId: string;
  provider: string;
  providerSessionId: string;
  checkoutUrl: string | null;
  amountInr: number;
  currency: "INR";
  activatesSubscription: false;
  statusMessage: string;
};

function providerMode(): "none" | "demo" | "webhook" {
  const env = loadEnv();
  return env.ONLINE_PAYMENT_PROVIDER;
}

/**
 * Start online subscription checkout.
 * Creates pending renewal + recorded online payment; activation only after webhook.
 */
export async function beginOnlineCheckoutForActor(
  admin: SupabaseClient,
  actor: Actor,
  input: {
    instituteId: string;
    durationMonths: number;
    clientReference?: string | null;
  },
): Promise<OnlineCheckoutDto> {
  const mode = providerMode();
  if (mode === "none") {
    throw AppError.validation("Online payments are not configured", {
      provider: ["Set ONLINE_PAYMENT_PROVIDER=demo|webhook"],
    });
  }

  const instituteId = requireInstituteId(actor, input.instituteId);
  assertSubscriptionBillingWriter(actor, instituteId);

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
      "A payment is already awaiting verification for this institute",
    );
  }
  const pendingOnline = payments.some(
    (p) =>
      p.method === "online" &&
      p.status === "recorded" &&
      renewals.some(
        (r) => r.id === p.renewal_record_id && r.status === "pending",
      ),
  );
  if (pendingOnline) {
    throw AppError.conflict(
      "An online checkout is already awaiting confirmation",
    );
  }

  const quote = calculateSubscriptionQuote({
    activeStudentCount: sub.active_student_count,
    assignedRateInr: Number(sub.assigned_rate_inr),
    durationMonths,
  });

  const startAt = new Date().toISOString();
  const endAt = addUtcDays(startAt, durationMonths * 30);
  const sessionId = `sess_${randomUUID().replace(/-/g, "")}`;
  const provider = mode === "demo" ? "demo" : "webhook";

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
    notes: input.clientReference?.trim()
      ? `online:${input.clientReference.trim()}`
      : "online_checkout",
    createdByUserId: actor.userId,
  });
  await updateRenewalFields(admin, renewal.id, { status: "pending" });

  const payment = await insertPayment(admin, {
    instituteId,
    subscriptionId: sub.id,
    renewalRecordId: renewal.id,
    amountInr: quote.payableAmountInr,
    method: "online",
    provider,
    providerRef: sessionId,
    note: input.clientReference?.trim() || null,
    recordedByUserId: actor.userId,
  });

  const env = loadEnv();
  const checkoutUrl =
    mode === "demo"
      ? `${env.ONLINE_PAYMENT_CHECKOUT_BASE_URL ?? "https://pay.lumenx.local"}/demo/${sessionId}`
      : null;

  return {
    paymentId: payment.id,
    renewalId: renewal.id,
    provider,
    providerSessionId: sessionId,
    checkoutUrl,
    amountInr: quote.payableAmountInr,
    currency: "INR",
    activatesSubscription: false,
    statusMessage:
      mode === "demo"
        ? "Demo checkout created — confirm via webhook to activate."
        : "Checkout session recorded — await provider webhook.",
  };
}

function assertWebhookSecret(provider: string, provided: string | undefined): void {
  const env = loadEnv();
  if (provider === "demo") {
    // Demo accepts any/empty secret in non-production; production requires configured secret match when set.
    if (env.NODE_ENV === "production" && env.ONLINE_PAYMENT_WEBHOOK_SECRET) {
      const expected = env.ONLINE_PAYMENT_WEBHOOK_SECRET;
      const a = Buffer.from(provided ?? "", "utf8");
      const b = Buffer.from(expected, "utf8");
      if (a.length !== b.length || !timingSafeEqual(a, b)) {
        throw AppError.unauthenticated("Invalid webhook signature");
      }
    }
    return;
  }
  const expected = env.ONLINE_PAYMENT_WEBHOOK_SECRET;
  if (!expected) {
    throw AppError.internal("ONLINE_PAYMENT_WEBHOOK_SECRET is not configured");
  }
  const a = Buffer.from(provided ?? "", "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw AppError.unauthenticated("Invalid webhook signature");
  }
}

/**
 * Provider webhook: mark online payment verified → activate subscription.
 * Signature: header `X-LumenX-Webhook-Secret` must match env secret (required for webhook mode).
 */
export async function confirmOnlinePaymentWebhook(
  admin: SupabaseClient,
  input: {
    provider: string;
    providerSessionId: string;
    webhookSecret?: string;
  },
): Promise<{ payment: PaymentDto; submission: OfflinePaymentSubmissionDto | null }> {
  const provider = input.provider.trim().toLowerCase();
  if (provider !== "demo" && provider !== "webhook") {
    throw AppError.notFound("Unknown payment provider");
  }
  assertWebhookSecret(provider, input.webhookSecret);

  const sessionId = input.providerSessionId.trim();
  if (!sessionId) {
    throw AppError.validation("provider_session_id is required");
  }

  const payment = await findPaymentByProviderRef(admin, provider, sessionId);
  if (!payment) throw AppError.notFound("Payment session not found");
  if (payment.method !== "online") {
    throw AppError.conflict("Payment is not an online checkout");
  }

  const paymentDto = await verifyPaymentInternal(
    admin,
    payment.id,
    SYSTEM_WORKER_USER_ID,
  );

  let submission: OfflinePaymentSubmissionDto | null = null;
  if (payment.renewal_record_id) {
    const renewal = await findRenewalById(admin, payment.renewal_record_id);
    const institute = await findInstituteById(admin, payment.institute_id);
    if (renewal) {
      const updatedPayment =
        (await findPaymentById(admin, payment.id)) ?? payment;
      submission = toOfflineSubmission(
        renewal,
        updatedPayment,
        institute?.name ?? payment.institute_id,
      );
    }
  }

  return { payment: paymentDto, submission };
}
