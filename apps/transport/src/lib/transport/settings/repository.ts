import type { NotificationPrefs, ThemeMode } from "../types";
import { repositoryDelay } from "../utils";
import {
  getSettingsSnapshot,
  resetSettingsStore,
  setNotificationPrefInStore,
  setThemeInStore,
  subscribeSettingsStore,
} from "./store";

export const settingsRepository = {
  subscribe: subscribeSettingsStore,
  getSnapshot: getSettingsSnapshot,

  async get() {
    await repositoryDelay();
    return getSettingsSnapshot();
  },

  async setTheme(theme: ThemeMode) {
    await repositoryDelay(40);
    setThemeInStore(theme);
  },

  async setNotificationPref(key: keyof NotificationPrefs, value: boolean) {
    await repositoryDelay(40);
    setNotificationPrefInStore(key, value);
  },

  reset() {
    resetSettingsStore();
  },
};
