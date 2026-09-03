/**
 * Subscription lifecycle + write-gate policy (mirrors @lumenx/utils).
 * Mutations blocked only for read_only / registered access modes.
 */

import type { SubscriptionLifecycle } from "../nexus/types.js";

export const TRIAL_EXPIRING_DAYS = 7;
export { DEFAULT_GRACE_DAYS } from "./pricing.js";

export type SubscriptionAccessMode = "full" | "grace" | "read_only";

export type LifecycleDeriveInput = {
  lifecycleStatus: SubscriptionLifecycle | string;
  trialStartAt: string | null;
  trialEndAt: string | null;
  graceEndsAt: string | null;
  currentPeriod: {
    startsAt: string;
    endsAt: string;
    paymentStatus: string;
  } | null;
};

export function addUtcDays(iso: string, days: number): string {
  const d = new Date(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString();
}

function daysRemainingUntil(endAt: string, now: Date): number {
  const end = new Date(endAt).getTime();
  const ms = end - now.getTime();
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
}

export function deriveSubscriptionLifecycle(
  sub: LifecycleDeriveInput,
  now: Date = new Date(),
  graceDays: number = 7,
): SubscriptionLifecycle {
  const nowMs = now.getTime();
  const period = sub.currentPeriod;

  if (period?.paymentStatus === "paid") {
    const startMs = new Date(period.startsAt).getTime();
    const endMs = new Date(period.endsAt).getTime();
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
    return sub.lifecycleStatus === "active"
      ? "read_only"
      : (sub.lifecycleStatus as SubscriptionLifecycle);
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

  if (nowMs <= graceEnd) {
    const msIntoGrace = nowMs - trialEnd;
    const oneDayMs = 24 * 60 * 60 * 1000;
    if (msIntoGrace < oneDayMs) return "trial_expired";
    return "grace_period";
  }

  return "read_only";
}

export function accessModeForLifecycle(
  status: SubscriptionLifecycle | string,
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

/** Mutations blocked only in read_only access mode (grace still allows writes). */
export function shouldEnforceSubscriptionReadOnly(
  status: SubscriptionLifecycle | string,
): boolean {
  return accessModeForLifecycle(status) === "read_only";
}
