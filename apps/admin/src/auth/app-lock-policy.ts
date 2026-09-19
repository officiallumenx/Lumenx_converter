/**
 * App-lock policy — PIN is a local session convenience, not backend identity.
 *
 * Decision (Phase 9 audit):
 * - NOT required for real production authentication (Supabase Auth is authoritative).
 * - IS a local app convenience lock in demo mode (re-unlock after tab refresh).
 * - Demo-only for PIN storage/verification; disabled in API mode.
 *
 * API mode must never treat a local PIN as proof of user identity.
 */
import { isApiAuthMode, isDemoAuthMode } from "./auth-mode";

/** Whether the launch-time AppLockScreen gate is shown. */
export function isAppLockRequired(): boolean {
  return isDemoAuthMode();
}

/** Whether local PIN map (localStorage) may be read or written. */
export function isLocalPinStorageAllowed(): boolean {
  return isDemoAuthMode();
}

/** Demo-only local app-lock routes. API PIN recovery lives in Admin login flow. */
export function resolveAppLockDemoRouteBlock(pathname: string): string | null {
  if (!isApiAuthMode()) return null;
  // Keep /forgot-pin available in API mode for deep-links; login embeds recovery.
  if (pathname === "/forgot-pin") return null;
  return null;
}
