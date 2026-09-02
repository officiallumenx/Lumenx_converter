/**
 * Clears Admin API-mode local identity when Supabase / /me is no longer valid.
 */
import { clearSession } from "./auth-store";
import { clearStoredActiveInstituteId } from "@/lib/active-institute";
import { clearApiRegistrationSnapshot } from "./api-registration-state";

export function clearApiModeLocalIdentity(): void {
  clearSession();
  clearStoredActiveInstituteId();
  clearApiRegistrationSnapshot();
}
