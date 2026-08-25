/**
 * LumenX Transport — border radius tokens (Connect-rounded surfaces).
 */

export const radiusBase = "1rem"; // 16px

export const radius = {
  none: "0",
  sm: "0.5rem", // 8
  md: "0.75rem", // 12
  lg: "1rem", // 16
  xl: "1.25rem", // 20
  "2xl": "1.5rem", // 24
  "3xl": "2rem", // 32
  full: "9999px",
} as const;

export type RadiusToken = keyof typeof radius;
