/**
 * Nexus billing defaults — thin adapter over @lumenx/utils subscription policy.
 * Subscription pricing SoT lives in packages/utils/src/subscription.
 * No Core / Plus / Max subscription plans.
 */

import {
  DEFAULT_PER_STUDENT_RATE_INR as SUB_DEFAULT_RATE,
  EXTENDED_PER_STUDENT_RATE_MAX_INR,
  MIN_MONTHLY_CHARGE_INR,
  NORMAL_PER_STUDENT_RATE_MIN_INR,
  freeMonthsForDuration,
  labelSubscriptionDuration,
  type SubscriptionDurationMonths,
} from "@lumenx/utils";

/** Suggested default per-student rate (₹). */
export const DEFAULT_PER_STUDENT_RATE_INR = SUB_DEFAULT_RATE;

/** Normal assignment band minimum (₹). Nexus may set above NORMAL max when required. */
export const PER_STUDENT_RATE_MIN_INR = NORMAL_PER_STUDENT_RATE_MIN_INR;

/** Extended absolute max for Nexus overrides. */
export const PER_STUDENT_RATE_MAX_INR = EXTENDED_PER_STUDENT_RATE_MAX_INR;

/** Monthly floor (₹) — applied in calculatePlanBill via subscription quote. */
export const DEFAULT_MINIMUM_MONTHLY_CHARGE_INR = MIN_MONTHLY_CHARGE_INR;

/** @deprecated Legacy flat institute rate — unused by subscription SoT. */
export const DEFAULT_INSTITUTE_RATE_INR = 25000;

export const PLAN_TENURE_OPTIONS = [1, 6, 12] as const;
export type PlanTenureMonths = (typeof PLAN_TENURE_OPTIONS)[number];

export type RateQuotePeriod = "monthly" | "yearly";

/**
 * @deprecated Prefer fixed commercial free months via subscription policy.
 * Kept so older UI can still select free_months; percent is ignored by SoT calc.
 */
export type DiscountKind = "none" | "percent" | "free_months";

export type BillingPolicyDefaults = {
  defaultPerStudentRateInr: number;
  perStudentRateMinInr: number;
  perStudentRateMaxInr: number;
  defaultRateQuotePeriod: RateQuotePeriod;
  defaultPlanTenureMonths: PlanTenureMonths;
  defaultDiscountKind: DiscountKind;
};

export const BILLING_POLICY_DEFAULTS: BillingPolicyDefaults = {
  defaultPerStudentRateInr: DEFAULT_PER_STUDENT_RATE_INR,
  perStudentRateMinInr: PER_STUDENT_RATE_MIN_INR,
  perStudentRateMaxInr: PER_STUDENT_RATE_MAX_INR,
  defaultRateQuotePeriod: "monthly",
  defaultPlanTenureMonths: 1,
  defaultDiscountKind: "free_months",
};

/** Max free months allowed for a plan tenure (commercial offer). */
export function maxFreeMonthsForPlan(planMonths: PlanTenureMonths): number {
  return freeMonthsForDuration(planMonths as SubscriptionDurationMonths);
}

export function labelPlanTenure(months: PlanTenureMonths): string {
  return labelSubscriptionDuration(months as SubscriptionDurationMonths);
}

export function labelRateQuotePeriod(period: RateQuotePeriod): string {
  return period === "yearly" ? "Yearly" : "Monthly";
}

export function labelDiscountKind(kind: DiscountKind): string {
  if (kind === "percent") return "Percent off (legacy — ignored)";
  if (kind === "free_months") return "Free months";
  return "No discount";
}

/** @deprecated Old cost-model label — always per-student plans now. */
export type BillingCostModel = "per_student" | "per_institute";

export function labelBillingCostModel(_type?: BillingCostModel): string {
  return "Per Student";
}
