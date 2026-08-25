/**
 * Subscription lifecycle derivation from trial / grace / paid period dates.
 *
 * APPROVED → TRIAL_ACTIVE → TRIAL_EXPIRING → TRIAL_EXPIRED → GRACE_PERIOD → READ_ONLY
 * (Paid ACTIVE clears read-only and restores writes.)
 */

import {
  DEFAULT_GRACE_DAYS,
  DEFAULT_TRIAL_DAYS,
  TRIAL_EXPIRING_DAYS,
} from "./policy";
import type { InstituteSubscription, SubscriptionLifecycleStatus } from "./types";

export type TrialWindow = {
  trialStartAt: string;
  trialEndAt: string;
  graceEndsAt: string;
};

export function addUtcDays(iso: string, days: number): string {
  const d = new Date(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString();
}

export function buildTrialWindow(
  startAt: string = new Date().toISOString(),
  trialDays: number = DEFAULT_TRIAL_DAYS,
  graceDays: number = DEFAULT_GRACE_DAYS,
): TrialWindow {
  const trialStartAt = new Date(startAt).toISOString();
  const trialEndAt = addUtcDays(trialStartAt, trialDays);
  const graceEndsAt = addUtcDays(trialEndAt, graceDays);
  return { trialStartAt, trialEndAt, graceEndsAt };
}

export function daysRemainingUntil(endAt: string, now: Date = new Date()): number {
  const end = new Date(endAt).getTime();
  const ms = end - now.getTime();
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
}

/**
 * Derive lifecycle from dates.
 * - Trial: full access (no payment required).
 * - After trialEnd: trial_expired briefly then grace_period for graceDays (writes still allowed).
 * - After graceEndsAt: read_only (mutations blocked via platform write-gate).
 * - Paid period wins while valid.
 */
export function deriveSubscriptionLifecycle(
  sub: Pick<
    InstituteSubscription,
    "trialStartAt" | "trialEndAt" | "graceEndsAt" | "currentPeriod" | "lifecycleStatus"
  >,
  now: Date = new Date(),
  graceDays: number = DEFAULT_GRACE_DAYS,
): SubscriptionLifecycleStatus {
  const nowMs = now.getTime();
  const period = sub.currentPeriod;

  if (period?.paymentStatus === "paid") {
    const startMs = new Date(period.startAt).getTime();
    const endMs = new Date(period.endAt).getTime();
    if (nowMs >= startMs && nowMs <= endMs) {
      return "active";
    }
    if (nowMs > endMs) {
      const graceEndMs = endMs + graceDays * 24 * 60 * 60 * 1000;
      if (nowMs <= graceEndMs) return "grace_period";
      return "read_only";
    }
  }

  if (!sub.trialStartAt || !sub.trialEndAt) {
    if (sub.lifecycleStatus === "registered") return "registered";
    if (sub.lifecycleStatus === "approved") return "approved";
    return sub.lifecycleStatus === "active" ? "read_only" : sub.lifecycleStatus;
  }

  const trialStart = new Date(sub.trialStartAt).getTime();
  const trialEnd = new Date(sub.trialEndAt).getTime();
  const graceEnd = sub.graceEndsAt
    ? new Date(sub.graceEndsAt).getTime()
    : trialEnd + graceDays * 24 * 60 * 60 * 1000;

  if (nowMs < trialStart) return "approved";

  if (nowMs <= trialEnd) {
    const daysLeft = daysRemainingUntil(sub.trialEndAt, now);
    if (daysLeft <= TRIAL_EXPIRING_DAYS) return "trial_expiring";
    return "trial_active";
  }

  // Trial ended → grace window (writes allowed + renewal CTA).
  // First calendar day after trialEnd surfaces as trial_expired; remainder as grace_period.
  if (nowMs <= graceEnd) {
    const msIntoGrace = nowMs - trialEnd;
    const oneDayMs = 24 * 60 * 60 * 1000;
    if (msIntoGrace < oneDayMs) return "trial_expired";
    return "grace_period";
  }

  return "read_only";
}

/** Access mode for Admin write gating — uses existing platform-readonly, not a second gate. */
export type SubscriptionAccessMode = "full" | "grace" | "read_only";

export function accessModeForLifecycle(
  status: SubscriptionLifecycleStatus,
): SubscriptionAccessMode {
  switch (status) {
    case "read_only":
    case "registered":
      return "read_only";
    case "grace_period":
    case "trial_expired":
      return "grace";
    default:
      return "full";
  }
}

/** Mutations blocked only in read_only (grace still allows create/edit). */
export function shouldEnforceSubscriptionReadOnly(
  status: SubscriptionLifecycleStatus,
): boolean {
  return accessModeForLifecycle(status) === "read_only";
}

/** Show renewal CTA (trial ending / ended / grace / read-only) — not during healthy trial. */
export function shouldShowRenewalCta(status: SubscriptionLifecycleStatus): boolean {
  return (
    status === "trial_expiring" ||
    status === "trial_expired" ||
    status === "grace_period" ||
    status === "read_only"
  );
}

export function labelSubscriptionLifecycle(status: SubscriptionLifecycleStatus): string {
  switch (status) {
    case "registered":
      return "Registered";
    case "approved":
      return "Approved";
    case "trial_active":
      return "Trial Active";
    case "trial_expiring":
      return "Trial Expiring";
    case "trial_expired":
      return "Trial Expired";
    case "grace_period":
      return "Grace Period";
    case "read_only":
      return "Read Only";
    case "active":
      return "Subscription Active";
    default:
      return status;
  }
}

export type SubscriptionTrialView = {
  lifecycleStatus: SubscriptionLifecycleStatus;
  accessMode: SubscriptionAccessMode;
  writesAllowed: boolean;
  showRenewalCta: boolean;
  trialStartAt: string | null;
  trialEndAt: string | null;
  graceEndsAt: string | null;
  /** Days left in trial (null when trial ended). */
  trialDaysRemaining: number | null;
  /** Days left in grace (null when not in post-trial grace). */
  graceDaysRemaining: number | null;
  headline: string;
  body: string;
};

export function buildSubscriptionTrialView(
  sub: Pick<
    InstituteSubscription,
    | "lifecycleStatus"
    | "trialStartAt"
    | "trialEndAt"
    | "graceEndsAt"
    | "currentPeriod"
  >,
  now: Date = new Date(),
): SubscriptionTrialView {
  const lifecycleStatus = deriveSubscriptionLifecycle(sub, now);
  const accessMode = accessModeForLifecycle(lifecycleStatus);
  const writesAllowed = accessMode !== "read_only";
  const showRenewalCta = shouldShowRenewalCta(lifecycleStatus);

  let trialDaysRemaining: number | null = null;
  let graceDaysRemaining: number | null = null;

  if (sub.trialEndAt && (lifecycleStatus === "trial_active" || lifecycleStatus === "trial_expiring")) {
    trialDaysRemaining = Math.max(0, daysRemainingUntil(sub.trialEndAt, now));
  }
  if (
    sub.graceEndsAt &&
    (lifecycleStatus === "trial_expired" || lifecycleStatus === "grace_period")
  ) {
    graceDaysRemaining = Math.max(0, daysRemainingUntil(sub.graceEndsAt, now));
  }

  let headline = labelSubscriptionLifecycle(lifecycleStatus);
  let body = "";

  switch (lifecycleStatus) {
    case "trial_active":
      body =
        trialDaysRemaining != null
          ? `${trialDaysRemaining} day${trialDaysRemaining === 1 ? "" : "s"} left in your free trial. Full access — no payment required.`
          : "Free trial active. Full access — no payment required.";
      break;
    case "trial_expiring":
      body =
        trialDaysRemaining != null
          ? `Your free trial ends in ${trialDaysRemaining} day${trialDaysRemaining === 1 ? "" : "s"}. Renew to keep full access after the trial.`
          : "Your free trial is ending soon. Renew to keep full access.";
      break;
    case "trial_expired":
      body =
        graceDaysRemaining != null
          ? `Your free trial has ended. You have ${graceDaysRemaining} day${graceDaysRemaining === 1 ? "" : "s"} of grace with full access — renew to avoid read-only mode.`
          : "Your free trial has ended. Renew to avoid read-only mode.";
      headline = "Your free trial has ended";
      break;
    case "grace_period":
      body =
        graceDaysRemaining != null
          ? `Grace period: ${graceDaysRemaining} day${graceDaysRemaining === 1 ? "" : "s"} left with full access. Renew now to stay unlocked.`
          : "Grace period active. Renew now to stay unlocked.";
      headline = "Your free trial has ended";
      break;
    case "read_only":
      headline = "Subscription expired";
      body =
        "Your trial and grace period have ended. Data is safe — you can view, search, and run reports. Create, edit, delete, publish, and submit are blocked until payment is verified.";
      break;
    case "active":
      body = "Subscription active. Full access restored.";
      break;
    default:
      body = "";
  }

  return {
    lifecycleStatus,
    accessMode,
    writesAllowed,
    showRenewalCta,
    trialStartAt: sub.trialStartAt,
    trialEndAt: sub.trialEndAt,
    graceEndsAt: sub.graceEndsAt,
    trialDaysRemaining,
    graceDaysRemaining,
    headline,
    body,
  };
}
