/**
 * Self-test: 60-day trial workflow → warning → expiry → grace → read-only → activate.
 * Run: npx tsx packages/utils/src/subscription/lifecycle.selftest.ts
 */

import {
  buildTrialWindow,
  deriveSubscriptionLifecycle,
  shouldEnforceSubscriptionReadOnly,
  shouldShowRenewalCta,
  buildSubscriptionTrialView,
  addUtcDays,
} from "./lifecycle";
import {
  DEFAULT_GRACE_DAYS,
  DEFAULT_TRIAL_DAYS,
  TRIAL_EXPIRING_DAYS,
} from "./policy";
import type { InstituteSubscription } from "./types";

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

const base = {
  instituteId: "ins-test",
  instituteName: "Test",
  assignedRateInr: 12,
  activeStudentCount: 0,
  currentPeriod: null,
  pendingOfflineSubmissionId: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
} as const;

assert(DEFAULT_TRIAL_DAYS === 60, "trial must be 60 days");
assert(DEFAULT_GRACE_DAYS === 7, "grace must be 7 days");
assert(TRIAL_EXPIRING_DAYS === 7, "expiring threshold must be 7 days");

{
  const w = buildTrialWindow("2026-01-01T00:00:00.000Z", 60, 7);
  assert(w.trialEndAt.startsWith("2026-03-02"), `trial end got ${w.trialEndAt}`);
  assert(w.graceEndsAt.startsWith("2026-03-09"), `grace end got ${w.graceEndsAt}`);
}

{
  const w = buildTrialWindow("2026-01-01T00:00:00.000Z");
  const sub: InstituteSubscription = {
    ...base,
    lifecycleStatus: "trial_active",
    trialStartAt: w.trialStartAt,
    trialEndAt: w.trialEndAt,
    graceEndsAt: w.graceEndsAt,
  };

  // Mid-trial → full access, no renewal CTA required
  const mid = deriveSubscriptionLifecycle(sub, new Date("2026-01-15T00:00:00.000Z"));
  assert(mid === "trial_active", `expected trial_active got ${mid}`);
  assert(shouldEnforceSubscriptionReadOnly(mid) === false, "trial writes ok");
  assert(shouldShowRenewalCta(mid) === false, "no CTA mid-trial");

  // ≤7 days remaining → TRIAL_EXPIRING
  const near = deriveSubscriptionLifecycle(sub, new Date("2026-02-28T00:00:00.000Z"));
  assert(near === "trial_expiring", `expected trial_expiring got ${near}`);
  assert(shouldEnforceSubscriptionReadOnly(near) === false, "expiring writes ok");
  assert(shouldShowRenewalCta(near) === true, "CTA when expiring");

  // First day after trialEnd → TRIAL_EXPIRED (grace writes still allowed)
  const expired = deriveSubscriptionLifecycle(sub, new Date("2026-03-02T12:00:00.000Z"));
  assert(expired === "trial_expired", `expected trial_expired got ${expired}`);
  assert(shouldEnforceSubscriptionReadOnly(expired) === false, "expired grace writes ok");
  assert(shouldShowRenewalCta(expired) === true, "CTA after trial");

  // Deeper into grace → GRACE_PERIOD
  const grace = deriveSubscriptionLifecycle(sub, new Date("2026-03-05T00:00:00.000Z"));
  assert(grace === "grace_period", `expected grace_period got ${grace}`);
  assert(shouldEnforceSubscriptionReadOnly(grace) === false, "grace writes ok");

  // After graceEndsAt → READ_ONLY (mutations blocked via platform gate)
  const ro = deriveSubscriptionLifecycle(sub, new Date("2026-03-15T00:00:00.000Z"));
  assert(ro === "read_only", `expected read_only got ${ro}`);
  assert(shouldEnforceSubscriptionReadOnly(ro) === true, "readonly enforce");
  assert(shouldShowRenewalCta(ro) === true, "CTA in read-only");

  const viewGrace = buildSubscriptionTrialView(sub, new Date("2026-03-05T00:00:00.000Z"));
  assert(viewGrace.writesAllowed === true, "view writes in grace");
  assert(viewGrace.showRenewalCta === true, "view CTA in grace");
  assert((viewGrace.graceDaysRemaining ?? 0) > 0, "grace days remaining");

  const viewRo = buildSubscriptionTrialView(sub, new Date("2026-03-15T00:00:00.000Z"));
  assert(viewRo.writesAllowed === false, "view writes blocked in RO");
  assert(viewRo.lifecycleStatus === "read_only", "view status RO");
}

{
  // Paid ACTIVE clears read-only and restores writes
  const start = "2026-03-20T00:00:00.000Z";
  const end = addUtcDays(start, 30);
  const sub: InstituteSubscription = {
    ...base,
    lifecycleStatus: "read_only",
    trialStartAt: "2026-01-01T00:00:00.000Z",
    trialEndAt: "2026-03-02T00:00:00.000Z",
    graceEndsAt: "2026-03-09T00:00:00.000Z",
    currentPeriod: {
      durationMonths: 1,
      activeStudentCount: 100,
      assignedRateInr: 12,
      monthlyPriceInr: 8000,
      regularAmountInr: 8000,
      discountAmountInr: 0,
      payableAmountInr: 8000,
      freeMonths: 0,
      startAt: start,
      endAt: end,
      paymentMethod: "offline",
      paymentStatus: "paid",
      amountPaidInr: 8000,
      paidAt: start,
    },
  };
  const active = deriveSubscriptionLifecycle(sub, new Date("2026-03-25T00:00:00.000Z"));
  assert(active === "active", `expected active got ${active}`);
  assert(shouldEnforceSubscriptionReadOnly(active) === false, "active clears RO");
  assert(shouldShowRenewalCta(active) === false, "no CTA while active");

  const view = buildSubscriptionTrialView(sub, new Date("2026-03-25T00:00:00.000Z"));
  assert(view.writesAllowed === true, "writes restored after payment");
  assert(view.lifecycleStatus === "active", "view active");
}

{
  // Paid period mid-month (no trial dates needed for active)
  const start = "2026-01-01T00:00:00.000Z";
  const end = addUtcDays(start, 30);
  const sub: InstituteSubscription = {
    ...base,
    lifecycleStatus: "active",
    trialStartAt: null,
    trialEndAt: null,
    graceEndsAt: addUtcDays(end, 7),
    currentPeriod: {
      durationMonths: 1,
      activeStudentCount: 100,
      assignedRateInr: 12,
      monthlyPriceInr: 8000,
      regularAmountInr: 8000,
      discountAmountInr: 0,
      payableAmountInr: 8000,
      freeMonths: 0,
      startAt: start,
      endAt: end,
      paymentMethod: "offline",
      paymentStatus: "paid",
      amountPaidInr: 8000,
      paidAt: start,
    },
  };
  const active = deriveSubscriptionLifecycle(sub, new Date("2026-01-15T00:00:00.000Z"));
  assert(active === "active", `expected active got ${active}`);
  assert(shouldEnforceSubscriptionReadOnly(active) === false, "active writes ok");
}

console.log("subscription/lifecycle.selftest: OK");
