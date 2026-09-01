import type { DemoInstituteProfile } from "@lumenx/types";
import {
  instituteDtoToDemoProfile,
  mergePublicProfileIntoSettings,
} from "@lumenx/utils";
import type { InstituteDto, InstituteSettingsDto } from "./types";

export function settingsToDemoProfile(
  institute: InstituteDto,
  settings: InstituteSettingsDto,
): DemoInstituteProfile {
  return instituteDtoToDemoProfile(institute, settings.settings);
}

export function demoProfileToSettingsPatch(
  existingSettings: Record<string, unknown>,
  profile: DemoInstituteProfile,
): Record<string, unknown> {
  return mergePublicProfileIntoSettings(existingSettings, profile);
}
