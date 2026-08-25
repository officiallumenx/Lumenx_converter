/**
 * Website visual-system catalog.
 * Values live in tokens.css — this file is the typed contract for components.
 */

export const SITE_BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
} as const;

export const SITE_SPACE = {
  1: "var(--site-space-1)",
  2: "var(--site-space-2)",
  3: "var(--site-space-3)",
  4: "var(--site-space-4)",
  5: "var(--site-space-5)",
  6: "var(--site-space-6)",
  7: "var(--site-space-7)",
  8: "var(--site-space-8)",
  gutter: "var(--site-gutter)",
  sectionY: "var(--site-section-y)",
} as const;

export const SITE_RADIUS = {
  sm: "var(--site-radius-sm)",
  md: "var(--site-radius-md)",
  lg: "var(--site-radius-lg)",
  xl: "var(--site-radius-xl)",
  full: "var(--site-radius-full)",
} as const;

export const SITE_SHADOW = {
  xs: "var(--site-shadow-xs)",
  sm: "var(--site-shadow-sm)",
  md: "var(--site-shadow-md)",
  lg: "var(--site-shadow-lg)",
  focus: "var(--site-shadow-focus)",
} as const;

export const SITE_MOTION = {
  hover: "var(--site-duration-hover)",
  enter: "var(--site-duration-enter)",
  page: "var(--site-duration-page)",
  crossfade: "var(--site-duration-crossfade)",
  stagger: "var(--site-stagger)",
} as const;

export const SITE_COLOR = {
  brand: "var(--site-brand)",
  brandHover: "var(--site-brand-hover)",
  brandSoft: "var(--site-brand-soft)",
  brandForeground: "var(--site-brand-foreground)",
  cyan: "var(--site-cyan)",
  ink: "var(--site-ink)",
  inkSoft: "var(--site-ink-soft)",
  background: "var(--background)",
  surface: "var(--surface)",
  elevated: "var(--elevated)",
  card: "var(--card)",
  muted: "var(--muted)",
  mutedForeground: "var(--muted-foreground)",
  border: "var(--border)",
  borderStrong: "var(--border-strong)",
  borderBrand: "var(--border-brand)",
} as const;
