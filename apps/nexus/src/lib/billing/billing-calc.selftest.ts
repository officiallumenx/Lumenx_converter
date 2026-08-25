/**
 * Self-test for plan billing calculation (adapter → subscription SoT).
 * Run: npx tsx src/lib/billing/billing-calc.selftest.ts
 */

import {
  calculatePlanBill,
  calculatePlanBillStrict,
  maxFreeMonthsForPlan,
  monthlyRateFromQuote,
  validateBillingInputs,
} from "./billing-calc";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

function assertEq(actual: number, expected: number, label: string): void {
  assert(actual === expected, `${label}: expected ${expected}, got ${actual}`);
}

// Floor: 100 × 12 = 1200 → monthly 8000
{
  const r = calculatePlanBill({
    activeStudentCount: 100,
    quotedRateInr: 12,
    rateQuotePeriod: "monthly",
    planTenureMonths: 1,
  });
  assertEq(r.monthlyPriceInr, 8000, "1mo monthly floor");
  assertEq(r.estimateInr, 8000, "1mo estimate");
  assertEq(r.finalAmountInr, 8000, "1mo payable");
  assert(r.floorApplied === true, "floor applied");
  assert(r.showAsBaseSubscription === true, "base UI");
}

{
  const r = calculatePlanBill({
    activeStudentCount: 100,
    quotedRateInr: 12,
    rateQuotePeriod: "monthly",
    planTenureMonths: 6,
  });
  assertEq(r.estimateInr, 48000, "6mo estimate");
  assertEq(r.finalAmountInr, 48000, "6mo payable (no free)");
  assertEq(r.freeMonths, 0, "6mo free");
}

{
  const r = calculatePlanBill({
    activeStudentCount: 100,
    quotedRateInr: 12,
    rateQuotePeriod: "monthly",
    planTenureMonths: 12,
  });
  assertEq(r.estimateInr, 96000, "1yr estimate");
  assertEq(r.finalAmountInr, 80000, "1yr payable (2 free)");
  assertEq(r.freeMonths, 2, "1yr free");
}

// Above floor: 600 × 14
{
  const r = calculatePlanBill({
    activeStudentCount: 600,
    quotedRateInr: 14,
    rateQuotePeriod: "monthly",
    planTenureMonths: 1,
  });
  assertEq(r.monthlyPriceInr, 8400, "above floor monthly");
  assertEq(r.finalAmountInr, 8400, "above floor payable");
  assert(r.floorApplied === false, "no floor");
}

// Yearly quote → monthly equivalent then floor
assertEq(monthlyRateFromQuote(144, "yearly"), 12, "yearly÷12");
{
  const r = calculatePlanBill({
    activeStudentCount: 100,
    quotedRateInr: 144,
    rateQuotePeriod: "yearly",
    planTenureMonths: 6,
  });
  assertEq(r.monthlyRateInr, 12, "yearly monthly rate");
  assertEq(r.finalAmountInr, 48000, "yearly quote 6mo payable");
}

assertEq(maxFreeMonthsForPlan(1), 0, "1mo max free");
assertEq(maxFreeMonthsForPlan(6), 0, "6mo max free");
assertEq(maxFreeMonthsForPlan(12), 2, "1yr max free");

// Percent discount is ignored — commercial free months win
{
  const r = calculatePlanBill({
    activeStudentCount: 100,
    quotedRateInr: 12,
    rateQuotePeriod: "monthly",
    planTenureMonths: 12,
    discountKind: "percent",
    discountPercent: 12,
  });
  assertEq(r.freeMonths, 2, "percent ignored → policy free months");
  assertEq(r.finalAmountInr, 80000, "payable uses free months");
}

{
  const v = validateBillingInputs({
    activeStudentCount: 10,
    quotedRateInr: 12,
    planTenureMonths: 1,
  });
  assert(v.ok, "valid inputs");
}

{
  const strict = calculatePlanBillStrict({
    activeStudentCount: 600,
    quotedRateInr: 14,
    planTenureMonths: 1,
  });
  assert(strict.ok === true, "strict ok");
  if (strict.ok) assertEq(strict.result.finalAmountInr, 8400, "strict payable");
}

console.log("billing-calc.selftest: OK");
