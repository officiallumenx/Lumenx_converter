/**
 * LumenX Transport — color tokens.
 * Light palette is the product source of truth. Dark values are stubs only.
 */

import type { CSSProperties } from "react";

export const colors = {
  background: "#F8FAFC",
  card: "#FFFFFF",
  primary: "#2563EB",
  transportAccent: "#EA580C",
  success: "#10B981",
  danger: "#EF4444",
  warning: "#F59E0B",
  textPrimary: "#0F172A",
  textSecondary: "#64748B",
  divider: "#E2E8F0",
} as const;

/** Semantic aliases used across CSS + TS. */
export const colorTokens = {
  background: colors.background,
  foreground: colors.textPrimary,
  card: colors.card,
  cardForeground: colors.textPrimary,
  popover: colors.card,
  popoverForeground: colors.textPrimary,
  primary: colors.primary,
  primaryForeground: "#FFFFFF",
  primaryGlow: "#3B82F6",
  transport: colors.transportAccent,
  transportForeground: "#FFFFFF",
  secondary: "#F1F5F9",
  secondaryForeground: colors.textPrimary,
  muted: "#F1F5F9",
  mutedForeground: colors.textSecondary,
  accent: "#FFF7ED",
  accentForeground: "#9A3412",
  success: colors.success,
  successForeground: "#FFFFFF",
  warning: colors.warning,
  warningForeground: "#78350F",
  destructive: colors.danger,
  destructiveForeground: "#FFFFFF",
  border: colors.divider,
  input: "#E2E8F0",
  ring: colors.primary,
  sidebar: colors.background,
  sidebarForeground: colors.textPrimary,
  sidebarPrimary: colors.primary,
  sidebarPrimaryForeground: "#FFFFFF",
  sidebarAccent: "#F1F5F9",
  sidebarAccentForeground: colors.textPrimary,
  sidebarBorder: colors.divider,
  sidebarRing: colors.primary,
} as const;

/**
 * Dark-mode stubs — setup only. Not wired to a theme switcher yet.
 * Values keep contrast readable when `.dark` is applied later.
 */
export const darkColorTokens = {
  background: "#0B1220",
  foreground: "#F8FAFC",
  card: "#111827",
  cardForeground: "#F8FAFC",
  popover: "#111827",
  popoverForeground: "#F8FAFC",
  primary: "#3B82F6",
  primaryForeground: "#0B1220",
  primaryGlow: "#60A5FA",
  transport: "#FB923C",
  transportForeground: "#0B1220",
  secondary: "#1E293B",
  secondaryForeground: "#F8FAFC",
  muted: "#1E293B",
  mutedForeground: "#94A3B8",
  accent: "#431407",
  accentForeground: "#FED7AA",
  success: "#34D399",
  successForeground: "#0B1220",
  warning: "#FBBF24",
  warningForeground: "#0B1220",
  destructive: "#F87171",
  destructiveForeground: "#FFFFFF",
  border: "#1F2937",
  input: "#1F2937",
  ring: "#3B82F6",
  sidebar: "#0F172A",
  sidebarForeground: "#F1F5F9",
  sidebarPrimary: "#3B82F6",
  sidebarPrimaryForeground: "#0B1220",
  sidebarAccent: "#1E293B",
  sidebarAccentForeground: "#F1F5F9",
  sidebarBorder: "#1F2937",
  sidebarRing: "#3B82F6",
} as const;

export type ColorTokenName = keyof typeof colorTokens;
export type DarkColorTokenName = keyof typeof darkColorTokens;

/** Icon / logo chip: solid accent + soft background (Connect-style). */
export type ModuleColor = {
  primary: string;
  iconBackground: string;
};

/**
 * Module icon colors — every entry is sourced from the `colors` table above.
 * Use for nav icons, FeatureHero logos, and IconWell chips (not body text).
 */
export const MODULE_COLORS = {
  primary: { primary: colors.primary, iconBackground: "#DBEAFE" },
  transport: { primary: colors.transportAccent, iconBackground: "#FFEDD5" },
  success: { primary: colors.success, iconBackground: "#D1FAE5" },
  danger: { primary: colors.danger, iconBackground: "#FEE2E2" },
  warning: { primary: colors.warning, iconBackground: "#FEF3C7" },
  slate: { primary: colors.textSecondary, iconBackground: colors.divider },
} as const satisfies Record<string, ModuleColor>;

export type ModuleColorName = keyof typeof MODULE_COLORS;

/** Icon chip style — color on the glyph + soft tint behind it. */
export function moduleIconStyle(color: ModuleColor): CSSProperties {
  return { color: color.primary, backgroundColor: color.iconBackground };
}

/** Bottom-nav icon chip: soft tint when idle, solid fill when active. */
export function moduleNavIconStyle(color: ModuleColor, active: boolean): CSSProperties {
  if (active) {
    return { color: "#FFFFFF", backgroundColor: color.primary };
  }
  return { color: color.primary, backgroundColor: color.iconBackground };
}
