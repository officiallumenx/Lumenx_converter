/**
 * Post-renewal billing adjustments — pure calculation.
 *
 * Purchase snapshot is immutable. When live headcount rises after a paid
 * period starts, additional charge = max(0, newMonthly − purchaseMonthly) × remainingMonths.
 * While still under the ₹8,000 floor → ₹0 (Case A).
 * Never applies during free trial (caller must gate).
 */

import { MIN_MONTHLY_CHARGE_INR, type SubscriptionDurationMonths } from "./policy";
import type { SubscriptionPeriod } from "./types";

const DAY_MS = 24 * 60 * 60 * 1000;
/** Matches approveOfflinePayment period length (durationMonths × 30 UTC days). */
const MONTH_MS = 30 * DAY_MS;

export type PostRenewalAdjustmentInput = {
  /** Frozen purchase student count (currentPeriod.activeStudentCount). */
  purchaseStudentCount: number;
  /** Frozen assigned rate at purchase. */
  assignedRateInr: number;
  /** Frozen monthly price paid at purchase (already MAX(floor, students×rate)). */
  purchaseMonthlyPriceInr: number;
  /** Live active student count after adds. */
  liveStudentCount: number;
  durationMonths: SubscriptionDurationMonths;
  periodStartAt: string;
  periodEndAt: string;
  now?: Date;
  minMonthlyChargeInr?: number;
};

export type PostRenewalAdjustmentQuote = {
  purchaseStudentCount: number;
  liveStudentCount: number;
  additionalStudentCount: number;
  assignedRateInr: number;
  purchaseMonthlyPriceInr: number;
  liveMonthlyPriceInr: number;
  /** max(0, liveMonthly − purchaseMonthly) */
  additionalMonthlyInr: number;
  remainingMonths: number;
  /** additionalMonthly × remainingMonths */
  payableAmountInr: number;
  /** True when still covered by the ₹8,000 floor (Case A). */
  stillUnderMinimum: boolean;
  /** True when a charge is due (Case B / crossed floor). */
  chargeRequired: boolean;
};

export function monthlyPriceForHeadcount(
  studentCount: number,
  rateInr: number,
  minMonthly: number = MIN_MONTHLY_CHARGE_INR,
): number {
  const students = Math.max(0, Math.round(studentCount));
  const rate = Math.max(0, Math.round(rateInr));
  return Math.max(minMonthly, students * rate);
}

/**
 * Remaining whole months in the paid period (ceil of leftover time / 30d),
 * capped to durationMonths, floored at 0.
 */
export function remainingMonthsInPeriod(
  periodStartAt: string,
  periodEndAt: string,
  durationMonths: number,
  now: Date = new Date(),
): number {
  const start = new Date(periodStartAt).getTime();
  const end = new Date(periodEndAt).getTime();
  const nowMs = now.getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0;
  if (nowMs >= end) return 0;
  if (nowMs <= start) return Math.max(0, Math.round(durationMonths));

  const remainingMs = end - nowMs;
  const months = Math.ceil(remainingMs / MONTH_MS);
  return Math.min(Math.max(0, Math.round(durationMonths)), Math.max(0, months));
}

export function calculatePostRenewalAdjustment(
  input: PostRenewalAdjustmentInput,
): PostRenewalAdjustmentQuote {
  const minMonthly = input.minMonthlyChargeInr ?? MIN_MONTHLY_CHARGE_INR;
  const purchaseStudentCount = Math.max(0, Math.round(input.purchaseStudentCount));
  const liveStudentCount = Math.max(0, Math.round(input.liveStudentCount));
  const assignedRateInr = Math.max(0, Math.round(input.assignedRateInr));
  const purchaseMonthlyPriceInr = Math.max(
    minMonthly,
    Math.round(input.purchaseMonthlyPriceInr),
  );

  const additionalStudentCount = Math.max(0, liveStudentCount - purchaseStudentCount);
  const liveMonthlyPriceInr = monthlyPriceForHeadcount(
    liveStudentCount,
    assignedRateInr,
    minMonthly,
  );
  const additionalMonthlyInr = Math.max(0, liveMonthlyPriceInr - purchaseMonthlyPriceInr);
  const remainingMonths = remainingMonthsInPeriod(
    input.periodStartAt,
    input.periodEndAt,
    input.durationMonths,
    input.now ?? new Date(),
  );
  const payableAmountInr = Math.round(additionalMonthlyInr * remainingMonths);
  const stillUnderMinimum =
    liveMonthlyPriceInr <= minMonthly && purchaseMonthlyPriceInr <= minMonthly;

  return {
    purchaseStudentCount,
    liveStudentCount,
    additionalStudentCount,
    assignedRateInr,
    purchaseMonthlyPriceInr,
    liveMonthlyPriceInr,
    additionalMonthlyInr,
    remainingMonths,
    payableAmountInr,
    stillUnderMinimum,
    chargeRequired: payableAmountInr > 0,
  };
}

export function quoteFromPaidPeriod(
  period: SubscriptionPeriod,
  liveStudentCount: number,
  now: Date = new Date(),
): PostRenewalAdjustmentQuote {
  return calculatePostRenewalAdjustment({
    purchaseStudentCount: period.activeStudentCount,
    assignedRateInr: period.assignedRateInr,
    purchaseMonthlyPriceInr: period.monthlyPriceInr,
    liveStudentCount,
    durationMonths: period.durationMonths,
    periodStartAt: period.startAt,
    periodEndAt: period.endAt,
    now,
  });
}
