import type { QueryClient } from "@tanstack/react-query";
import { loadLearnerTeachers } from "@/lib/teachers";
import { loadLearnerTimetable } from "@/lib/timetable";
import { loadConnectEvents } from "@/lib/events";
import { loadPortalSchoolAlerts } from "@/lib/school-alerts";
import { loadLearnerTransport } from "@/lib/transport";
import { loadStudentReportCards } from "@/lib/marks";
import { loadStudentHomeworkItems } from "@/lib/homework";
import { listDiaryDays } from "@/lib/diary/api";
import { loadLearnerActivities } from "@/lib/activity/learner-load";
import { loadStudentFeePortal } from "@/lib/fees";
import { connectQueryKeys } from "./keys";
import { scopedConnectKey } from "./scope";
import { runPrefetchTiers, type IdleCancel } from "./schedule-idle";

/**
 * Warm common student module caches after the portal snapshot is ready.
 * Critical modules run immediately; lower-priority modules wait for idle.
 */
export function prefetchStudentModuleQueries(
  queryClient: QueryClient,
  userId: string,
  instituteId: string,
  studentId: string,
): IdleCancel {
  const critical = [
    () => {
      void queryClient.prefetchQuery({
        queryKey: scopedConnectKey(
          userId,
          connectQueryKeys.teachersLearner(instituteId, studentId),
        ),
        queryFn: () => loadLearnerTeachers({ instituteId, studentId }),
      });
    },
    () => {
      void queryClient.prefetchQuery({
        queryKey: scopedConnectKey(
          userId,
          connectQueryKeys.timetableLearner(instituteId, studentId),
        ),
        queryFn: () => loadLearnerTimetable({ instituteId, studentId }),
      });
    },
    () => {
      void queryClient.prefetchQuery({
        queryKey: scopedConnectKey(
          userId,
          connectQueryKeys.schoolAlerts(instituteId),
        ),
        queryFn: () => loadPortalSchoolAlerts({ instituteId }),
      });
    },
    () => {
      void queryClient.prefetchQuery({
        queryKey: scopedConnectKey(
          userId,
          connectQueryKeys.transportLearner(instituteId, studentId),
        ),
        queryFn: () => loadLearnerTransport({ instituteId, studentId }),
      });
    },
  ];

  const deferred = [
    () => {
      void queryClient.prefetchQuery({
        queryKey: scopedConnectKey(userId, connectQueryKeys.events(instituteId)),
        queryFn: () => loadConnectEvents({ instituteId }),
      });
    },
    () => {
      void queryClient.prefetchQuery({
        queryKey: scopedConnectKey(
          userId,
          connectQueryKeys.marksStudent(instituteId, studentId),
        ),
        queryFn: () => loadStudentReportCards({ instituteId, studentId }),
      });
    },
    () => {
      void queryClient.prefetchQuery({
        queryKey: scopedConnectKey(
          userId,
          connectQueryKeys.homeworkStudent(instituteId, studentId),
        ),
        queryFn: () => loadStudentHomeworkItems({ instituteId, studentId }),
      });
    },
    () => {
      void queryClient.prefetchQuery({
        queryKey: scopedConnectKey(
          userId,
          connectQueryKeys.diaryLearner(instituteId),
        ),
        queryFn: async () => {
          const rows = await listDiaryDays({ instituteId, submitted: true });
          return rows.slice().sort((a, b) => b.diaryDate.localeCompare(a.diaryDate));
        },
      });
    },
    () => {
      void queryClient.prefetchQuery({
        queryKey: scopedConnectKey(
          userId,
          connectQueryKeys.activitiesLearner(instituteId, studentId),
        ),
        queryFn: () => loadLearnerActivities({ instituteId, studentId }),
      });
    },
    () => {
      void queryClient.prefetchQuery({
        queryKey: scopedConnectKey(
          userId,
          connectQueryKeys.feesStudent(instituteId, studentId),
        ),
        queryFn: () => loadStudentFeePortal({ instituteId, studentId }),
      });
    },
  ];

  return runPrefetchTiers({ critical, deferred });
}
