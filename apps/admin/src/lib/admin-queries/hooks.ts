import { useQuery, useQueryClient } from "@tanstack/react-query";
import { isInstituteUuid } from "@/lib/active-institute";
import { adminQueryKeys, adminQueryRoots } from "./keys";

import {
  loadStudentsList,
  peekStudentsListCache,
  type ListStudentsParams,
} from "@/lib/students";
import {
  loadTeachersList,
  peekTeachersListCache,
  type ListTeachersParams,
} from "@/lib/teachers";
import { loadClassesList, peekClassesListCache } from "@/lib/classes";
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

function instituteEnabled(
  instituteId: string | null | undefined,
  enabled: boolean,
): boolean {
  return (
    enabled && Boolean(instituteId) && isInstituteUuid(instituteId ?? "")
  );
}

function filterSig(value: unknown): string {
  return typeof value === "string" ? value : JSON.stringify(value ?? {});
}

/** Invalidate a module root (all filters) for the active institute. */
export function useInvalidateAdminQuery() {
  const qc = useQueryClient();
  return (
    root: (typeof adminQueryRoots)[keyof typeof adminQueryRoots],
    instituteId?: string | null,
  ) => {
    if (instituteId) {
      void qc.invalidateQueries({ queryKey: [root, instituteId] });
      return;
    }
    void qc.invalidateQueries({ queryKey: [root] });
  };
}

export function useStudentsListQuery(
  instituteId: string | null | undefined,
  filters: Omit<ListStudentsParams, "instituteId"> = {},
  enabled = true,
) {
  const sig = filterSig({
    status: filters.status ?? null,
    q: filters.q ?? null,
    classLabel: filters.classLabel ?? null,
    sectionLabel: filters.sectionLabel ?? null,
  });
  const id = instituteId ?? "_";
  return useQuery({
    queryKey: adminQueryKeys.students(id, sig),
    queryFn: () => loadStudentsList(instituteId!, filters),
    enabled: instituteEnabled(instituteId, enabled),
    placeholderData: (prev) =>
      prev ??
      (instituteId ? peekStudentsListCache(instituteId, filters) ?? undefined : undefined),
  });
}

export function useTeachersListQuery(
  instituteId: string | null | undefined,
  filters: Pick<ListTeachersParams, "status" | "teachingScope" | "q"> = {},
  enabled = true,
) {
  const sig = filterSig({
    status: filters.status ?? null,
    teachingScope: filters.teachingScope ?? null,
    q: filters.q ?? null,
  });
  const id = instituteId ?? "_";
  return useQuery({
    queryKey: adminQueryKeys.teachers(id, sig),
    queryFn: () => loadTeachersList(instituteId!, filters),
    enabled: instituteEnabled(instituteId, enabled),
    placeholderData: (prev) =>
      prev ??
      (instituteId ? peekTeachersListCache(instituteId, filters) ?? undefined : undefined),
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
    placeholderData: (prev) =>
      prev ??
      (instituteId ? peekClassesListCache(instituteId) ?? undefined : undefined),
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
    queryKey: [...adminQueryKeys.fees(id), yearKey] as const,
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
  const scopeKey = filterSig(scope);
  const id = instituteId ?? "_";
  return useQuery({
    queryKey: adminQueryKeys.attendance(id, scopeKey),
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
    queryKey: adminQueryKeys.attendance(id, `staff-day:${attendanceDate}`),
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
    queryKey: adminQueryKeys.attendance(
      id,
      `staff-range:${fromDate}:${toDate}`,
    ),
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
    queryKey: adminQueryKeys.documents(id),
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
    queryKey: [...adminQueryKeys.documents(id), "templates"] as const,
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
    queryKey: [...adminQueryKeys.documents(id), "generated"] as const,
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
    queryKey: [...adminQueryKeys.messages(id), currentUserId ?? "_"] as const,
    queryFn: () => loadMessagesThreadList(instituteId!, currentUserId),
    enabled: instituteEnabled(instituteId, enabled),
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
    queryKey: adminQueryKeys.admissions(id),
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
    queryKey: [...adminQueryKeys.admissions(id), "programs"] as const,
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
    queryKey: [...adminQueryKeys.admissions(id), "openings"] as const,
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
    queryKey: adminQueryKeys.careers(id),
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
    queryKey: [...adminQueryKeys.careers(id), "jobs"] as const,
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
  });
}

export function useAcademicYearsListQuery(
  instituteId: string | null | undefined,
  enabled = true,
) {
  const id = instituteId ?? "_";
  return useQuery({
    queryKey: [...adminQueryKeys.catalogYears(id), "list-state"] as const,
    queryFn: () => loadAcademicYearsList(instituteId!),
    enabled: instituteEnabled(instituteId, enabled),
  });
}
