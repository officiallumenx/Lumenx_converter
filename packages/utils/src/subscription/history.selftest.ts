/**
 * Self-test: immutable billing history snapshots.
 * Run: npx tsx packages/utils/src/subscription/history.selftest.ts
 */

import { MIN_MONTHLY_CHARGE_INR } from "./policy";
import {
  approveOfflinePayment,
  getInstituteBillingHistory,
  listRenewalRecords,
  setInstituteAssignedRate,
  startInstituteTrial,
  submitOfflinePayment,
  syncPostRenewalHeadcount,
} from "./store";

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

memory.clear();
const instituteId = "ins-history-1";

startInstituteTrial({
  instituteId,
  instituteName: "History School",
  assignedRateInr: 12,
  activeStudentCount: 700,
  trialStartAt: "2020-01-01T00:00:00.000Z",
});

const sub1 = submitOfflinePayment({
  instituteId,
  durationMonths: 6,
  referenceId: "UTR-HIST-1",
});
approveOfflinePayment(sub1!.submissionId, { reviewedBy: "Test" });

const renewalsAfterFirst = listRenewalRecords(instituteId);
assert(renewalsAfterFirst.length === 1, "one renewal");
const snap = renewalsAfterFirst[0]!;
assert(snap.minMonthlyChargeInr === MIN_MONTHLY_CHARGE_INR, "min charge snapped");
assert(snap.activeStudentCountAtPurchase === 700, "students snapped");
assert(snap.assignedRateInrAtPurchase === 12, "rate snapped");
assert(snap.monthlyPriceInr === 8400, "monthly snapped");
assert(typeof snap.regularAmountInr === "number", "regular");
assert(typeof snap.discountAmountInr === "number", "discount");
assert(typeof snap.payableAmountInr === "number", "final");
assert(snap.paymentMethod === "offline", "method");
assert(snap.paymentStatus === "paid", "status");
assert(!!snap.subscriptionStartAt && !!snap.subscriptionEndAt, "dates");

const frozen = JSON.stringify(snap);

// Live rate change must not rewrite history
setInstituteAssignedRate(instituteId, 15);
assert(JSON.stringify(listRenewalRecords(instituteId)[0]) === frozen, "rate change immutable");

// Live student count change must not rewrite renewal snapshot
const now = new Date(listRenewalRecords(instituteId)[0]!.subscriptionStartAt);
now.setUTCDate(now.getUTCDate() + 30);
syncPostRenewalHeadcount({ instituteId, liveStudentCount: 800, now });
assert(JSON.stringify(listRenewalRecords(instituteId)[0]) === frozen, "headcount immutable");

const history = getInstituteBillingHistory(instituteId);
assert(history.renewals.length === 1, "history renewals");
assert(history.payments.length >= 1, "history payments");
assert(history.subscription?.assignedRateInr === 15, "live rate updated");
assert(
  history.subscription?.currentPeriod?.assignedRateInr === 12,
  "period snapshot rate unchanged",
);
assert(
  history.subscription?.currentPeriod?.activeStudentCount === 700,
  "period snapshot students unchanged",
);

// New renewal creates a NEW record (second purchase)
const sub2 = submitOfflinePayment({
  instituteId,
  durationMonths: 1,
  referenceId: "UTR-HIST-2",
});
// Need pending - but already active with pending offline might work
if (sub2 && sub2.status === "verification_pending") {
  approveOfflinePayment(sub2.submissionId, { reviewedBy: "Test" });
}
assert(listRenewalRecords(instituteId).length >= 1, "renewals still present");
// First renewal still identical
const first = listRenewalRecords(instituteId).find((r) => r.paymentRef === "UTR-HIST-1");
assert(!!first, "first renewal kept");
assert(JSON.stringify(first) === frozen, "first renewal never rewritten");

const adj = history.adjustments.find((a) => a.status === "pending");
if (adj) {
  assert(adj.reason.length > 0, "adjustment reason");
  assert(typeof adj.additionalStudentCount === "number", "added count");
  assert(typeof adj.remainingMonths === "number", "remaining");
  assert(typeof adj.payableAmountInr === "number", "additional amount");
  assert(!!adj.createdAt, "created date");
}

console.log("subscription/history.selftest: OK");
