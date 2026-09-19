import type { QueryClient } from "@tanstack/react-query";
import { ADMIN_SOFT_REFRESH_ROOTS, adminQueryRoots } from "./keys";

/** Soft refresh: invalidate all Admin module TanStack Query caches (not clear). */
export function invalidateAdminSoftRefresh(queryClient: QueryClient): Promise<void> {
  return Promise.all(
    ADMIN_SOFT_REFRESH_ROOTS.map((root) =>
      queryClient.invalidateQueries({ queryKey: [root] }),
    ),
  ).then(() => undefined);
}

/** Drop institute-scoped caches when the active institute changes (optional helper). */
export function invalidateAdminInstituteQueries(
  queryClient: QueryClient,
  instituteId: string,
): Promise<void> {
  return Promise.all(
    Object.values(adminQueryRoots).map((root) =>
      queryClient.invalidateQueries({ queryKey: [root, instituteId] }),
    ),
  ).then(() => undefined);
}
