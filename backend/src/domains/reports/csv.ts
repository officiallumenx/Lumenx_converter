/**
 * Shared CSV helpers for report generators.
 * Escapes quotes and neutralizes spreadsheet formula injection.
 */

/** Prefix that Excel/Sheets treat as formulas when leading a cell. */
const FORMULA_PREFIX = /^[=+\-@\t\r]/;

export function escapeCsvCell(value: string | null | undefined): string {
  let text = value == null ? "" : String(value);
  if (FORMULA_PREFIX.test(text)) {
    text = `'${text}`;
  }
  return `"${text.replace(/"/g, '""')}"`;
}

export function toCsv(
  headers: string[],
  rows: Array<Array<string | null | undefined>>,
): string {
  const lines = [
    headers.map(escapeCsvCell).join(","),
    ...rows.map((row) => row.map(escapeCsvCell).join(",")),
  ];
  return `${lines.join("\n")}\n`;
}

export function reportFileStamp(reportId: string, suffix?: string): string {
  const d = new Date().toISOString().slice(0, 10);
  return suffix
    ? `${reportId}-${suffix}.csv`
    : `${reportId}-${d}.csv`;
}
