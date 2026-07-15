import { useLocation } from "@tanstack/react-router";

/** True when the Connect main app Settings route (/profile) is active. */
export function isConnectSettingsPath(pathname: string): boolean {
  if (!pathname) return false;
  if (pathname === "/profile" || pathname.startsWith("/profile/")) return true;
  if (pathname === "/activity/profile" || pathname.startsWith("/activity/profile/")) return true;
  if (pathname.endsWith("/profile")) return true;
  return false;
}

export function useIsConnectSettingsRoute(): boolean {
  const loc = useLocation();
  return isConnectSettingsPath(loc.pathname);
}
