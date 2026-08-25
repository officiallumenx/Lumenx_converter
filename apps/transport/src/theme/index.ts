/**
 * LumenX Transport Design System
 * Reusable tokens only — no screens / components.
 */

export * from "./colors";
export * from "./typography";
export * from "./spacing";
export * from "./radius";
export * from "./shadows";
export * from "./transitions";
export * from "./breakpoints";
export * from "./dark-mode";

import { colorTokens, colors, darkColorTokens, MODULE_COLORS } from "./colors";
import { breakpoints, contentMaxWidth, layoutTiers, mediaQueries } from "./breakpoints";
import { darkModeConfig, themeModes } from "./dark-mode";
import { radius, radiusBase } from "./radius";
import { shadows } from "./shadows";
import { layoutSpacing, spacing } from "./spacing";
import { durations, easings, transitions } from "./transitions";
import {
  fontFamilies,
  fontSizes,
  fontWeights,
  letterSpacings,
  lineHeights,
  typography,
} from "./typography";

/** Aggregated theme object for programmatic access. */
export const transportTheme = {
  colors,
  colorTokens,
  darkColorTokens,
  moduleColors: MODULE_COLORS,
  typography: {
    families: fontFamilies,
    sizes: fontSizes,
    weights: fontWeights,
    lineHeights,
    letterSpacings,
    roles: typography,
  },
  spacing,
  layoutSpacing,
  radius,
  radiusBase,
  shadows,
  motion: {
    durations,
    easings,
    transitions,
  },
  breakpoints,
  layoutTiers,
  mediaQueries,
  contentMaxWidth,
  darkMode: darkModeConfig,
  modes: themeModes,
} as const;

export type TransportTheme = typeof transportTheme;
