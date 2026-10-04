import type { QueryClient } from "@tanstack/react-query";
import { activityRepository } from "@/lib/activity/repositories";
import { warmActivityApiSession } from "@/hooks/use-activity-api-session";
import { connectQueryKeys } from "./keys";

/**
 * Warm Activity Workspace dashboard + hierarchy/session caches when activity
 * mode becomes active so Sports/ECA open without a cold skeleton.
 */
export function prefetchActivityModuleQueries(
  queryClient: QueryClient,
  instituteId: string,
): void {
  void queryClient.prefetchQuery({
    queryKey: connectQueryKeys.activityWorkspace(instituteId),
    queryFn: () => activityRepository.getDashboard(),
  });

  void warmActivityApiSession(instituteId);
}
