/**
 * Billing lifecycle statuses + payment ledger helpers (local/mock).
 * No payment gateway. No real processing.
 *
 * Statuses: Draft · Issued · Pending · Paid · Overdue · Cancelled
 */

import type { IssuedInvoice } from "./billing-invoice";

export type BillingLifecycleStatus =
  | "draft"
  | "issued"
  | "pending"
  | "paid"
  | "overdue"
  | "cancelled";

export const BILLING_LIFECYCLE_STATUSES: BillingLifecycleStatus[] = [
  "draft",
  "issued",
  "pending",
  "paid",
  "overdue",
  "cancelled",
];

export type BillingPaymentMethod = "bank_transfer" | "upi" | "cheque" | "other";

/** Mock ledger entry — not a gateway charge. */
export type BillingPaymentRecord = {
  id: string;
  instituteId: string;
  invoiceId: string;
  invoiceNumber: string;
  amountInr: number;
  recordedAt: string;
  method: BillingPaymentMethod;
  note?: string;
};

export type BillingHistoryKind =
  | "invoice_draft"
  | "invoice_issued"
  | "payment_recorded"
  | "invoice_cancelled"
  | "renewal_invoiced";

export type BillingHistoryEvent = {
  id: string;
  instituteId: string;
  kind: BillingHistoryKind;
  at: string;
  title: string;
  detail: string;
  amountInr?: number;
  invoiceNumber?: string;
  status?: BillingLifecycleStatus;
};

export function labelBillingLifecycleStatus(status: BillingLifecycleStatus): string {
  if (status === "draft") return "Draft";
  if (status === "issued") return "Issued";
  if (status === "pending") return "Pending";
  if (status === "paid") return "Paid";
  if (status === "overdue") return "Overdue";
  if (status === "cancelled") return "Cancelled";
  return status;
}

export function billingLifecycleTone(
  status: BillingLifecycleStatus,
): "success" | "warning" | "danger" | "info" | "neutral" {
  if (status === "paid") return "success";
  if (status === "issued" || status === "pending") return "warning";
  if (status === "overdue" || status === "cancelled") return "danger";
  if (status === "draft") return "info";
  return "neutral";
}

export function labelPaymentMethod(method: BillingPaymentMethod): string {
  if (method === "bank_transfer") return "Bank transfer";
  if (method === "upi") return "UPI";
  if (method === "cheque") return "Cheque";
  return "Other";
}

export function outstandingOnInvoice(
  invoice: Pick<IssuedInvoice, "finalAmountInr" | "amountPaidInr" | "status">,
): number {
  if (invoice.status === "cancelled" || invoice.status === "draft") {
    return 0;
  }
  return Math.max(0, invoice.finalAmountInr - invoice.amountPaidInr);
}

/**
 * Unified display status (all six product statuses).
 *
 * - Draft: not issued
 * - Cancelled: cancelled / void
 * - Paid: balance cleared
 * - Overdue: past due with balance
 * - Issued: unpaid, no payment yet, not past due
 * - Pending: partial payment received, not past due (awaiting remainder)
 */
export function resolveBillingLifecycleStatus(
  invoice: Pick<
    IssuedInvoice,
    "status" | "finalAmountInr" | "amountPaidInr" | "dueDate"
  >,
  now: Date = new Date(),
): BillingLifecycleStatus {
  const raw = invoice.status as string;
  if (raw === "draft") return "draft";
  if (raw === "cancelled" || raw === "void") return "cancelled";

  const balance = Math.max(0, invoice.finalAmountInr - invoice.amountPaidInr);
  if (balance <= 0) return "paid";

  const due = new Date(invoice.dueDate);
  const pastDue = !Number.isNaN(due.getTime()) && due.getTime() < now.getTime();
  if (pastDue) return "overdue";

  if (invoice.amountPaidInr > 0) return "pending";
  return "issued";
}

/** Payment-oriented status for payment columns (subset + pending/paid/overdue/cancelled). */
export function resolvePaymentStatus(
  invoice: Pick<
    IssuedInvoice,
    "status" | "finalAmountInr" | "amountPaidInr" | "dueDate"
  >,
  now: Date = new Date(),
): BillingLifecycleStatus {
  const life = resolveBillingLifecycleStatus(invoice, now);
  if (life === "draft") return "draft";
  if (life === "cancelled") return "cancelled";
  if (life === "paid") return "paid";
  if (life === "overdue") return "overdue";
  // issued unpaid → payment is Pending
  return "pending";
}

export function buildBillingHistoryEvents(input: {
  instituteId: string;
  invoices: IssuedInvoice[];
  payments: BillingPaymentRecord[];
  now?: Date;
}): BillingHistoryEvent[] {
  const now = input.now ?? new Date();
  const events: BillingHistoryEvent[] = [];

  for (const inv of input.invoices) {
    if (inv.status === "draft") {
      events.push({
        id: `hist-draft-${inv.id}`,
        instituteId: input.instituteId,
        kind: "invoice_draft",
        at: inv.issueDate,
        title: "Draft invoice",
        detail: inv.invoiceNumber,
        amountInr: inv.finalAmountInr,
        invoiceNumber: inv.invoiceNumber,
        status: "draft",
      });
    } else {
      events.push({
        id: `hist-issued-${inv.id}`,
        instituteId: input.instituteId,
        kind: "invoice_issued",
        at: inv.issueDate,
        title: "Invoice issued",
        detail: `${inv.invoiceNumber} · ${inv.activeStudentCount} students`,
        amountInr: inv.finalAmountInr,
        invoiceNumber: inv.invoiceNumber,
        status: resolveBillingLifecycleStatus(inv, now),
      });
    }
    if (inv.status === "cancelled") {
      events.push({
        id: `hist-cancel-${inv.id}`,
        instituteId: input.instituteId,
        kind: "invoice_cancelled",
        at: inv.voidedAt ?? inv.issueDate,
        title: "Invoice cancelled",
        detail: inv.voidReason ?? inv.invoiceNumber,
        amountInr: inv.finalAmountInr,
        invoiceNumber: inv.invoiceNumber,
        status: "cancelled",
      });
    }
  }

  for (const p of input.payments) {
    events.push({
      id: `hist-pay-${p.id}`,
      instituteId: input.instituteId,
      kind: "payment_recorded",
      at: p.recordedAt,
      title: "Payment recorded (mock)",
      detail: `${p.invoiceNumber} · ${labelPaymentMethod(p.method)}${p.note ? ` · ${p.note}` : ""}`,
      amountInr: p.amountInr,
      invoiceNumber: p.invoiceNumber,
      status: "paid",
    });
  }

  return events.sort((a, b) => b.at.localeCompare(a.at));
}
