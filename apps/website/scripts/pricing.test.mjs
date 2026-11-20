/**
 * LumenX pricing calculation tests (custom rate ≥ ₹10).
 * Run: node scripts/pricing.test.mjs
 */
import assert from "node:assert/strict";
import {
  calculateMonthly,
  calculateQuote,
  formatInr,
  normalizeRate,
  normalizeStudentCount,
  PRICING,
} from "../src/utils/pricing.js";

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`  ok  ${name}`);
  } catch (err) {
    failed += 1;
    console.error(`  FAIL  ${name}`);
    console.error(`        ${err.message}`);
  }
}

console.log("Monthly payable = max(8000, students × customRate)");
test("300 × ₹10 = ₹3,000 → display monthly ₹8,000", () => {
  const m = calculateMonthly(300, 10);
  assert.equal(m.studentSubtotal, 3000);
  assert.equal(m.monthlyPayable, 8000);
  assert.equal(m.minimumApplied, true);
  const q3 = calculateQuote(300, 10, "3m");
  const q6 = calculateQuote(300, 10, "6m");
  const q12 = calculateQuote(300, 10, "12m");
  assert.equal(q3.totalPayable, 8000 * 3);
  assert.equal(q6.totalPayable, 8000 * 6);
  assert.equal(q12.normalAnnualAmount, 8000 * 12);
  assert.equal(q12.annualDiscount, 8000 * 2);
  assert.equal(q12.totalPayable, 8000 * 10);
});
test("300 × ₹15 = ₹4,500 → monthly ₹8,000", () => {
  const m = calculateMonthly(300, 15);
  assert.equal(m.studentSubtotal, 4500);
  assert.equal(m.monthlyPayable, 8000);
  assert.equal(m.minimumApplied, true);
});
test("500 × ₹15 = ₹7,500 → monthly ₹8,000", () => {
  const m = calculateMonthly(500, 15);
  assert.equal(m.studentSubtotal, 7500);
  assert.equal(m.monthlyPayable, 8000);
  assert.equal(m.minimumApplied, true);
  const q12 = calculateQuote(500, 15, "12m");
  assert.equal(q12.totalPayable, 8000 * 10);
  assert.notEqual(q12.totalPayable, 7500 * 10);
});
test("667 × ₹12 = ₹8,004 → monthly ₹8,004", () => {
  const m = calculateMonthly(667, 12);
  assert.equal(m.studentSubtotal, 8004);
  assert.equal(m.monthlyPayable, 8004);
  assert.equal(m.minimumApplied, false);
});
test("800 × ₹10 = ₹8,000 → monthly ₹8,000", () => {
  const m = calculateMonthly(800, 10);
  assert.equal(m.studentSubtotal, 8000);
  assert.equal(m.monthlyPayable, 8000);
  assert.equal(m.minimumApplied, false);
});
test("900 × ₹10 = ₹9,000 → monthly ₹9,000", () => {
  const m = calculateMonthly(900, 10);
  assert.equal(m.studentSubtotal, 9000);
  assert.equal(m.monthlyPayable, 9000);
});
test("900 × ₹12 = ₹10,800 → monthly ₹10,800", () => {
  const m = calculateMonthly(900, 12);
  assert.equal(m.studentSubtotal, 10800);
  assert.equal(m.monthlyPayable, 10800);
});
test("1,000 × ₹15 = ₹15,000 → monthly ₹15,000", () => {
  const m = calculateMonthly(1000, 15);
  assert.equal(m.studentSubtotal, 15000);
  assert.equal(m.monthlyPayable, 15000);
});
test("custom rate ₹20: 900 × ₹20 = ₹18,000", () => {
  const m = calculateMonthly(900, 20);
  assert.equal(m.studentSubtotal, 18000);
  assert.equal(m.monthlyPayable, 18000);
});
test("custom rate ₹50: 500 × ₹50 = ₹25,000", () => {
  const m = calculateMonthly(500, 50);
  assert.equal(m.studentSubtotal, 25000);
  assert.equal(m.monthlyPayable, 25000);
});
test("never adds ₹8,000 on top of subtotal", () => {
  const m = calculateMonthly(1000, 15);
  assert.notEqual(m.monthlyPayable, 8000 + 15000);
  assert.equal(m.monthlyPayable, 15000);
  const below = calculateMonthly(300, 15);
  assert.notEqual(below.monthlyPayable, 8000 + 4500);
  assert.equal(below.monthlyPayable, 8000);
});
test("exact minimum: 800 students × ₹10 = ₹8,000", () => {
  const m = calculateMonthly(800, 10);
  assert.equal(m.calculatedAmount, 8000);
  assert.equal(m.monthlyPayable, 8000);
  assert.equal(m.minimumApplied, false);
});

console.log("Billing durations");
test("3 months uses applicable monthly", () => {
  const q = calculateQuote(900, 12, "3m");
  assert.equal(q.monthlyPayable, 10800);
  assert.equal(q.totalPayable, 10800 * 3);
  assert.equal(q.serviceMonths, 3);
});
test("6 months uses same monthly", () => {
  const q = calculateQuote(900, 12, "6m");
  assert.equal(q.monthlyPayable, 10800);
  assert.equal(q.totalPayable, 10800 * 6);
  assert.equal(q.serviceMonths, 6);
});
test("3m and 6m share monthly for minimum case", () => {
  const a = calculateQuote(300, 15, "3m");
  const b = calculateQuote(300, 15, "6m");
  assert.equal(a.monthlyPayable, 8000);
  assert.equal(b.monthlyPayable, 8000);
  assert.equal(a.totalPayable, 24000);
  assert.equal(b.totalPayable, 48000);
});
test("custom ₹50 annual: pay 10 months", () => {
  const q = calculateQuote(200, 50, "12m");
  assert.equal(q.monthlyPayable, 10000);
  assert.equal(q.normalAnnualAmount, 120000);
  assert.equal(q.annualDiscount, 20000);
  assert.equal(q.totalPayable, 100000);
});

console.log("Annual billing");
test("at ₹8,000 monthly: ₹96,000 − ₹16,000 = ₹80,000", () => {
  const q = calculateQuote(300, 15, "12m");
  assert.equal(q.monthlyPayable, 8000);
  assert.equal(q.normalAnnualAmount, 96000);
  assert.equal(q.annualDiscount, 16000);
  assert.equal(q.totalPayable, 80000);
  assert.equal(q.monthsPaid, 10);
  assert.equal(q.serviceMonths, 12);
});
test("at ₹10,800 monthly: ₹129,600 − ₹21,600 = ₹108,000", () => {
  const q = calculateQuote(900, 12, "12m");
  assert.equal(q.monthlyPayable, 10800);
  assert.equal(q.normalAnnualAmount, 129600);
  assert.equal(q.annualDiscount, 21600);
  assert.equal(q.totalPayable, 108000);
});
test("900 × ₹10 annual: ₹1,08,000 − ₹18,000 = ₹90,000", () => {
  const m = calculateMonthly(900, 10);
  assert.equal(m.calculatedAmount, 9000);
  assert.equal(m.monthlyPayable, 9000);
  const q = calculateQuote(900, 10, "12m");
  assert.equal(q.normalAnnualAmount, 108000);
  assert.equal(q.annualDiscount, 18000);
  assert.equal(q.totalPayable, 90000);
});
test("legacy annual id aliases to 12m", () => {
  const q = calculateQuote(300, 15, "annual");
  assert.equal(q.durationId, "12m");
  assert.equal(q.totalPayable, 80000);
});

console.log("Custom rate validation");
test("default rate constant is ₹10", () => {
  assert.equal(PRICING.defaultRate, 10);
  assert.equal(PRICING.rateMin, 10);
});
test("rates ≥ ₹10 accepted including above former ₹15 cap", () => {
  for (const r of [10, 12, 15, 16, 20, 50, 10.5, 99.99]) {
    assert.equal(normalizeRate(r), r);
    assert.ok(calculateMonthly(100, r));
  }
});
test("rates below ₹10, blank, and invalid rejected", () => {
  assert.equal(normalizeRate(9), null);
  assert.equal(normalizeRate(9.99), null);
  assert.equal(normalizeRate(0), null);
  assert.equal(normalizeRate(-5), null);
  assert.equal(normalizeRate(""), null);
  assert.equal(normalizeRate(null), null);
  assert.equal(normalizeRate(undefined), null);
  assert.equal(normalizeRate("abc"), null);
  assert.equal(normalizeRate(Number.NaN), null);
  assert.equal(normalizeRate(Number.POSITIVE_INFINITY), null);
  assert.equal(calculateMonthly(100, 9), null);
  assert.equal(calculateMonthly(100, 9.99), null);
  assert.equal(calculateQuote(100, "", "3m"), null);
});
test("invalid student counts", () => {
  assert.equal(normalizeStudentCount(-1), null);
  assert.equal(normalizeStudentCount("abc"), null);
  assert.equal(calculateMonthly(-5, 12), null);
  assert.equal(calculateQuote("nope", 12, "3m"), null);
});
test("zero students yields minimum monthly", () => {
  const m = calculateMonthly(0, 12);
  assert.equal(m.calculatedAmount, 0);
  assert.equal(m.monthlyPayable, 8000);
  assert.equal(m.minimumApplied, true);
});
test("unknown duration returns null", () => {
  assert.equal(calculateQuote(100, 12, "quarterly"), null);
});
test("INR formatting", () => {
  assert.equal(formatInr(80000), "₹80,000");
  assert.equal(formatInr(10800), "₹10,800");
  assert.equal(formatInr(129600), "₹1,29,600");
  assert.equal(formatInr(null), "—");
});

console.log("");
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
