import {
  useQuery,
  useQueryClient,
  type QueryClient,
  type UseQueryResult,
} from "@tanstack/react-query";
import { isApiAuthMode } from "@/auth/auth-mode";
import { isInstituteUuid } from "@/lib/institute-id";
import {
  clearTeacherPortalApiCache,
  loadTeacherPortalApiData,
  type TeacherPortalApiData,
} from "@/lib/teacher-classes/load";
import { connectQueryRoots } from "@/lib/connect-queries/keys";
import { scopedConnectKey } from "@/lib/connect-queries/scope";

export const TEACHER_PORTAL_QUERY_ROOT = connectQueryRoots.teacherPortal;

export function teacherPortalQueryKey(
  userId: string,
  instituteId: string,
): readonly unknown[] {
  return scopedConnectKey(userId, [TEACHER_PORTAL_QUERY_ROOT, instituteId]);
}

export async function fetchTeacherPortalRoster(
  instituteId: string,
): Promise<TeacherPortalApiData | null> {
  return loadTeacherPortalApiData(instituteId);
}

export function invalidateTeacherPortalQueries(
  queryClient: QueryClient,
  userId: string,
  instituteId?: string | null,
): Promise<void> {
  if (instituteId) {
    return queryClient.invalidateQueries({
      queryKey: teacherPortalQueryKey(userId, instituteId),
    });
  }
  return queryClient.invalidateQueries({
    queryKey: [TEACHER_PORTAL_QUERY_ROOT],
  });
}

export function removeTeacherPortalQueries(queryClient: QueryClient): void {
  clearTeacherPortalApiCache();
  queryClient.removeQueries({ queryKey: [TEACHER_PORTAL_QUERY_ROOT] });
}

/** For non-React callers (e.g. GlobalSearch). Uses RQ when bound, else module cache / load. */
let boundQueryClient: QueryClient | null = null;

export function bindTeacherPortalQueryClient(queryClient: QueryClient | null): void {
  boundQueryClient = queryClient;
}

export async function ensureTeacherPortalRoster(
  instituteId: string,
  userId?: string | null,
): Promise<TeacherPortalApiData | null> {
  if (!isApiAuthMode() || !isInstituteUuid(instituteId)) return null;

  if (boundQueryClient && userId) {
    return boundQueryClient.fetchQuery({
      queryKey: teacherPortalQueryKey(userId, instituteId),
      queryFn: () => fetchTeacherPortalRoster(instituteId),
    });
  }

  const { getTeacherPortalApiCache } = await import("@/lib/teacher-classes/load");
  const cached = getTeacherPortalApiCache();
  // Never return another institute's module-level roster.
  if (cached?.instituteId === instituteId) return cached;
  return fetchTeacherPortalRoster(instituteId);
}

export type UseTeacherPortalRosterOptions = {
  instituteId: string | null | undefined;
  userId?: string | null;
  enabled?: boolean;
};

export function useTeacherPortalRosterQuery({
  instituteId,
  userId,
  enabled = true,
}: UseTeacherPortalRosterOptions): UseQueryResult<TeacherPortalApiData | null> {
  const id = instituteId ?? "";
  const uid = userId?.trim() || "__none__";
  const canRun =
    enabled &&
    isApiAuthMode() &&
    Boolean(id) &&
    isInstituteUuid(id) &&
    uid !== "__none__";

  return useQuery({
    queryKey: teacherPortalQueryKey(uid, id),
    queryFn: () => fetchTeacherPortalRoster(id),
    enabled: canRun,
  });
}

/** Soft-refresh / logout helpers that need the active QueryClient from a component. */
export function useTeacherPortalQueryClient(): QueryClient {
  return useQueryClient();
}
