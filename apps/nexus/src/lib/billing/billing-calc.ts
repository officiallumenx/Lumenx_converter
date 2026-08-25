/**
 * Nexus billing calculation — thin adapter over unified subscription pricing.
 *
 * SoT: @lumenx/utils calculateSubscriptionQuote
 * monthlyPrice = MAX(₹8000, students × rate)
 * free months: 0 / 0 / 2 for 1 / 6 / 12 month durations
 *
 * Percent discount inputs are ignored (legacy UI only).
 */

import {
  calculateSubscriptionQuote,
  freeMonthsForDuration,
  type SubscriptionDurationMonths,
} from "@lumenx/utils";
import {
  BILLING_POLICY_DEFAULTS,
  DEFAULT_INSTITUTE_RATE_INR,
  DEFAULT_MINIMUM_MONTHLY_CHARGE_INR,
  DEFAULT_PER_STUDENT_RATE_INR,
  PER_STUDENT_RATE_MAX_INR,
  PER_STUDENT_RATE_MIN_INR,
  labelBillingCostModel,
  labelDiscountKind,
  labelPlanTenure,
  labelRateQuotePeriod,
  maxFreeMonthsForPlan,
  type BillingCostModel,
  type BillingPolicyDefaults,
  type DiscountKind,
  type PlanTenureMonths,
  type RateQuotePeriod,
} from "./billing-defaults";

export {
  BILLING_POLICY_DEFAULTS,
  DEFAULT_INSTITUTE_RATE_INR,
  DEFAULT_MINIMUM_MONTHLY_CHARGE_INR,
  DEFAULT_PER_STUDENT_RATE_INR,
  PER_STUDENT_RATE_MAX_INR,
  PER_STUDENT_RATE_MIN_INR,
  labelBillingCostModel,
  labelDiscountKind,
  labelPlanTenure,
  labelRateQuotePeriod,
  maxFreeMonthsForPlan,
} from "./billing-defaults";
export type {
  BillingCostModel,
  BillingPolicyDefaults,
  DiscountKind,
  PlanTenureMonths,
  RateQuotePeriod,
} from "./billing-defaults";

export type BillingCalcInput = {
  activeStudentCount: number;
  quotedRateInr?: number;
  rateQuotePeriod?: RateQuotePeriod;
  planTenureMonths: PlanTenureMonths;
  /** @deprecated Ignored — commercial free months are fixed by duration. */
  discountKind?: DiscountKind;
  discountPercent?: number;
  freeMonths?: number;
  perStudentRateInr?: number;
  billingType?: BillingCostModel;
  instituteRateInr?: number;
  minimumMonthlyChargeInr?: number;
};

export type BillingCalcResult = {
  activeStudentCount: number;
  rateQuotePeriod: RateQuotePeriod;
  quotedRateInr: number;
  monthlyRateInr: number;
  planTenureMonths: PlanTenureMonths;
  estimateInr: number;
  discountKind: DiscountKind;
  discountPercent: number;
  freeMonths: number;
  billableMonths: number;
  discountAmountInr: number;
  finalAmountInr: number;
  finalMonthlyBillInr: number;
  studentChargeInr: number;
  billingType: "per_student";
  perStudentRateInr: number;
  instituteRateInr: number;
  minimumMonthlyChargeInr: number;
  floorApplied: boolean;
  /** Alias of final monthly price after floor. */
  monthlyPriceInr: number;
  showAsBaseSubscription: boolean;
};

export type BillingValidationIssue = {
  field:
    | "activeStudentCount"
    | "quotedRateInr"
    | "perStudentRateInr"
    | "rateQuotePeriod"
    | "planTenureMonths"
    | "discountKind"
    | "discountPercent"
    | "freeMonths";
  code:
    | "required"
    | "not_a_number"
    | "negative"
    | "not_integer"
    | "below_min"
    | "above_max"
    | "invalid";
  message: string;
};

export type BillingValidationResult = {
  ok: boolean;
  issues: BillingValidationIssue[];
  normalized: {
    activeStudentCount: number;
    quotedRateInr: number;
    rateQuotePeriod: RateQuotePeriod;
    planTenureMonths: PlanTenureMonths;
    discountKind: DiscountKind;
    discountPercent: number;
    freeMonths: number;
  };
};

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export function parsePlanTenure(value: unknown): PlanTenureMonths | null {
  const n = toNumber(value);
  if (n === 1 || n === 6 || n === 12) return n;
  return null;
}

export function parseRateQuotePeriod(value: unknown): RateQuotePeriod {
  return value === "yearly" ? "yearly" : "monthly";
}

export function parseDiscountKind(value: unknown): DiscountKind {
  if (value === "percent" || value === "free_months") return value;
  return "none";
}

export function monthlyRateFromQuote(
  quotedRateInr: number,
  rateQuotePeriod: RateQuotePeriod,
): number {
  const rate = Math.max(0, quotedRateInr);
  if (rateQuotePeriod === "yearly") {
    return Math.round((rate / 12) * 100) / 100;
  }
  return Math.round(rate * 100) / 100;
}

export function isPerStudentRateInRange(
  rateInr: number,
  policy: BillingPolicyDefaults = BILLING_POLICY_DEFAULTS,
): boolean {
  return (
    isFiniteNumber(rateInr) &&
    rateInr >= policy.perStudentRateMinInr &&
    rateInr <= policy.perStudentRateMaxInr
  );
}

export function clampPerStudentRate(
  rateInr: number,
  policy: BillingPolicyDefaults = BILLING_POLICY_DEFAULTS,
): number {
  if (!isFiniteNumber(rateInr) || rateInr < 0) return policy.defaultPerStudentRateInr;
  const rounded = Math.round(rateInr);
  return Math.min(
    policy.perStudentRateMaxInr,
    Math.max(1, rounded),
  );
}

export function validateBillingInputs(
  input: {
    activeStudentCount: unknown;
    quotedRateInr?: unknown;
    perStudentRateInr?: unknown;
    rateQuotePeriod?: unknown;
    planTenureMonths?: unknown;
    discountKind?: unknown;
    discountPercent?: unknown;
    freeMonths?: unknown;
  },
  policy: BillingPolicyDefaults = BILLING_POLICY_DEFAULTS,
): BillingValidationResult {
  const issues: BillingValidationIssue[] = [];

  const studentsRaw = toNumber(input.activeStudentCount);
  if (studentsRaw === null) {
    issues.push({
      field: "activeStudentCount",
      code: "not_a_number",
      message: "Active student count must be a number.",
    });
  } else if (studentsRaw < 0) {
    issues.push({
      field: "activeStudentCount",
      code: "negative",
      message: "Active student count cannot be negative.",
    });
  } else if (!Number.isInteger(studentsRaw)) {
    issues.push({
      field: "activeStudentCount",
      code: "not_integer",
      message: "Active student count must be a whole number.",
    });
  }

  const rateQuotePeriod = parseRateQuotePeriod(input.rateQuotePeriod);
  const rateRaw = toNumber(
    input.quotedRateInr !== undefined ? input.quotedRateInr : input.perStudentRateInr,
  );
  let quotedRateInr = policy.defaultPerStudentRateInr;
  if (rateRaw === null) {
    issues.push({
      field: "quotedRateInr",
      code: "not_a_number",
      message: "Per student rate must be a number.",
    });
  } else if (rateRaw < 0) {
    issues.push({
      field: "quotedRateInr",
      code: "negative",
      message: "Per student rate cannot be negative.",
    });
  } else if (rateRaw < 1) {
    issues.push({
      field: "quotedRateInr",
      code: "below_min",
      message: "Per student rate must be at least ₹1.",
    });
  } else if (rateRaw > policy.perStudentRateMaxInr) {
    issues.push({
      field: "quotedRateInr",
      code: "above_max",
      message: `Per student rate must be at most ₹${policy.perStudentRateMaxInr}.`,
    });
  } else {
    quotedRateInr = Math.round(rateRaw);
  }

  const planTenureMonths =
    parsePlanTenure(input.planTenureMonths) ?? policy.defaultPlanTenureMonths;
  if (input.planTenureMonths !== undefined && parsePlanTenure(input.planTenureMonths) === null) {
    issues.push({
      field: "planTenureMonths",
      code: "invalid",
      message: "Plan must be 1 month, 6 months, or 1 year.",
    });
  }

  const freeMonths = freeMonthsForDuration(planTenureMonths as SubscriptionDurationMonths);

  const ok = issues.length === 0;
  return {
    ok,
    issues,
    normalized: {
      activeStudentCount:
        studentsRaw !== null && studentsRaw >= 0 ? Math.round(studentsRaw) : 0,
      quotedRateInr,
      rateQuotePeriod,
      planTenureMonths,
      discountKind: "free_months",
      discountPercent: 0,
      freeMonths,
    },
  };
}

/**
 * Calculate bill via unified subscription quote (floor + fixed free months).
 */
export function calculatePlanBill(
  input: BillingCalcInput,
  policy: BillingPolicyDefaults = BILLING_POLICY_DEFAULTS,
): BillingCalcResult {
  const rateQuotePeriod = parseRateQuotePeriod(input.rateQuotePeriod);
  const quotedRaw =
    input.quotedRateInr !== undefined
      ? input.quotedRateInr
      : input.perStudentRateInr !== undefined
        ? input.perStudentRateInr
        : policy.defaultPerStudentRateInr;
  const quotedRateInr = clampPerStudentRate(quotedRaw, policy);
  const monthlyRateInr = monthlyRateFromQuote(quotedRateInr, rateQuotePeriod);
  const planTenureMonths =
    parsePlanTenure(input.planTenureMonths) ?? policy.defaultPlanTenureMonths;

  const quote = calculateSubscriptionQuote({
    activeStudentCount: input.activeStudentCount,
    assignedRateInr: monthlyRateInr,
    durationMonths: planTenureMonths as SubscriptionDurationMonths,
  });

  return {
    activeStudentCount: quote.activeStudentCount,
    rateQuotePeriod,
    quotedRateInr,
    monthlyRateInr: quote.assignedRateInr,
    planTenureMonths,
    estimateInr: quote.regularAmountInr,
    discountKind: "free_months",
    discountPercent: 0,
    freeMonths: quote.freeMonths,
    billableMonths: quote.billableMonths,
    discountAmountInr: quote.discountAmountInr,
    finalAmountInr: quote.payableAmountInr,
    finalMonthlyBillInr: quote.payableAmountInr,
    studentChargeInr: quote.studentChargeInr,
    billingType: "per_student",
    perStudentRateInr: quote.assignedRateInr,
    instituteRateInr: DEFAULT_INSTITUTE_RATE_INR,
    minimumMonthlyChargeInr: DEFAULT_MINIMUM_MONTHLY_CHARGE_INR,
    floorApplied: quote.floorApplied,
    monthlyPriceInr: quote.monthlyPriceInr,
    showAsBaseSubscription: quote.showAsBaseSubscription,
  };
}

/** @deprecated Prefer calculatePlanBill — same implementation. */
export function calculateMonthlyBill(
  input: BillingCalcInput,
  policy: BillingPolicyDefaults = BILLING_POLICY_DEFAULTS,
): BillingCalcResult {
  return calculatePlanBill(input, policy);
}

export function calculateMonthlyBillStrict(
  input: {
    activeStudentCount: unknown;
    quotedRateInr?: unknown;
    perStudentRateInr?: unknown;
    rateQuotePeriod?: unknown;
    planTenureMonths?: unknown;
    discountKind?: unknown;
    discountPercent?: unknown;
    freeMonths?: unknown;
  },
  policy: BillingPolicyDefaults = BILLING_POLICY_DEFAULTS,
):
  | { ok: true; result: BillingCalcResult }
  | { ok: false; issues: BillingValidationIssue[] } {
  const validation = validateBillingInputs(input, policy);
  if (!validation.ok) {
    return { ok: false, issues: validation.issues };
  }
  return {
    ok: true,
    result: calculatePlanBill(
      {
        activeStudentCount: validation.normalized.activeStudentCount,
        quotedRateInr: validation.normalized.quotedRateInr,
        rateQuotePeriod: validation.normalized.rateQuotePeriod,
        planTenureMonths: validation.normalized.planTenureMonths,
      },
      policy,
    ),
  };
}

export const calculatePlanBillStrict = calculateMonthlyBillStrict;
