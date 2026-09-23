/**
 * Clears Admin API-mode local identity when Supabase / /me is no longer valid.
 */
import { clearSession } from "./auth-store";
import { clearStoredActiveInstituteId } from "@/lib/active-institute";
import { clearApiRegistrationSnapshot } from "./api-registration-state";
import { clearAdminQueryClient } from "@/lib/admin-queries/query-client";
import { clearAllPersistedAdminCaches } from "@/lib/admin-queries/persist";

export function clearApiModeLocalIdentity(): void {
  clearSession();
  clearStoredActiveInstituteId();
  clearApiRegistrationSnapshot();
  clearAdminQueryClient();
  void clearAllPersistedAdminCaches().catch(() => undefined);
  void import("./me-bridge").then((m) => m.invalidateMeCache()).catch(() => undefined);
  void import("@/lib/admin-resource-cache").then((m) => {
    m.invalidateAdminCache("admin:");
  }).catch(() => undefined);
}
