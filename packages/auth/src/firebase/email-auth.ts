/**
 * Best-effort Firebase Auth client sign-out (stale sessions only).
 * Interactive Firebase Auth (email/phone login) has been removed.
 * Product login uses Supabase Auth; Firebase remains for FCM/Analytics/Crashlytics.
 */

import { signOut, type Auth } from "firebase/auth";
import { getFirebaseAuth } from "./client";

/** Sign out any residual Firebase Auth session without throwing. */
export async function signOutFirebase(auth?: Auth): Promise<void> {
  const authClient = auth ?? getFirebaseAuth();
  if (!authClient) return;
  try {
    await signOut(authClient);
  } catch {
    // Ignore — Auth may be unused or already signed out.
  }
}
