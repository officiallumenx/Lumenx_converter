/**
 * Self-test: subscription pricing (MAX floor + fixed free months).
 * Run: npx tsx packages/utils/src/subscription/pricing.selftest.ts
 */

import {
  calculateSubscriptionQuote,
  quoteAllDurations,
} from "./pricing";
import { MIN_MONTHLY_CHARGE_INR, freeMonthsForDuration } from "./policy";

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

// Below floor: 200 × 12 = 2400 → monthly = 8000
{
  const q = calculateSubscriptionQuote({
    activeStudentCount: 200,
    assignedRateInr: 12,
    durationMonths: 1,
  });
  assert(q.monthlyPriceInr === MIN_MONTHLY_CHARGE_INR, "floor monthly");
  assert(q.floorApplied === true, "floor applied");
  assert(q.showAsBaseSubscription === true, "show as base");
  assert(q.payableAmountInr === 8000, "1mo payable");
  assert(q.regularAmountInr === 8000, "1mo regular");
  assert(q.discountAmountInr === 0, "1mo discount");
}

// 6 months below floor — no free months on half-year
{
  const q = calculateSubscriptionQuote({
    activeStudentCount: 200,
    assignedRateInr: 12,
    durationMonths: 6,
  });
  assert(q.freeMonths === 0, "6mo free");
  assert(q.regularAmountInr === 8000 * 6, "6mo regular");
  assert(q.payableAmountInr === 8000 * 6, "6mo payable");
  assert(q.discountAmountInr === 0, "6mo discount amt");
}

// Yearly below floor
{
  const q = calculateSubscriptionQuote({
    activeStudentCount: 200,
    assignedRateInr: 12,
    durationMonths: 12,
  });
  assert(q.freeMonths === 2, "12mo free");
  assert(q.payableAmountInr === 8000 * 10, "12mo payable");
}

// Above floor: 700 × 12 = 8400 (Nexus UI shows breakdown, not base)
{
  const q = calculateSubscriptionQuote({
    activeStudentCount: 700,
    assignedRateInr: 12,
    durationMonths: 1,
  });
  assert(q.studentChargeInr === 8400, "700×12 student charge");
  assert(q.monthlyPriceInr === 8400, "700 students monthly");
  assert(q.floorApplied === false, "700 no floor");
  assert(q.showAsBaseSubscription === false, "700 show breakdown");
}

// Above floor: 600 × 14 = 8400
{
  const q = calculateSubscriptionQuote({
    activeStudentCount: 600,
    assignedRateInr: 14,
    durationMonths: 1,
  });
  assert(q.monthlyPriceInr === 8400, "above floor monthly");
  assert(q.floorApplied === false, "no floor");
  assert(q.showAsBaseSubscription === false, "show breakdown");
  assert(q.payableAmountInr === 8400, "above floor payable");
}

// Above floor yearly
{
  const q = calculateSubscriptionQuote({
    activeStudentCount: 600,
    assignedRateInr: 14,
    durationMonths: 12,
  });
  assert(q.regularAmountInr === 8400 * 12, "yearly regular");
  assert(q.payableAmountInr === 8400 * 10, "yearly payable");
}

assert(freeMonthsForDuration(1) === 0, "free 1");
assert(freeMonthsForDuration(6) === 0, "free 6");
assert(freeMonthsForDuration(12) === 2, "free 12");

const all = quoteAllDurations({ activeStudentCount: 100, assignedRateInr: 12 });
assert(all.length === 3, "three durations");

console.log("subscription/pricing.selftest: OK");
