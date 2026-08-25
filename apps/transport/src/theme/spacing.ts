/**
 * LumenX Transport — spacing scale (4px base, Connect rhythm).
 */

export const spacing = {
  none: "0",
  xs: "0.25rem", // 4
  sm: "0.5rem", // 8
  md: "0.75rem", // 12
  lg: "1rem", // 16
  xl: "1.25rem", // 20
  "2xl": "1.5rem", // 24
  "3xl": "2rem", // 32
  "4xl": "2.5rem", // 40
  "5xl": "3rem", // 48
  "6xl": "4rem", // 64
} as const;

/** Common layout insets. */
export const layoutSpacing = {
  pageX: spacing.lg,
  pageY: spacing.lg,
  section: spacing["2xl"],
  stack: spacing.md,
  cardPadding: spacing.lg,
  touchGap: spacing.sm,
} as const;

export type SpacingToken = keyof typeof spacing;
