/**
 * Session clear helper used by app api-auth modules on logout.
 * Clears Supabase/local session; best-effort Firebase Auth sign-out for stale clients.
 * Not a Firebase Auth login path.
 */

import { logoutFirebaseAndClearLocal } from "./index";

/** @deprecated Prefer clearAppAuthSession — kept as alias for existing imports. */
export async function firebaseLogout(input?: {
  clearSupabaseSession?: () => Promise<void>;
  clearLocalSession?: () => void;
}): Promise<void> {
  await clearAppAuthSession(input);
}

export async function clearAppAuthSession(input?: {
  clearSupabaseSession?: () => Promise<void>;
  clearLocalSession?: () => void;
}): Promise<void> {
  await logoutFirebaseAndClearLocal(input);
}
