/**
 * Unified subscription domain types.
 * Single source of truth for lifecycle, pricing snapshots, payments, renewals.
 * No Core / Plus / Max plan tiers.
 */

import type { RenewalReminderKind } from "./policy";
import type { SubscriptionDurationMonths } from "./policy";

export type SubscriptionLifecycleStatus =
  | "registered"
  | "approved"
  | "trial_active"
  | "trial_expiring"
  | "trial_expired"
  | "grace_period"
  | "read_only"
  | "active";

export type SubscriptionPaymentMethod = "online" | "offline";

export type SubscriptionPaymentStatus =
  | "none"
  | "checkout_started"
  | "verification_pending"
  | "paid"
  | "failed"
  | "rejected";

/** Live commercial settings for an institute (mutable by Nexus only for rate). */
export type InstituteSubscription = {
  instituteId: string;
  instituteName: string;
  lifecycleStatus: SubscriptionLifecycleStatus;
  /** Nexus-assigned; Admin cannot edit. */
  assignedRateInr: number;
  /** Live student count used for quotes (not historical). */
  activeStudentCount: number;
  trialStartAt: string | null;
  trialEndAt: string | null;
  graceEndsAt: string | null;
  /** Current paid period, if any. */
  currentPeriod: SubscriptionPeriod | null;
  /** Pending offline submission id, if awaiting Nexus. */
  pendingOfflineSubmissionId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SubscriptionPeriod = {
  durationMonths: SubscriptionDurationMonths;
  /** Frozen at purchase */
  activeStudentCount: number;
  assignedRateInr: number;
  monthlyPriceInr: number;
  regularAmountInr: number;
  discountAmountInr: number;
  payableAmountInr: number;
  freeMonths: number;
  startAt: string;
  endAt: string;
  paymentMethod: SubscriptionPaymentMethod;
  paymentStatus: SubscriptionPaymentStatus;
  paymentId?: string;
  paymentRef?: string;
  amountPaidInr: number;
  paidAt?: string;
};

/** Immutable renewal / purchase history row — never rewritten after create. */
export type RenewalRecord = {
  renewalId: string;
  instituteId: string;
  instituteName: string;
  durationMonths: SubscriptionDurationMonths;
  /** Snapshot: active students at purchase. */
  activeStudentCountAtPurchase: number;
  /** Snapshot: Nexus-assigned rate at purchase. */
  assignedRateInrAtPurchase: number;
  /** Snapshot: minimum monthly floor applied at purchase (₹). */
  minMonthlyChargeInr: number;
  /** Snapshot: MAX(min, students × rate) at purchase. */
  monthlyPriceInr: number;
  regularAmountInr: number;
  discountAmountInr: number;
  /** Snapshot: final payable / amount paid for this renewal. */
  payableAmountInr: number;
  freeMonths: number;
  paymentMethod: SubscriptionPaymentMethod;
  paymentStatus: SubscriptionPaymentStatus;
  subscriptionStartAt: string;
  subscriptionEndAt: string;
  paymentId?: string;
  paymentRef?: string;
  createdAt: string;
};

export type PaymentRecord = {
  paymentId: string;
  instituteId: string;
  renewalId?: string;
  method: SubscriptionPaymentMethod;
  status: SubscriptionPaymentStatus;
  amountInr: number;
  reference?: string;
  note?: string;
  createdAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
};

export type OfflinePaymentSubmission = {
  submissionId: string;
  instituteId: string;
  instituteName: string;
  durationMonths: SubscriptionDurationMonths;
  /** Snapshot at submit time */
  activeStudentCount: number;
  assignedRateInr: number;
  monthlyPriceInr: number;
  regularAmountInr: number;
  discountAmountInr: number;
  payableAmountInr: number;
  freeMonths: number;
  referenceId: string;
  /** Placeholder path/name for proof upload (no real upload backend). */
  proofLabel?: string;
  status: "verification_pending" | "paid" | "rejected";
  rejectionReason?: string;
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  renewalId?: string;
};

export type RenewalReminderState = {
  id: string;
  instituteId: string;
  kind: RenewalReminderKind;
  /** ISO date the reminder targets (expiry date). */
  targetExpiryAt: string;
  createdAt: string;
  dismissedAt?: string;
};

/**
 * Immutable post-renewal seat adjustment (never rewrites RenewalRecord / currentPeriod snapshot).
 * Consolidated pending row per institute+period — bulk adds update the same pending charge.
 */
export type BillingAdjustmentStatus =
  | "pending"
  | "verification_pending"
  | "paid"
  | "cancelled";

export type BillingAdjustment = {
  adjustmentId: string;
  instituteId: string;
  instituteName: string;
  /** Links to paid period / renewal context (informational). */
  periodStartAt: string;
  periodEndAt: string;
  durationMonths: SubscriptionDurationMonths;
  /** Frozen purchase snapshot fields (copied, never mutated from renewal). */
  purchaseStudentCount: number;
  assignedRateInr: number;
  purchaseMonthlyPriceInr: number;
  liveStudentCount: number;
  /** Snapshot: students added beyond purchase count. */
  additionalStudentCount: number;
  additionalMonthlyInr: number;
  /** Snapshot: remaining months in period when charge was computed. */
  remainingMonths: number;
  /** Snapshot: additional amount due. */
  payableAmountInr: number;
  /** Why this adjustment exists (immutable after first set on pending→paid path). */
  reason: string;
  status: BillingAdjustmentStatus;
  referenceId?: string;
  proofLabel?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  paymentId?: string;
};

export type SubscriptionStoreState = {
  version: 1;
  subscriptions: InstituteSubscription[];
  renewals: RenewalRecord[];
  payments: PaymentRecord[];
  offlineSubmissions: OfflinePaymentSubmission[];
  reminders: RenewalReminderState[];
  /** Post-renewal seat adjustments (append-only history; pending consolidated). */
  billingAdjustments: BillingAdjustment[];
};
