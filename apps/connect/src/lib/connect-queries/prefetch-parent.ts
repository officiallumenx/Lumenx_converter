import type { QueryClient } from "@tanstack/react-query";
import { loadLearnerTeachers } from "@/lib/teachers";
import { loadConnectEvents } from "@/lib/events";
import { loadLearnerTransport } from "@/lib/transport";
import { connectQueryKeys } from "./keys";
import { scopedConnectKey } from "./scope";
import { runPrefetchTiers, type IdleCancel } from "./schedule-idle";

/**
 * Warm module caches not already embedded in the parent portal snapshot.
 * Transport is critical; teachers/events defer to idle.
 */
export function prefetchParentModuleQueries(
  queryClient: QueryClient,
  userId: string,
  instituteId: string,
  childId: string,
): IdleCancel {
  return runPrefetchTiers({
    critical: [
      () => {
        void queryClient.prefetchQuery({
          queryKey: scopedConnectKey(
            userId,
            connectQueryKeys.transportLearner(instituteId, childId),
          ),
          queryFn: () => loadLearnerTransport({ instituteId, studentId: childId }),
        });
      },
    ],
    deferred: [
      () => {
        void queryClient.prefetchQuery({
          queryKey: scopedConnectKey(
            userId,
            connectQueryKeys.teachersLearner(instituteId, childId),
          ),
          queryFn: () => loadLearnerTeachers({ instituteId, studentId: childId }),
        });
      },
      () => {
        void queryClient.prefetchQuery({
          queryKey: scopedConnectKey(userId, connectQueryKeys.events(instituteId)),
          queryFn: () => loadConnectEvents({ instituteId }),
        });
      },
    ],
  });
}
