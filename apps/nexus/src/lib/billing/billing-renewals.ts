/**
 * Monthly renewals — pure helpers (no UI, no suspend, no network).
 *
 * When a period begins: read live students + rate → calculate → issue new invoice.
 * Prior invoices stay unchanged. Overdue never implies suspension.
 */

export type RenewalStatus =
  | "current"
  | "due_soon"
  | "due_today"
  | "overdue"
  | "renewal_due";

export type RenewalPolicy = {
  /** Days before next renewal to mark due_soon. */
  dueSoonDays: number;
};

export const DEFAULT_RENEWAL_POLICY: RenewalPolicy = {
  dueSoonDays: 7,
};

export function addOneMonth(from: Date): Date {
  return new Date(from.getFullYear(), from.getMonth() + 1, from.getDate(), 0, 0, 0, 0);
}

/** Next billing / renewal instant = end of the current period. */
export function nextBillingDateFromPeriodEnd(periodEnd: Date): Date {
  return new Date(periodEnd.getTime());
}

export function deriveRenewalStatus(
  nextRenewalAt: Date,
  now: Date = new Date(),
  policy: RenewalPolicy = DEFAULT_RENEWAL_POLICY,
): RenewalStatus {
  const ms = nextRenewalAt.getTime() - now.getTime();
  const dayMs = 24 * 60 * 60 * 1000;
  if (ms < 0) return "renewal_due";
  if (ms <= dayMs) return "due_today";
  if (ms <= policy.dueSoonDays * dayMs) return "due_soon";
  return "current";
}

export function labelRenewalStatus(status: RenewalStatus): string {
  if (status === "current") return "Current";
  if (status === "due_soon") return "Due soon";
  if (status === "due_today") return "Due today";
  if (status === "overdue") return "Overdue billing";
  if (status === "renewal_due") return "Renewal due";
  return status;
}

export function renewalStatusTone(
  status: RenewalStatus,
): "success" | "warning" | "danger" | "info" | "neutral" {
  if (status === "current") return "success";
  if (status === "due_soon" || status === "due_today") return "warning";
  if (status === "renewal_due" || status === "overdue") return "danger";
  return "neutral";
}

/**
 * Combined renewal + billing-overdue signal for display.
 * Overdue invoices affect status label only — never institute lifecycle.
 */
export function combineRenewalDisplayStatus(
  renewal: RenewalStatus,
  hasOverdueInvoice: boolean,
): RenewalStatus {
  if (hasOverdueInvoice && renewal === "current") return "overdue";
  if (hasOverdueInvoice && renewal === "due_soon") return "overdue";
  return renewal;
}
