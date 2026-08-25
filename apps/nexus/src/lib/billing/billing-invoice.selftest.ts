/**
 * Self-test: invoice snapshots are immutable when pricing / students change.
 * Run: npx tsx src/lib/billing/billing-invoice.selftest.ts
 */

import { calculatePlanBill } from "./billing-calc";
import {
  buildIssuedInvoice,
  commercialSnapshotOf,
  commercialSnapshotsEqual,
  invoicePaymentStatus,
} from "./billing-invoice";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

function assertEq(actual: unknown, expected: unknown, label: string): void {
  assert(actual === expected, `${label}: expected ${String(expected)}, got ${String(actual)}`);
}

const periodStart = new Date("2026-08-01T00:00:00.000Z");
const periodEnd = new Date("2026-09-01T00:00:00.000Z");

const issued = buildIssuedInvoice({
  instituteId: "ins-test",
  instituteName: "Test Academy",
  activeStudentCount: 300,
  quotedRateInr: 12,
  rateQuotePeriod: "monthly",
  planTenureMonths: 1,
  billingPeriodStart: periodStart,
  billingPeriodEnd: periodEnd,
  invoiceNumber: "LX-INV-2026-00099",
  issueDate: new Date("2026-08-01T09:00:00.000Z"),
  dueDate: new Date("2026-08-31T00:00:00.000Z"),
});

assertEq(issued.invoiceNumber, "LX-INV-2026-00099", "invoice number");
assertEq(issued.instituteName, "Test Academy", "institute");
assertEq(issued.activeStudentCount, 300, "students");
assertEq(issued.perStudentRateInr, 12, "rate");
assertEq(issued.planTenureMonths, 1, "tenure");
assertEq(issued.finalAmountInr, 8000, "final MAX(8000, 300×12)");
assertEq(invoicePaymentStatus(issued, new Date("2026-08-15")), "pending", "payment pending");

const snapBefore = commercialSnapshotOf(issued);

const laterLive = calculatePlanBill({
  activeStudentCount: 1200,
  quotedRateInr: 10,
  rateQuotePeriod: "monthly",
  planTenureMonths: 1,
});
assertEq(laterLive.finalAmountInr, 12000, "live calc changed");
assertEq(issued.finalAmountInr, 8000, "issued final unchanged");
assertEq(issued.activeStudentCount, 300, "issued students unchanged");
assertEq(issued.perStudentRateInr, 12, "issued rate unchanged");

const snapAfter = commercialSnapshotOf(issued);
assert(
  commercialSnapshotsEqual(
    { ...issued, ...snapBefore } as typeof issued,
    { ...issued, ...snapAfter } as typeof issued,
  ),
  "commercial snapshot stable",
);
assertEq(JSON.stringify(snapBefore), JSON.stringify(snapAfter), "snapshot JSON stable");

let threw = false;
try {
  (issued as { finalAmountInr: number }).finalAmountInr = 99999;
  if (issued.finalAmountInr === 99999) threw = false;
  else threw = true;
} catch {
  threw = true;
}
assert(threw && issued.finalAmountInr === 8000, "frozen invoice resists mutation");

console.log("billing-invoice.selftest: all assertions passed");
