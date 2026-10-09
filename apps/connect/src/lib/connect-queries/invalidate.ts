import type { QueryClient } from "@tanstack/react-query";
import {
  CONNECT_AUTO_SOFT_REFRESH_ROOTS,
  CONNECT_SOFT_REFRESH_ROOTS,
  connectQueryRoots,
} from "./keys";

function invalidateRoots(
  queryClient: QueryClient,
  roots: readonly string[],
): Promise<void> {
  return Promise.all(
    roots.map((root) => queryClient.invalidateQueries({ queryKey: [root] })),
  ).then(() => undefined);
}

/** Manual pull-to-refresh: invalidate all Connect module caches (not clear). */
export function invalidateConnectSoftRefresh(queryClient: QueryClient): Promise<void> {
  return invalidateRoots(queryClient, CONNECT_SOFT_REFRESH_ROOTS);
}

/**
 * Resume / tab focus: invalidate only volatile / shell caches.
 * Does not invalidate marks, homework, fees, exams, attendance, etc.
 */
export function invalidateConnectAutoSoftRefresh(
  queryClient: QueryClient,
): Promise<void> {
  return invalidateRoots(queryClient, CONNECT_AUTO_SOFT_REFRESH_ROOTS);
}

/** Logout / role leave: drop portal caches so institutes cannot leak. */
export function removeConnectPortalQueries(queryClient: QueryClient): void {
  queryClient.removeQueries({ queryKey: [connectQueryRoots.teacherPortal] });
  queryClient.removeQueries({ queryKey: [connectQueryRoots.parentPortal] });
  queryClient.removeQueries({ queryKey: [connectQueryRoots.studentPortal] });
  queryClient.removeQueries({ queryKey: [connectQueryRoots.activityWorkspace] });
}
