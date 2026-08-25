import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { Button, Card, CardHeader, Pill, EmptyState, PageToolbar } from "@lumenx/ui-admin";
import { Navigation } from "lucide-react";
import {
  listActiveTransportEmergencies,
  subscribeTransportEmergencies,
} from "@lumenx/utils";
import {
  ensureTripsForDate,
  nextTripStatus,
  tripStatusAdvanceLabel,
  TRIP_STATUS_LABEL,
  updateTripStatus,
  normalizeTripStatus,
  type TransportSnapshot,
  type TransportTrip,
  type TripSlot,
  type TripStatus,
} from "@/lib/transport-store";

type Props = {
  snapshot: TransportSnapshot;
};

type TripTab = "morning" | "evening" | "history" | "overview";

const STATUS_TONE: Record<string, "success" | "warning" | "neutral" | "danger"> = {
  not_started: "neutral",
  ready: "warning",
  running: "warning",
  completed: "success",
  emergency: "danger",
  scheduled: "neutral",
  in_progress: "warning",
  cancelled: "neutral",
};

function effectiveTripStatus(
  trip: TransportTrip,
  emergencyRouteCodes: Set<string>,
  emergencyVehicles: Set<string>,
): TripStatus {
  const base = normalizeTripStatus(trip.status);
  if (base === "completed") return "completed";
  const routeKey = trip.routeName.toUpperCase();
  if (
    emergencyRouteCodes.has(routeKey) ||
    emergencyVehicles.has(trip.vehicleLabel.toUpperCase())
  ) {
    return "emergency";
  }
  return base;
}

export function TransportTripsView({ snapshot }: Props) {
  const [tab, setTab] = useState<TripTab>("overview");
  const emergencies = useSyncExternalStore(
    subscribeTransportEmergencies,
    listActiveTransportEmergencies,
    listActiveTransportEmergencies,
  );

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  useEffect(() => {
    ensureTripsForDate(today);
  }, [today]);

  const emergencyRouteCodes = useMemo(
    () =>
      new Set(
        emergencies.flatMap((e) => [
          e.routeCode.toUpperCase(),
          e.routeName.toUpperCase(),
        ]),
      ),
    [emergencies],
  );
  const emergencyVehicles = useMemo(
    () => new Set(emergencies.map((e) => e.vehicleNumber.toUpperCase())),
    [emergencies],
  );

  const enriched = useMemo(() => {
    return snapshot.trips.map((t) => ({
      trip: t,
      displayStatus: effectiveTripStatus(t, emergencyRouteCodes, emergencyVehicles),
    }));
  }, [snapshot.trips, emergencyRouteCodes, emergencyVehicles]);

  const rows = useMemo(() => {
    if (tab === "overview") {
      return enriched.filter(
        (r) =>
          r.trip.date === today ||
          r.displayStatus === "running" ||
          r.displayStatus === "emergency" ||
          r.displayStatus === "ready",
      );
    }
    if (tab === "history") {
      return enriched.filter(
        (r) =>
          r.displayStatus === "completed" ||
          r.trip.date < today,
      );
    }
    const slot: TripSlot = tab;
    return enriched.filter(
      (r) =>
        r.trip.slot === slot &&
        (r.trip.date === today ||
          r.displayStatus === "running" ||
          r.displayStatus === "emergency" ||
          r.displayStatus === "ready" ||
          r.displayStatus === "not_started"),
    );
  }, [enriched, tab, today]);

  return (
    <div className="space-y-4">
      <PageToolbar>
        <div className="flex gap-1 p-1 rounded-lg bg-muted/40 border border-border/60">
          {(
            [
              { key: "overview", label: "Overview" },
              { key: "morning", label: "Morning" },
              { key: "evening", label: "Evening" },
              { key: "history", label: "History" },
            ] as const
          ).map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`px-3 h-7 rounded-md text-[11px] font-medium transition-colors ${
                tab === t.key
                  ? "bg-background text-foreground shadow-sm border border-border/50"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </PageToolbar>

      <Card>
        <CardHeader
          title={
            tab === "overview"
              ? "Transport trip overview"
              : tab === "history"
                ? "Trip history"
                : `${tab === "morning" ? "Morning" : "Evening"} trips`
          }
          hint="Driver · Bus · Route · Status · Emergency overlays active SOS · mock schedules"
        />
        {rows.length === 0 ? (
          <div className="px-5 pb-8">
            <EmptyState
              icon={<Navigation className="size-5" />}
              title="No trips in this view"
              hint="Trips appear after routes are configured or locked."
            />
          </div>
        ) : (
          <div className="px-5 pb-5 overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border">
                  <th className="py-2 pr-3 font-medium">Driver</th>
                  <th className="py-2 pr-3 font-medium">Bus</th>
                  <th className="py-2 pr-3 font-medium">Route</th>
                  <th className="py-2 pr-3 font-medium">Slot</th>
                  <th className="py-2 pr-3 font-medium">Scheduled</th>
                  <th className="py-2 pr-3 font-medium">Students</th>
                  <th className="py-2 font-medium">Trip status</th>
                  <th className="py-2 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ trip: t, displayStatus }) => {
                  const advance = tripStatusAdvanceLabel(t.status);
                  const canAdvance =
                    displayStatus !== "emergency" && Boolean(nextTripStatus(t.status));
                  return (
                    <tr key={t.id} className="border-b border-border last:border-0">
                      <td className="py-2.5 pr-3 font-medium">{t.driverName}</td>
                      <td className="py-2.5 pr-3">{t.vehicleLabel}</td>
                      <td className="py-2.5 pr-3">{t.routeName}</td>
                      <td className="py-2.5 pr-3 capitalize">{t.slot}</td>
                      <td className="py-2.5 pr-3 font-mono text-[11px]">
                        {t.date} · {t.scheduledAt}
                      </td>
                      <td className="py-2.5 pr-3">{t.studentsCount}</td>
                      <td className="py-2.5">
                        <Pill tone={STATUS_TONE[displayStatus] ?? "neutral"}>
                          {TRIP_STATUS_LABEL[displayStatus] ?? displayStatus}
                        </Pill>
                      </td>
                      <td className="py-2.5">
                        {canAdvance && advance ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const next = nextTripStatus(t.status);
                              if (next) updateTripStatus(t.id, next);
                            }}
                          >
                            {advance}
                          </Button>
                        ) : displayStatus === "emergency" ? (
                          <span className="text-[10px] text-destructive">See Emergencies</span>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
