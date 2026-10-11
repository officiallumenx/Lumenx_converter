/**
 * Shell / Home query hooks only.
 * Imported by AdminChrome and Home so the entry graph does not pull every module loader
 * from the monolithic hooks barrel.
 */
import { useQueryClient } from "@tanstack/react-query";
import { listClassesCatalog } from "@/lib/classes/api";
import { listSubjects } from "@/lib/subjects/api";
import { loadNotificationInboxList } from "@/lib/notification-inbox";
import { loadAcademicYearsList } from "@/lib/academic-years";
import {
  loadDashboardSummary,
  loadDashboardWidgets,
  loadHomeBirthdaysToday,
  localYmd,
} from "@/lib/dashboard";
import { loadInstituteProfile } from "@/lib/institutes";
import {
  ADMIN_QUERY_CATALOG_STALE_TIME_MS,
  ADMIN_QUERY_VOLATILE_STALE_TIME_MS,
} from "./constants";
import {
  adminModulePrefix,
  adminQueryKeys,
  adminScopePrefix,
  type AdminQueryEntity,
} from "./keys";
import { instituteEnabled, useAdminQuery } from "./hooks-shared";

export { instituteEnabled, useAdminQuery } from "./hooks-shared";

/** Invalidate a module root (all filters) for the active institute. */
export function useInvalidateAdminQuery() {
  const qc = useQueryClient();
  return (root: AdminQueryEntity, instituteId?: string | null) => {
    if (instituteId) {
      void qc.invalidateQueries({
        queryKey: adminModulePrefix(instituteId, root),
      });
      return;
    }
    void qc.invalidateQueries({ queryKey: adminScopePrefix() });
  };
}

export function useNotificationsListQuery(
  instituteId: string | null | undefined,
  enabled = true,
) {
  const id = instituteId ?? "_";
  return useAdminQuery({
    queryKey: adminQueryKeys.notifications(id),
    queryFn: () => loadNotificationInboxList(instituteId!),
    enabled: instituteEnabled(instituteId, enabled),
    staleTime: ADMIN_QUERY_VOLATILE_STALE_TIME_MS,
    refetchOnWindowFocus: true,
    refetchInterval: ADMIN_QUERY_VOLATILE_STALE_TIME_MS,
  });
}

export function useCatalogClassesQuery(
  instituteId: string | null | undefined,
  enabled = true,
) {
  const id = instituteId ?? "_";
  return useAdminQuery({
    queryKey: adminQueryKeys.catalogClasses(id),
    queryFn: () => listClassesCatalog({ instituteId: instituteId! }),
    enabled: instituteEnabled(instituteId, enabled),
    staleTime: ADMIN_QUERY_CATALOG_STALE_TIME_MS,
  });
}

export function useCatalogSubjectsQuery(
  instituteId: string | null | undefined,
  enabled = true,
) {
  const id = instituteId ?? "_";
  return useAdminQuery({
    queryKey: adminQueryKeys.catalogSubjects(id),
    queryFn: () => listSubjects({ instituteId: instituteId! }),
    enabled: instituteEnabled(instituteId, enabled),
    staleTime: ADMIN_QUERY_CATALOG_STALE_TIME_MS,
  });
}

export function useCatalogYearsQuery(
  instituteId: string | null | undefined,
  enabled = true,
) {
  const id = instituteId ?? "_";
  // Share the academic-years list cache — one GET for Home, lock sync, and catalogs.
  return useAdminQuery({
    queryKey: adminQueryKeys.academicYears(id),
    queryFn: () => loadAcademicYearsList(instituteId!),
    select: (data) => data.items,
    enabled: instituteEnabled(instituteId, enabled),
    staleTime: ADMIN_QUERY_CATALOG_STALE_TIME_MS,
  });
}

export function useAcademicYearsListQuery(
  instituteId: string | null | undefined,
  enabled = true,
) {
  const id = instituteId ?? "_";
  return useAdminQuery({
    queryKey: adminQueryKeys.academicYears(id),
    queryFn: () => loadAcademicYearsList(instituteId!),
    enabled: instituteEnabled(instituteId, enabled),
    staleTime: ADMIN_QUERY_CATALOG_STALE_TIME_MS,
  });
}

export function useHomeSummaryQuery(
  instituteId: string | null | undefined,
  enabled = true,
) {
  const id = instituteId ?? "_";
  return useAdminQuery({
    queryKey: adminQueryKeys.homeSummary(id),
    queryFn: () => loadDashboardSummary(instituteId!),
    enabled: instituteEnabled(instituteId, enabled),
    staleTime: ADMIN_QUERY_VOLATILE_STALE_TIME_MS,
    refetchOnWindowFocus: true,
  });
}

export function useHomeWidgetsQuery(
  instituteId: string | null | undefined,
  enabled = true,
) {
  const id = instituteId ?? "_";
  // Local calendar day in the key so yesterday's empty birthday board cannot
  // stick under the 7-day default stale window / IndexedDB restore.
  const dayYmd = localYmd();
  return useAdminQuery({
    queryKey: adminQueryKeys.homeWidgets(id, dayYmd),
    queryFn: () => loadDashboardWidgets(instituteId!),
    enabled: instituteEnabled(instituteId, enabled),
    staleTime: ADMIN_QUERY_VOLATILE_STALE_TIME_MS,
    refetchOnWindowFocus: true,
  });
}

/** Today's student/teacher birthdays — month+day match, fresh each calendar day. */
export function useHomeBirthdaysQuery(
  instituteId: string | null | undefined,
  enabled = true,
) {
  const id = instituteId ?? "_";
  const dayYmd = localYmd();
  return useAdminQuery({
    queryKey: adminQueryKeys.homeBirthdays(id, dayYmd),
    queryFn: () => loadHomeBirthdaysToday(instituteId!),
    enabled: instituteEnabled(instituteId, enabled),
    staleTime: ADMIN_QUERY_VOLATILE_STALE_TIME_MS,
    // Share directory cache with widgets/setup — don't force a second burst on every mount.
    refetchOnMount: true,
    retry: (failureCount, error) => {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        (error as { code: string }).code === "RATE_LIMITED"
      ) {
        return failureCount < 2;
      }
      return failureCount < 1;
    },
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 4000),
  });
}

export function useInstituteProfileQuery(
  instituteId: string | null | undefined,
  enabled = true,
) {
  const id = instituteId ?? "_";
  return useAdminQuery({
    queryKey: adminQueryKeys.instituteProfile(id),
    queryFn: () => loadInstituteProfile(instituteId!),
    enabled: instituteEnabled(instituteId, enabled),
  });
}
