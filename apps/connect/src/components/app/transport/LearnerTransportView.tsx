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
};

export function LearnerTransportView({
  title = "Transport",
  subtitle,
  headerExtra,
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

      <TransportEtaBanner tracking={tracking} />

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
          label="Time to bus"
          value={formatEtaMinutes(tracking.etaMinutes)}
          hint={`Pickup ${assignment.morningPickupTime}`}
          tone={tracking.etaMinutes <= 5 ? "warning" : "primary"}
        />
        <StatCard
          icon={MapPin}
          label="Pickup stop"
          value={assignment.pickupStop.name.split(" ").slice(0, 2).join(" ")}
          hint={assignment.pickupStop.scheduledTime}
        />
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-2">
        <TransportBusCard assignment={assignment} />
        <TransportTrackingPanel tracking={tracking} />
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
