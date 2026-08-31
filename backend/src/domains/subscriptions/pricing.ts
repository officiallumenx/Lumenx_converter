/** Subscription pricing — mirrors @lumenx/utils commercial policy (server-side). */

export const MIN_MONTHLY_CHARGE_INR = 8_000;
export const DEFAULT_PER_STUDENT_RATE_INR = 12;
export const EXTENDED_PER_STUDENT_RATE_MAX_INR = 1_000;
export const DEFAULT_GRACE_DAYS = 7;

export const SUBSCRIPTION_DURATION_OPTIONS = [1, 6, 12] as const;
export type SubscriptionDurationMonths =
  (typeof SUBSCRIPTION_DURATION_OPTIONS)[number];

export function freeMonthsForDuration(
  months: SubscriptionDurationMonths,
): number {
  if (months === 12) return 2;
  return 0;
}

export function labelSubscriptionDuration(
  months: SubscriptionDurationMonths,
): string {
  if (months === 1) return "Monthly";
  if (months === 6) return "6 Months";
  return "Yearly";
}

export function parseSubscriptionDuration(
  value: unknown,
): SubscriptionDurationMonths | null {
  if (value === 1 || value === 6 || value === 12) return value;
  if (typeof value === "string") {
    const n = Number(value);
    if (n === 1 || n === 6 || n === 12) return n;
  }
  return null;
}

export function normalizeAssignedRate(rateInr: number): number {
  if (!Number.isFinite(rateInr) || rateInr < 0) {
    return DEFAULT_PER_STUDENT_RATE_INR;
  }
  const rounded = Math.round(rateInr);
  return Math.min(EXTENDED_PER_STUDENT_RATE_MAX_INR, Math.max(1, rounded));
}

export type SubscriptionQuoteInput = {
  activeStudentCount: number;
  assignedRateInr: number;
  durationMonths: SubscriptionDurationMonths;
};

export type SubscriptionQuoteDto = {
  activeStudentCount: number;
  assignedRateInr: number;
  durationMonths: SubscriptionDurationMonths;
  durationLabel: string;
  studentChargeInr: number;
  minMonthlyChargeInr: number;
  monthlyPriceInr: number;
  floorApplied: boolean;
  showAsBaseSubscription: boolean;
  freeMonths: number;
  billableMonths: number;
  regularAmountInr: number;
  discountAmountInr: number;
  payableAmountInr: number;
};

export function calculateSubscriptionQuote(
  input: SubscriptionQuoteInput,
): SubscriptionQuoteDto {
  const activeStudentCount = Math.max(0, Math.round(input.activeStudentCount));
  const assignedRateInr = normalizeAssignedRate(input.assignedRateInr);
  const durationMonths =
    parseSubscriptionDuration(input.durationMonths) ??
    (1 as SubscriptionDurationMonths);

  const studentChargeInr = Math.round(activeStudentCount * assignedRateInr);
  const minMonthlyChargeInr = MIN_MONTHLY_CHARGE_INR;
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
): SubscriptionQuoteDto[] {
  return SUBSCRIPTION_DURATION_OPTIONS.map((durationMonths) =>
    calculateSubscriptionQuote({ ...input, durationMonths }),
  );
}

export function addUtcDays(iso: string, days: number): string {
  const d = new Date(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString();
}
