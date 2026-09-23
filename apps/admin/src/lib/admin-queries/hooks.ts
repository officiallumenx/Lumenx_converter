import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { isInstituteUuid } from "@/lib/active-institute";
import {
  ADMIN_QUERY_CATALOG_STALE_TIME_MS,
  ADMIN_QUERY_VOLATILE_STALE_TIME_MS,
} from "./constants";
import {
  adminModulePrefix,
  adminQueryKeys,
  adminQueryRoots,
  adminScopePrefix,
  type AdminQueryEntity,
} from "./keys";

import {
  loadStudentDetail,
  loadStudentGuardians,
  loadStudentsList,
  type ListStudentsParams,
} from "@/lib/students";
import {
  loadTeachersList,
  type ListTeachersParams,
} from "@/lib/teachers";
import { loadClassesList } from "@/lib/classes";
import { listClassesCatalog } from "@/lib/classes/api";
import { loadSubjectsList } from "@/lib/subjects";
import { listSubjects } from "@/lib/subjects/api";
import { loadFeesSnapshot } from "@/lib/fees";
import { loadAttendanceRegistersList } from "@/lib/attendance";
import {
  loadStaffAttendanceDay,
  loadStaffAttendanceSubmittedRange,
} from "@/lib/staff-attendance";
import { loadTimetableReadBundle } from "@/lib/timetable";
import { loadMarksList } from "@/lib/marks";
import { loadExamsList } from "@/lib/exams";
import { loadHomeworkList } from "@/lib/homework";
import { loadParentsList } from "@/lib/parents";
import {
  loadTransportVehiclesList,
  loadTransportDriversList,
  loadTransportRoutesList,
  loadTransportEnrollmentsList,
  loadTransportSettings,
} from "@/lib/transport";
import { loadAnalyticsSummary } from "@/lib/analytics";
import {
  loadDocumentsHubSummary,
  loadDocumentsTemplatesList,
  loadDocumentsGeneratedList,
} from "@/lib/documents";
import { loadEventsList } from "@/lib/events";
import { loadAnnouncementsList } from "@/lib/announcements";
import { loadComplaintsList } from "@/lib/complaints";
import { loadNotificationInboxList } from "@/lib/notification-inbox";
import { loadDiaryDaysList } from "@/lib/diary";
import { loadLeaveRequestsList } from "@/lib/leave";
import { loadMessagesThreadList } from "@/lib/messages";
import { loadCalendarList } from "@/lib/calendar";
import {
  loadAdmissionsList,
  loadAdmissionsProgramsList,
  loadAdmissionsOpeningsList,
} from "@/lib/admissions";
import { loadCareersList, loadCareerJobsList } from "@/lib/careers";
import { listAcademicYears } from "@/lib/academic-years/api";
import { loadAcademicYearsList } from "@/lib/academic-years";
import { loadDashboardSummary, loadDashboardWidgets } from "@/lib/dashboard";
import { loadSectionDetail } from "@/lib/classes";
import { loadSubjectDetail } from "@/lib/subjects";
import { loadEnrollmentsList } from "@/lib/enrollments";
import type { EnrollmentStatus } from "@/lib/enrollments";
import { loadParentDetail } from "@/lib/parents";
import {
  listAccessAssignees,
  listAccessRoles,
  type AccessAssigneeDto,
  type AccessRoleDto,
} from "@/lib/access-roles";
import { listTeachers } from "@/lib/teachers/api";
import { listStaffAccounts } from "@/lib/staff/api";
import { loadMembershipsList } from "@/lib/identity";
import type { MembershipStatus } from "@/lib/identity";
import { loadInstituteProfile } from "@/lib/institutes";
import { loadStorageUsage } from "@/lib/assets";
import { loadReportsCatalog } from "@/lib/reports";
import { loadAlertRules } from "@/lib/alert-rules-api";

function instituteEnabled(
  instituteId: string | null | undefined,
  enabled: boolean,
): boolean {
  return (
    enabled && Boolean(instituteId) && isInstituteUuid(instituteId ?? "")
  );
}

function studentFiltersKey(
  filters: Omit<ListStudentsParams, "instituteId">,
) {
  return {
    status: filters.status ?? null,
    q: filters.q ?? null,
    classLabel: filters.classLabel ?? null,
    sectionLabel: filters.sectionLabel ?? null,
  };
}

function teacherFiltersKey(
  filters: Pick<ListTeachersParams, "status" | "teachingScope" | "q">,
) {
  return {
    status: filters.status ?? null,
    teachingScope: filters.teachingScope ?? null,
    q: filters.q ?? null,
  };
}

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

export function useStudentsListQuery(
  instituteId: string | null | undefined,
  filters: Omit<ListStudentsParams, "instituteId"> = {},
  enabled = true,
) {
  const id = instituteId ?? "_";
  const filterKey = studentFiltersKey(filters);
  return useQuery({
    queryKey: adminQueryKeys.students(id, filterKey),
    queryFn: () => loadStudentsList(instituteId!, filters),
    enabled: instituteEnabled(instituteId, enabled),
    placeholderData: keepPreviousData,
  });
}

export function useStudentDetailQuery(
  instituteId: string | null | undefined,
  studentId: string | null | undefined,
  enabled = true,
) {
  const id = instituteId ?? "_";
  const sid = studentId ?? "_";
  return useQuery({
    queryKey: adminQueryKeys.student(id, sid),
    queryFn: () => loadStudentDetail(studentId!, instituteId ?? null),
    enabled:
      instituteEnabled(instituteId, enabled) &&
      Boolean(studentId) &&
      isInstituteUuid(studentId ?? ""),
  });
}

export function useStudentGuardiansQuery(
  instituteId: string | null | undefined,
  studentId: string | null | undefined,
  enabled = true,
) {
  const id = instituteId ?? "_";
  const sid = studentId ?? "_";
  return useQuery({
    queryKey: adminQueryKeys.studentGuardians(id, sid),
    queryFn: () => loadStudentGuardians(studentId!),
    enabled:
      instituteEnabled(instituteId, enabled) &&
      Boolean(studentId) &&
      isInstituteUuid(studentId ?? ""),
  });
}

export function useTeachersListQuery(
  instituteId: string | null | undefined,
  filters: Pick<ListTeachersParams, "status" | "teachingScope" | "q"> = {},
  enabled = true,
) {
  const id = instituteId ?? "_";
  const filterKey = teacherFiltersKey(filters);
  return useQuery({
    queryKey: adminQueryKeys.teachers(id, filterKey),
    queryFn: () => loadTeachersList(instituteId!, filters),
    enabled: instituteEnabled(instituteId, enabled),
    placeholderData: keepPreviousData,
  });
}

export function useClassesListQuery(
  instituteId: string | null | undefined,
  enabled = true,
) {
  const id = instituteId ?? "_";
  return useQuery({
    queryKey: adminQueryKeys.classes(id),
    queryFn: () => loadClassesList(instituteId!),
    enabled: instituteEnabled(instituteId, enabled),
    staleTime: ADMIN_QUERY_CATALOG_STALE_TIME_MS,
  });
}

export function useSubjectsListQuery(
  instituteId: string | null | undefined,
  enabled = true,
) {
  const id = instituteId ?? "_";
  return useQuery({
    queryKey: adminQueryKeys.subjects(id),
    queryFn: () => loadSubjectsList(instituteId!),
    enabled: instituteEnabled(instituteId, enabled),
  });
}

export function useFeesSnapshotQuery(
  instituteId: string | null | undefined,
  academicYearId?: string | null,
  enabled = true,
) {
  const id = instituteId ?? "_";
  const yearKey = academicYearId ?? "_";
  return useQuery({
    queryKey: adminQueryKeys.fees(id, yearKey),
    queryFn: () => loadFeesSnapshot(instituteId!, academicYearId ?? undefined),
    enabled:
      instituteEnabled(instituteId, enabled) &&
      (academicYearId === undefined || Boolean(academicYearId)),
  });
}

export function useAttendanceRegistersQuery(
  instituteId: string | null | undefined,
  scope: { sectionId?: string; attendanceDate?: string },
  enabled = true,
) {
  const id = instituteId ?? "_";
  return useQuery({
    queryKey: adminQueryKeys.attendance(id, scope),
    queryFn: () => loadAttendanceRegistersList(instituteId!, scope),
    enabled: instituteEnabled(instituteId, enabled),
  });
}

export function useStaffAttendanceDayQuery(
  instituteId: string | null | undefined,
  attendanceDate: string,
  enabled = true,
) {
  const id = instituteId ?? "_";
  return useQuery({
    queryKey: adminQueryKeys.teacherAttendance(id, {
      kind: "day",
      attendanceDate,
    }),
    queryFn: () => loadStaffAttendanceDay(instituteId!, attendanceDate),
    enabled:
      instituteEnabled(instituteId, enabled) && Boolean(attendanceDate),
  });
}

export function useStaffAttendanceRangeQuery(
  instituteId: string | null | undefined,
  fromDate: string,
  toDate: string,
  enabled = true,
) {
  const id = instituteId ?? "_";
  return useQuery({
    queryKey: adminQueryKeys.teacherAttendance(id, {
      kind: "range",
      fromDate,
      toDate,
    }),
    queryFn: () =>
      loadStaffAttendanceSubmittedRange(instituteId!, {
        from: fromDate,
        to: toDate,
      }),
    enabled:
      instituteEnabled(instituteId, enabled) &&
      Boolean(fromDate) &&
      Boolean(toDate),
  });
}

export function useTimetableReadQuery(
  instituteId: string | null | undefined,
  enabled = true,
) {
  const id = instituteId ?? "_";
  return useQuery({
    queryKey: adminQueryKeys.timetable(id),
    queryFn: () => loadTimetableReadBundle(instituteId!),
    enabled: instituteEnabled(instituteId, enabled),
  });
}

export function useMarksListQuery(
  instituteId: string | null | undefined,
  enabled = true,
) {
  const id = instituteId ?? "_";
  return useQuery({
    queryKey: adminQueryKeys.marks(id),
    queryFn: () => loadMarksList(instituteId!),
    enabled: instituteEnabled(instituteId, enabled),
  });
}

export function useExamsListQuery(
  instituteId: string | null | undefined,
  enabled = true,
) {
  const id = instituteId ?? "_";
  return useQuery({
    queryKey: adminQueryKeys.exams(id),
    queryFn: () => loadExamsList(instituteId!),
    enabled: instituteEnabled(instituteId, enabled),
  });
}

export function useHomeworkListQuery(
  instituteId: string | null | undefined,
  enabled = true,
) {
  const id = instituteId ?? "_";
  return useQuery({
    queryKey: adminQueryKeys.homework(id),
    queryFn: () => loadHomeworkList(instituteId!),
    enabled: instituteEnabled(instituteId, enabled),
  });
}

export function useParentsListQuery(
  instituteId: string | null | undefined,
  enabled = true,
) {
  const id = instituteId ?? "_";
  return useQuery({
    queryKey: adminQueryKeys.parents(id),
    queryFn: () => loadParentsList(instituteId!),
    enabled: instituteEnabled(instituteId, enabled),
  });
}

export function useTransportVehiclesQuery(
  instituteId: string | null | undefined,
  enabled = true,
) {
  const id = instituteId ?? "_";
  return useQuery({
    queryKey: adminQueryKeys.transport(id, "vehicles"),
    queryFn: () => loadTransportVehiclesList(instituteId!),
    enabled: instituteEnabled(instituteId, enabled),
  });
}

export function useTransportDriversQuery(
  instituteId: string | null | undefined,
  enabled = true,
) {
  const id = instituteId ?? "_";
  return useQuery({
    queryKey: adminQueryKeys.transport(id, "drivers"),
    queryFn: () => loadTransportDriversList(instituteId!),
    enabled: instituteEnabled(instituteId, enabled),
  });
}

export function useTransportRoutesQuery(
  instituteId: string | null | undefined,
  enabled = true,
) {
  const id = instituteId ?? "_";
  return useQuery({
    queryKey: adminQueryKeys.transport(id, "routes"),
    queryFn: () => loadTransportRoutesList(instituteId!),
    enabled: instituteEnabled(instituteId, enabled),
  });
}

export function useTransportEnrollmentsQuery(
  instituteId: string | null | undefined,
  enabled = true,
) {
  const id = instituteId ?? "_";
  return useQuery({
    queryKey: adminQueryKeys.transport(id, "enrollments"),
    queryFn: () => loadTransportEnrollmentsList(instituteId!),
    enabled: instituteEnabled(instituteId, enabled),
  });
}

export function useTransportSettingsQuery(
  instituteId: string | null | undefined,
  enabled = true,
) {
  const id = instituteId ?? "_";
  return useQuery({
    queryKey: adminQueryKeys.transport(id, "settings"),
    queryFn: () => loadTransportSettings(instituteId!),
    enabled: instituteEnabled(instituteId, enabled),
  });
}

export function useAnalyticsSummaryQuery(
  instituteId: string | null | undefined,
  enabled = true,
) {
  const id = instituteId ?? "_";
  return useQuery({
    queryKey: adminQueryKeys.analytics(id),
    queryFn: () => loadAnalyticsSummary(instituteId!),
    enabled: instituteEnabled(instituteId, enabled),
  });
}

export function useDocumentsHubQuery(
  instituteId: string | null | undefined,
  enabled = true,
) {
  const id = instituteId ?? "_";
  return useQuery({
    queryKey: adminQueryKeys.documents(id, "hub"),
    queryFn: () => loadDocumentsHubSummary(instituteId!),
    enabled: instituteEnabled(instituteId, enabled),
  });
}

export function useDocumentsTemplatesQuery(
  instituteId: string | null | undefined,
  enabled = true,
) {
  const id = instituteId ?? "_";
  return useQuery({
    queryKey: adminQueryKeys.documents(id, "templates"),
    queryFn: () => loadDocumentsTemplatesList(instituteId!),
    enabled: instituteEnabled(instituteId, enabled),
  });
}

export function useDocumentsGeneratedQuery(
  instituteId: string | null | undefined,
  enabled = true,
) {
  const id = instituteId ?? "_";
  return useQuery({
    queryKey: adminQueryKeys.documents(id, "generated"),
    queryFn: () => loadDocumentsGeneratedList(instituteId!),
    enabled: instituteEnabled(instituteId, enabled),
  });
}

export function useEventsListQuery(
  instituteId: string | null | undefined,
  enabled = true,
) {
  const id = instituteId ?? "_";
  return useQuery({
    queryKey: adminQueryKeys.events(id),
    queryFn: () => loadEventsList(instituteId!),
    enabled: instituteEnabled(instituteId, enabled),
  });
}

export function useAnnouncementsListQuery(
  instituteId: string | null | undefined,
  enabled = true,
) {
  const id = instituteId ?? "_";
  return useQuery({
    queryKey: adminQueryKeys.announcements(id),
    queryFn: () => loadAnnouncementsList(instituteId!),
    enabled: instituteEnabled(instituteId, enabled),
  });
}

export function useComplaintsListQuery(
  instituteId: string | null | undefined,
  enabled = true,
) {
  const id = instituteId ?? "_";
  return useQuery({
    queryKey: adminQueryKeys.complaints(id),
    queryFn: () => loadComplaintsList(instituteId!),
    enabled: instituteEnabled(instituteId, enabled),
  });
}

export function useNotificationsListQuery(
  instituteId: string | null | undefined,
  enabled = true,
) {
  const id = instituteId ?? "_";
  return useQuery({
    queryKey: adminQueryKeys.notifications(id),
    queryFn: () => loadNotificationInboxList(instituteId!),
    enabled: instituteEnabled(instituteId, enabled),
    staleTime: ADMIN_QUERY_VOLATILE_STALE_TIME_MS,
  });
}

export function useDiaryDaysQuery(
  instituteId: string | null | undefined,
  enabled = true,
) {
  const id = instituteId ?? "_";
  return useQuery({
    queryKey: adminQueryKeys.diary(id),
    queryFn: () => loadDiaryDaysList(instituteId!),
    enabled: instituteEnabled(instituteId, enabled),
  });
}

export function useLeaveRequestsQuery(
  instituteId: string | null | undefined,
  enabled = true,
) {
  const id = instituteId ?? "_";
  return useQuery({
    queryKey: adminQueryKeys.leave(id),
    queryFn: () => loadLeaveRequestsList(instituteId!),
    enabled: instituteEnabled(instituteId, enabled),
  });
}

export function useMessagesThreadsQuery(
  instituteId: string | null | undefined,
  currentUserId?: string | null,
  enabled = true,
) {
  const id = instituteId ?? "_";
  return useQuery({
    queryKey: [
      ...adminQueryKeys.messages(id),
      currentUserId ?? "_",
    ] as const,
    queryFn: () => loadMessagesThreadList(instituteId!, currentUserId),
    enabled: instituteEnabled(instituteId, enabled),
    staleTime: ADMIN_QUERY_VOLATILE_STALE_TIME_MS,
  });
}

export function useCalendarListQuery(
  instituteId: string | null | undefined,
  enabled = true,
) {
  const id = instituteId ?? "_";
  return useQuery({
    queryKey: adminQueryKeys.calendar(id),
    queryFn: () => loadCalendarList(instituteId!),
    enabled: instituteEnabled(instituteId, enabled),
  });
}

export function useAdmissionsListQuery(
  instituteId: string | null | undefined,
  enabled = true,
) {
  const id = instituteId ?? "_";
  return useQuery({
    queryKey: adminQueryKeys.admissions(id, "list"),
    queryFn: () => loadAdmissionsList(instituteId!),
    enabled: instituteEnabled(instituteId, enabled),
  });
}

export function useAdmissionsProgramsQuery(
  instituteId: string | null | undefined,
  enabled = true,
) {
  const id = instituteId ?? "_";
  return useQuery({
    queryKey: adminQueryKeys.admissions(id, "programs"),
    queryFn: () => loadAdmissionsProgramsList(instituteId!),
    enabled: instituteEnabled(instituteId, enabled),
  });
}

export function useAdmissionsOpeningsQuery(
  instituteId: string | null | undefined,
  enabled = true,
) {
  const id = instituteId ?? "_";
  return useQuery({
    queryKey: adminQueryKeys.admissions(id, "openings"),
    queryFn: () => loadAdmissionsOpeningsList(instituteId!),
    enabled: instituteEnabled(instituteId, enabled),
  });
}

export function useCareersListQuery(
  instituteId: string | null | undefined,
  enabled = true,
) {
  const id = instituteId ?? "_";
  return useQuery({
    queryKey: adminQueryKeys.careers(id, "list"),
    queryFn: () => loadCareersList(instituteId!),
    enabled: instituteEnabled(instituteId, enabled),
  });
}

export function useCareerJobsQuery(
  instituteId: string | null | undefined,
  enabled = true,
) {
  const id = instituteId ?? "_";
  return useQuery({
    queryKey: adminQueryKeys.careers(id, "jobs"),
    queryFn: () => loadCareerJobsList(instituteId!),
    enabled: instituteEnabled(instituteId, enabled),
  });
}

export function useCatalogClassesQuery(
  instituteId: string | null | undefined,
  enabled = true,
) {
  const id = instituteId ?? "_";
  return useQuery({
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
  return useQuery({
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
  return useQuery({
    queryKey: adminQueryKeys.catalogYears(id),
    queryFn: () => listAcademicYears({ instituteId: instituteId! }),
    enabled: instituteEnabled(instituteId, enabled),
    staleTime: ADMIN_QUERY_CATALOG_STALE_TIME_MS,
  });
}

export function useAcademicYearsListQuery(
  instituteId: string | null | undefined,
  enabled = true,
) {
  const id = instituteId ?? "_";
  return useQuery({
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
  return useQuery({
    queryKey: adminQueryKeys.homeSummary(id),
    queryFn: () => loadDashboardSummary(instituteId!),
    enabled: instituteEnabled(instituteId, enabled),
  });
}

export function useHomeWidgetsQuery(
  instituteId: string | null | undefined,
  enabled = true,
) {
  const id = instituteId ?? "_";
  return useQuery({
    queryKey: adminQueryKeys.homeWidgets(id),
    queryFn: () => loadDashboardWidgets(instituteId!),
    enabled: instituteEnabled(instituteId, enabled),
  });
}

export function useClassSectionDetailQuery(
  instituteId: string | null | undefined,
  sectionId: string | null | undefined,
  enabled = true,
) {
  const id = instituteId ?? "_";
  const sid = sectionId ?? "_";
  return useQuery({
    queryKey: adminQueryKeys.classSection(id, sid),
    queryFn: () => loadSectionDetail(sectionId!, instituteId ?? null),
    enabled:
      instituteEnabled(instituteId, enabled) &&
      Boolean(sectionId) &&
      isInstituteUuid(sectionId ?? ""),
  });
}

export function useSubjectDetailQuery(
  instituteId: string | null | undefined,
  subjectId: string | null | undefined,
  enabled = true,
) {
  const id = instituteId ?? "_";
  const sid = subjectId ?? "_";
  return useQuery({
    queryKey: adminQueryKeys.subject(id, sid),
    queryFn: () => loadSubjectDetail(subjectId!, instituteId ?? null),
    enabled:
      instituteEnabled(instituteId, enabled) &&
      Boolean(subjectId) &&
      isInstituteUuid(subjectId ?? ""),
  });
}

function enrollmentFiltersKey(filters: {
  academicYearId?: string;
  classId?: string;
  sectionId?: string;
  status?: EnrollmentStatus;
}) {
  return {
    academicYearId: filters.academicYearId ?? null,
    classId: filters.classId ?? null,
    sectionId: filters.sectionId ?? null,
    status: filters.status ?? null,
  };
}

export function useEnrollmentsListQuery(
  instituteId: string | null | undefined,
  filters: {
    academicYearId?: string;
    classId?: string;
    sectionId?: string;
    status?: EnrollmentStatus;
  } = {},
  enabled = true,
) {
  const id = instituteId ?? "_";
  const filterKey = enrollmentFiltersKey(filters);
  return useQuery({
    queryKey: adminQueryKeys.enrollments(id, filterKey),
    queryFn: () => loadEnrollmentsList(instituteId!, filters),
    enabled: instituteEnabled(instituteId, enabled),
    placeholderData: keepPreviousData,
  });
}

export function useParentDetailQuery(
  instituteId: string | null | undefined,
  parentId: string | null | undefined,
  enabled = true,
) {
  const id = instituteId ?? "_";
  const pid = parentId ?? "_";
  return useQuery({
    queryKey: adminQueryKeys.parent(id, pid),
    queryFn: () => loadParentDetail(parentId!, instituteId ?? null),
    enabled:
      instituteEnabled(instituteId, enabled) &&
      Boolean(parentId) &&
      isInstituteUuid(parentId ?? ""),
  });
}

export type PermissionsAccessState = {
  roles: AccessRoleDto[];
  assignees: AccessAssigneeDto[];
  teachers: Array<{
    id: string;
    displayName: string;
    email: string | null;
    phone: string | null;
  }>;
  staffAccounts: Array<{
    id: string;
    displayName: string;
    email: string | null;
    phone: string | null;
    department: string;
  }>;
  teachersCatalogFailed: boolean;
  staffCatalogFailed: boolean;
};

async function loadPermissionsAccess(
  instituteId: string,
): Promise<PermissionsAccessState> {
  let teachersCatalogFailed = false;
  let staffCatalogFailed = false;
  const [roles, assignees, nextTeachers, nextStaff] = await Promise.all([
    listAccessRoles(instituteId),
    listAccessAssignees(instituteId),
    listTeachers({ instituteId }).catch(() => {
      teachersCatalogFailed = true;
      return [];
    }),
    listStaffAccounts({ instituteId }).catch(() => {
      staffCatalogFailed = true;
      return [];
    }),
  ]);
  return {
    roles,
    assignees,
    teachers: nextTeachers.map((t) => ({
      id: t.id,
      displayName: t.displayName,
      email: t.email,
      phone: t.phone,
    })),
    staffAccounts: nextStaff.map((s) => ({
      id: s.id,
      displayName: s.displayName,
      email: s.email,
      phone: s.phone,
      department: s.department,
    })),
    teachersCatalogFailed,
    staffCatalogFailed,
  };
}

export function usePermissionsAccessQuery(
  instituteId: string | null | undefined,
  enabled = true,
) {
  const id = instituteId ?? "_";
  return useQuery({
    queryKey: adminQueryKeys.permissions(id),
    queryFn: () => loadPermissionsAccess(instituteId!),
    enabled: instituteEnabled(instituteId, enabled),
  });
}

export function useAccountsMembershipsQuery(
  instituteId: string | null | undefined,
  statusFilter: MembershipStatus | "" = "",
  enabled = true,
) {
  const id = instituteId ?? "_";
  const filters = { status: statusFilter || null };
  return useQuery({
    queryKey: adminQueryKeys.accounts(id, filters),
    queryFn: () =>
      loadMembershipsList(
        instituteId!,
        statusFilter ? { status: statusFilter } : undefined,
      ),
    enabled: instituteEnabled(instituteId, enabled),
    placeholderData: keepPreviousData,
  });
}

export function useInstituteProfileQuery(
  instituteId: string | null | undefined,
  enabled = true,
) {
  const id = instituteId ?? "_";
  return useQuery({
    queryKey: adminQueryKeys.instituteProfile(id),
    queryFn: () => loadInstituteProfile(instituteId!),
    enabled: instituteEnabled(instituteId, enabled),
  });
}

export function useStorageUsageQuery(
  instituteId: string | null | undefined,
  enabled = true,
) {
  const id = instituteId ?? "_";
  return useQuery({
    queryKey: adminQueryKeys.storage(id),
    queryFn: () => loadStorageUsage(instituteId!),
    enabled: instituteEnabled(instituteId, enabled),
  });
}

export function useReportsCatalogQuery(
  instituteId: string | null | undefined,
  enabled = true,
) {
  const id = instituteId ?? "_";
  return useQuery({
    queryKey: adminQueryKeys.reports(id),
    queryFn: () => loadReportsCatalog(instituteId!),
    enabled: instituteEnabled(instituteId, enabled),
  });
}

export function useAlertRulesQuery(
  instituteId: string | null | undefined,
  enabled = true,
) {
  const id = instituteId ?? "_";
  return useQuery({
    queryKey: adminQueryKeys.alerts(id),
    queryFn: () => loadAlertRules(instituteId!),
    enabled: instituteEnabled(instituteId, enabled),
  });
}
