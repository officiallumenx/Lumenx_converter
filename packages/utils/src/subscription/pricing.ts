/**
 * Subscription pricing — pure functions, no UI / storage.
 *
 * monthlyPrice = MAX(minMonthly, students × rate)
 * payable = monthlyPrice × (duration − freeMonths)
 */

import {
  SUBSCRIPTION_POLICY,
  freeMonthsForDuration,
  labelSubscriptionDuration,
  type SubscriptionDurationMonths,
  type SubscriptionPolicy,
} from "./policy";

export type SubscriptionQuoteInput = {
  activeStudentCount: number;
  /** Nexus-assigned per-student rate (Admin cannot change). */
  assignedRateInr: number;
  durationMonths: SubscriptionDurationMonths;
};

export type SubscriptionQuote = {
  activeStudentCount: number;
  assignedRateInr: number;
  durationMonths: SubscriptionDurationMonths;
  durationLabel: string;
  /** students × rate before floor */
  studentChargeInr: number;
  minMonthlyChargeInr: number;
  /** MAX(min, studentCharge) */
  monthlyPriceInr: number;
  /** True when floor raised the monthly price above studentCharge */
  floorApplied: boolean;
  /**
   * UI rule: when floor applies, show "Base Subscription ₹X/month"
   * instead of students × rate breakdown.
   */
  showAsBaseSubscription: boolean;
  freeMonths: number;
  billableMonths: number;
  /** monthlyPrice × duration */
  regularAmountInr: number;
  /** monthlyPrice × freeMonths */
  discountAmountInr: number;
  /** monthlyPrice × billableMonths */
  payableAmountInr: number;
};

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function parseSubscriptionDuration(value: unknown): SubscriptionDurationMonths | null {
  if (value === 1 || value === 6 || value === 12) return value;
  if (typeof value === "string") {
    const n = Number(value);
    if (n === 1 || n === 6 || n === 12) return n;
  }
  return null;
}

export function normalizeAssignedRate(
  rateInr: number,
  policy: SubscriptionPolicy = SUBSCRIPTION_POLICY,
): number {
  if (!isFiniteNumber(rateInr) || rateInr < 0) return policy.defaultPerStudentRateInr;
  const rounded = Math.round(rateInr);
  return Math.min(policy.extendedRateMaxInr, Math.max(1, rounded));
}

/** True when rate is outside the normal Nexus guidance band (still allowed if extended). */
export function isExtendedPerStudentRate(
  rateInr: number,
  policy: SubscriptionPolicy = SUBSCRIPTION_POLICY,
): boolean {
  const rate = normalizeAssignedRate(rateInr, policy);
  return rate < policy.normalRateMinInr || rate > policy.normalRateMaxInr;
}

/**
 * Calculate subscription quote for a duration.
 * Free months are fixed by commercial policy (not user-editable).
 */
export function calculateSubscriptionQuote(
  input: SubscriptionQuoteInput,
  policy: SubscriptionPolicy = SUBSCRIPTION_POLICY,
): SubscriptionQuote {
  const activeStudentCount = Math.max(
    0,
    Math.round(isFiniteNumber(input.activeStudentCount) ? input.activeStudentCount : 0),
  );
  const assignedRateInr = normalizeAssignedRate(input.assignedRateInr, policy);
  const durationMonths =
    parseSubscriptionDuration(input.durationMonths) ?? (1 as SubscriptionDurationMonths);

  const studentChargeInr = Math.round(activeStudentCount * assignedRateInr);
  const minMonthlyChargeInr = policy.minMonthlyChargeInr;
  const monthlyPriceInr = Math.max(minMonthlyChargeInr, studentChargeInr);
  const floorApplied = monthlyPriceInr > studentChargeInr;
  const freeMonths = freeMonthsForDuration(durationMonths);
  const billableMonths = Math.max(0, durationMonths - freeMonths);
  const regularAmountInr = Math.round(monthlyPriceInr * durationMonths);
  const payableAmountInr = Math.round(monthlyPriceInr * billableMonths);
  const discountAmountInr = Math.max(0, regularAmountInr - payableAmountInr);

  return {
    activeStudentCount,
    assignedRateInr,
    durationMonths,
    durationLabel: labelSubscriptionDuration(durationMonths),
    studentChargeInr,
    minMonthlyChargeInr,
    monthlyPriceInr,
    floorApplied,
    showAsBaseSubscription: floorApplied,
    freeMonths,
    billableMonths,
    regularAmountInr,
    discountAmountInr,
    payableAmountInr,
  };
}

export function quoteAllDurations(
  input: Omit<SubscriptionQuoteInput, "durationMonths">,
  policy: SubscriptionPolicy = SUBSCRIPTION_POLICY,
): SubscriptionQuote[] {
  return ([1, 6, 12] as const).map((durationMonths) =>
    calculateSubscriptionQuote({ ...input, durationMonths }, policy),
  );
}
