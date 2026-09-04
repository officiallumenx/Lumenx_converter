/** Admin view of the institute license assigned in Nexus + secure payment + invoices. */

import { syncSubscriptionExpiredFromBilling, formatInrOrDash, formatDateTimeEnIn, downloadTextToDevice } from "@lumenx/utils";

export type BillingCadence = "monthly" | "yearly";
export type PaymentStatus = "unpaid" | "pending" | "paid";
export type PaymentMethod = "upi" | "card" | "netbanking";

export type BillingInvoice = {
  invoiceId: string;
  paymentRef: string;
  instituteId: string;
  instituteName: string;
  studentCount: number;
  cadence: BillingCadence;
  amountInr: number;
  /** CGST + SGST demo split (18% GST) */
  gstInr: number;
  totalInr: number;
  method: PaymentMethod;
  issuedAt: string;
  periodStart: string;
  periodEnd: string;
  termsAcceptedAt: string;
};

export type InstituteBillingPlan = {
  instituteId: string;
  instituteName: string;
  studentCount: number;
  cadence: BillingCadence;
  amountInr: number;
  /** datetime-local */
  startAt: string;
  paymentStatus: PaymentStatus;
  lastPaidAt?: string;
  lastPaymentRef?: string;
  lastInvoiceId?: string;
  invoices: BillingInvoice[];
};

const STORAGE_KEY = "lumenx.admin.instituteBilling.v2";

/** Demo institute — mirrors Nexus seed for Test1School. */
export const CURRENT_INSTITUTE_ID = "ins-test1school";

export const BILLING_TERMS_VERSION = "2026.1";

export const BILLING_TERMS_TEXT = `LumenX Institute Subscription Terms (${BILLING_TERMS_VERSION})

1. Scope
This agreement covers the LumenX platform licence for your institute for the selected billing period (monthly or yearly). Fees are set by LumenX Nexus based on institute scale (students).

2. Payment & security
Payments must be authorised by an institute administrator using their personal 6-digit security PIN. Do not share your PIN. LumenX never stores full card or UPI credentials in Admin — checkout is processed through a PCI-DSS aligned payment partner in production.

3. Billing period
The plan starts on the stated start date/time. Renewal falls due at the end of each monthly or yearly period. Failure to pay may restrict premium operations after a grace period.

4. Taxes
Displayed amounts are exclusive of applicable GST unless stated. Invoices itemise taxable value and GST as required under Indian tax rules.

5. Invoice
After successful payment, a tax invoice is generated and stored in your institute billing history. Keep invoices for your accounts and audit records.

6. Refunds
Refunds, if any, follow the LumenX commercial policy and applicable law. Chargebacks without prior notice may suspend the institute licence.

7. Modules
Optional modules are enabled by default. Turning a module off disables it in Admin for this institute. Core modules (Home, Modules, Analytics, Settings, Roles, Accounts) cannot be turned off.

8. Acceptance
By accepting these terms and confirming payment with your security PIN, you confirm you are authorised to bind the institute to this subscription.`;

function nowDateTimeLocal(d = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function seedPlan(): InstituteBillingPlan {
  return {
    instituteId: CURRENT_INSTITUTE_ID,
    instituteName: "Test1School",
    studentCount: 1840,
    cadence: "yearly",
    amountInr: 249999,
    startAt: "2026-04-01T09:00",
    paymentStatus: "paid",
    lastPaidAt: "2026-04-01T09:05:00.000Z",
    lastPaymentRef: "PAY-DEMO-001",
    lastInvoiceId: "INV-DEMO-001",
    invoices: [],
  };
}

export function loadInstituteBilling(): InstituteBillingPlan {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as InstituteBillingPlan;
      return { ...seedPlan(), ...parsed, invoices: parsed.invoices ?? [] };
    }
  } catch {
    // fall through
  }
  return seedPlan();
}

export function saveInstituteBilling(plan: InstituteBillingPlan): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(plan));
  } catch {
    // Persist failed — still apply in-memory subscription lock sync.
  }
  syncSubscriptionExpiredFromBilling(plan.paymentStatus);
}

export function parseStartAt(startAt: string): Date | null {
  if (!startAt.trim()) return null;
  const d = new Date(startAt);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function nextRenewalDate(
  plan: Pick<InstituteBillingPlan, "startAt" | "cadence">,
  from: Date = new Date(),
): Date | null {
  const start = parseStartAt(plan.startAt);
  if (!start) return null;
  const cursor = new Date(start);
  if (cursor > from) return cursor;
  const months = plan.cadence === "monthly" ? 1 : 12;
  for (let i = 0; i < 600; i++) {
    cursor.setMonth(cursor.getMonth() + months);
    if (cursor > from) return new Date(cursor);
  }
  return null;
}

export function formatInr(amount: number): string {
  return formatInrOrDash(amount);
}

export function formatDateTime(value: string | Date): string {
  const d = typeof value === "string" ? parseStartAt(value) : value;
  if (!d) return "—";
  return formatDateTimeEnIn(d);
}

export function gstOnAmount(amountInr: number): { gstInr: number; totalInr: number } {
  const gstInr = Math.round(amountInr * 0.18);
  return { gstInr, totalInr: amountInr + gstInr };
}

export function buildInvoice(
  plan: InstituteBillingPlan,
  method: PaymentMethod,
  termsAcceptedAt: string,
): BillingInvoice {
  const issued = new Date();
  const periodStart = plan.startAt;
  const renewal = nextRenewalDate(plan, issued) ?? issued;
  const { gstInr, totalInr } = gstOnAmount(plan.amountInr);
  const stamp = Date.now().toString(36).toUpperCase();
  return {
    invoiceId: `INV-LX-${stamp}`,
    paymentRef: `LX-PAY-${stamp}`,
    instituteId: plan.instituteId,
    instituteName: plan.instituteName,
    studentCount: plan.studentCount,
    cadence: plan.cadence,
    amountInr: plan.amountInr,
    gstInr,
    totalInr,
    method,
    issuedAt: nowDateTimeLocal(issued),
    periodStart,
    periodEnd: nowDateTimeLocal(renewal),
    termsAcceptedAt,
  };
}

export function markPlanPending(plan: InstituteBillingPlan): InstituteBillingPlan {
  const next: InstituteBillingPlan = { ...plan, paymentStatus: "pending" };
  saveInstituteBilling(next);
  return next;
}

export function completeSecurePayment(
  plan: InstituteBillingPlan,
  method: PaymentMethod,
  termsAcceptedAt: string,
): { plan: InstituteBillingPlan; invoice: BillingInvoice } {
  const invoice = buildInvoice(plan, method, termsAcceptedAt);
  const next: InstituteBillingPlan = {
    ...plan,
    paymentStatus: "paid",
    lastPaidAt: invoice.issuedAt,
    lastPaymentRef: invoice.paymentRef,
    lastInvoiceId: invoice.invoiceId,
    invoices: [invoice, ...(plan.invoices ?? [])],
  };
  saveInstituteBilling(next);
  return { plan: next, invoice };
}

export function getLatestInvoice(plan: InstituteBillingPlan): BillingInvoice | null {
  if (plan.invoices?.length) return plan.invoices[0]!;
  return null;
}

export function invoiceToPlainText(invoice: BillingInvoice): string {
  const halfGst = Math.round(invoice.gstInr / 2);
  return [
    "LUMENX — TAX INVOICE",
    "========================================",
    `Invoice ID     : ${invoice.invoiceId}`,
    `Payment ref    : ${invoice.paymentRef}`,
    `Issued         : ${formatDateTime(invoice.issuedAt)}`,
    `Institute      : ${invoice.instituteName}`,
    `Institute ID   : ${invoice.instituteId}`,
    `Students       : ${invoice.studentCount}`,
    `Billing        : ${invoice.cadence}`,
    `Period         : ${formatDateTime(invoice.periodStart)} → ${formatDateTime(invoice.periodEnd)}`,
    `Method         : ${invoice.method}`,
    "----------------------------------------",
    `Subscription   : ${formatInr(invoice.amountInr)}`,
    `CGST (9%)      : ${formatInr(halfGst)}`,
    `SGST (9%)      : ${formatInr(invoice.gstInr - halfGst)}`,
    `Total payable  : ${formatInr(invoice.totalInr)}`,
    "----------------------------------------",
    `Terms accepted : ${formatDateTime(invoice.termsAcceptedAt)} (v${BILLING_TERMS_VERSION})`,
    "This is a system-generated invoice.",
  ].join("\n");
}

export function downloadInvoice(invoice: BillingInvoice): void {
  downloadTextToDevice(
    `${invoice.invoiceId}.txt`,
    invoiceToPlainText(invoice),
    "text/plain;charset=utf-8",
  );
}

