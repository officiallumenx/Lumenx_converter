/**
 * Firebase client helpers kept for logout hygiene (FCM / Analytics / Crash
 * live in sibling modules). Interactive Auth login paths were removed.
 */

import type { Auth } from "firebase/auth";
import { signOutFirebase } from "./email-auth";
import { logLumenXAnalyticsEventForContext } from "./analytics";

export async function logoutFirebaseAndClearLocal(input?: {
  auth?: Auth;
  clearSupabaseSession?: () => Promise<void>;
  clearLocalSession?: () => void;
}): Promise<void> {
  void logLumenXAnalyticsEventForContext({ name: "auth_logout" });
  try {
    await signOutFirebase(input?.auth);
  } catch {
    // Continue clearing local session even if Firebase sign-out fails.
  }
  if (input?.clearSupabaseSession) {
    await input.clearSupabaseSession();
  }
  input?.clearLocalSession?.();
}
