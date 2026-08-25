import { DARK_MODE_CLASS, darkModeConfig } from "@/theme";

import { transportSeed } from "../mock/seed";
import type { NotificationPrefs, ThemeMode } from "../types";

export type SettingsState = {
  theme: ThemeMode;
  notifications: NotificationPrefs;
};

const listeners = new Set<() => void>();

function readStoredTheme(): ThemeMode {
  try {
    const stored = localStorage.getItem(darkModeConfig.storageKey);
    if (stored === "light" || stored === "dark") return stored;
    if (stored === "system") return darkModeConfig.defaultMode;
  } catch {
    /* ignore */
  }
  return transportSeed.settings.theme;
}

let state: SettingsState = {
  theme: typeof window !== "undefined" ? readStoredTheme() : transportSeed.settings.theme,
  notifications: { ...transportSeed.settings.notifications },
};

function emit() {
  listeners.forEach((listener) => listener());
}

function resolveDark(mode: ThemeMode): boolean {
  return mode === "dark";
}

export function applyThemeMode(mode: ThemeMode) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (resolveDark(mode)) root.classList.add(DARK_MODE_CLASS);
  else root.classList.remove(DARK_MODE_CLASS);
  try {
    localStorage.setItem(darkModeConfig.storageKey, mode);
  } catch {
    /* ignore */
  }
}

export function subscribeSettingsStore(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSettingsSnapshot(): SettingsState {
  return state;
}

export function setThemeInStore(theme: ThemeMode) {
  state = { ...state, theme };
  applyThemeMode(theme);
  emit();
}

export function setNotificationPrefInStore(key: keyof NotificationPrefs, value: boolean) {
  state = {
    ...state,
    notifications: { ...state.notifications, [key]: value },
  };
  emit();
}

export function resetSettingsStore() {
  state = {
    theme: transportSeed.settings.theme,
    notifications: { ...transportSeed.settings.notifications },
  };
  applyThemeMode(state.theme);
  emit();
}
