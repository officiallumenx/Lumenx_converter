/**
 * Self-test: post-renewal billing adjustments (Case A / B / remaining months / trial skip).
 * Run: npx tsx packages/utils/src/subscription/adjustments.selftest.ts
 */

import {
  calculatePostRenewalAdjustment,
  remainingMonthsInPeriod,
} from "./adjustments";
import {
  approveOfflinePayment,
  getInstituteSubscription,
  listBillingAdjustments,
  listRenewalRecords,
  startInstituteTrial,
  submitOfflinePayment,
  syncPostRenewalHeadcount,
} from "./store";
import { MIN_MONTHLY_CHARGE_INR } from "./policy";

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

// Case A — still under floor after adds
{
  const q = calculatePostRenewalAdjustment({
    purchaseStudentCount: 200,
    assignedRateInr: 12,
    purchaseMonthlyPriceInr: 8000,
    liveStudentCount: 204,
    durationMonths: 1,
    periodStartAt: "2026-01-01T00:00:00.000Z",
    periodEndAt: "2026-01-31T00:00:00.000Z",
    now: new Date("2026-01-10T00:00:00.000Z"),
  });
  assert(q.stillUnderMinimum === true, "case A under min");
  assert(q.additionalMonthlyInr === 0, "case A no monthly delta");
  assert(q.payableAmountInr === 0, "case A no payable");
  assert(q.chargeRequired === false, "case A no charge");
}

// Case B — above floor, +4 students
{
  const q = calculatePostRenewalAdjustment({
    purchaseStudentCount: 700,
    assignedRateInr: 12,
    purchaseMonthlyPriceInr: 8400,
    liveStudentCount: 704,
    durationMonths: 1,
    periodStartAt: "2026-01-01T00:00:00.000Z",
    periodEndAt: "2026-01-31T00:00:00.000Z",
    now: new Date("2026-01-10T00:00:00.000Z"),
  });
  assert(q.additionalStudentCount === 4, "case B +4");
  assert(q.additionalMonthlyInr === 48, "case B +48/mo");
  assert(q.payableAmountInr === 48, "case B monthly payable");
  assert(q.chargeRequired === true, "case B charge");
}

// Remaining period: 6 months, after 3 months, +100 students
{
  const start = "2026-01-01T00:00:00.000Z";
  const end = "2026-07-01T00:00:00.000Z"; // 6×30d ≈ if using 180 days from Jan 1 = Jul 1? 
  // approve uses durationMonths * 30 days from start
  const endExact = new Date("2026-01-01T00:00:00.000Z");
  endExact.setUTCDate(endExact.getUTCDate() + 6 * 30);
  const now = new Date("2026-01-01T00:00:00.000Z");
  now.setUTCDate(now.getUTCDate() + 3 * 30);

  const rem = remainingMonthsInPeriod(start, endExact.toISOString(), 6, now);
  assert(rem === 3, `remaining months got ${rem}`);

  const q = calculatePostRenewalAdjustment({
    purchaseStudentCount: 700,
    assignedRateInr: 12,
    purchaseMonthlyPriceInr: 8400,
    liveStudentCount: 800,
    durationMonths: 6,
    periodStartAt: start,
    periodEndAt: endExact.toISOString(),
    now,
  });
  assert(q.additionalMonthlyInr === 1200, "100×12 monthly");
  assert(q.remainingMonths === 3, "3 months left");
  assert(q.payableAmountInr === 3600, "100×12×3");
}

// Floor constant
assert(MIN_MONTHLY_CHARGE_INR === 8000, "floor 8000");

// Store: trial skip + paid period adjustment; renewal immutable
{
  memory.clear();
  const instituteId = "ins-adj-1";
  startInstituteTrial({
    instituteId,
    instituteName: "Adj School",
    assignedRateInr: 12,
    activeStudentCount: 700,
    trialStartAt: "2020-01-01T00:00:00.000Z",
  });
  // Still trial/expired — no paid period
  const none = syncPostRenewalHeadcount({ instituteId, liveStudentCount: 700 });
  assert(none === null, "no adjustment without paid period");

  const sub = submitOfflinePayment({
    instituteId,
    durationMonths: 6,
    referenceId: "UTR-ADJ-BASE",
  });
  approveOfflinePayment(sub!.submissionId, { reviewedBy: "Test" });
  const active = getInstituteSubscription(instituteId)!;
  assert(active.lifecycleStatus === "active", "active after approve");
  const purchased = active.currentPeriod!.activeStudentCount;
  assert(purchased === 700, `snapshot 700 got ${purchased}`);

  const renewalsBefore = JSON.stringify(listRenewalRecords(instituteId));

  const now = new Date(active.currentPeriod!.startAt);
  now.setUTCDate(now.getUTCDate() + 3 * 30);

  const adj = syncPostRenewalHeadcount({
    instituteId,
    liveStudentCount: purchased + 100,
    now,
  });
  assert(!!adj, "adjustment created");
  assert(adj!.payableAmountInr === 3600, `payable got ${adj!.payableAmountInr}`);
  assert(adj!.status === "pending", "pending");
  assert(adj!.additionalStudentCount === 100, "+100");

  // Consolidate: another sync with more students updates SAME pending
  const adj2 = syncPostRenewalHeadcount({
    instituteId,
    liveStudentCount: purchased + 150,
    now,
  });
  assert(adj2!.adjustmentId === adj!.adjustmentId, "consolidated id");
  assert(listBillingAdjustments(instituteId).filter((a) => a.status === "pending").length === 1, "one pending");

  const renewalsAfter = JSON.stringify(listRenewalRecords(instituteId));
  assert(renewalsBefore === renewalsAfter, "renewal snapshot unchanged");
  assert(
    getInstituteSubscription(instituteId)!.currentPeriod!.activeStudentCount === purchased,
    "period snapshot students unchanged",
  );
}

console.log("subscription/adjustments.selftest: OK");
