import { useQuery, useQueryClient } from "@tanstack/react-query";
import { isInstituteUuid } from "@/lib/institute-id";
import { connectQueryKeys } from "./keys";
import { loadTeacherFeeRoster } from "@/lib/fees";
import { loadLearnerTeachers } from "@/lib/teachers";
import { loadTeacherTimetable } from "@/lib/timetable";
import { loadTeacherLeavePortal } from "@/lib/leave";
import { loadMessagesThreadList } from "@/lib/messages/load";
import { loadTeacherAttendancePortal } from "@/lib/attendance/load";
import { loadLearnerAttendancePortal } from "@/lib/attendance/load";
import { loadTeacherSelfAttendance } from "@/lib/staff-attendance";
import { loadInstituteHolidays, loadConnectEvents } from "@/lib/events";
import { loadTeacherHomeworkList } from "@/lib/homework";
import { listSubjects, listTeacherAssignments } from "@/lib/teacher-classes/api";
import { listExams, loadTeacherExamPapers } from "@/lib/exams";
import { loadTeacherMarkSheet } from "@/lib/marks";
import { isApiAuthMode } from "@/auth/auth-mode";
import { getAnnouncement, listAnnouncements } from "@/lib/announcements/api";
import { loadLearnerComplaints, loadTeacherComplaints } from "@/lib/complaints";
import { loadLearnerTransport, loadTeacherClassTransport } from "@/lib/transport";
import { loadTeacherStudentDetail } from "@/lib/students";
import { loadPortalSchoolAlerts } from "@/lib/school-alerts";
import { loadStudentEnrollmentHistory } from "@/lib/academic-history/load-enrollments";
import { loadLearnerActivities } from "@/lib/activity/learner-load";
import { loadConnectPortalInbox } from "@/lib/connect-inbox/load";
import { listIssuedCertificates } from "@/lib/certificates/api";
import { issuedCertificateDtosToLearnerRecords } from "@/lib/certificates/map";
import { getConnectApiClient } from "@/lib/connect-api";
import type { MeResponse } from "@/lib/api/me-types";
import { teacherRepository } from "@/lib/teacher/repositories";

export function useTeacherFeesRosterQuery(
  instituteId: string | null | undefined,
  sectionIds: string[],
  enabled: boolean,
) {
  const ids = sectionIds.slice().sort().join(",");
  return useQuery({
    queryKey: [...connectQueryKeys.feesTeacher(instituteId ?? "_"), ids],
    queryFn: () =>
      loadTeacherFeeRoster({
        instituteId: instituteId!,
        sectionIds,
      }),
    enabled:
      enabled &&
      Boolean(instituteId) &&
      isInstituteUuid(instituteId ?? "") &&
      sectionIds.length > 0,
  });
}

export function useLearnerTeachersQuery(
  instituteId: string | null | undefined,
  studentId: string | null | undefined,
) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: connectQueryKeys.teachersLearner(instituteId ?? "_", studentId ?? "_"),
    queryFn: () =>
      loadLearnerTeachers({ instituteId: instituteId ?? null, studentId: studentId ?? null }),
    enabled:
      Boolean(instituteId) &&
      Boolean(studentId) &&
      isInstituteUuid(instituteId ?? "") &&
      isInstituteUuid(studentId ?? ""),
  });
  const refresh = () => {
    if (!instituteId || !studentId) return;
    void qc.invalidateQueries({
      queryKey: connectQueryKeys.teachersLearner(instituteId, studentId),
    });
  };
  return { ...query, refresh };
}

export function useTeacherTimetableQuery(
  instituteId: string | null | undefined,
  scope: string,
  enabled: boolean,
) {
  return useQuery({
    queryKey: connectQueryKeys.timetableTeacher(instituteId ?? "_", scope),
    queryFn: () =>
      loadTeacherTimetable({
        instituteId: instituteId!,
        ...(scope !== "mine" ? { sectionId: scope } : {}),
      }),
    enabled: enabled && Boolean(instituteId) && isInstituteUuid(instituteId ?? ""),
  });
}

export function useTeacherLeaveQuery(
  instituteId: string | null | undefined,
  teacherId: string | null | undefined,
  enabled: boolean,
) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: connectQueryKeys.leaveTeacher(instituteId ?? "_", teacherId ?? "_"),
    queryFn: () =>
      loadTeacherLeavePortal({
        instituteId: instituteId!,
        teacherId: teacherId ?? null,
      }),
    enabled:
      enabled &&
      Boolean(instituteId) &&
      isInstituteUuid(instituteId ?? ""),
  });
  const refresh = () => {
    if (!instituteId) return;
    void qc.invalidateQueries({
      queryKey: connectQueryKeys.leaveTeacher(instituteId, teacherId ?? "_"),
    });
  };
  return { ...query, refresh };
}

export function useMessagesThreadsQuery(
  instituteId: string | null | undefined,
  currentUserId: string | null | undefined,
  enabled: boolean,
  studentId?: string | null,
) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: [
      ...connectQueryKeys.messagesThreads(instituteId ?? "_"),
      currentUserId ?? "_",
      studentId ?? "_",
    ],
    queryFn: () =>
      loadMessagesThreadList({
        instituteId: instituteId ?? null,
        currentUserId: currentUserId ?? null,
        studentId,
      }),
    enabled:
      enabled &&
      Boolean(instituteId) &&
      Boolean(currentUserId) &&
      isInstituteUuid(instituteId ?? ""),
  });
  const refresh = () => {
    if (!instituteId) return;
    void qc.invalidateQueries({
      queryKey: connectQueryKeys.messagesThreads(instituteId),
    });
  };
  return { ...query, refresh };
}

export function useTeacherAttendancePortalQuery(
  instituteId: string | null | undefined,
  sectionId: string,
  date: string,
  enabled: boolean,
) {
  return useQuery({
    queryKey: connectQueryKeys.attendanceTeacher(instituteId ?? "_", sectionId, date),
    queryFn: () =>
      loadTeacherAttendancePortal({
        instituteId: instituteId!,
        sectionId,
        attendanceDate: date,
      }),
    enabled:
      enabled &&
      Boolean(instituteId) &&
      Boolean(sectionId) &&
      Boolean(date) &&
      isInstituteUuid(instituteId ?? ""),
  });
}

export function useLearnerAttendanceQuery(
  instituteId: string | null | undefined,
  studentId: string | null | undefined,
  from: string,
  to: string,
  enabled: boolean,
) {
  return useQuery({
    queryKey: connectQueryKeys.attendanceLearner(
      instituteId ?? "_",
      studentId ?? "_",
      from,
      to,
    ),
    queryFn: () =>
      loadLearnerAttendancePortal({
        instituteId: instituteId!,
        studentId: studentId!,
        fromDate: from,
        toDate: to,
      }),
    enabled:
      enabled &&
      Boolean(instituteId) &&
      Boolean(studentId) &&
      isInstituteUuid(instituteId ?? "") &&
      isInstituteUuid(studentId ?? ""),
  });
}

export function useTeacherSelfAttendanceQuery(
  instituteId: string | null | undefined,
  teacherId: string | null | undefined,
  enabled: boolean,
) {
  return useQuery({
    queryKey: connectQueryKeys.attendanceTeacherSelf(
      instituteId ?? "_",
      teacherId ?? "_",
    ),
    queryFn: () =>
      loadTeacherSelfAttendance({
        instituteId: instituteId!,
        teacherId: teacherId ?? null,
      }),
    enabled:
      enabled &&
      Boolean(instituteId) &&
      isInstituteUuid(instituteId ?? ""),
  });
}

export function useHolidaysQuery(instituteId: string | null | undefined, enabled: boolean) {
  return useQuery({
    queryKey: connectQueryKeys.holidays(instituteId ?? "_"),
    queryFn: () => loadInstituteHolidays({ instituteId: instituteId ?? null }),
    enabled: enabled && Boolean(instituteId) && isInstituteUuid(instituteId ?? ""),
  });
}

export function useTeacherHomeworkListQuery(
  instituteId: string | null | undefined,
  teacherId: string | null | undefined,
  enabled: boolean,
) {
  return useQuery({
    queryKey: connectQueryKeys.homeworkTeacher(instituteId ?? "_", teacherId ?? "_"),
    queryFn: async () => {
      const [subjects, assignments, list] = await Promise.all([
        listSubjects(instituteId!),
        teacherId
          ? listTeacherAssignments({ instituteId: instituteId!, teacherId })
          : Promise.resolve([]),
        teacherId
          ? loadTeacherHomeworkList({ instituteId: instituteId!, teacherId })
          : Promise.resolve({ status: "empty" as const, items: [], errorMessage: null }),
      ]);
      return { subjects, assignments, list };
    },
    enabled:
      enabled &&
      Boolean(instituteId) &&
      Boolean(teacherId) &&
      isInstituteUuid(instituteId ?? ""),
  });
}

export function useTeacherMarksCatalogQuery(
  instituteId: string | null | undefined,
  teacherId: string | null | undefined,
  enabled: boolean,
) {
  return useQuery({
    queryKey: [connectQueryKeys.marksParent(instituteId ?? "_")[0], "catalog", instituteId, teacherId],
    queryFn: async () => {
      const [examRows, subjectRows, assignments] = await Promise.all([
        listExams({ instituteId: instituteId!, scheduleStatus: "published" }),
        listSubjects(instituteId!),
        teacherId
          ? listTeacherAssignments({ instituteId: instituteId!, teacherId })
          : Promise.resolve([]),
      ]);
      return { examRows, subjectRows, assignments };
    },
    enabled:
      enabled &&
      Boolean(instituteId) &&
      isInstituteUuid(instituteId ?? ""),
  });
}

export function useTeacherMarkSheetQuery(
  instituteId: string | null | undefined,
  sectionId: string,
  examId: string,
  subjectId: string,
  enabled: boolean,
) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: connectQueryKeys.marksSheet(
      instituteId ?? "_",
      sectionId,
      examId,
      subjectId,
    ),
    queryFn: () =>
      loadTeacherMarkSheet({
        instituteId: instituteId!,
        sectionId,
        examId,
        subjectId,
      }),
    enabled:
      enabled &&
      Boolean(instituteId) &&
      Boolean(sectionId) &&
      Boolean(examId) &&
      Boolean(subjectId) &&
      isInstituteUuid(instituteId ?? ""),
  });
  const refresh = () => {
    if (!instituteId || !sectionId || !examId || !subjectId) return;
    void qc.invalidateQueries({
      queryKey: connectQueryKeys.marksSheet(instituteId, sectionId, examId, subjectId),
    });
  };
  return { ...query, refresh };
}

export function useConnectEventsQuery(
  instituteId: string | null | undefined,
  enabled: boolean,
) {
  return useQuery({
    queryKey: connectQueryKeys.events(instituteId ?? "_"),
    queryFn: () => loadConnectEvents({ instituteId: instituteId! }),
    enabled:
      enabled && isApiAuthMode() && Boolean(instituteId) && isInstituteUuid(instituteId ?? ""),
  });
}

export function useTeacherExamsQuery(
  instituteId: string | null | undefined,
  enabled: boolean,
) {
  return useQuery({
    queryKey: connectQueryKeys.examsTeacher(instituteId ?? "_"),
    queryFn: () => loadTeacherExamPapers({ instituteId: instituteId! }),
    enabled: enabled && Boolean(instituteId) && isInstituteUuid(instituteId ?? ""),
  });
}

export function useAnnouncementsListQuery(
  instituteId: string | null | undefined,
  enabled: boolean,
) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: connectQueryKeys.announcements(instituteId ?? "_"),
    queryFn: async () => {
      const rows = await listAnnouncements({ instituteId: instituteId! });
      return rows.filter((row) => row.status === "published");
    },
    enabled:
      enabled &&
      isApiAuthMode() &&
      Boolean(instituteId) &&
      isInstituteUuid(instituteId ?? ""),
  });
  const refresh = () => {
    if (!instituteId) return;
    void qc.invalidateQueries({ queryKey: connectQueryKeys.announcements(instituteId) });
  };
  return { ...query, refresh };
}

export function useAnnouncementDetailQuery(
  instituteId: string | null | undefined,
  id: string,
  enabled: boolean,
) {
  return useQuery({
    queryKey: connectQueryKeys.announcement(instituteId ?? "_", id || "_"),
    queryFn: () => getAnnouncement(id),
    enabled: enabled && isApiAuthMode() && Boolean(id),
  });
}

export function useTeacherComplaintsQuery(
  instituteId: string | null | undefined,
  enabled: boolean,
) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: connectQueryKeys.complaintsTeacher(instituteId ?? "_"),
    queryFn: () => loadTeacherComplaints({ instituteId: instituteId! }),
    enabled:
      enabled &&
      isApiAuthMode() &&
      Boolean(instituteId) &&
      isInstituteUuid(instituteId ?? ""),
  });
  const refresh = () => {
    if (!instituteId) return;
    void qc.invalidateQueries({
      queryKey: connectQueryKeys.complaintsTeacher(instituteId),
    });
  };
  return { ...query, refresh };
}

export function useLearnerComplaintsQuery(
  instituteId: string | null | undefined,
  studentId: string | null | undefined,
  enabled: boolean,
) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: [
      ...connectQueryKeys.complaintsLearner(instituteId ?? "_"),
      studentId ?? "_",
    ],
    queryFn: () =>
      loadLearnerComplaints({
        instituteId: instituteId!,
        studentId: studentId ?? null,
      }),
    enabled:
      enabled &&
      isApiAuthMode() &&
      Boolean(instituteId) &&
      isInstituteUuid(instituteId ?? ""),
  });
  const refresh = () => {
    if (!instituteId) return;
    void qc.invalidateQueries({
      queryKey: connectQueryKeys.complaintsLearner(instituteId),
    });
  };
  return { ...query, refresh };
}

export function useTeacherTransportQuery(
  instituteId: string | null | undefined,
  enabled: boolean,
) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: connectQueryKeys.transportTeacher(instituteId ?? "_"),
    queryFn: () => loadTeacherClassTransport({ instituteId: instituteId! }),
    enabled:
      enabled &&
      isApiAuthMode() &&
      Boolean(instituteId) &&
      isInstituteUuid(instituteId ?? ""),
  });
  const refresh = () => {
    if (!instituteId) return;
    void qc.invalidateQueries({
      queryKey: connectQueryKeys.transportTeacher(instituteId),
    });
  };
  return { ...query, refresh };
}

export function useLearnerTransportQuery(
  instituteId: string | null | undefined,
  studentId: string | null | undefined,
  enabled: boolean,
) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: connectQueryKeys.transportLearner(
      instituteId ?? "_",
      studentId ?? "_",
    ),
    queryFn: () =>
      loadLearnerTransport({ instituteId: instituteId!, studentId: studentId! }),
    enabled:
      enabled &&
      isApiAuthMode() &&
      Boolean(instituteId) &&
      Boolean(studentId) &&
      isInstituteUuid(instituteId ?? "") &&
      isInstituteUuid(studentId ?? ""),
  });
  const refresh = () => {
    if (!instituteId || !studentId) return;
    void qc.invalidateQueries({
      queryKey: connectQueryKeys.transportLearner(instituteId, studentId),
    });
  };
  return { ...query, refresh };
}

export function useTeacherRemarksQuery(
  instituteId: string | null | undefined,
  enabled: boolean,
) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: connectQueryKeys.remarks(instituteId ?? "_"),
    queryFn: () => teacherRepository.getAllRemarks({ instituteId }),
    enabled:
      enabled &&
      Boolean(instituteId) &&
      isInstituteUuid(instituteId ?? ""),
  });
  const refresh = () => {
    if (!instituteId) return;
    void qc.invalidateQueries({ queryKey: connectQueryKeys.remarks(instituteId) });
  };
  return { ...query, refresh };
}

export function useTeacherStudentDetailQuery(
  instituteId: string | null | undefined,
  studentId: string | null | undefined,
  enabled: boolean,
) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: connectQueryKeys.studentDetail(
      instituteId ?? "_",
      studentId ?? "_",
    ),
    queryFn: () =>
      loadTeacherStudentDetail({
        instituteId: instituteId ?? null,
        studentId: studentId ?? null,
      }),
    enabled:
      enabled &&
      isApiAuthMode() &&
      Boolean(instituteId) &&
      Boolean(studentId) &&
      isInstituteUuid(instituteId ?? "") &&
      isInstituteUuid(studentId ?? ""),
  });
  const refresh = () => {
    if (!instituteId || !studentId) return;
    void qc.invalidateQueries({
      queryKey: connectQueryKeys.studentDetail(instituteId, studentId),
    });
  };
  return { ...query, refresh };
}

export function useSchoolAlertsQuery(
  instituteId: string | null | undefined,
  enabled: boolean,
) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: connectQueryKeys.schoolAlerts(instituteId ?? "_"),
    queryFn: () => loadPortalSchoolAlerts({ instituteId: instituteId ?? null }),
    enabled:
      enabled &&
      isApiAuthMode() &&
      Boolean(instituteId) &&
      isInstituteUuid(instituteId ?? ""),
  });
  const refresh = () => {
    if (!instituteId) return;
    void qc.invalidateQueries({
      queryKey: connectQueryKeys.schoolAlerts(instituteId),
    });
  };
  return { ...query, refresh };
}

export function useLearnerCertificatesQuery(
  instituteId: string | null | undefined,
  studentId: string | null | undefined,
  enabled: boolean,
) {
  return useQuery({
    queryKey: connectQueryKeys.certificates(
      instituteId ?? "_",
      studentId ?? "_",
    ),
    queryFn: async () => {
      let studentFilter = studentId ?? null;
      if (studentFilter && !isInstituteUuid(studentFilter)) {
        const me = await getConnectApiClient().get<MeResponse>("/api/v1/me");
        studentFilter =
          me.identities.students.find((s) => s.instituteId === instituteId)
            ?.studentId ?? null;
      }
      const rows = await listIssuedCertificates({
        instituteId: instituteId!,
        studentId:
          studentFilter && isInstituteUuid(studentFilter) ? studentFilter : undefined,
        status: "issued",
      });
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      return issuedCertificateDtosToLearnerRecords(rows, origin);
    },
    enabled:
      enabled &&
      isApiAuthMode() &&
      Boolean(instituteId) &&
      isInstituteUuid(instituteId ?? ""),
  });
}

export function useEnrollmentHistoryQuery(
  instituteId: string | null | undefined,
  studentId: string | null | undefined,
  enabled: boolean,
) {
  return useQuery({
    queryKey: connectQueryKeys.enrollmentHistory(
      instituteId ?? "_",
      studentId ?? "_",
    ),
    queryFn: () =>
      loadStudentEnrollmentHistory({
        instituteId: instituteId ?? null,
        studentId: studentId ?? null,
      }),
    enabled:
      enabled &&
      isApiAuthMode() &&
      Boolean(instituteId) &&
      Boolean(studentId) &&
      isInstituteUuid(instituteId ?? "") &&
      isInstituteUuid(studentId ?? ""),
  });
}

export function useLearnerActivitiesQuery(
  instituteId: string | null | undefined,
  studentId: string | null | undefined,
  enabled: boolean,
) {
  return useQuery({
    queryKey: connectQueryKeys.activitiesLearner(
      instituteId ?? "_",
      studentId ?? "_",
    ),
    queryFn: () =>
      loadLearnerActivities({
        instituteId: instituteId!,
        studentId: studentId!,
      }),
    enabled:
      enabled &&
      isApiAuthMode() &&
      Boolean(instituteId) &&
      Boolean(studentId) &&
      isInstituteUuid(instituteId ?? "") &&
      isInstituteUuid(studentId ?? ""),
  });
}

export function useConnectInboxQuery(
  instituteId: string | null | undefined,
  role: string,
  enabled: boolean,
) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: connectQueryKeys.inbox(instituteId ?? "_", role || "_"),
    queryFn: () => loadConnectPortalInbox(instituteId ?? null),
    enabled:
      enabled &&
      isApiAuthMode() &&
      Boolean(instituteId) &&
      isInstituteUuid(instituteId ?? ""),
  });
  const refresh = () => {
    if (!instituteId) return;
    void qc.invalidateQueries({
      queryKey: connectQueryKeys.inbox(instituteId, role || "_"),
    });
  };
  return { ...query, refresh };
}
