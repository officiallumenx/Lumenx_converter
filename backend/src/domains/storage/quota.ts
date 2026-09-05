import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Storage quota is monitoring-only: uploads are never hard-denied.
 * Nexus still configures limit_gb for alerts/usage displays.
 */
export async function assertInstituteStorageQuota(
  _admin: SupabaseClient,
  _instituteId: string,
  _additionalBytes: number,
): Promise<void> {
  return;
}
