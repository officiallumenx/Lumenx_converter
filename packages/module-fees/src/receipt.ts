/**
 * Offline fee receipt download (text receipt — no payment gateway).
 * Saves to the device Downloads folder only — no in-app copy.
 */
import { downloadTextToDevice, formatInr as formatInrShared } from "@lumenx/utils";
import type { FeePaymentRecord } from "./types";

function formatInr(amount: number): string {
  return formatInrShared(amount);
}

const METHOD_LABEL: Record<FeePaymentRecord["method"], string> = {
  cash: "Cash",
  cheque: "Cheque",
  upi_office: "UPI (office)",
  bank_transfer: "Bank transfer",
  other: "Other",
};

export function buildFeeReceiptText(
  payment: FeePaymentRecord,
  opts?: {
    instituteName?: string;
    billed?: number;
    paidTotal?: number;
    due?: number;
  },
): string {
  const institute = opts?.instituteName ?? "LumenX Institute";
  const lines = [
    `${institute}`,
    "OFFICIAL FEE RECEIPT",
    "========================================",
    `Receipt No. : ${payment.receiptNo}`,
    `Date        : ${payment.paidAt}`,
    `Student     : ${payment.studentName}`,
    `Student ID  : ${payment.studentId}`,
    `Class       : ${payment.classKey}`,
    `Amount paid : ${formatInr(payment.amount)}`,
    `Mode        : ${METHOD_LABEL[payment.method]}`,
  ];
  if (payment.note) lines.push(`Note        : ${payment.note}`);
  if (opts?.billed != null) lines.push(`Total fees  : ${formatInr(opts.billed)}`);
  if (opts?.paidTotal != null) lines.push(`Paid to date: ${formatInr(opts.paidTotal)}`);
  if (opts?.due != null) lines.push(`Balance due : ${formatInr(opts.due)}`);
  lines.push("----------------------------------------");
  lines.push("Paid offline at the school office.");
  lines.push("This is a computer-generated receipt.");
  lines.push("========================================");
  return `${lines.join("\n")}\n`;
}

export function downloadFeeReceipt(
  payment: FeePaymentRecord,
  opts?: {
    instituteName?: string;
    billed?: number;
    paidTotal?: number;
    due?: number;
  },
): void {
  const content = buildFeeReceiptText(payment, opts);
  downloadTextToDevice(`${payment.receiptNo}.txt`, content, "text/plain;charset=utf-8");
}
