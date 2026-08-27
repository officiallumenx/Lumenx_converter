/**
 * API-mode AuthUser institute presentation — only mirrors the validated
 * active-institute preference, never arbitrary caller input.
 */
import {
  isInstituteUuid,
  readStoredActiveInstituteId,
} from "@/lib/active-institute";
import { loadSession, saveSession, sessionToUser } from "@/auth/auth-store";
import { isApiAuthMode } from "@/auth/auth-mode";
import type { AuthUser } from "@/auth/types";
import { AUTH_REMEMBER_KEY } from "@/auth/constants";

export type ApplyApiInstituteCheck =
  | { ok: true }
  | { ok: false; reason: "invalid_uuid" | "not_active_preference" | "empty_name" };

/**
 * Authority: instituteId must be a UUID and equal the currently stored
 * validated active institute preference (set only by active-institute helpers).
 */
export function checkApplyApiActiveInstitute(
  instituteId: string,
  instituteName: string,
  storedActiveId: string | null = readStoredActiveInstituteId(),
): ApplyApiInstituteCheck {
  if (!isInstituteUuid(instituteId)) {
    return { ok: false, reason: "invalid_uuid" };
  }
  if (!storedActiveId || storedActiveId !== instituteId.trim()) {
    return { ok: false, reason: "not_active_preference" };
  }
  if (!instituteName.trim()) {
    return { ok: false, reason: "empty_name" };
  }
  return { ok: true };
}

/**
 * Persist AuthUser institute fields only when check passes.
 * Returns the next user when applied, or null when rejected (session unchanged).
 */
export function tryApplyApiActiveInstituteSession(
  instituteId: string,
  instituteName: string,
): AuthUser | null {
  if (!isApiAuthMode()) return null;
  const check = checkApplyApiActiveInstitute(instituteId, instituteName);
  if (!check.ok) return null;

  const existing = loadSession();
  if (!existing || existing.authSource !== "api") return null;

  const remember =
    typeof localStorage !== "undefined" &&
    localStorage.getItem(AUTH_REMEMBER_KEY) === "1";
  const current = sessionToUser(existing);
  const next: AuthUser = {
    ...current,
    instituteId: instituteId.trim(),
    instituteName: instituteName.trim(),
  };
  saveSession(next, remember, { authSource: "api" });
  return next;
}

/** Clear institute presentation fields on an API-mode session (no demo fallback). */
export function clearApiActiveInstituteSession(): AuthUser | null {
  if (!isApiAuthMode()) return null;
  const existing = loadSession();
  if (!existing || existing.authSource !== "api") return null;
  const remember =
    typeof localStorage !== "undefined" &&
    localStorage.getItem(AUTH_REMEMBER_KEY) === "1";
  const current = sessionToUser(existing);
  if (!current.instituteId && !current.instituteName) return current;
  const next: AuthUser = {
    ...current,
    instituteId: "",
    instituteName: "",
  };
  saveSession(next, remember, { authSource: "api" });
  return next;
}
