import type { QueryClient } from "@tanstack/react-query";
import { loadLearnerTeachers } from "@/lib/teachers";
import { loadLearnerTransport } from "@/lib/transport";
import { loadStudentHomeworkItems } from "@/lib/homework";
import { listDiaryDays } from "@/lib/diary/api";
import { loadLearnerActivities } from "@/lib/activity/learner-load";
import { loadStudentFeePortal } from "@/lib/fees";
import { connectQueryKeys } from "./keys";
import { scopedConnectKey } from "./scope";
import { runPrefetchTiers, type IdleCancel } from "./schedule-idle";

/**
 * Warm student module caches after the portal profile shell is ready.
 *
 * Home enrich already loads timetable / marks / events / attendance / inbox.
 * Do not prefetch those — they duplicated cold Home GETs.
 * Alerts are owned by ConnectSchoolAlertsSync (shared React Query source).
 */
export function prefetchStudentModuleQueries(
  queryClient: QueryClient,
  userId: string,
  instituteId: string,
  studentId: string,
): IdleCancel {
  // Do not prefetch events/marks — Home enrich already loads them (dupes on cold).
  const deferred = [
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
          connectQueryKeys.transportLearner(instituteId, studentId),
        ),
        queryFn: () => loadLearnerTransport({ instituteId, studentId }),
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

  return runPrefetchTiers({ critical: [], deferred });
}
