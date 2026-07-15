/** ISO date (yyyy-mm-dd) → locale display string. */
export function formatDate(iso: string, locale = "en-IN"): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" });
}

/** Currency display (INR default for demo institutes). */
export function formatCurrency(amount: number, currency = "INR", locale = "en-IN"): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 0 }).format(
    amount,
  );
}

/** Percentage with one decimal. */
export function formatPercent(value: number): string {
  return `${value.toFixed(value % 1 === 0 ? 0 : 1)}%`;
}

/** Title-case a slug or enum value. */
export function formatLabel(value: string): string {
  return value
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Initials from a person's name — the first letter of each space-separated part.
 * Pass `max` to cap the number of letters (e.g. 2 for an avatar fallback).
 */
export function getInitials(name: string, max?: number): string {
  const letters = name
    .split(" ")
    .map((p) => p.charAt(0))
    .join("");
  return max === undefined ? letters : letters.slice(0, max);
}
