import type { QueryClient } from "@tanstack/react-query";
import {
  adminInstitutePrefix,
  adminModulePrefix,
  adminScopePrefix,
  type AdminQueryEntity,
} from "./keys";

function queryKeyLooksLikeSignedUrl(queryKey: readonly unknown[]): boolean {
  return queryKey.some(
    (part) => typeof part === "string" && part.toLowerCase().includes("signed-url"),
  );
}

/**
 * Soft refresh: invalidate active Admin queries for the institute (or whole
 * Admin scope when institute unknown). Skips signed-url photo keys so resume
 * does not force mass re-sign + image re-download.
 */
export function invalidateAdminSoftRefresh(
  queryClient: QueryClient,
  instituteId?: string | null,
): Promise<void> {
  const baseKey = instituteId?.trim()
    ? adminInstitutePrefix(instituteId.trim())
    : adminScopePrefix();

  return queryClient
    .invalidateQueries({
      queryKey: baseKey,
      refetchType: "active",
      predicate: (query) => !queryKeyLooksLikeSignedUrl(query.queryKey),
    })
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
