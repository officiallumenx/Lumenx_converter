/**
 * Immutable billing history helpers + aggregate view.
 * Snapshot builders have no store deps (safe to import from store).
 */

import { MIN_MONTHLY_CHARGE_INR } from "./policy";
import type { SubscriptionDurationMonths } from "./policy";
import type {
  BillingAdjustment,
  InstituteSubscription,
  PaymentRecord,
  RenewalRecord,
  SubscriptionPaymentMethod,
  SubscriptionPaymentStatus,
} from "./types";

export type RenewalSnapshotInput = {
  renewalId: string;
  instituteId: string;
  instituteName: string;
  durationMonths: SubscriptionDurationMonths;
  activeStudentCountAtPurchase: number;
  assignedRateInrAtPurchase: number;
  monthlyPriceInr: number;
  regularAmountInr: number;
  discountAmountInr: number;
  payableAmountInr: number;
  freeMonths: number;
  paymentMethod: SubscriptionPaymentMethod;
  paymentStatus: SubscriptionPaymentStatus;
  subscriptionStartAt: string;
  subscriptionEndAt: string;
  paymentId?: string;
  paymentRef?: string;
  createdAt: string;
  minMonthlyChargeInr?: number;
};

/** Build a complete immutable renewal snapshot (all Phase 9 fields). */
export function buildRenewalSnapshot(input: RenewalSnapshotInput): RenewalRecord {
  return {
    renewalId: input.renewalId,
    instituteId: input.instituteId,
    instituteName: input.instituteName,
    durationMonths: input.durationMonths,
    activeStudentCountAtPurchase: input.activeStudentCountAtPurchase,
    assignedRateInrAtPurchase: input.assignedRateInrAtPurchase,
    minMonthlyChargeInr: input.minMonthlyChargeInr ?? MIN_MONTHLY_CHARGE_INR,
    monthlyPriceInr: input.monthlyPriceInr,
    regularAmountInr: input.regularAmountInr,
    discountAmountInr: input.discountAmountInr,
    payableAmountInr: input.payableAmountInr,
    freeMonths: input.freeMonths,
    paymentMethod: input.paymentMethod,
    paymentStatus: input.paymentStatus,
    subscriptionStartAt: input.subscriptionStartAt,
    subscriptionEndAt: input.subscriptionEndAt,
    paymentId: input.paymentId,
    paymentRef: input.paymentRef,
    createdAt: input.createdAt,
  };
}

export const DEFAULT_ADJUSTMENT_REASON = "Post-renewal student additions";

export type InstituteBillingHistory = {
  instituteId: string;
  subscription: InstituteSubscription | null;
  renewals: RenewalRecord[];
  payments: PaymentRecord[];
  adjustments: BillingAdjustment[];
};

export function assembleInstituteBillingHistory(input: {
  instituteId: string;
  subscription: InstituteSubscription | null;
  renewals: RenewalRecord[];
  payments: PaymentRecord[];
  adjustments: BillingAdjustment[];
}): InstituteBillingHistory {
  return {
    instituteId: input.instituteId,
    subscription: input.subscription,
    renewals: input.renewals,
    payments: input.payments,
    adjustments: input.adjustments,
  };
}
