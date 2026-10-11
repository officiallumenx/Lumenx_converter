/**
 * Exact UTC boundary cases for 60-day trial + 7-day grace + paid period.
 */
import { describe, it, expect } from "vitest";
import {
  accessModeForLifecycle,
  deriveSubscriptionLifecycle,
  shouldEnforceSubscriptionReadOnly,
} from "../src/domains/subscriptions/lifecycle.js";
import {
  DEFAULT_GRACE_DAYS,
  DEFAULT_TRIAL_DAYS,
  addUtcDays,
} from "../src/domains/subscriptions/pricing.js";

describe("subscription lifecycle boundaries", () => {
  it("uses 60-day trial and 7-day grace defaults", () => {
    expect(DEFAULT_TRIAL_DAYS).toBe(60);
    expect(DEFAULT_GRACE_DAYS).toBe(7);
    const trialStartAt = "2026-01-01T00:00:00.000Z";
    const trialEndAt = addUtcDays(trialStartAt, DEFAULT_TRIAL_DAYS);
    const graceEndsAt = addUtcDays(trialEndAt, DEFAULT_GRACE_DAYS);
    expect(trialEndAt).toBe("2026-03-02T00:00:00.000Z");
    expect(graceEndsAt).toBe("2026-03-09T00:00:00.000Z");
  });

  it("keeps trial_active until exact trialEndAt inclusive", () => {
    const trialStartAt = "2026-01-01T00:00:00.000Z";
    const trialEndAt = addUtcDays(trialStartAt, 60);
    const graceEndsAt = addUtcDays(trialEndAt, 7);
    const sub = {
      lifecycleStatus: "trial_active",
      trialStartAt,
      trialEndAt,
      graceEndsAt,
      currentPeriod: null,
    };

    // Mid-trial (well before expiring window)
    expect(
      deriveSubscriptionLifecycle(sub, new Date("2026-01-15T12:00:00.000Z")),
    ).toBe("trial_active");

    // Exact trial end still writable trial (expiring when ≤7 days left)
    const atEnd = deriveSubscriptionLifecycle(sub, new Date(trialEndAt));
    expect(atEnd).toBe("trial_expiring");
    expect(shouldEnforceSubscriptionReadOnly(atEnd)).toBe(false);

    // 1ms after trial end → trial_expired (grace writes)
    const justAfter = new Date(new Date(trialEndAt).getTime() + 1);
    const expired = deriveSubscriptionLifecycle(sub, justAfter);
    expect(expired).toBe("trial_expired");
    expect(accessModeForLifecycle(expired)).toBe("grace");
    expect(shouldEnforceSubscriptionReadOnly(expired)).toBe(false);
  });

  it("keeps grace writable until exact graceEndsAt inclusive, then read_only", () => {
    const trialStartAt = "2026-01-01T00:00:00.000Z";
    const trialEndAt = addUtcDays(trialStartAt, 60);
    const graceEndsAt = addUtcDays(trialEndAt, 7);
    const sub = {
      lifecycleStatus: "grace_period",
      trialStartAt,
      trialEndAt,
      graceEndsAt,
      currentPeriod: null,
    };

    // Deeper into grace (>1 day after trial end)
    const midGrace = deriveSubscriptionLifecycle(
      sub,
      new Date(new Date(trialEndAt).getTime() + 2 * 24 * 60 * 60 * 1000),
    );
    expect(midGrace).toBe("grace_period");
    expect(shouldEnforceSubscriptionReadOnly(midGrace)).toBe(false);

    const atGraceEnd = deriveSubscriptionLifecycle(sub, new Date(graceEndsAt));
    expect(atGraceEnd).toBe("grace_period");
    expect(shouldEnforceSubscriptionReadOnly(atGraceEnd)).toBe(false);

    const afterGrace = new Date(new Date(graceEndsAt).getTime() + 1);
    const ro = deriveSubscriptionLifecycle(sub, afterGrace);
    expect(ro).toBe("read_only");
    expect(shouldEnforceSubscriptionReadOnly(ro)).toBe(true);
  });

  it("paid period: active through endsAt, grace after, read_only after grace", () => {
    const startsAt = "2026-06-01T00:00:00.000Z";
    const endsAt = addUtcDays(startsAt, 30);
    const graceEndMs =
      new Date(endsAt).getTime() + DEFAULT_GRACE_DAYS * 24 * 60 * 60 * 1000;
    const sub = {
      lifecycleStatus: "active",
      trialStartAt: null,
      trialEndAt: null,
      graceEndsAt: null,
      currentPeriod: {
        startsAt,
        endsAt,
        paymentStatus: "paid",
      },
    };

    expect(
      deriveSubscriptionLifecycle(sub, new Date("2026-05-15T00:00:00.000Z")),
    ).toBe("active"); // prepaid / not started yet

    expect(deriveSubscriptionLifecycle(sub, new Date(startsAt))).toBe("active");
    expect(deriveSubscriptionLifecycle(sub, new Date(endsAt))).toBe("active");

    const justAfterEnd = new Date(new Date(endsAt).getTime() + 1);
    expect(deriveSubscriptionLifecycle(sub, justAfterEnd)).toBe("grace_period");
    expect(
      shouldEnforceSubscriptionReadOnly(
        deriveSubscriptionLifecycle(sub, justAfterEnd),
      ),
    ).toBe(false);

    const atPaidGraceEnd = new Date(graceEndMs);
    expect(deriveSubscriptionLifecycle(sub, atPaidGraceEnd)).toBe(
      "grace_period",
    );

    const afterPaidGrace = new Date(graceEndMs + 1);
    expect(deriveSubscriptionLifecycle(sub, afterPaidGrace)).toBe("read_only");
    expect(
      shouldEnforceSubscriptionReadOnly(
        deriveSubscriptionLifecycle(sub, afterPaidGrace),
      ),
    ).toBe(true);
  });
});
