import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardHeader, EmptyState, PageToolbar, Pill } from "@lumenx/ui-admin";
import { Navigation } from "lucide-react";
import { subscribeTransportRealtime } from "@lumenx/utils";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { listTransportTrips } from "@/lib/transport/ops-api";
import type { TransportTripDto } from "@/lib/transport/types";

type Props = {
  instituteId: string;
};

const PHASE_TONE: Record<string, "success" | "warning" | "neutral" | "danger"> = {
  ready: "neutral",
  starting: "warning",
  running: "warning",
  boarding: "warning",
  dropping: "warning",
  completed: "success",
};

function formatWhen(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

export function TransportTripsApiPanel({ instituteId }: Props) {
  const [trips, setTrips] = useState<TransportTripDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listTransportTrips({ instituteId, tripDate: today });
      setTrips(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load trips");
    } finally {
      setLoading(false);
    }
  }, [instituteId, today]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    try {
      const supabase = getSupabaseBrowserClient();
      return subscribeTransportRealtime(supabase, {
        instituteId,
        onChange: () => {
          void reload();
        },
      });
    } catch {
      return undefined;
    }
  }, [instituteId, reload]);

  const active = trips.filter((t) => !t.finalized && t.phase !== "completed");
  const completed = trips.filter((t) => t.finalized || t.phase === "completed");

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading trips…</p>;
  }

  if (error) {
    return <p className="text-sm text-destructive">{error}</p>;
  }

  return (
    <div className="space-y-4">
      <PageToolbar>
        <p className="text-sm text-muted-foreground">
          Live and completed trips for {today} from the transport API.
        </p>
        <Pill tone={active.length ? "warning" : "neutral"}>
          {active.length ? `${active.length} active` : `${trips.length} total`}
        </Pill>
      </PageToolbar>

      {trips.length === 0 ? (
        <EmptyState
          icon={Navigation}
          title="No trips yet"
          description="Trips appear here when drivers start runs in the Transport app."
        />
      ) : (
        <>
          {active.length > 0 ? (
            <div className="space-y-3">
              <h3 className="text-sm font-medium">Active</h3>
              {active.map((trip) => (
                <Card key={trip.id}>
                  <CardHeader
                    title={`${trip.routeName ?? "Route"} · ${trip.vehicleNumber ?? "Bus"}`}
                    subtitle={`Driver: ${trip.driverName ?? "—"} · Started ${formatWhen(trip.startedAt)}`}
                    action={
                      <Pill tone={PHASE_TONE[trip.phase] ?? "neutral"}>
                        {trip.phase.replace("_", " ")}
                      </Pill>
                    }
                  />
                </Card>
              ))}
            </div>
          ) : null}

          {completed.length > 0 ? (
            <div className="space-y-3">
              <h3 className="text-sm font-medium">Completed today</h3>
              {completed.map((trip) => (
                <Card key={trip.id}>
                  <CardHeader
                    title={`${trip.routeName ?? "Route"} · ${trip.vehicleNumber ?? "Bus"}`}
                    subtitle={`Ended ${formatWhen(trip.completedAt)}`}
                    action={<Pill tone="success">completed</Pill>}
                  />
                </Card>
              ))}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
