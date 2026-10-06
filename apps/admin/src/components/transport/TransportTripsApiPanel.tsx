import { useMemo, useState } from "react";
import {
  Button,
  Card,
  CardHeader,
  EmptyState,
  PageToolbar,
  Pill,
  SearchInput,
} from "@lumenx/ui-admin";
import { Navigation } from "lucide-react";
import {
  classifyGpsFreshness,
  formatGpsAgeLabel,
  isGpsShownAsLive,
} from "@lumenx/utils";
import {
  useTransportEmergenciesQuery,
  useTransportTripsQuery,
} from "@/lib/admin-queries";
import { useTransportRealtimeInvalidate } from "@/lib/transport/use-transport-realtime-invalidate";
import {
  filterMonitorTrips,
  formatTimelineClock,
  isTripActive,
  isTripDelayed,
  isTripGpsStale,
  searchMonitorTrips,
  sortTimelineChronological,
  tripHasOpenEmergency,
  type TransportMonitorFilter,
} from "@/lib/transport/monitor-helpers";
import type { TransportTripDto } from "@/lib/transport/types";
import { TransportTripMonitorDetail } from "@/components/transport/TransportTripMonitorDetail";
import { useQueryClient } from "@tanstack/react-query";
import { adminQueryKeys } from "@/lib/admin-queries/keys";

type Props = {
  instituteId: string;
  writesEnabled?: boolean;
  onNotify?: (message: string) => void;
};

const FILTERS: Array<{ id: TransportMonitorFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "delayed", label: "Delayed" },
  { id: "completed", label: "Completed" },
  { id: "gps_stale", label: "GPS stale" },
  { id: "emergency", label: "Emergency" },
];

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

function formatDistance(m: number | null | undefined): string {
  if (m == null || !Number.isFinite(m)) return "—";
  if (m < 1000) return `${Math.round(m)} m`;
  return `${(m / 1000).toFixed(1)} km`;
}

function TripCard({
  trip,
  hasEmergency,
  onOpen,
}: {
  trip: TransportTripDto;
  hasEmergency: boolean;
  onOpen: () => void;
}) {
  const capturedAt = trip.latestLocation?.capturedAt ?? null;
  const freshness =
    trip.gpsFreshness ?? classifyGpsFreshness(capturedAt);
  const ageLabel = formatGpsAgeLabel(capturedAt);
  const showCoords =
    trip.latestLocation &&
    isGpsShownAsLive(freshness) &&
    Number.isFinite(trip.latestLocation.latitude);
  const delayed = isTripDelayed(trip);
  const stale = isTripGpsStale(trip);
  const timelinePreview = sortTimelineChronological(trip.timeline).slice(-4);

  return (
    <Card>
      <CardHeader
        title={`${trip.routeName ?? "Route"} · ${trip.vehicleNumber ?? "Bus"}`}
        hint={`Driver: ${trip.driverName ?? "—"} · Started ${formatWhen(trip.startedAt)}`}
        action={
          <div className="flex flex-wrap items-center gap-1.5">
            <Pill tone={PHASE_TONE[trip.phase] ?? "neutral"}>
              {trip.phase.replace("_", " ")}
            </Pill>
            {delayed ? <Pill tone="warning">Delayed</Pill> : null}
            {stale ? <Pill tone="danger">GPS stale</Pill> : null}
            {hasEmergency ? <Pill tone="danger">Emergency</Pill> : null}
            <Button size="sm" variant="outline" onClick={onOpen}>
              Open
            </Button>
          </div>
        }
      />
      <div className="space-y-1.5 border-t border-border px-4 py-3 text-sm text-muted-foreground">
        <p>
          Current:{" "}
          <span className="text-foreground">{trip.currentStopName ?? "—"}</span>
          {" · "}
          Next: <span className="text-foreground">{trip.nextStopName ?? "—"}</span>
          {" · "}
          {formatDistance(trip.distanceToNextStopM)}
          {" · "}
          {trip.etaToNextStopMinutes != null
            ? `~${trip.etaToNextStopMinutes} min`
            : "ETA —"}
        </p>
        <p>
          GPS:{" "}
          {showCoords ? (
            <span className="font-mono text-foreground">
              {trip.latestLocation!.latitude.toFixed(5)},{" "}
              {trip.latestLocation!.longitude.toFixed(5)}
            </span>
          ) : (
            <span className="text-foreground">{ageLabel}</span>
          )}
          {capturedAt ? (
            <span className="text-muted-foreground"> · {ageLabel}</span>
          ) : null}
        </p>
        {timelinePreview.length > 0 ? (
          <ul className="mt-1 space-y-0.5 border-t border-border pt-2 text-xs">
            {timelinePreview.map((evt) => (
              <li key={evt.id} className="flex gap-2">
                <span className="tabular-nums text-muted-foreground">
                  {formatTimelineClock(evt.at)}
                </span>
                <span className="text-foreground">{evt.label}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </Card>
  );
}

export function TransportTripsApiPanel({
  instituteId,
  writesEnabled = true,
  onNotify,
}: Props) {
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const queryClient = useQueryClient();
  const tripsQuery = useTransportTripsQuery(instituteId, today);
  const emergenciesQuery = useTransportEmergenciesQuery(instituteId);
  useTransportRealtimeInvalidate(instituteId);

  const [filter, setFilter] = useState<TransportMonitorFilter>("all");
  const [search, setSearch] = useState("");
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);

  const trips = tripsQuery.data ?? [];
  const emergencies = emergenciesQuery.data ?? [];

  const visible = useMemo(() => {
    const filtered = filterMonitorTrips(trips, filter, emergencies);
    return searchMonitorTrips(filtered, search);
  }, [trips, filter, emergencies, search]);

  const selected =
    trips.find((t) => t.id === selectedTripId) ?? null;

  const refreshOps = () => {
    void queryClient.invalidateQueries({
      queryKey: adminQueryKeys.transport(instituteId, `trips:${today}`),
    });
    void queryClient.invalidateQueries({
      queryKey: adminQueryKeys.transport(instituteId, "emergencies"),
    });
    void queryClient.invalidateQueries({
      queryKey: adminQueryKeys.transport(instituteId, `daily-exceptions:${today}`),
    });
    void queryClient.invalidateQueries({
      queryKey: adminQueryKeys.transport(instituteId, `analytics:${today}`),
    });
  };

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

  if (selected) {
    return (
      <TransportTripMonitorDetail
        instituteId={instituteId}
        trip={selected}
        emergencies={emergencies}
        writesEnabled={writesEnabled}
        onClose={() => setSelectedTripId(null)}
        onNotify={onNotify}
        onChanged={refreshOps}
      />
    );
  }

  return (
    <div className="space-y-4">
      <PageToolbar>
        <p className="text-sm text-muted-foreground">
          Live monitoring for {today}. Updates via realtime — no full page reload.
        </p>
        <Pill tone={trips.some(isTripActive) ? "warning" : "neutral"}>
          {trips.filter(isTripActive).length} active · {trips.length} total
        </Pill>
      </PageToolbar>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <Button
              key={f.id}
              size="sm"
              variant={filter === f.id ? "default" : "outline"}
              onClick={() => setFilter(f.id)}
            >
              {f.label}
            </Button>
          ))}
        </div>
        <div className="relative min-w-[12rem] max-w-sm flex-1">
          <SearchInput
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search bus, driver, route…"
          />
        </div>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={<Navigation className="size-5" />}
          title={trips.length === 0 ? "No trips yet" : "No matches"}
          hint={
            trips.length === 0
              ? "Trips appear when drivers start runs in the Transport app."
              : "Try another filter or search."
          }
        />
      ) : (
        <div className="space-y-3">
          {visible.map((trip) => (
            <TripCard
              key={trip.id}
              trip={trip}
              hasEmergency={tripHasOpenEmergency(trip, emergencies)}
              onOpen={() => setSelectedTripId(trip.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
