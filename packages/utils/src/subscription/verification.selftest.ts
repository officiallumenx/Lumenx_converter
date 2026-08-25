/**
 * Self-test: Nexus approve / reject offline payment verification.
 * Run: npx tsx packages/utils/src/subscription/verification.selftest.ts
 */

import {
  approveOfflinePayment,
  getInstituteSubscription,
  listOfflinePaymentSubmissions,
  listPaymentRecords,
  listRenewalRecords,
  rejectOfflinePayment,
  startInstituteTrial,
  submitOfflinePayment,
} from "./store";
import { shouldEnforceSubscriptionReadOnly } from "./lifecycle";
import { loadPlatformReadOnlyState } from "../platform-readonly";

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

// ── Approve path ──────────────────────────────────────────────
{
  memory.clear();
  const instituteId = "ins-verify-approve";
  startInstituteTrial({
    instituteId,
    instituteName: "Approve School",
    assignedRateInr: 12,
    activeStudentCount: 700,
    trialStartAt: "2020-01-01T00:00:00.000Z",
  });
  const sub = submitOfflinePayment({
    instituteId,
    durationMonths: 12,
    referenceId: "UTR-APPROVE-1",
    proofLabel: "proof.pdf",
  });
  assert(!!sub && sub.status === "verification_pending", "pending submit");

  const payBefore = listPaymentRecords(instituteId);
  assert(payBefore.some((p) => p.status === "verification_pending"), "pending payment row");
  const payCountBefore = payBefore.length;

  const next = approveOfflinePayment(sub!.submissionId, { reviewedBy: "Tester" });
  assert(!!next, "approve returns sub");
  assert(next!.lifecycleStatus === "active", "subscription ACTIVE");
  assert(next!.currentPeriod?.paymentStatus === "paid", "period paid");
  assert(!!next!.currentPeriod?.startAt && !!next!.currentPeriod?.endAt, "start/end set");
  assert(shouldEnforceSubscriptionReadOnly(next!.lifecycleStatus) === false, "RO cleared");
  assert(loadPlatformReadOnlyState().subscriptionExpired === false, "platform RO false");

  const renewals = listRenewalRecords(instituteId);
  assert(renewals.length === 1, "renewal created");
  assert(renewals[0]!.paymentStatus === "paid", "renewal paid");

  const pays = listPaymentRecords(instituteId);
  assert(pays.length === payCountBefore, "payment rows not deleted (updated in place)");
  assert(pays.some((p) => p.status === "paid" && p.reference === "UTR-APPROVE-1"), "paid history");
  assert(
    !pays.some((p) => p.status === "verification_pending" && p.reference === "UTR-APPROVE-1"),
    "no leftover pending for same ref",
  );

  const submission = listOfflinePaymentSubmissions("all").find(
    (s) => s.submissionId === sub!.submissionId,
  );
  assert(submission?.status === "paid", "submission paid in history");
}

// ── Reject path ───────────────────────────────────────────────
{
  memory.clear();
  const instituteId = "ins-verify-reject";
  startInstituteTrial({
    instituteId,
    instituteName: "Reject School",
    assignedRateInr: 12,
    activeStudentCount: 200,
    trialStartAt: "2020-01-01T00:00:00.000Z",
  });
  const sub = submitOfflinePayment({
    instituteId,
    durationMonths: 1,
    referenceId: "UTR-REJECT-1",
  });
  assert(!!sub, "reject path submit");
  const payCountBefore = listPaymentRecords(instituteId).length;
  const before = getInstituteSubscription(instituteId)!;
  assert(before.lifecycleStatus !== "active", "not active before reject");

  const updated = rejectOfflinePayment(sub!.submissionId, {
    reason: "UTR not found",
    reviewedBy: "Tester",
  });
  assert(updated?.status === "rejected", "rejected");
  assert(updated?.rejectionReason === "UTR not found", "reason kept");

  const after = getInstituteSubscription(instituteId)!;
  assert(after.lifecycleStatus !== "active", "reject must not activate");
  assert(after.lifecycleStatus === before.lifecycleStatus || after.lifecycleStatus === "read_only" || after.lifecycleStatus === "grace_period" || after.lifecycleStatus === "trial_expired", "stays non-active");

  const pays = listPaymentRecords(instituteId);
  assert(pays.length === payCountBefore, "reject does not delete payments");
  assert(pays.some((p) => p.status === "rejected" && p.reference === "UTR-REJECT-1"), "rejected history");
}

console.log("subscription/verification.selftest: OK");
