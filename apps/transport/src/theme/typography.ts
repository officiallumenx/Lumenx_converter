/**
 * LumenX Transport — typography tokens.
 * Root sizes come from the shared @lumenx/ui typography system (--lx-*).
 * Prefer semantic CSS classes: .lx-heading .lx-title .lx-subtitle .lx-body .lx-caption .lx-button
 */

export const fontFamilies = {
  sans: '"Inter", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  display: '"Sora", "Inter", ui-sans-serif, system-ui, sans-serif',
  mono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
} as const;

export const fontWeights = {
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
  extrabold: 800,
} as const;

/** Rem scale — scales with shared --lx-root-font-size (Small/Default/Large/XL). */
export const fontSizes = {
  xs: "var(--lx-text-caption)",
  sm: "var(--lx-text-button)",
  md: "0.875rem",
  base: "var(--lx-text-body)",
  lg: "var(--lx-text-subtitle)",
  xl: "var(--lx-text-title)",
  "2xl": "var(--lx-text-heading)",
  "3xl": "1.875rem",
  "4xl": "2.25rem",
} as const;

export const lineHeights = {
  tight: "var(--lx-leading-heading)",
  snug: "var(--lx-leading-title)",
  normal: "var(--lx-leading-body)",
  relaxed: 1.65,
} as const;

export const letterSpacings = {
  tighter: "var(--lx-tracking-heading)",
  tight: "var(--lx-tracking-title)",
  normal: "var(--lx-tracking-body)",
  wide: "0.04em",
} as const;

export const typography = {
  heading: {
    fontFamily: fontFamilies.display,
    fontSize: "var(--lx-text-heading)",
    fontWeight: fontWeights.bold,
    letterSpacing: letterSpacings.tighter,
    lineHeight: lineHeights.tight,
  },
  title: {
    fontFamily: fontFamilies.display,
    fontSize: "var(--lx-text-title)",
    fontWeight: fontWeights.semibold,
    letterSpacing: letterSpacings.tight,
    lineHeight: lineHeights.snug,
  },
  subtitle: {
    fontFamily: fontFamilies.sans,
    fontSize: "var(--lx-text-subtitle)",
    fontWeight: fontWeights.medium,
    letterSpacing: "var(--lx-tracking-subtitle)",
    lineHeight: "var(--lx-leading-subtitle)",
  },
  body: {
    fontFamily: fontFamilies.sans,
    fontSize: "var(--lx-text-body)",
    fontWeight: fontWeights.regular,
    letterSpacing: letterSpacings.normal,
    lineHeight: lineHeights.normal,
  },
  caption: {
    fontFamily: fontFamilies.sans,
    fontSize: "var(--lx-text-caption)",
    fontWeight: fontWeights.regular,
    letterSpacing: "var(--lx-tracking-caption)",
    lineHeight: "var(--lx-leading-caption)",
  },
  button: {
    fontFamily: fontFamilies.sans,
    fontSize: "var(--lx-text-button)",
    fontWeight: fontWeights.semibold,
    letterSpacing: "var(--lx-tracking-button)",
    lineHeight: "var(--lx-leading-button)",
  },
  display: {
    fontFamily: fontFamilies.display,
    fontWeight: fontWeights.bold,
    letterSpacing: letterSpacings.tighter,
    lineHeight: lineHeights.tight,
  },
  label: {
    fontFamily: fontFamilies.sans,
    fontWeight: fontWeights.medium,
    letterSpacing: letterSpacings.wide,
    lineHeight: lineHeights.snug,
  },
} as const;

export type FontSizeToken = keyof typeof fontSizes;
export type FontWeightToken = keyof typeof fontWeights;
