import type { QueryClient } from "@tanstack/react-query";
import { loadLearnerTeachers } from "@/lib/teachers";
import { loadConnectEvents } from "@/lib/events";
import { loadLearnerTransport } from "@/lib/transport";
import { connectQueryKeys } from "./keys";

/**
 * Warm module caches not already embedded in the parent portal snapshot.
 * Timetable / alerts are owned by the snapshot + ConnectSchoolAlertsSync.
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
    queryKey: connectQueryKeys.events(instituteId),
    queryFn: () => loadConnectEvents({ instituteId }),
  });

  void queryClient.prefetchQuery({
    queryKey: connectQueryKeys.transportLearner(instituteId, childId),
    queryFn: () => loadLearnerTransport({ instituteId, studentId: childId }),
  });
}
