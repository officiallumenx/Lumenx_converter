/**
 * LumenX subscription commercial policy — single source of defaults.
 * No Core / Plus / Max plans. Per-student rate + ₹8,000 monthly floor.
 */

export const SUBSCRIPTION_STORAGE_KEY = "lumenx.platform.subscriptions.v1";
export const SUBSCRIPTION_CHANGED_EVENT = "lumenx-subscriptions-changed";

/** Days remaining at or below this → TRIAL_EXPIRING. */
export const TRIAL_EXPIRING_DAYS = 7;

/** Exact free-trial length for newly approved institutes. */
export const DEFAULT_TRIAL_DAYS = 60;

/** Days of full access after trial/subscription expiry before read-only. */
export const DEFAULT_GRACE_DAYS = 7;

/** Minimum monthly charge (₹). */
export const MIN_MONTHLY_CHARGE_INR = 8_000;

/** Default Nexus-assigned per-student rate (₹). */
export const DEFAULT_PER_STUDENT_RATE_INR = 12;

/** Normal Nexus assignment band (₹). */
export const NORMAL_PER_STUDENT_RATE_MIN_INR = 12;
export const NORMAL_PER_STUDENT_RATE_MAX_INR = 15;

/**
 * Absolute ceiling when Nexus explicitly extends above the normal band.
 * Admin never edits rate; Nexus UI should warn when above NORMAL max.
 */
export const EXTENDED_PER_STUDENT_RATE_MAX_INR = 1_000;

export const SUBSCRIPTION_DURATION_OPTIONS = [1, 6, 12] as const;
export type SubscriptionDurationMonths = (typeof SUBSCRIPTION_DURATION_OPTIONS)[number];

/** Fixed commercial free months by duration — not configurable per quote. */
export function freeMonthsForDuration(months: SubscriptionDurationMonths): number {
  if (months === 12) return 2;
  return 0;
}

export function labelSubscriptionDuration(months: SubscriptionDurationMonths): string {
  if (months === 1) return "Monthly";
  if (months === 6) return "6 Months";
  return "Yearly";
}

export type SubscriptionPolicy = {
  trialDays: number;
  graceDays: number;
  minMonthlyChargeInr: number;
  defaultPerStudentRateInr: number;
  normalRateMinInr: number;
  normalRateMaxInr: number;
  extendedRateMaxInr: number;
};

export const SUBSCRIPTION_POLICY: SubscriptionPolicy = {
  trialDays: DEFAULT_TRIAL_DAYS,
  graceDays: DEFAULT_GRACE_DAYS,
  minMonthlyChargeInr: MIN_MONTHLY_CHARGE_INR,
  defaultPerStudentRateInr: DEFAULT_PER_STUDENT_RATE_INR,
  normalRateMinInr: NORMAL_PER_STUDENT_RATE_MIN_INR,
  normalRateMaxInr: NORMAL_PER_STUDENT_RATE_MAX_INR,
  extendedRateMaxInr: EXTENDED_PER_STUDENT_RATE_MAX_INR,
};

/** Reminder offsets (days before expiry). Expired is separate. */
export const RENEWAL_REMINDER_DAYS = [30, 15, 7, 3, 1] as const;
export type RenewalReminderKind = (typeof RENEWAL_REMINDER_DAYS)[number] | "expired";
