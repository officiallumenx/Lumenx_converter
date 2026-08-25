import { settingsRepository } from "@/lib/transport/settings";

/** @deprecated Prefer `settingsRepository.getSnapshot()`. */
export const settingsMock = settingsRepository.getSnapshot();

export type { NotificationPrefs } from "@/lib/transport/types";
