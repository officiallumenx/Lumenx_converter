/**
 * Phone / email normalization for directory + auth matching.
 * Two phone variants exist in the codebase — keep both APIs so callers do not change behavior.
 */

/** Digits only, then last 10 (no country-code special case). */
export function normalizePhoneLast10(value: string): string {
  return value.replace(/\D/g, "").slice(-10);
}

/**
 * Digits only; strip leading `91` when length is 12; otherwise last 10 when longer.
 * Used by Connect auth and Admin roles recovery matching.
 */
export function normalizePhoneDigits(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  if (digits.length > 10) return digits.slice(-10);
  return digits;
}

/** Trim + lowercase email for identity matching. */
export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

/** Loose email shape check (non-empty local@domain). */
export function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

/** Exactly 10 digits (after optional non-digit strip via caller). */
export function isTenDigitPhone(value: string): boolean {
  return /^\d{10}$/.test(value);
}
