/**
 * Self-test: lifecycle statuses + outstanding.
 * Run: npx tsx src/lib/billing/billing-history.selftest.ts
 */

import { buildIssuedInvoice } from "./billing-invoice";
import {
  outstandingOnInvoice,
  resolveBillingLifecycleStatus,
  resolvePaymentStatus,
  labelBillingLifecycleStatus,
  BILLING_LIFECYCLE_STATUSES,
} from "./billing-history";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

function assertEq(actual: unknown, expected: unknown, label: string): void {
  assert(actual === expected, `${label}: expected ${String(expected)}, got ${String(actual)}`);
}

assertEq(BILLING_LIFECYCLE_STATUSES.length, 6, "six statuses");
assertEq(labelBillingLifecycleStatus("cancelled"), "Cancelled", "label");

const base = {
  instituteId: "ins-test",
  instituteName: "Test",
  perStudentRateInr: 12,
  minimumChargeInr: 8000,
  billingPeriodStart: "2026-08-01T00:00:00.000Z",
  billingPeriodEnd: "2026-09-01T00:00:00.000Z",
  invoiceNumber: "LX-INV-2026-00999",
  issueDate: "2026-08-01T09:00:00.000Z",
  dueDate: "2026-08-31T00:00:00.000Z",
};

const issued = buildIssuedInvoice({ ...base, activeStudentCount: 300, amountPaidInr: 0 });
assertEq(resolveBillingLifecycleStatus(issued, new Date("2026-08-15")), "issued", "issued unpaid");
assertEq(resolvePaymentStatus(issued, new Date("2026-08-15")), "pending", "payment pending");
assertEq(outstandingOnInvoice(issued), 8000, "outstanding MAX(8000, 300×12)");

const overdue = buildIssuedInvoice({
  ...base,
  invoiceNumber: "LX-INV-2026-01000",
  activeStudentCount: 300,
  amountPaidInr: 0,
  dueDate: "2026-07-01T00:00:00.000Z",
});
assertEq(resolveBillingLifecycleStatus(overdue, new Date("2026-08-15")), "overdue", "overdue");

const paid = buildIssuedInvoice({
  ...base,
  invoiceNumber: "LX-INV-2026-01001",
  activeStudentCount: 600,
  perStudentRateInr: 14,
  amountPaidInr: 8400,
});
assertEq(resolveBillingLifecycleStatus(paid), "paid", "paid");
assertEq(outstandingOnInvoice(paid), 0, "no outstanding");

const pendingPartial = { ...issued, amountPaidInr: 2000, status: "issued" as const };
assertEq(
  resolveBillingLifecycleStatus(pendingPartial, new Date("2026-08-15")),
  "pending",
  "partial → pending",
);

const cancelled = { ...issued, status: "cancelled" as const };
assertEq(resolveBillingLifecycleStatus(cancelled), "cancelled", "cancelled");
assertEq(outstandingOnInvoice(cancelled), 0, "cancelled outstanding 0");

const draft = buildIssuedInvoice({
  ...base,
  invoiceNumber: "LX-INV-2026-01002",
  activeStudentCount: 300,
  asDraft: true,
});
assertEq(resolveBillingLifecycleStatus(draft), "draft", "draft");

console.log("billing-history.selftest: all assertions passed");
