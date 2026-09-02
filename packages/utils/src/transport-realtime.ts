import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";

export type TransportRealtimeTable =
  | "route"
  | "stop"
  | "transport_enrollment"
  | "transport_trip"
  | "transport_boarding_event"
  | "transport_emergency"
  | "vehicle_location";

export type TransportRealtimeEvent = {
  table: TransportRealtimeTable;
  eventType: "INSERT" | "UPDATE" | "DELETE";
};

export type SubscribeTransportRealtimeOptions = {
  instituteId: string;
  onChange: (event: TransportRealtimeEvent) => void;
};

/**
 * Subscribe to Supabase Realtime changes on transport approval tables.
 * Filters server-side by institute_id when present on the row payload.
 */
export function subscribeTransportRealtime(
  supabase: SupabaseClient,
  options: SubscribeTransportRealtimeOptions,
): () => void {
  const instituteId = options.instituteId.trim();
  const tables: TransportRealtimeTable[] = [
    "route",
    "stop",
    "transport_enrollment",
    "transport_trip",
    "transport_boarding_event",
    "transport_emergency",
    "vehicle_location",
  ];

  const channels: RealtimeChannel[] = [];

  for (const table of tables) {
    const channel = supabase
      .channel(`transport-${table}-${instituteId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table },
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
