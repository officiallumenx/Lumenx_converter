/**
 * Theme mode tokens.
 * Settings applies `.dark` on `<html>` via `settingsRepository` / `applyThemeMode`.
 * CSS variables in `tokens.css` under `.dark` resolve automatically.
 *
 * Supported: Light | Dark. Default: Light. Follow System is not supported.
 */

export const themeModes = ["light", "dark"] as const;

export type ThemeMode = (typeof themeModes)[number];

export const DARK_MODE_CLASS = "dark";

export const darkModeConfig = {
  /** Class strategy — matches Connect / Tailwind `@custom-variant dark`. */
  strategy: "class" as const,
  className: DARK_MODE_CLASS,
  defaultMode: "light" as ThemeMode,
  /** Storage key used by settings store. */
  storageKey: "lumenx-transport-theme",
  /** Theme switching is available in Settings. */
  enabled: true,
} as const;
