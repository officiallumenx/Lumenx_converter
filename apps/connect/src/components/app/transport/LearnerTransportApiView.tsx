import { useEffect, useState, useMemo } from "react";
import { Bus, Clock, MapPin } from "lucide-react";
import { subscribeTransportRealtime } from "@lumenx/utils";
import { PageHeader } from "@/components/app/PageHeader";
import { StatCard } from "@/components/app/StatCard";
import { TransportBusCard } from "@/components/app/transport/TransportBusCard";
import {
  TransportEtaBanner,
  TransportRouteTimeline,
  TransportTrackingPanel,
} from "@/components/app/transport/TransportRouteTimeline";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { useLearnerTransportQuery } from "@/lib/connect-queries/hooks";
import {
  buildLiveTracking,
  loadLearnerTransportLive,
  mapLearnerSummaryToAssignment,
  subscribeLearnerLiveTrip,
  summaryStopsToTimeline,
} from "@/lib/transport/learner-live";
import { formatEtaMinutes } from "@/lib/transport-utils";

type Props = {
  instituteId: string;
  studentId: string;
  subtitle: string;
  headerExtra?: React.ReactNode;
  viewer?: "parent" | "student";
};

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
    refresh,
  } = useLearnerTransportQuery(instituteId, studentId, true);

  const [live, setLive] = useState<Awaited<ReturnType<typeof loadLearnerTransportLive>>>(null);
  const [liveTick, setLiveTick] = useState(0);

  const summary =
    transportState?.status === "ready" ? transportState.summary : null;
  const error =
    transportState?.status === "error" ? transportState.message : null;
  const empty =
    transportState?.status === "empty" ? transportState.message : null;
  const loading = isLoading && !transportState;

  useEffect(() => {
    if (!summary) {
      setLive(null);
      return;
    }
    let cancelled = false;
    void loadLearnerTransportLive({ instituteId, studentId }).then((liveData) => {
      if (!cancelled) setLive(liveData);
    });
    return () => {
      cancelled = true;
    };
  }, [summary, instituteId, studentId]);

  useEffect(() => {
    try {
      const supabase = getSupabaseBrowserClient();
      return subscribeTransportRealtime(supabase, {
        instituteId,
        onChange: refresh,
      });
    } catch {
      return undefined;
    }
  }, [instituteId, refresh]);

  useEffect(() => subscribeLearnerLiveTrip(() => setLiveTick((t) => t + 1)), []);

  const assignment = useMemo(
    () => (summary ? mapLearnerSummaryToAssignment(summary) : null),
    [summary],
  );
  const tracking = useMemo(
    () => (summary && assignment ? buildLiveTracking(summary, assignment, live) : null),
    [summary, assignment, live, liveTick],
  );

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
      </div>
    );
  }

  const pending = summary.approvalStatus === "pending";
  const timelineStops = summaryStopsToTimeline(summary);

  return (
    <div className="min-w-0 max-w-full space-y-5">
      {headerExtra}
      <PageHeader title="Transport" subtitle={subtitle} />

      {pending ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-100">
          Bus enrollment is pending admin approval. Route details will appear once approved.
        </div>
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
          label={
            tracking.learnerStatus === "awaiting_pickup" ? "Time to your stop" : "Journey status"
          }
          value={
            tracking.sharedTripActive
              ? formatEtaMinutes(tracking.etaMinutes)
              : tracking.learnerStatus === "reached_school"
                ? "Reached school"
                : tracking.learnerStatus === "picked_up"
                  ? "Picked up"
                  : "Scheduled"
          }
          hint={
            tracking.sharedTripActive
              ? tracking.nextStopName
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
    </div>
  );
}
