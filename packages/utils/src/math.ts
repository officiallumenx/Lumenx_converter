/** Clamp a number to the inclusive [lo, hi] range. */
export function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}
