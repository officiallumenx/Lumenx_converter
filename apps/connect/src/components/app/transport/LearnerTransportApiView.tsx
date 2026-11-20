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
import { formatApproachEta } from "@/lib/transport-utils";
import type { LearnerTransportHistoryDayDto } from "@/lib/transport/api-types";
import {
  DEFAULT_TRANSPORT_TIMEZONE,
  formatExpectedPickupLabel,
  formatTransportDate,
  formatTransportInstant,
} from "@/lib/transport/format-time";

type Props = {
  instituteId: string;
  studentId: string;
  subtitle: string;
  headerExtra?: React.ReactNode;
  viewer?: "parent" | "student";
};

function boardingLabel(
  status: string | null | undefined,
  at?: string | null,
  timeZone?: string,
): string {
  if (status === "boarded") {
    const time = formatTransportInstant(at, { timeZone });
    return time ? `Boarded (${time})` : "Boarded";
  }
  if (status === "not_boarded") return "Not boarded";
  if (status === "pending") return "Pending";
  return "—";
}

function droppingLabel(
  status: string | null | undefined,
  at?: string | null,
  timeZone?: string,
): string {
  if (status === "dropped") {
    const time = formatTransportInstant(at, { timeZone });
    return time ? `Dropped (${time})` : "Dropped";
  }
  if (status === "not_dropped") return "Not dropped";
  if (status === "pending") return "Pending";
  return "—";
}

function HistoryList({
  days,
  timeZone,
}: {
  days: LearnerTransportHistoryDayDto[];
  timeZone: string;
}) {
  if (days.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No trip history yet for this student.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {days.map((day) => {
        const formattedDate =
          formatTransportDate(day.tripDate, { timeZone, relative: true }) ??
          day.tripDate;
        return (
          <li
            key={`${day.tripDate}-${day.tripId ?? "none"}`}
            className="rounded-lg border border-border px-3 py-2"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium text-foreground">{formattedDate}</p>
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
                <dd className="inline text-foreground">
                  {boardingLabel(day.boardingStatus, day.boardedAt, timeZone)}
                </dd>
              </div>
              <div>
                <dt className="inline text-muted-foreground">Drop: </dt>
                <dd className="inline text-foreground">
                  {day.dropStopName ? `${day.dropStopName} · ` : ""}
                  {droppingLabel(day.droppingStatus, day.droppedAt, timeZone)}
                </dd>
              </div>
              {day.boardedAt || day.droppedAt ? (
                <div>
                  <dt className="inline text-muted-foreground">Times: </dt>
                  <dd className="inline text-foreground">
                    {[
                      day.boardedAt
                        ? `Boarded ${formatTransportInstant(day.boardedAt, { timeZone }) ?? "—"}`
                        : null,
                      day.droppedAt
                        ? `Dropped ${formatTransportInstant(day.droppedAt, { timeZone }) ?? "—"}`
                        : null,
                    ]
                      .filter(Boolean)
                      .join(" · ") || "—"}
                  </dd>
                </div>
              ) : null}
            </dl>
          </li>
        );
      })}
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
    { label: "Assigned location", value: pickupStop },
    { label: "Expected pickup (institute default)", value: expectedPickup },
    { label: "Current status", value: PARENT_TRANSPORT_STATUS_LABEL[status] },
    { label: "Current / next stop", value: currentOrNextStop },
    { label: "Arrival", value: etaLabel },
    { label: "Live location", value: locationLabel },
    { label: "Boarding status", value: boarding },
    { label: "Drop status", value: dropping },
  ];

  return (
    <SectionCard title="Today's transport">
      <dl className="grid gap-3 sm:grid-cols-2">
        {rows.map((row) => (
          <div key={row.label} className="min-w-0">
            <dt className="text-xs uppercase tracking-wide text-muted-foreground truncate">
              {row.label}
            </dt>
            <dd className="mt-0.5 text-sm font-medium text-foreground break-words">{row.value}</dd>
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
    isError: liveIsError,
    error: liveError,
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
  const showArrivalMinutes =
    tracking.sharedTripActive &&
    tracking.etaMinutes > 0 &&
    (parentStatus === "trip_started" ||
      parentStatus === "approaching" ||
      parentStatus === "arrived" ||
      parentStatus === "dropping" ||
      tracking.learnerStatus === "awaiting_pickup" ||
      tracking.learnerStatus === "picked_up");
  const approachEta = formatApproachEta({
    minutes: tracking.etaMinutes,
    displayMode: tracking.etaDisplayMode,
    confidence: tracking.etaConfidence,
    gpsFreshness: tracking.gpsFreshness,
    lastUpdated: tracking.lastUpdated,
  });
  const etaLabel =
    parentStatus === "not_riding"
      ? "—"
      : showArrivalMinutes ||
          (tracking.sharedTripActive &&
            hasGps &&
            tracking.etaMinutes <= 0 &&
            tracking.etaDisplayMode !== "stale")
        ? approachEta
        : tracking.sharedTripActive && !hasGps
          ? tracking.lastUpdated || "Location unavailable"
          : tracking.etaDisplayMode === "stale" ||
              tracking.gpsFreshness === "stale" ||
              tracking.gpsFreshness === "offline"
            ? approachEta
            : "—";
  const gpsAge =
    live?.latestLocation?.capturedAt
      ? formatGpsAgeLabel(live.latestLocation.capturedAt)
      : tracking.lastUpdated || null;
  const locationLabel = hasGps
    ? `${tracking.lat.toFixed(4)}, ${tracking.lng.toFixed(4)}${gpsAge ? ` · ${gpsAge}` : ""}`
    : gpsAge || "Location unavailable";
  const syncingHint = summaryFetching || liveFetching ? "Updating…" : null;

  const effectiveTimeZone =
    live?.timezone || summary?.timezone || DEFAULT_TRANSPORT_TIMEZONE;

  return (
    <div className="min-w-0 max-w-full space-y-5">
      {headerExtra}
      <PageHeader title="Transport" subtitle={subtitle} />

      {liveIsError ? (
        <div
          className="rounded-xl border border-destructive/40 bg-destructive/8 px-4 py-3 text-sm text-destructive"
          role="alert"
        >
          Live tracking could not load
          {liveError instanceof Error && liveError.message
            ? `: ${liveError.message}`
            : "."}{" "}
          <button
            type="button"
            className="font-medium underline underline-offset-2"
            onClick={() => refreshLive()}
          >
            Retry
          </button>
        </div>
      ) : null}

      {pending ? (
        <div className="rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          Enrollment is already usable. Admin may still review this assignment.
        </div>
      ) : null}

      {!summary.pickupStop ? (
        <div
          className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-foreground"
          role="status"
        >
          <div className="flex items-start gap-3">
            <MapPin className="size-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-amber-950 dark:text-amber-200">
                Pickup stop not assigned
              </p>
              <p className="mt-1 text-xs text-amber-900/80 dark:text-amber-200/80 leading-relaxed">
                {viewer === "parent"
                  ? `${summary.studentName} is enrolled on ${summary.routeName ?? "this bus route"}, but an exact pickup stop has not been assigned yet. Please contact the school transport office or use the report form below to request a designated pickup stop.`
                  : "You are enrolled on this route, but your pickup stop has not been designated yet. Please ask your parent or the school transport office to assign your stop location."}
              </p>
              {viewer === "parent" ? (
                <div className="mt-2.5">
                  <a
                    href="#report-transport-issue"
                    className="inline-flex h-7 items-center justify-center rounded-lg bg-amber-600 px-3 text-xs font-medium text-white shadow-sm hover:bg-amber-700 transition-colors"
                  >
                    Request Stop Assignment
                  </a>
                </div>
              ) : null}
            </div>
          </div>
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
        pickupStop={summary.pickupStop?.name ?? "Stop not assigned"}
        expectedPickup={formatExpectedPickupLabel(
          tracking.expectedPickupTime,
          Boolean(summary.pickupStop),
        )}
        status={parentStatus}
        currentOrNextStop={
          summary.pickupStop
            ? tracking.currentStopName || tracking.nextStopName || "—"
            : "Location pending"
        }
        etaLabel={etaLabel}
        locationLabel={locationLabel}
        boarding={boardingLabel(
          tracking.boardingStatus,
          tracking.boardedAt,
          effectiveTimeZone,
        )}
        dropping={droppingLabel(
          tracking.droppingStatus,
          tracking.droppedAt,
          effectiveTimeZone,
        )}
      />

      {viewer === "parent" ? (
        <NotRidingTodayCard
          instituteId={instituteId}
          studentId={studentId}
          participation={rideException}
          onChanged={refreshAll}
          timeZone={effectiveTimeZone}
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
              ? `${approachEta} · ${tracking.nextStopName}`
              : summary.driverName ?? "Contact school transport office"
          }
          tone={tracking.sharedTripActive ? "primary" : "default"}
        />
        <StatCard
          icon={MapPin}
          label="Assigned location"
          value={summary.pickupStop?.name ?? "Stop not assigned"}
          hint={
            summary.pickupStop?.locationLabel ??
            (viewer === "parent"
              ? "Action required: Request stop assignment below"
              : "Ask the driver or Admin to assign a transport location")
          }
          tone={summary.pickupStop ? "default" : "warning"}
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
        <HistoryList days={historyDays} timeZone={effectiveTimeZone} />
      </SectionCard>

      {viewer === "parent" ? (
        <div id="report-transport-issue">
          <ReportTransportIssueCard
            instituteId={instituteId}
            studentId={studentId}
            studentName={summary.studentName}
          />
        </div>
      ) : null}
    </div>
  );
}
