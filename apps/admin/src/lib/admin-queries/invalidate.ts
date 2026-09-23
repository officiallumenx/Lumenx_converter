import type { QueryClient } from "@tanstack/react-query";
import {
  adminInstitutePrefix,
  adminModulePrefix,
  adminScopePrefix,
  type AdminQueryEntity,
} from "./keys";

/** Soft refresh: invalidate all Admin TanStack Query caches (not clear). */
export function invalidateAdminSoftRefresh(
  queryClient: QueryClient,
): Promise<void> {
  return queryClient
    .invalidateQueries({ queryKey: adminScopePrefix() })
    .then(() => undefined);
}

/** Drop institute-scoped caches when the active institute changes. */
export function invalidateAdminInstituteQueries(
  queryClient: QueryClient,
  instituteId: string,
): Promise<void> {
  return queryClient
    .invalidateQueries({ queryKey: adminInstitutePrefix(instituteId) })
    .then(() => undefined);
}

/** Remove (not just invalidate) all queries for an institute — switch / logout. */
export function removeAdminInstituteQueries(
  queryClient: QueryClient,
  instituteId: string,
): void {
  queryClient.removeQueries({ queryKey: adminInstitutePrefix(instituteId) });
}

export function invalidateAdminModule(
  queryClient: QueryClient,
  instituteId: string,
  entity: AdminQueryEntity,
): Promise<void> {
  return queryClient
    .invalidateQueries({ queryKey: adminModulePrefix(instituteId, entity) })
    .then(() => undefined);
}
