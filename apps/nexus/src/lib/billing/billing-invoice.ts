/**
 * Immutable institute invoices (local/mock).
 * Commercial snapshot fields are frozen at issue and never recalculated.
 */

import { calculatePlanBill } from "./billing-calc";
import type { DiscountKind, PlanTenureMonths, RateQuotePeriod } from "./billing-defaults";
import {
  outstandingOnInvoice,
  resolveBillingLifecycleStatus,
  resolvePaymentStatus,
  type BillingLifecycleStatus,
} from "./billing-history";

export type { BillingLifecycleStatus };

export type InvoiceDocStatus = "draft" | "issued" | "paid" | "cancelled";

/** @deprecated Prefer BillingLifecycleStatus via resolveBillingLifecycleStatus */
export type InvoicePaymentStatus = "paid" | "partial" | "pending" | "overdue" | "cancelled";

/** Commercial snapshot — frozen after issue. */
export type InvoiceCommercialSnapshot = {
  invoiceNumber: string;
  instituteId: string;
  instituteName: string;
  billingPeriodStart: string;
  billingPeriodEnd: string;
  activeStudentCount: number;
  /** Monthly equivalent rate used for the bill. */
  perStudentRateInr: number;
  quotedRateInr: number;
  rateQuotePeriod: RateQuotePeriod;
  planTenureMonths: PlanTenureMonths;
  estimateInr: number;
  discountKind: DiscountKind;
  discountPercent: number;
  freeMonths: number;
  billableMonths: number;
  discountAmountInr: number;
  /** @deprecated Always 0 in plan model; kept for older snapshots. */
  minimumChargeInr: number;
  finalAmountInr: number;
  /** Pre-discount estimate (compat). */
  studentChargeInr: number;
  issueDate: string;
  dueDate: string;
};

export type IssuedInvoice = InvoiceCommercialSnapshot & {
  id: string;
  status: InvoiceDocStatus;
  amountPaidInr: number;
  lastPaymentAt?: string;
  voidedAt?: string;
  voidReason?: string;
};

export type IssueInvoiceInput = {
  instituteId: string;
  instituteName: string;
  activeStudentCount: number;
  /** Quoted ₹ per student (defaults from perStudentRateInr if omitted). */
  quotedRateInr?: number;
  rateQuotePeriod?: RateQuotePeriod;
  planTenureMonths?: PlanTenureMonths;
  discountKind?: DiscountKind;
  discountPercent?: number;
  freeMonths?: number;
  /** @deprecated Prefer quotedRateInr + rateQuotePeriod */
  perStudentRateInr?: number;
  /** @deprecated Ignored */
  minimumChargeInr?: number;
  billingPeriodStart: Date | string;
  billingPeriodEnd: Date | string;
  issueDate?: Date | string;
  dueDate?: Date | string;
  invoiceNumber: string;
  amountPaidInr?: number;
  lastPaymentAt?: Date | string;
  asDraft?: boolean;
};

function toIso(value: Date | string): string {
  if (typeof value === "string") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? value : d.toISOString();
  }
  return value.toISOString();
}

function normalizeDocStatus(raw: unknown, amountPaidInr: number, finalAmountInr: number): InvoiceDocStatus {
  if (raw === "draft") return "draft";
  if (raw === "cancelled" || raw === "void") return "cancelled";
  if (raw === "paid" || (amountPaidInr >= finalAmountInr && finalAmountInr > 0)) return "paid";
  if (raw === "partially_paid" || raw === "issued") return "issued";
  return "issued";
}

function parseTenure(raw: unknown): PlanTenureMonths {
  const n = Number(raw);
  if (n === 6 || n === 12) return n;
  return 1;
}

function parseQuote(raw: unknown): RateQuotePeriod {
  return raw === "yearly" ? "yearly" : "monthly";
}

function parseDiscount(raw: unknown): DiscountKind {
  if (raw === "percent" || raw === "free_months") return raw;
  return "none";
}

/**
 * @deprecated Use resolvePaymentStatus / resolveBillingLifecycleStatus
 */
export function invoicePaymentStatus(
  invoice: Pick<IssuedInvoice, "finalAmountInr" | "amountPaidInr" | "dueDate" | "status">,
  now: Date = new Date(),
): InvoicePaymentStatus {
  const life = resolveBillingLifecycleStatus(invoice, now);
  if (life === "cancelled") return "cancelled";
  if (life === "paid") return "paid";
  if (life === "overdue") return "overdue";
  if (life === "pending") return "partial";
  return "pending";
}

export function labelInvoicePaymentStatus(status: InvoicePaymentStatus | BillingLifecycleStatus): string {
  if (status === "partial") return "Pending";
  if (status === "paid") return "Paid";
  if (status === "pending") return "Pending";
  if (status === "overdue") return "Overdue";
  if (status === "cancelled") return "Cancelled";
  if (status === "draft") return "Draft";
  if (status === "issued") return "Issued";
  return status;
}

export function buildIssuedInvoice(input: IssueInvoiceInput): IssuedInvoice {
  const calc = calculatePlanBill({
    activeStudentCount: input.activeStudentCount,
    quotedRateInr: input.quotedRateInr ?? input.perStudentRateInr ?? 0,
    rateQuotePeriod: input.rateQuotePeriod ?? "monthly",
    planTenureMonths: input.planTenureMonths ?? 1,
    discountKind: input.discountKind ?? "none",
    discountPercent: input.discountPercent ?? 0,
    freeMonths: input.freeMonths ?? 0,
  });

  const issueDate = toIso(input.issueDate ?? new Date());
  const dueDate = toIso(input.dueDate ?? input.billingPeriodEnd);
  const amountPaidInr = Math.max(0, Math.round(input.amountPaidInr ?? 0));
  const finalAmountInr = calc.finalAmountInr;
  const paid = Math.min(amountPaidInr, finalAmountInr);

  let status: InvoiceDocStatus = input.asDraft ? "draft" : "issued";
  if (!input.asDraft && paid >= finalAmountInr && finalAmountInr > 0) status = "paid";

  const invoice: IssuedInvoice = {
    id: input.invoiceNumber,
    invoiceNumber: input.invoiceNumber,
    instituteId: input.instituteId,
    instituteName: input.instituteName,
    billingPeriodStart: toIso(input.billingPeriodStart),
    billingPeriodEnd: toIso(input.billingPeriodEnd),
    activeStudentCount: calc.activeStudentCount,
    perStudentRateInr: calc.monthlyRateInr,
    quotedRateInr: calc.quotedRateInr,
    rateQuotePeriod: calc.rateQuotePeriod,
    planTenureMonths: calc.planTenureMonths,
    estimateInr: calc.estimateInr,
    discountKind: calc.discountKind,
    discountPercent: calc.discountPercent,
    freeMonths: calc.freeMonths,
    billableMonths: calc.billableMonths,
    discountAmountInr: calc.discountAmountInr,
    minimumChargeInr: calc.minimumMonthlyChargeInr,
    studentChargeInr: calc.studentChargeInr,
    finalAmountInr,
    issueDate,
    dueDate,
    status,
    amountPaidInr: paid,
    lastPaymentAt:
      paid > 0 ? toIso(input.lastPaymentAt ?? input.issueDate ?? new Date()) : undefined,
  };

  return freezeIssuedInvoice(invoice);
}

export function freezeIssuedInvoice(invoice: IssuedInvoice): IssuedInvoice {
  return Object.freeze({ ...invoice });
}

export function commercialSnapshotOf(invoice: IssuedInvoice): InvoiceCommercialSnapshot {
  return {
    invoiceNumber: invoice.invoiceNumber,
    instituteId: invoice.instituteId,
    instituteName: invoice.instituteName,
    billingPeriodStart: invoice.billingPeriodStart,
    billingPeriodEnd: invoice.billingPeriodEnd,
    activeStudentCount: invoice.activeStudentCount,
    perStudentRateInr: invoice.perStudentRateInr,
    quotedRateInr: invoice.quotedRateInr,
    rateQuotePeriod: invoice.rateQuotePeriod,
    planTenureMonths: invoice.planTenureMonths,
    estimateInr: invoice.estimateInr,
    discountKind: invoice.discountKind,
    discountPercent: invoice.discountPercent,
    freeMonths: invoice.freeMonths,
    billableMonths: invoice.billableMonths,
    discountAmountInr: invoice.discountAmountInr,
    minimumChargeInr: invoice.minimumChargeInr,
    finalAmountInr: invoice.finalAmountInr,
    studentChargeInr: invoice.studentChargeInr,
    issueDate: invoice.issueDate,
    dueDate: invoice.dueDate,
  };
}

export function commercialSnapshotsEqual(a: IssuedInvoice, b: IssuedInvoice): boolean {
  const sa = commercialSnapshotOf(a);
  const sb = commercialSnapshotOf(b);
  return (Object.keys(sa) as (keyof InvoiceCommercialSnapshot)[]).every((k) => sa[k] === sb[k]);
}

export function normalizeIssuedInvoice(raw: unknown): IssuedInvoice | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;

  const invoiceNumber =
    typeof r.invoiceNumber === "string" ? r.invoiceNumber : typeof r.id === "string" ? r.id : null;
  const instituteId = typeof r.instituteId === "string" ? r.instituteId : null;
  if (!invoiceNumber || !instituteId) return null;

  const amountPaidInr = Math.max(0, Math.round(Number(r.amountPaidInr) || 0));
  const finalAmountInr = Math.max(0, Math.round(Number(r.finalAmountInr ?? r.amountDueInr) || 0));
  const perStudentRateInr = Math.max(
    0,
    Math.round(Number(r.perStudentRateInr ?? r.snapshotPerStudentRateInr) || 0),
  );
  const planTenureMonths = parseTenure(r.planTenureMonths);
  const rateQuotePeriod = parseQuote(r.rateQuotePeriod);
  const discountKind = parseDiscount(r.discountKind);
  const estimateInr = Math.max(
    0,
    Math.round(Number(r.estimateInr ?? r.studentChargeInr ?? r.lineSubtotalInr) || finalAmountInr),
  );

  const invoice: IssuedInvoice = {
    id: invoiceNumber,
    invoiceNumber,
    instituteId,
    instituteName: typeof r.instituteName === "string" ? r.instituteName : instituteId,
    billingPeriodStart: String(r.billingPeriodStart ?? r.periodStart ?? ""),
    billingPeriodEnd: String(r.billingPeriodEnd ?? r.periodEnd ?? ""),
    activeStudentCount: Math.max(0, Math.round(Number(r.activeStudentCount ?? r.snapshotStudentCount) || 0)),
    perStudentRateInr,
    quotedRateInr: Math.max(0, Math.round(Number(r.quotedRateInr) || perStudentRateInr)),
    rateQuotePeriod,
    planTenureMonths,
    estimateInr,
    discountKind,
    discountPercent: Math.max(0, Math.round(Number(r.discountPercent) || 0)),
    freeMonths: Math.max(0, Math.round(Number(r.freeMonths) || 0)),
    billableMonths: Math.max(
      0,
      Math.round(Number(r.billableMonths) || planTenureMonths),
    ),
    discountAmountInr: Math.max(
      0,
      Math.round(Number(r.discountAmountInr) || Math.max(0, estimateInr - finalAmountInr)),
    ),
    minimumChargeInr: Math.max(0, Math.round(Number(r.minimumChargeInr ?? r.snapshotMinimumMonthlyChargeInr) || 0)),
    studentChargeInr: estimateInr,
    finalAmountInr,
    issueDate: String(r.issueDate ?? r.issuedAt ?? ""),
    dueDate: String(r.dueDate ?? r.dueAt ?? ""),
    status: normalizeDocStatus(r.status, amountPaidInr, finalAmountInr),
    amountPaidInr,
    lastPaymentAt: typeof r.lastPaymentAt === "string" ? r.lastPaymentAt : undefined,
    voidedAt: typeof r.voidedAt === "string" ? r.voidedAt : undefined,
    voidReason: typeof r.voidReason === "string" ? r.voidReason : undefined,
  };

  return freezeIssuedInvoice(invoice);
}

export {
  outstandingOnInvoice,
  resolveBillingLifecycleStatus,
  resolvePaymentStatus,
};
