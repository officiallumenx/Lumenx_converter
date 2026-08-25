/** Clamp a number to the inclusive [lo, hi] range. */
export function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

/** Percentage of `part` relative to `whole` (0 when whole is 0). */
export function percentOf(part: number, whole: number, digits = 0): number {
  if (!whole) return 0;
  const raw = (part / whole) * 100;
  const factor = 10 ** digits;
  return Math.round(raw * factor) / factor;
}

/** Round to `digits` decimal places. */
export function roundTo(value: number, digits = 1): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
