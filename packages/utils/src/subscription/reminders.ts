/**
 * Renewal reminder state helpers (in-app only — no SMS / email / push).
 *
 * Thresholds: 30 · 15 · 7 · 3 · 1 days before expiry · Expired.
 * Reminder ids are stable per institute + kind + expiry date so ensure is idempotent.
 */

import { RENEWAL_REMINDER_DAYS, type RenewalReminderKind } from "./policy";
import { daysRemainingUntil, labelSubscriptionLifecycle } from "./lifecycle";
import type { InstituteSubscription, RenewalReminderState } from "./types";

/** Expiry the reminder clock uses: paid period end, else trial end. */
export function resolveReminderExpiryAt(
  sub: Pick<InstituteSubscription, "currentPeriod" | "trialEndAt">,
): string | null {
  if (sub.currentPeriod?.paymentStatus === "paid" && sub.currentPeriod.endAt) {
    return sub.currentPeriod.endAt;
  }
  return sub.trialEndAt ?? null;
}

/**
 * Map days-left to a reminder kind.
 * Soft bands: once inside a window (e.g. 16–30 → 30), keep that kind until the next threshold.
 */
export function reminderKindForDaysRemaining(daysLeft: number): RenewalReminderKind | null {
  if (daysLeft <= 0) return "expired";
  for (const d of RENEWAL_REMINDER_DAYS) {
    if (daysLeft === d) return d;
  }
  if (daysLeft <= 1) return 1;
  if (daysLeft <= 3) return 3;
  if (daysLeft <= 7) return 7;
  if (daysLeft <= 15) return 15;
  if (daysLeft <= 30) return 30;
  return null;
}

export function buildReminderState(input: {
  instituteId: string;
  targetExpiryAt: string;
  now?: Date;
}): RenewalReminderState | null {
  const now = input.now ?? new Date();
  const daysLeft = daysRemainingUntil(input.targetExpiryAt, now);
  const kind = reminderKindForDaysRemaining(daysLeft);
  if (!kind) return null;
  return {
    id: `rem-${input.instituteId}-${kind}-${input.targetExpiryAt.slice(0, 10)}`,
    instituteId: input.instituteId,
    kind,
    targetExpiryAt: input.targetExpiryAt,
    createdAt: now.toISOString(),
  };
}

export function labelRenewalReminder(kind: RenewalReminderKind): string {
  if (kind === "expired") return "Subscription expired";
  return `${kind} day${kind === 1 ? "" : "s"} before expiry`;
}

/** Admin-facing in-app reminder view (no channel delivery). */
export type RenewalReminderView = {
  reminder: RenewalReminderState;
  kind: RenewalReminderKind;
  /** Paid period or trial currently in focus. */
  currentSubscriptionLabel: string;
  expiryAt: string;
  /** Calendar days remaining (0 when expired). */
  daysRemaining: number;
  headline: string;
  body: string;
  showRenewCta: true;
};

export function currentSubscriptionLabelForReminder(
  sub: Pick<InstituteSubscription, "lifecycleStatus" | "currentPeriod">,
): string {
  if (sub.currentPeriod?.paymentStatus === "paid") {
    return "Current subscription";
  }
  if (
    sub.lifecycleStatus === "trial_active" ||
    sub.lifecycleStatus === "trial_expiring"
  ) {
    return "Free trial";
  }
  return labelSubscriptionLifecycle(sub.lifecycleStatus);
}

export function buildRenewalReminderView(input: {
  sub: Pick<
    InstituteSubscription,
    "lifecycleStatus" | "currentPeriod" | "trialEndAt" | "instituteName"
  >;
  reminder: RenewalReminderState;
  now?: Date;
}): RenewalReminderView {
  const now = input.now ?? new Date();
  const expiryAt = input.reminder.targetExpiryAt;
  const rawDays = daysRemainingUntil(expiryAt, now);
  const daysRemaining = Math.max(0, rawDays);
  const kind = input.reminder.kind;
  const currentSubscriptionLabel = currentSubscriptionLabelForReminder(input.sub);

  let headline: string;
  let body: string;
  if (kind === "expired" || rawDays <= 0) {
    headline = "Subscription expired";
    body = `${currentSubscriptionLabel} ended on ${formatReminderDate(expiryAt)}. Renew to restore full access.`;
  } else {
    headline = `Renewal reminder — ${labelRenewalReminder(kind)}`;
    body =
      daysRemaining === 1
        ? `${currentSubscriptionLabel} expires tomorrow (${formatReminderDate(expiryAt)}). Renew to avoid interruption.`
        : `${currentSubscriptionLabel} expires in ${daysRemaining} days (${formatReminderDate(expiryAt)}). Renew to avoid interruption.`;
  }

  return {
    reminder: input.reminder,
    kind,
    currentSubscriptionLabel,
    expiryAt,
    daysRemaining,
    headline,
    body,
    showRenewCta: true,
  };
}

function formatReminderDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
