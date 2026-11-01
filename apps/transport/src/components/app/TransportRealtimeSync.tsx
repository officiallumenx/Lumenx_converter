import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { TransportRealtimeEvent } from "@lumenx/utils";

import { useTransportRealtimeRefresh } from "@/hooks/use-transport-realtime";
import { useTransportAuth } from "@/lib/auth/transport-auth";
import { isApiAuthMode } from "@/lib/auth/auth-mode";
import { transportQueryKeys } from "@/lib/transport-queries/keys";
import { tripRepository } from "@/lib/transport/trip/repository";
import { attendanceRepository } from "@/lib/transport/attendance/repository";

/** Tables that change assignment / route-setup shape — full roster reload. */
const STRUCTURAL_TABLES = new Set([
  "route",
  "stop",
  "transport_enrollment",
  "transport_daily_exception",
]);

/** Ops tables — trip + attendance hydrate only (no assignment GET). */
const TRIP_MARK_TABLES = new Set(["transport_trip", "transport_boarding_event"]);

/**
 * App-wide Supabase realtime → selective live refresh.
 * Boarding confirms hydrate attendance only; route/stop/enrollment changes
 * reload roster + assignment.
 */
export function TransportRealtimeSync(): null {
  const { user } = useTransportAuth();
  const queryClient = useQueryClient();
  const instituteId = isApiAuthMode() ? (user?.instituteId ?? null) : null;
  const driverId = user?.driverId ?? null;

  const onRefresh = useCallback(
    (event?: TransportRealtimeEvent) => {
      if (!instituteId) return;
      const table = event?.table;

      // GPS pings are high-frequency — never reload assignment from them.
      if (table === "vehicle_location") return;

      if (!table || STRUCTURAL_TABLES.has(table)) {
        void queryClient.invalidateQueries({
          queryKey: transportQueryKeys.roster(instituteId),
        });
        if (driverId) {
          void queryClient.invalidateQueries({
            queryKey: transportQueryKeys.assignment(instituteId, driverId),
          });
        }
      }

      if (!table || TRIP_MARK_TABLES.has(table) || STRUCTURAL_TABLES.has(table)) {
        void tripRepository
          .hydrateFromApi()
          .then(() => attendanceRepository.hydrateFromApi())
          .catch(() => undefined);
      } else if (table === "transport_emergency") {
        // Emergencies are polled separately; trip hydrate keeps phase flags fresh.
        void tripRepository.hydrateFromApi().catch(() => undefined);
      }
    },
    [instituteId, driverId, queryClient],
  );

  useTransportRealtimeRefresh(instituteId ?? undefined, onRefresh);
  return null;
}
