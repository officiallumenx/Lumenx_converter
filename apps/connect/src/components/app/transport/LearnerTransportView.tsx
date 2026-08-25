import { useMemo, useSyncExternalStore } from "react";
import { Bus, Clock, MapPin } from "lucide-react";
import { PageHeader } from "@/components/app/PageHeader";
import { StatCard } from "@/components/app/StatCard";
import { TransportAlertsList } from "@/components/app/transport/TransportAlertsList";
import { TransportBusCard } from "@/components/app/transport/TransportBusCard";
import {
  TransportEtaBanner,
  TransportRouteTimeline,
  TransportTrackingPanel,
} from "@/components/app/transport/TransportRouteTimeline";
import { transportStore } from "@/lib/transport-store";
import { formatEtaMinutes } from "@/lib/transport-utils";

type LearnerTransportViewProps = {
  title?: string;
  subtitle: string;
  headerExtra?: React.ReactNode;
  viewer: "parent" | "student";
};

export function LearnerTransportView({
  title = "Transport",
  subtitle,
  headerExtra,
  viewer,
}: LearnerTransportViewProps) {
  const assignment = useSyncExternalStore(
    transportStore.subscribe,
    transportStore.getAssignment,
    transportStore.getAssignment,
  );
  const tracking = useSyncExternalStore(
    transportStore.subscribe,
    transportStore.getTracking,
    transportStore.getTracking,
  );
  const allAlerts = useSyncExternalStore(
    transportStore.subscribe,
    transportStore.getAlerts,
    transportStore.getAlerts,
  );
  const alerts = useMemo(
    () =>
      allAlerts.filter(
        (alert) =>
          !alert.studentId ||
          alert.studentId === assignment.studentId ||
          alert.studentName === assignment.studentName,
      ),
    [allAlerts, assignment.studentId, assignment.studentName],
  );
  const routeOverview = useSyncExternalStore(
    transportStore.subscribe,
    transportStore.getRouteOverview,
    transportStore.getRouteOverview,
  );

  return (
    <div className="min-w-0 max-w-full space-y-5">
      {headerExtra}
      <PageHeader title={title} subtitle={subtitle} />

      <TransportEtaBanner tracking={tracking} assignment={assignment} viewer={viewer} />

      <TransportTrackingPanel tracking={tracking} />

      <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard
          icon={Bus}
          label="Assigned bus"
          value={assignment.bus.busNumber}
          hint={assignment.bus.routeCode}
          tone="warning"
        />
        <StatCard
          icon={Clock}
          label={
            tracking.learnerStatus === "awaiting_pickup" ? "Time to your stop" : "Journey status"
          }
          value={
            tracking.learnerStatus === "reached_school"
              ? "Reached school"
              : tracking.learnerStatus === "picked_up"
                ? "Picked up"
                : formatEtaMinutes(tracking.etaMinutes)
          }
          hint={
            tracking.learnerStatus === "awaiting_pickup"
              ? `Scheduled ${assignment.morningPickupTime}`
              : tracking.learnerStatus === "picked_up"
                ? "Heading to school"
                : "Arrived safely"
          }
          tone={
            tracking.learnerStatus === "awaiting_pickup" && tracking.etaMinutes <= 5
              ? "warning"
              : "primary"
          }
        />
        <StatCard
          icon={MapPin}
          label="Pickup stop"
          value={assignment.pickupStop.name.split(" ").slice(0, 2).join(" ")}
          hint={assignment.pickupStop.scheduledTime}
        />
      </div>

      <div className="min-w-0">
        <TransportBusCard assignment={assignment} />
      </div>

      <TransportRouteTimeline
        stops={routeOverview.stops}
        tracking={tracking}
        highlightStopId={assignment.pickupStop.id}
      />

      <TransportAlertsList
        alerts={alerts}
        onMarkRead={transportStore.markAlertRead}
        onMarkAllRead={transportStore.markAllAlertsRead}
      />
    </div>
  );
}
