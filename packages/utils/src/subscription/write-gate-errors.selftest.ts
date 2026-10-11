/**
 * Self-test: subscription write-gate error helpers.
 * Run: npx tsx packages/utils/src/subscription/write-gate-errors.selftest.ts
 */
import {
  formatSubscriptionWriteBlockedMessage,
  isSubscriptionWriteBlockedError,
  subscriptionWriteGateReasonFromDetails,
} from "./write-gate-errors";

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

assert(
  subscriptionWriteGateReasonFromDetails({
    reason: "SUBSCRIPTION_READ_ONLY",
    lifecycleStatus: "read_only",
  }) === "SUBSCRIPTION_READ_ONLY",
  "reason from details",
);

assert(
  subscriptionWriteGateReasonFromDetails({ reason: "other" }) === null,
  "unknown reason ignored",
);

assert(
  isSubscriptionWriteBlockedError({
    status: 403,
    details: { reason: "SUBSCRIPTION_REQUIRED" },
    message: "Institute subscription is required before making changes.",
  }),
  "required is blocked",
);

assert(
  !isSubscriptionWriteBlockedError({ status: 403, message: "No permission" }),
  "generic 403 is not subscription lock",
);

assert(
  formatSubscriptionWriteBlockedMessage({
    message: "Institute subscription is read-only. Renew billing to restore edits.",
    details: { reason: "SUBSCRIPTION_READ_ONLY" },
  }).includes("read-only"),
  "prefer server message",
);

console.log("write-gate-errors.selftest: ok");
