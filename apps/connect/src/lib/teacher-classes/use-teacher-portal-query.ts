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

export const TEACHER_PORTAL_QUERY_ROOT = "teacher-portal" as const;

export function teacherPortalQueryKey(instituteId: string) {
  return [TEACHER_PORTAL_QUERY_ROOT, instituteId] as const;
}

export async function fetchTeacherPortalRoster(
  instituteId: string,
): Promise<TeacherPortalApiData | null> {
  return loadTeacherPortalApiData(instituteId);
}

export function invalidateTeacherPortalQueries(
  queryClient: QueryClient,
  instituteId?: string | null,
): Promise<void> {
  if (instituteId) {
    return queryClient.invalidateQueries({
      queryKey: teacherPortalQueryKey(instituteId),
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
): Promise<TeacherPortalApiData | null> {
  if (!isApiAuthMode() || !isInstituteUuid(instituteId)) return null;

  if (boundQueryClient) {
    return boundQueryClient.fetchQuery({
      queryKey: teacherPortalQueryKey(instituteId),
      queryFn: () => fetchTeacherPortalRoster(instituteId),
    });
  }

  const { getTeacherPortalApiCache } = await import("@/lib/teacher-classes/load");
  const cached = getTeacherPortalApiCache();
  if (cached) return cached;
  return fetchTeacherPortalRoster(instituteId);
}

export type UseTeacherPortalRosterOptions = {
  instituteId: string | null | undefined;
  enabled?: boolean;
};

export function useTeacherPortalRosterQuery({
  instituteId,
  enabled = true,
}: UseTeacherPortalRosterOptions): UseQueryResult<TeacherPortalApiData | null> {
  const id = instituteId ?? "";
  const canRun =
    enabled && isApiAuthMode() && Boolean(id) && isInstituteUuid(id);

  return useQuery({
    queryKey: teacherPortalQueryKey(id),
    queryFn: () => fetchTeacherPortalRoster(id),
    enabled: canRun,
  });
}

/** Soft-refresh / logout helpers that need the active QueryClient from a component. */
export function useTeacherPortalQueryClient(): QueryClient {
  return useQueryClient();
}
