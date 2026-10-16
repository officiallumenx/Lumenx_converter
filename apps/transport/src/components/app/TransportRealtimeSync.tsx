import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { useTransportRealtimeRefresh } from "@/hooks/use-transport-realtime";
import { useTransportAuth } from "@/lib/auth/transport-auth";
import { isApiAuthMode } from "@/lib/auth/auth-mode";
import { transportQueryKeys } from "@/lib/transport-queries/keys";
import { tripRepository } from "@/lib/transport/trip/repository";
import { attendanceRepository } from "@/lib/transport/attendance/repository";

/**
 * App-wide Supabase realtime → live API refresh (assignment, roster, trip, attendance).
 * Keeps driver UI aligned with Admin changes without cold-open local paint.
 */
export function TransportRealtimeSync(): null {
  const { user } = useTransportAuth();
  const queryClient = useQueryClient();
  const instituteId = isApiAuthMode() ? (user?.instituteId ?? null) : null;
  const driverId = user?.driverId ?? null;

  const onRefresh = useCallback(() => {
    if (!instituteId) return;
    void queryClient.invalidateQueries({
      queryKey: transportQueryKeys.roster(instituteId),
    });
    if (driverId) {
      void queryClient.invalidateQueries({
        queryKey: transportQueryKeys.assignment(instituteId, driverId),
      });
    }
    // Trip day flags + attendance are API-hydrated outside RQ — refresh live.
    void tripRepository
      .hydrateFromApi()
      .then(() => attendanceRepository.hydrateFromApi())
      .catch(() => undefined);
  }, [instituteId, driverId, queryClient]);

  useTransportRealtimeRefresh(instituteId ?? undefined, onRefresh);
  return null;
}
