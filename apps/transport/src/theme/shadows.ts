/**
 * LumenX Transport — elevation / shadow tokens.
 */

export const shadows = {
  none: "none",
  soft: "0 1px 2px rgb(15 23 42 / 0.04), 0 4px 16px rgb(15 23 42 / 0.06)",
  elevated: "0 8px 32px -8px rgb(15 23 42 / 0.18)",
  glow: "0 8px 32px -8px rgb(37 99 235 / 0.45)",
  transportGlow: "0 8px 32px -8px rgb(249 115 22 / 0.4)",
  focus: "0 0 0 3px rgb(37 99 235 / 0.28)",
} as const;

export type ShadowToken = keyof typeof shadows;
