import { useMemo, useState, useSyncExternalStore } from "react";
import { Card, CardHeader, EmptyState, PageToolbar, Pill } from "@lumenx/ui-admin";
import {
  listTransportAttendanceMarks,
  listTransportAttendanceTrips,
  subscribeTransportAttendance,
  type SharedTripAttendanceMark,
} from "@lumenx/utils";

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

function boardingTone(status: SharedTripAttendanceMark["boarding"]) {
  if (status === "boarded") return "success" as const;
  if (status === "not_boarded") return "danger" as const;
  return "neutral" as const;
}

function droppingTone(status: SharedTripAttendanceMark["dropping"]) {
  if (status === "dropped") return "success" as const;
  if (status === "not_dropped") return "danger" as const;
  return "neutral" as const;
}

export function TransportAttendanceView() {
  const marks = useSyncExternalStore(
    subscribeTransportAttendance,
    listTransportAttendanceMarks,
    listTransportAttendanceMarks,
  );
  const trips = useSyncExternalStore(
    subscribeTransportAttendance,
    listTransportAttendanceTrips,
    listTransportAttendanceTrips,
  );

  const [tripFilter, setTripFilter] = useState<string>("all");

  const tripOptions = useMemo(() => {
    const ids = [...new Set(marks.map((m) => m.tripId))];
    return ids.sort((a, b) => {
      const ta = trips.find((t) => t.tripId === a)?.startedAt ?? "";
      const tb = trips.find((t) => t.tripId === b)?.startedAt ?? "";
      return ta < tb ? 1 : -1;
    });
  }, [marks, trips]);

  const rows = useMemo(() => {
    const filtered =
      tripFilter === "all" ? marks : marks.filter((m) => m.tripId === tripFilter);
    return [...filtered].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  }, [marks, tripFilter]);

  const activeTrip = trips.find((t) => !t.finalized);

  return (
    <div className="space-y-4">
      <PageToolbar>
        <p className="text-sm text-muted-foreground">
          Shared mock boarding/dropping from Transport (this browser).
        </p>
        <Pill tone={activeTrip ? "warning" : "neutral"}>
          {activeTrip ? "Trip live" : `${marks.length} marks`}
        </Pill>
      </PageToolbar>

      {activeTrip ? (
        <Card className="border-warning/40 bg-warning/5">
          <CardHeader
            title={`Active trip · ${activeTrip.vehicleNumber} · ${activeTrip.routeCode}`}
            hint={`Driver ${activeTrip.driverName} · ${activeTrip.currentStopName ?? "—"} · ${activeTrip.phase}`}
          />
        </Card>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={`rounded-lg border px-2.5 py-1 text-xs font-medium ${
            tripFilter === "all" ? "border-primary bg-primary/10" : "border-border"
          }`}
          onClick={() => setTripFilter("all")}
        >
          All trips
        </button>
        {tripOptions.map((id) => {
          const meta = trips.find((t) => t.tripId === id);
          return (
            <button
              key={id}
              type="button"
              className={`rounded-lg border px-2.5 py-1 text-xs font-medium ${
                tripFilter === id ? "border-primary bg-primary/10" : "border-border"
              }`}
              onClick={() => setTripFilter(id)}
            >
              {meta?.vehicleNumber ?? id.slice(0, 12)}
              {meta?.finalized ? " · done" : ""}
            </button>
          );
        })}
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="No boarding marks yet"
          hint="When a driver starts a trip and marks students in Transport, records appear here via shared localStorage."
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Trip</th>
                <th className="px-3 py-2 font-medium">Bus</th>
                <th className="px-3 py-2 font-medium">Driver</th>
                <th className="px-3 py-2 font-medium">Stop</th>
                <th className="px-3 py-2 font-medium">Student</th>
                <th className="px-3 py-2 font-medium">Boarded</th>
                <th className="px-3 py-2 font-medium">Dropped</th>
                <th className="px-3 py-2 font-medium">Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-border/70">
                  <td className="px-3 py-2 font-mono text-xs">{row.tripId.slice(0, 14)}</td>
                  <td className="px-3 py-2">{row.vehicleNumber}</td>
                  <td className="px-3 py-2">{row.driverName}</td>
                  <td className="px-3 py-2">{row.stopName}</td>
                  <td className="px-3 py-2">
                    <div className="font-medium">{row.studentName}</div>
                    <div className="text-xs text-muted-foreground">{row.studentClass}</div>
                  </td>
                  <td className="px-3 py-2">
                    <Pill tone={boardingTone(row.boarding)}>{row.boarding.replace("_", " ")}</Pill>
                    {row.boardedAt ? (
                      <div className="mt-1 text-[11px] text-muted-foreground">
                        {formatWhen(row.boardedAt)}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-3 py-2">
                    <Pill tone={droppingTone(row.dropping)}>{row.dropping.replace("_", " ")}</Pill>
                    {row.droppedAt ? (
                      <div className="mt-1 text-[11px] text-muted-foreground">
                        {formatWhen(row.droppedAt)}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {formatWhen(row.updatedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
