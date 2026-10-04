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

/**
 * Warm common student module caches after the portal snapshot is ready so
 * navigating between modules hits React Query instead of a cold skeleton.
 */
export function prefetchStudentModuleQueries(
  queryClient: QueryClient,
  instituteId: string,
  studentId: string,
): void {
  void queryClient.prefetchQuery({
    queryKey: connectQueryKeys.teachersLearner(instituteId, studentId),
    queryFn: () => loadLearnerTeachers({ instituteId, studentId }),
  });

  void queryClient.prefetchQuery({
    queryKey: connectQueryKeys.timetableLearner(instituteId, studentId),
    queryFn: () => loadLearnerTimetable({ instituteId, studentId }),
  });

  void queryClient.prefetchQuery({
    queryKey: connectQueryKeys.events(instituteId),
    queryFn: () => loadConnectEvents({ instituteId }),
  });

  void queryClient.prefetchQuery({
    queryKey: connectQueryKeys.schoolAlerts(instituteId),
    queryFn: () => loadPortalSchoolAlerts({ instituteId }),
  });

  void queryClient.prefetchQuery({
    queryKey: connectQueryKeys.transportLearner(instituteId, studentId),
    queryFn: () => loadLearnerTransport({ instituteId, studentId }),
  });

  void queryClient.prefetchQuery({
    queryKey: connectQueryKeys.marksStudent(instituteId, studentId),
    queryFn: () => loadStudentReportCards({ instituteId, studentId }),
  });

  void queryClient.prefetchQuery({
    queryKey: connectQueryKeys.homeworkStudent(instituteId, studentId),
    queryFn: () => loadStudentHomeworkItems({ instituteId, studentId }),
  });

  void queryClient.prefetchQuery({
    queryKey: connectQueryKeys.diaryLearner(instituteId),
    queryFn: async () => {
      const rows = await listDiaryDays({ instituteId, submitted: true });
      return rows.slice().sort((a, b) => b.diaryDate.localeCompare(a.diaryDate));
    },
  });

  void queryClient.prefetchQuery({
    queryKey: connectQueryKeys.activitiesLearner(instituteId, studentId),
    queryFn: () => loadLearnerActivities({ instituteId, studentId }),
  });

  void queryClient.prefetchQuery({
    queryKey: connectQueryKeys.feesStudent(instituteId, studentId),
    queryFn: () => loadStudentFeePortal({ instituteId, studentId }),
  });
}
