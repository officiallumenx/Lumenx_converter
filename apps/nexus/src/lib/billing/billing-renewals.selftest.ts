/**
 * Self-test: renewal issues a new invoice and never mutates prior ones.
 * Run: npx tsx src/lib/billing/billing-renewals.selftest.ts
 */

import { calculatePlanBill } from "./billing-calc";
import {
  buildIssuedInvoice,
  commercialSnapshotOf,
  commercialSnapshotsEqual,
} from "./billing-invoice";
import {
  combineRenewalDisplayStatus,
  deriveRenewalStatus,
  labelRenewalStatus,
} from "./billing-renewals";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

function assertEq(actual: unknown, expected: unknown, label: string): void {
  assert(actual === expected, `${label}: expected ${String(expected)}, got ${String(actual)}`);
}

assertEq(labelRenewalStatus("current"), "Current", "label current");
assertEq(deriveRenewalStatus(new Date(Date.now() + 10 * 24 * 3600 * 1000), new Date()), "current", "far");
assertEq(
  combineRenewalDisplayStatus("current", true),
  "overdue",
  "overdue invoices affect display only",
);

const periodStart = new Date("2026-07-01T00:00:00.000Z");
const periodEnd = new Date("2026-08-01T00:00:00.000Z");

const prior = buildIssuedInvoice({
  instituteId: "ins-test",
  instituteName: "Test Academy",
  activeStudentCount: 300,
  quotedRateInr: 12,
  rateQuotePeriod: "monthly",
  planTenureMonths: 1,
  billingPeriodStart: periodStart,
  billingPeriodEnd: periodEnd,
  invoiceNumber: "LX-INV-2026-00001",
  amountPaidInr: 0,
});

const priorSnap = commercialSnapshotOf(prior);

const liveStudents = 1200;
const liveRate = 10;
const liveCalc = calculatePlanBill({
  activeStudentCount: liveStudents,
  quotedRateInr: liveRate,
  rateQuotePeriod: "monthly",
  planTenureMonths: 1,
});
assertEq(liveCalc.finalAmountInr, 12000, "new period bill");

const renewed = buildIssuedInvoice({
  instituteId: "ins-test",
  instituteName: "Test Academy",
  activeStudentCount: liveStudents,
  quotedRateInr: liveRate,
  rateQuotePeriod: "monthly",
  planTenureMonths: 1,
  billingPeriodStart: periodEnd,
  billingPeriodEnd: new Date("2026-09-01T00:00:00.000Z"),
  invoiceNumber: "LX-INV-2026-00002",
});

assertEq(renewed.finalAmountInr, 12000, "renewal invoice amount");
assertEq(prior.finalAmountInr, 8000, "prior invoice unchanged");
assertEq(prior.activeStudentCount, 300, "prior students unchanged");
assert(
  commercialSnapshotsEqual(prior, { ...prior, ...priorSnap } as typeof prior),
  "prior commercial snapshot stable after renewal calc",
);
assert(prior.invoiceNumber !== renewed.invoiceNumber, "distinct invoice numbers");

console.log("billing-renewals.selftest: all assertions passed");
