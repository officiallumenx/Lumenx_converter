/**
 * LumenX Transport — responsive breakpoints (mobile-first).
 * Aligned with Connect / LumenX layout tiers.
 */

export const breakpoints = {
  mobile: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
} as const;

/** Named layout tiers used by shells. */
export const layoutTiers = {
  mobile: breakpoints.mobile,
  tablet: breakpoints.md,
  desktop: breakpoints.lg,
} as const;

export const contentMaxWidth = 720;

export const mediaQueries = {
  sm: `(min-width: ${breakpoints.sm}px)`,
  md: `(min-width: ${breakpoints.md}px)`,
  lg: `(min-width: ${breakpoints.lg}px)`,
  xl: `(min-width: ${breakpoints.xl}px)`,
  "2xl": `(min-width: ${breakpoints["2xl"]}px)`,
  tablet: `(min-width: ${layoutTiers.tablet}px)`,
  desktop: `(min-width: ${layoutTiers.desktop}px)`,
} as const;

export type BreakpointToken = keyof typeof breakpoints;
export type LayoutTier = keyof typeof layoutTiers;
