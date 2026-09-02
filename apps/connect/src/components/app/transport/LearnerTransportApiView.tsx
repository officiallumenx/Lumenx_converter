import { useEffect, useState, useCallback, useMemo } from "react";
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
import { loadLearnerTransport } from "@/lib/transport";
import type { LearnerTransportSummary } from "@/lib/transport";
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
  const [summary, setSummary] = useState<LearnerTransportSummary | null>(null);
  const [live, setLive] = useState<Awaited<ReturnType<typeof loadLearnerTransportLive>>>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [empty, setEmpty] = useState<string | null>(null);
  const [liveTick, setLiveTick] = useState(0);

  const reload = useCallback(() => {
    setLoading(true);
    setError(null);
    setEmpty(null);
    void loadLearnerTransport({ instituteId, studentId }).then(async (state) => {
      if (state.status === "ready") {
        setSummary(state.summary);
        const liveData = await loadLearnerTransportLive({ instituteId, studentId });
        setLive(liveData);
        setLoading(false);
        return;
      }
      if (state.status === "empty") {
        setSummary(null);
        setEmpty(state.message);
        setLoading(false);
        return;
      }
      if (state.status === "error") {
        setError(state.message);
        setLoading(false);
        return;
      }
      setLoading(false);
    });
  }, [instituteId, studentId]);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    try {
      const supabase = getSupabaseBrowserClient();
      return subscribeTransportRealtime(supabase, {
        instituteId,
        onChange: reload,
      });
    } catch {
      return undefined;
    }
  }, [instituteId, reload]);

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
          tone={tracking.sharedTripActive ? "primary" : "neutral"}
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
