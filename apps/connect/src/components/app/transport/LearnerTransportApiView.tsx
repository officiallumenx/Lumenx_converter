import { useEffect, useMemo, useRef, useState } from "react";
import { Bus, Clock, MapPin } from "lucide-react";
import { subscribeTransportRealtime, formatGpsAgeLabel } from "@lumenx/utils";
import { Badge } from "@lumenx/ui";
import { PageHeader } from "@/components/app/PageHeader";
import { StatCard } from "@/components/app/StatCard";
import { SectionCard } from "@/components/app/SectionCard";
import { TransportBusCard } from "@/components/app/transport/TransportBusCard";
import {
  TransportEtaBanner,
  TransportRouteTimeline,
  TransportTrackingPanel,
} from "@/components/app/transport/TransportRouteTimeline";
import { NotRidingTodayCard } from "@/components/app/transport/NotRidingTodayCard";
import { ReportTransportIssueCard } from "@/components/app/transport/ReportTransportIssueCard";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import {
  useLearnerTransportHistoryQuery,
  useLearnerTransportLiveQuery,
  useLearnerTransportQuery,
  useRideExceptionQuery,
} from "@/lib/connect-queries/hooks";
import {
  buildLiveTracking,
  mapLearnerSummaryToAssignment,
  summaryStopsToTimeline,
} from "@/lib/transport/learner-live";
import { maybePlayArrivalChime } from "@/lib/transport/arrival-chime";
import {
  PARENT_TRANSPORT_STATUS_LABEL,
  type ParentTransportStatus,
} from "@/lib/transport/parent-status";
import { formatEtaMinutes } from "@/lib/transport-utils";
import type { LearnerTransportHistoryDayDto } from "@/lib/transport/api-types";

type Props = {
  instituteId: string;
  studentId: string;
  subtitle: string;
  headerExtra?: React.ReactNode;
  viewer?: "parent" | "student";
};

function boardingLabel(status: string | null | undefined): string {
  if (status === "boarded") return "Boarded";
  if (status === "not_boarded") return "Not boarded";
  if (status === "pending") return "Pending";
  return "—";
}

function droppingLabel(status: string | null | undefined): string {
  if (status === "dropped") return "Dropped";
  if (status === "not_dropped") return "Not dropped";
  if (status === "pending") return "Pending";
  return "—";
}

function HistoryList({ days }: { days: LearnerTransportHistoryDayDto[] }) {
  if (days.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No trip history yet for this student.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {days.map((day) => (
        <li
          key={`${day.tripDate}-${day.tripId ?? "none"}`}
          className="rounded-lg border border-border px-3 py-2"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium text-foreground">{day.tripDate}</p>
            {day.notRiding ? (
              <Badge variant="outline" className="text-[10px]">
                Not riding
              </Badge>
            ) : day.phase ? (
              <Badge variant="secondary" className="text-[10px]">
                {day.phase}
              </Badge>
            ) : null}
          </div>
          <dl className="mt-2 grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
            <div>
              <dt className="inline text-muted-foreground">Pickup: </dt>
              <dd className="inline text-foreground">{day.pickupStopName ?? "—"}</dd>
            </div>
            <div>
              <dt className="inline text-muted-foreground">Boarding: </dt>
              <dd className="inline text-foreground">{boardingLabel(day.boardingStatus)}</dd>
            </div>
            <div>
              <dt className="inline text-muted-foreground">Drop: </dt>
              <dd className="inline text-foreground">
                {day.dropStopName ? `${day.dropStopName} · ` : ""}
                {droppingLabel(day.droppingStatus)}
              </dd>
            </div>
            {day.boardedAt || day.droppedAt ? (
              <div>
                <dt className="inline text-muted-foreground">Times: </dt>
                <dd className="inline text-foreground">
                  {[
                    day.boardedAt ? `Boarded ${new Date(day.boardedAt).toLocaleTimeString()}` : null,
                    day.droppedAt ? `Dropped ${new Date(day.droppedAt).toLocaleTimeString()}` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "—"}
                </dd>
              </div>
            ) : null}
          </dl>
        </li>
      ))}
    </ul>
  );
}

function TodayFacts({
  summaryBus,
  summaryDriver,
  summaryRoute,
  pickupStop,
  expectedPickup,
  status,
  currentOrNextStop,
  etaLabel,
  locationLabel,
  boarding,
  dropping,
}: {
  summaryBus: string;
  summaryDriver: string;
  summaryRoute: string;
  pickupStop: string;
  expectedPickup: string;
  status: ParentTransportStatus;
  currentOrNextStop: string;
  etaLabel: string;
  locationLabel: string;
  boarding: string;
  dropping: string;
}) {
  const rows: Array<{ label: string; value: string }> = [
    { label: "Bus", value: summaryBus },
    { label: "Driver", value: summaryDriver },
    { label: "Route", value: summaryRoute },
    { label: "Pickup stop", value: pickupStop },
    { label: "Expected pickup", value: expectedPickup },
    { label: "Current status", value: PARENT_TRANSPORT_STATUS_LABEL[status] },
    { label: "Current / next stop", value: currentOrNextStop },
    { label: "ETA", value: etaLabel },
    { label: "Live location", value: locationLabel },
    { label: "Boarding status", value: boarding },
    { label: "Drop status", value: dropping },
  ];

  return (
    <SectionCard title="Today's transport">
      <dl className="grid gap-3 sm:grid-cols-2">
        {rows.map((row) => (
          <div key={row.label}>
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">
              {row.label}
            </dt>
            <dd className="mt-0.5 text-sm font-medium text-foreground">{row.value}</dd>
          </div>
        ))}
      </dl>
    </SectionCard>
  );
}

export function LearnerTransportApiView({
  instituteId,
  studentId,
  subtitle,
  headerExtra,
  viewer = "parent",
}: Props) {
  const {
    data: transportState,
    isLoading,
    isFetching: summaryFetching,
    refresh,
  } = useLearnerTransportQuery(instituteId, studentId, true);
  const {
    data: rideException,
    refresh: refreshRideException,
  } = useRideExceptionQuery(instituteId, studentId, viewer === "parent");

  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const gpsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Prefer realtime; keep a slow safety poll only when connected.
  const livePollMs = realtimeConnected ? 120_000 : 20_000;

  const {
    data: live,
    isFetching: liveFetching,
    refresh: refreshLive,
  } = useLearnerTransportLiveQuery(instituteId, studentId, true, {
    pollMs: livePollMs,
  });

  const {
    data: historyDays = [],
    refresh: refreshHistory,
  } = useLearnerTransportHistoryQuery(instituteId, studentId, true);

  const summary =
    transportState?.status === "ready" ? transportState.summary : null;
  const error =
    transportState?.status === "error" ? transportState.message : null;
  const empty =
    transportState?.status === "empty" ? transportState.message : null;
  const loading = isLoading && !transportState;

  const refreshAll = () => {
    refresh();
    refreshLive();
    refreshRideException();
    refreshHistory();
  };

  useEffect(() => {
    try {
      const supabase = getSupabaseBrowserClient();
      setRealtimeConnected(true);
      const unsubscribe = subscribeTransportRealtime(supabase, {
        instituteId,
        onChange: (event) => {
          setRealtimeConnected(true);
          if (event.table === "vehicle_location") {
            if (gpsTimer.current) return;
            gpsTimer.current = setTimeout(() => {
              gpsTimer.current = null;
              refreshLive();
            }, 400);
            return;
          }
          const liveOnly =
            event.table === "transport_trip" ||
            event.table === "transport_boarding_event" ||
            event.table === "transport_emergency";
          if (liveOnly) {
            refreshLive();
            return;
          }
          refreshAll();
        },
      });
      return () => {
        if (gpsTimer.current) {
          clearTimeout(gpsTimer.current);
          gpsTimer.current = null;
        }
        unsubscribe();
      };
    } catch {
      setRealtimeConnected(false);
      return undefined;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refreshAll is stable enough per institute
  }, [instituteId, studentId]);

  const assignment = useMemo(
    () => (summary ? mapLearnerSummaryToAssignment(summary) : null),
    [summary],
  );
  const tracking = useMemo(
    () => (summary && assignment ? buildLiveTracking(summary, assignment, live) : null),
    [summary, assignment, live],
  );

  useEffect(() => {
    if (!tracking?.parentStatus) return;
    maybePlayArrivalChime({
      studentId,
      tripId: tracking.tripId,
      status: tracking.parentStatus,
    });
  }, [studentId, tracking?.parentStatus, tracking?.tripId]);

  if (loading) {
    return (
      <div className="space-y-5">
        {headerExtra}
        <PageHeader title="Transport" subtitle={subtitle} />
        <p className="text-sm text-muted-foreground">Loading transport details…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-5">
        {headerExtra}
        <PageHeader title="Transport" subtitle={subtitle} />
        <p className="text-sm text-destructive">{error}</p>
      </div>
    );
  }

  if (empty || !summary || !assignment || !tracking) {
    return (
      <div className="space-y-5">
        {headerExtra}
        <PageHeader title="Transport" subtitle={subtitle} />
        <p className="text-sm text-muted-foreground">
          {empty ?? "No bus enrollment found for this student."}
        </p>
        {viewer === "parent" ? (
          <ReportTransportIssueCard instituteId={instituteId} studentId={studentId} />
        ) : null}
      </div>
    );
  }

  const pending = summary.approvalStatus === "pending";
  const timelineStops = summaryStopsToTimeline(summary);
  const parentStatus = tracking.parentStatus ?? "driver_not_started";
  const hasGps =
    Number.isFinite(tracking.lat) &&
    Number.isFinite(tracking.lng) &&
    !(tracking.lat === 0 && tracking.lng === 0);
  const etaLabel =
    parentStatus === "not_riding"
      ? "—"
      : tracking.learnerStatus === "awaiting_pickup" && tracking.sharedTripActive && hasGps
        ? formatEtaMinutes(tracking.etaMinutes)
        : tracking.sharedTripActive && !hasGps
          ? "Location unavailable"
          : "—";
  const gpsAge =
    hasGps && live?.latestLocation?.capturedAt
      ? formatGpsAgeLabel(live.latestLocation.capturedAt)
      : tracking.gpsFreshness
        ? tracking.gpsFreshness.toUpperCase()
        : "UNKNOWN";
  const locationLabel = hasGps
    ? `${tracking.lat.toFixed(4)}, ${tracking.lng.toFixed(4)} · ${gpsAge}`
    : tracking.lastUpdated || "Location unavailable";
  const syncingHint = summaryFetching || liveFetching ? "Updating…" : null;

  return (
    <div className="min-w-0 max-w-full space-y-5">
      {headerExtra}
      <PageHeader title="Transport" subtitle={subtitle} />

      {pending ? (
        <div className="rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          Enrollment is already usable. Admin may still review this assignment.
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span>{gpsAge}</span>
        {syncingHint ? <span>· {syncingHint}</span> : null}
        {realtimeConnected ? <span>· Live updates on</span> : <span>· Refreshing periodically</span>}
      </div>

      <TodayFacts
        summaryBus={summary.busNumber ?? "—"}
        summaryDriver={summary.driverName ?? "—"}
        summaryRoute={summary.routeName ?? "—"}
        pickupStop={summary.pickupStop?.name ?? "—"}
        expectedPickup={tracking.expectedPickupTime ?? "—"}
        status={parentStatus}
        currentOrNextStop={
          tracking.currentStopName || tracking.nextStopName || "—"
        }
        etaLabel={etaLabel}
        locationLabel={locationLabel}
        boarding={boardingLabel(tracking.boardingStatus)}
        dropping={droppingLabel(tracking.droppingStatus)}
      />

      {viewer === "parent" ? (
        <NotRidingTodayCard
          instituteId={instituteId}
          studentId={studentId}
          participation={rideException}
          onChanged={refreshAll}
        />
      ) : null}

      <TransportEtaBanner tracking={tracking} assignment={assignment} viewer={viewer} />
      <TransportTrackingPanel tracking={tracking} />

      <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard
          icon={Bus}
          label="Assigned bus"
          value={summary.busNumber ?? "—"}
          hint={summary.routeName ?? "—"}
          tone="warning"
        />
        <StatCard
          icon={Clock}
          label="Status"
          value={PARENT_TRANSPORT_STATUS_LABEL[parentStatus]}
          hint={
            hasGps && tracking.etaMinutes > 0
              ? `${formatEtaMinutes(tracking.etaMinutes)} · ${tracking.nextStopName}`
              : summary.driverName ?? "Contact school transport office"
          }
          tone={tracking.sharedTripActive ? "primary" : "default"}
        />
        <StatCard
          icon={MapPin}
          label="Pickup stop"
          value={summary.pickupStop?.name ?? "—"}
          hint={summary.pickupStop?.locationLabel ?? "—"}
        />
      </div>

      <TransportBusCard assignment={assignment} />

      {timelineStops.length > 0 ? (
        <TransportRouteTimeline
          stops={timelineStops}
          tracking={tracking}
          highlightStopId={assignment.pickupStop.id}
        />
      ) : null}

      <SectionCard title="Trip history">
        <HistoryList days={historyDays} />
      </SectionCard>

      {viewer === "parent" ? (
        <ReportTransportIssueCard
          instituteId={instituteId}
          studentId={studentId}
          studentName={summary.studentName}
        />
      ) : null}
    </div>
  );
}
