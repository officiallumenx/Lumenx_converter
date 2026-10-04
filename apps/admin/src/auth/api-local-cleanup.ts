/**
 * Clears Admin API-mode local identity when Supabase / /me is no longer valid.
 *
 * Session-only clear is for cold-start hydrate miss (keeps IndexedDB query cache).
 * Full clear (incl. query cache) is for explicit logout only.
 */
import { clearSession } from "./auth-store";
import { clearStoredActiveInstituteId } from "@/lib/active-institute";
import { clearApiRegistrationSnapshot } from "./api-registration-state";
import { clearAdminQueryClient } from "@/lib/admin-queries/query-client";
import { clearAllPersistedAdminCaches } from "@/lib/admin-queries/persist";
import { invalidateAdminCache } from "@/lib/admin-resource-cache";
import { invalidateMeCache } from "./me-bridge";

export type ClearApiModeSessionOptions = {
  /** When true (logout), also drop stored active institute preference. */
  clearActiveInstitute?: boolean;
};

/**
 * Drop UI session + registration snapshot without touching TanStack Query / IndexedDB.
 * Used when bootstrap finds no Supabase session — preserve module cache for next login.
 */
export function clearApiModeSessionIdentity(
  opts?: ClearApiModeSessionOptions,
): void {
  clearSession();
  clearApiRegistrationSnapshot();
  if (opts?.clearActiveInstitute) {
    clearStoredActiveInstituteId();
  }
  // Synchronous clears — avoid cross-account leaks while dynamic import is in flight.
  invalidateMeCache();
  invalidateAdminCache("admin:");
}

/** Logout: session cleanup + wipe in-memory and persisted query caches. */
export async function clearApiModeLocalIdentity(): Promise<void> {
  clearApiModeSessionIdentity({ clearActiveInstitute: true });
  clearAdminQueryClient();
  await clearAllPersistedAdminCaches();
}
