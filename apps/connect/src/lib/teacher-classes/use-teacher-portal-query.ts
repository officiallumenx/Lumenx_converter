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
  options?: { includeStudents?: boolean },
): Promise<TeacherPortalApiData | null> {
  return loadTeacherPortalApiData(instituteId, options);
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
    const key = teacherPortalQueryKey(userId, instituteId);
    const existing = boundQueryClient.getQueryData<TeacherPortalApiData | null>(key);
    // Home may have cached a shell roster (no enrollments). Callers of ensure*
    // need students — do not return shell as if it were complete.
    if (existing?.instituteId === instituteId && existing.studentsLoaded) {
      return existing;
    }
    return boundQueryClient.fetchQuery({
      queryKey: key,
      queryFn: () => fetchTeacherPortalRoster(instituteId, { includeStudents: true }),
      // Force refetch when only the Home shell is present.
      ...(existing && !existing.studentsLoaded ? { staleTime: 0 } : {}),
    });
  }

  const { getTeacherPortalApiCache } = await import("@/lib/teacher-classes/load");
  const cached = getTeacherPortalApiCache();
  // Never return another institute's module-level roster; never treat shell as full.
  if (cached?.instituteId === instituteId && cached.studentsLoaded) return cached;
  return fetchTeacherPortalRoster(instituteId, { includeStudents: true });
}

export type UseTeacherPortalRosterOptions = {
  instituteId: string | null | undefined;
  userId?: string | null;
  enabled?: boolean;
  /**
   * Home passes false so enrollments/photos do not block shell + timetable overlap.
   * Default true for callers that need student rosters immediately.
   */
  includeStudents?: boolean;
};

export function useTeacherPortalRosterQuery({
  instituteId,
  userId,
  enabled = true,
  includeStudents = true,
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
    // Shell vs full share the same key so background student fill can upgrade in place.
    queryKey: teacherPortalQueryKey(uid, id),
    queryFn: () => fetchTeacherPortalRoster(id, { includeStudents }),
    enabled: canRun,
  });
}

/** Soft-refresh / logout helpers that need the active QueryClient from a component. */
export function useTeacherPortalQueryClient(): QueryClient {
  return useQueryClient();
}
