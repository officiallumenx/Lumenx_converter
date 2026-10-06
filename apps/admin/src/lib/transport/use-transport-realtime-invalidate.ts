import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { subscribeTransportRealtime } from "@lumenx/utils";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import {
  ADMIN_QUERY_SCOPE,
  adminQueryRoots,
  adminQueryKeys,
} from "@/lib/admin-queries/keys";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Soft-invalidate transport ops caches when realtime events arrive.
 * GPS pings only refresh trip live state — never analytics / boarding dumps.
 * Debounced so multiple buses do not stampede the API.
 */
export function useTransportRealtimeInvalidate(instituteId: string) {
  const queryClient = useQueryClient();
  const pending = useRef<Set<string>>(new Set());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!instituteId) return;

    const flush = () => {
      timer.current = null;
      const keys = [...pending.current];
      pending.current.clear();
      const day = todayIso();
      for (const key of keys) {
        if (key === "trips") {
          void queryClient.invalidateQueries({
            queryKey: adminQueryKeys.transport(instituteId, `trips:${day}`),
          });
        } else if (key === "boarding") {
          void queryClient.invalidateQueries({
            queryKey: adminQueryKeys.transport(instituteId, `boarding:${day}`),
          });
        } else if (key === "analytics") {
          void queryClient.invalidateQueries({
            queryKey: adminQueryKeys.transport(instituteId, `analytics:${day}`),
          });
        } else if (key === "emergencies") {
          void queryClient.invalidateQueries({
            queryKey: adminQueryKeys.transport(instituteId, "emergencies"),
          });
        } else if (key === "daily") {
          void queryClient.invalidateQueries({
            queryKey: adminQueryKeys.transport(
              instituteId,
              `daily-exceptions:${day}`,
            ),
          });
        } else if (key === "fleet") {
          void queryClient.invalidateQueries({
            queryKey: [
              ADMIN_QUERY_SCOPE,
              instituteId,
              adminQueryRoots.transport,
            ],
          });
        }
      }
    };

    const schedule = (key: string, delayMs = 400) => {
      pending.current.add(key);
      if (timer.current) {
        if (delayMs === 0) {
          clearTimeout(timer.current);
          timer.current = setTimeout(flush, 0);
        }
        return;
      }
      timer.current = setTimeout(flush, delayMs);
    };

    let unsubscribe: (() => void) | undefined;
    try {
      const supabase = getSupabaseBrowserClient();
      unsubscribe = subscribeTransportRealtime(supabase, {
        instituteId,
        onChange: (event) => {
          const table = event.table;
          if (table === "vehicle_location") {
            // Live map / trip cards only — do not reload analytics or boarding.
            schedule("trips");
            return;
          }
          if (table === "transport_trip") {
            schedule("trips", 0);
            schedule("analytics", 0);
            return;
          }
          if (table === "transport_boarding_event") {
            schedule("boarding", 0);
            schedule("trips", 0);
            return;
          }
          if (table === "transport_emergency") {
            schedule("emergencies", 0);
            schedule("analytics", 0);
            return;
          }
          if (table === "transport_daily_exception") {
            schedule("daily");
            schedule("trips");
            return;
          }
          schedule("fleet");
        },
      });
    } catch {
      unsubscribe = undefined;
    }

    return () => {
      if (timer.current) {
        clearTimeout(timer.current);
        timer.current = null;
      }
      pending.current.clear();
      unsubscribe?.();
    };
  }, [instituteId, queryClient]);
}
