/**
 * Self-test: offline payment stays verification_pending (no auto-activate).
 * Run: npx tsx packages/utils/src/subscription/offline-payment.selftest.ts
 */

import {
  getInstituteSubscription,
  listOfflinePaymentSubmissions,
  startInstituteTrial,
  submitOfflinePayment,
  labelOfflinePaymentStatus,
} from "./store";
import { deriveSubscriptionLifecycle } from "./lifecycle";

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

const memory = new Map<string, string>();
(globalThis as { localStorage?: Storage }).localStorage = {
  getItem: (k) => memory.get(k) ?? null,
  setItem: (k, v) => {
    memory.set(k, String(v));
  },
  removeItem: (k) => {
    memory.delete(k);
  },
  clear: () => memory.clear(),
  key: () => null,
  get length() {
    return memory.size;
  },
} as Storage;

const instituteId = "ins-offline-selftest";
startInstituteTrial({
  instituteId,
  instituteName: "Offline Test School",
  assignedRateInr: 12,
  activeStudentCount: 200,
  trialStartAt: "2020-01-01T00:00:00.000Z",
});

const before = getInstituteSubscription(instituteId);
assert(!!before, "subscription exists");
assert(before!.lifecycleStatus !== "active", "not active before submit");

const submission = submitOfflinePayment({
  instituteId,
  durationMonths: 6,
  referenceId: "UTR-SELFTEST-001",
  proofLabel: "receipt.pdf",
});

assert(!!submission, "submission created");
assert(submission!.status === "verification_pending", "status pending");
assert(
  labelOfflinePaymentStatus(submission!.status) === "VERIFICATION_PENDING",
  "label",
);
assert(submission!.payableAmountInr > 0, "amount set");
assert(submission!.referenceId === "UTR-SELFTEST-001", "reference stored");

const after = getInstituteSubscription(instituteId);
assert(!!after, "sub after");
assert(after!.lifecycleStatus !== "active", "must NOT become active on submit");
assert(
  after!.pendingOfflineSubmissionId === submission!.submissionId,
  "pending id linked",
);

const pending = listOfflinePaymentSubmissions("verification_pending");
assert(
  pending.some((p) => p.submissionId === submission!.submissionId),
  "appears in pending list for Nexus",
);

// Duplicate submit returns same pending row
const again = submitOfflinePayment({
  instituteId,
  durationMonths: 12,
  referenceId: "UTR-OTHER",
});
assert(again!.submissionId === submission!.submissionId, "no duplicate pending");

const derived = deriveSubscriptionLifecycle(after!);
assert(derived !== "active", "derived lifecycle not active");

console.log("subscription/offline-payment.selftest: OK");
