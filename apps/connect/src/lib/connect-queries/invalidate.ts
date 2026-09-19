import type { QueryClient } from "@tanstack/react-query";
import { CONNECT_SOFT_REFRESH_ROOTS, connectQueryRoots } from "./keys";

/** Soft refresh: invalidate all Connect module caches (not clear). */
export function invalidateConnectSoftRefresh(queryClient: QueryClient): Promise<void> {
  return Promise.all(
    CONNECT_SOFT_REFRESH_ROOTS.map((root) =>
      queryClient.invalidateQueries({ queryKey: [root] }),
    ),
  ).then(() => undefined);
}

/** Logout / role leave: drop portal caches so institutes cannot leak. */
export function removeConnectPortalQueries(queryClient: QueryClient): void {
  queryClient.removeQueries({ queryKey: [connectQueryRoots.teacherPortal] });
  queryClient.removeQueries({ queryKey: [connectQueryRoots.parentPortal] });
  queryClient.removeQueries({ queryKey: [connectQueryRoots.studentPortal] });
  queryClient.removeQueries({ queryKey: [connectQueryRoots.activityWorkspace] });
}
