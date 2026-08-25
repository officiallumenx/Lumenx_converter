import { useSyncExternalStore } from "react";

import {
  settingsRepository,
  type SettingsState,
} from "@/lib/transport/settings";

export function useSettings(): SettingsState {
  return useSyncExternalStore(
    settingsRepository.subscribe,
    settingsRepository.getSnapshot,
    settingsRepository.getSnapshot,
  );
}
