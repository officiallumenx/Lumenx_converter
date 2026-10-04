import type { QueryClient } from "@tanstack/react-query";
import { loadLearnerTeachers } from "@/lib/teachers";
import { loadLearnerTimetable } from "@/lib/timetable";
import { loadConnectEvents } from "@/lib/events";
import { loadPortalSchoolAlerts } from "@/lib/school-alerts";
import { loadLearnerTransport } from "@/lib/transport";
import { connectQueryKeys } from "./keys";

/**
 * Warm common parent/learner module caches after the active child snapshot is ready.
 */
export function prefetchParentModuleQueries(
  queryClient: QueryClient,
  instituteId: string,
  childId: string,
): void {
  void queryClient.prefetchQuery({
    queryKey: connectQueryKeys.teachersLearner(instituteId, childId),
    queryFn: () => loadLearnerTeachers({ instituteId, studentId: childId }),
  });

  void queryClient.prefetchQuery({
    queryKey: connectQueryKeys.timetableLearner(instituteId, childId),
    queryFn: () => loadLearnerTimetable({ instituteId, studentId: childId }),
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
    queryKey: connectQueryKeys.transportLearner(instituteId, childId),
    queryFn: () => loadLearnerTransport({ instituteId, studentId: childId }),
  });
}
