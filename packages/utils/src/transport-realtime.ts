import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";

export type TransportRealtimeTable =
  | "route"
  | "stop"
  | "transport_enrollment"
  | "transport_trip"
  | "transport_boarding_event"
  | "transport_emergency"
  | "vehicle_location"
  | "transport_daily_exception";

export type TransportRealtimeEvent = {
  table: TransportRealtimeTable;
  eventType: "INSERT" | "UPDATE" | "DELETE";
};

export type SubscribeTransportRealtimeOptions = {
  instituteId: string;
  onChange: (event: TransportRealtimeEvent) => void;
  /** Optional: only listen to a subset of tables (reduces fan-in). */
  tables?: TransportRealtimeTable[];
};

/**
 * Subscribe to Supabase Realtime changes on transport tables.
 * Filters server-side by institute_id when the Realtime filter is supported;
 * still guards client-side as defense-in-depth.
 */
export function subscribeTransportRealtime(
  supabase: SupabaseClient,
  options: SubscribeTransportRealtimeOptions,
): () => void {
  const instituteId = options.instituteId.trim();
  const tables: TransportRealtimeTable[] = options.tables ?? [
    "route",
    "stop",
    "transport_enrollment",
    "transport_trip",
    "transport_boarding_event",
    "transport_emergency",
    "vehicle_location",
    "transport_daily_exception",
  ];

  const channels: RealtimeChannel[] = [];

  for (const table of tables) {
    const channel = supabase
      .channel(`transport-${table}-${instituteId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table,
          filter: `institute_id=eq.${instituteId}`,
        },
        (payload) => {
          const row =
            (payload.new as Record<string, unknown> | null) ??
            (payload.old as Record<string, unknown> | null);
          if (row && row.institute_id !== instituteId) return;
          options.onChange({
            table,
            eventType: payload.eventType as TransportRealtimeEvent["eventType"],
          });
        },
      )
      .subscribe();
    channels.push(channel);
  }

  return () => {
    for (const channel of channels) {
      void supabase.removeChannel(channel);
    }
  };
}
