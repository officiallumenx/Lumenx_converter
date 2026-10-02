/**
 * Resolve the principal display name for birthday WhatsApp wishes.
 * Prefers institute public profile settings (same source as Institute page).
 */
import type { InstituteDto, InstituteSettingsDto } from "@/lib/institutes/types";
import { settingsToDemoProfile } from "@/lib/institutes/map";

export function resolveBirthdayPrincipalName(input: {
  institute: InstituteDto | null | undefined;
  settings: InstituteSettingsDto | null | undefined;
  registeredPrincipalName?: string | null;
  sessionUserName?: string | null;
  demoPrincipalName?: string | null;
  apiMode?: boolean;
}): string {
  if (input.institute && input.settings) {
    const fromProfile = settingsToDemoProfile(
      input.institute,
      input.settings,
    ).principal.trim();
    if (fromProfile) return fromProfile;
  }

  const registered = input.registeredPrincipalName?.trim() || "";
  if (registered) return registered;

  if (input.apiMode) {
    const session = input.sessionUserName?.trim() || "";
    if (session) return session;
  }

  const demo = input.demoPrincipalName?.trim() || "";
  if (demo) return demo;

  return input.sessionUserName?.trim() || "Principal";
}
