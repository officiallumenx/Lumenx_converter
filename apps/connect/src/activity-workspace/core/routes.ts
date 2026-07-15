/** Base path for the Activity Coordinator workspace (single Teacher Portal). */
export const ACTIVITY_WORKSPACE_BASE = "/activity";

/** @deprecated Use ACTIVITY_WORKSPACE_BASE — internal rename only; path unchanged. */
export const ACTIVITY_PORTAL_BASE = ACTIVITY_WORKSPACE_BASE;

export function isActivityWorkspacePath(pathname: string): boolean {
  return (
    pathname === ACTIVITY_WORKSPACE_BASE || pathname.startsWith(`${ACTIVITY_WORKSPACE_BASE}/`)
  );
}

/** @deprecated Use isActivityWorkspacePath */
export function isActivityPortalPath(pathname: string): boolean {
  return isActivityWorkspacePath(pathname);
}
