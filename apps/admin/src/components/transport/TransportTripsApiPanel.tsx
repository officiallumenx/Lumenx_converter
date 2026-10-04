import { useMemo } from "react";
import { Card, CardHeader, EmptyState, PageToolbar, Pill } from "@lumenx/ui-admin";
import { Navigation } from "lucide-react";
import { useTransportTripsQuery } from "@/lib/admin-queries";
import { useTransportRealtimeInvalidate } from "@/lib/transport/use-transport-realtime-invalidate";

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
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const tripsQuery = useTransportTripsQuery(instituteId, today);
  useTransportRealtimeInvalidate(instituteId);

  const trips = tripsQuery.data ?? [];
  const active = trips.filter((t) => !t.finalized && t.phase !== "completed");
  const completed = trips.filter((t) => t.finalized || t.phase === "completed");

  if (tripsQuery.isLoading && trips.length === 0) {
    return <p className="text-sm text-muted-foreground">Loading trips…</p>;
  }

  if (tripsQuery.isError && trips.length === 0) {
    return (
      <p className="text-sm text-destructive">
        {tripsQuery.error instanceof Error
          ? tripsQuery.error.message
          : "Failed to load trips"}
      </p>
    );
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
          icon={<Navigation className="size-5" />}
          title="No trips yet"
          hint="Trips appear here when drivers start runs in the Transport app."
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
                    hint={`Driver: ${trip.driverName ?? "—"} · Started ${formatWhen(trip.startedAt)}`}
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
                    hint={`Ended ${formatWhen(trip.completedAt)}`}
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
