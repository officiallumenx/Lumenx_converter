/**
 * Returns true when the user has requested reduced motion at the OS/browser level.
 *
 * Recharts drives its entrance animations in JavaScript (SVG), so the global CSS
 * `prefers-reduced-motion` rule cannot neutralise them. Chart series read
 * `isAnimationActive` at mount, so a synchronous read is sufficient — the motion
 * preference does not meaningfully change mid-session, and this keeps callers free
 * of extra state/re-render wiring. Guarded for SSR.
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
