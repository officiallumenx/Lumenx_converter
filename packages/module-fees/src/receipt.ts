/**
 * Offline fee receipt — download (.txt) or print at the office counter.
 * No payment gateway.
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

export type FeeReceiptOpts = {
  instituteName?: string;
  billed?: number;
  paidTotal?: number;
  due?: number;
};

export function buildFeeReceiptText(
  payment: FeePaymentRecord,
  opts?: FeeReceiptOpts,
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
  opts?: FeeReceiptOpts,
): void {
  const content = buildFeeReceiptText(payment, opts);
  downloadTextToDevice(`${payment.receiptNo}.txt`, content, "text/plain;charset=utf-8");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Opens a print dialog for counter use (staff clicks Print when ready). */
export function printFeeReceipt(
  payment: FeePaymentRecord,
  opts?: FeeReceiptOpts,
): void {
  if (typeof window === "undefined") return;
  const institute = opts?.instituteName ?? "LumenX Institute";
  const rows: Array<[string, string]> = [
    ["Receipt No.", payment.receiptNo],
    ["Date", payment.paidAt],
    ["Student", payment.studentName],
    ["Student ID", payment.studentId],
    ["Class", payment.classKey],
    ["Amount paid", formatInr(payment.amount)],
    ["Mode", METHOD_LABEL[payment.method]],
  ];
  if (payment.note) rows.push(["Note", payment.note]);
  if (opts?.billed != null) rows.push(["Total fees", formatInr(opts.billed)]);
  if (opts?.paidTotal != null) rows.push(["Paid to date", formatInr(opts.paidTotal)]);
  if (opts?.due != null) rows.push(["Balance due", formatInr(opts.due)]);

  const tableRows = rows
    .map(
      ([label, value]) =>
        `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`,
    )
    .join("");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(payment.receiptNo)}</title>
  <style>
    body { font-family: Georgia, "Times New Roman", serif; color: #111; margin: 24px; }
    h1 { font-size: 18px; margin: 0 0 4px; font-weight: 700; }
    .sub { font-size: 13px; letter-spacing: 0.04em; text-transform: uppercase; margin-bottom: 16px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th, td { text-align: left; padding: 6px 0; border-bottom: 1px solid #ddd; vertical-align: top; }
    th { width: 34%; font-weight: 600; color: #444; }
    .foot { margin-top: 18px; font-size: 12px; color: #555; }
  </style>
</head>
<body>
  <h1>${escapeHtml(institute)}</h1>
  <div class="sub">Official fee receipt</div>
  <table>${tableRows}</table>
  <p class="foot">Paid offline at the school office. Computer-generated receipt.</p>
  <script>
    window.onload = function () { window.focus(); window.print(); };
  </script>
</body>
</html>`;

  const win = window.open("", "_blank", "noopener,noreferrer,width=640,height=720");
  if (!win) {
    throw new Error("Pop-up blocked — allow pop-ups to print the receipt");
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
}
