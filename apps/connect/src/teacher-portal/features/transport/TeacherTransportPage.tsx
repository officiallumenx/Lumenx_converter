import { useEffect, useMemo, useSyncExternalStore } from "react";
import { Bus, Clock, Users } from "lucide-react";
import { PageHeader } from "@/components/app/PageHeader";
import { StatCard } from "@/components/app/StatCard";
import { TransportAlertsList } from "@/components/app/transport/TransportAlertsList";
import { TransportBusCard } from "@/components/app/transport/TransportBusCard";
import {
  TransportEtaBanner,
  TransportRouteTimeline,
  TransportTrackingPanel,
} from "@/components/app/transport/TransportRouteTimeline";
import { TransportStudentsTable } from "@/components/app/transport/TransportStudentsTable";
import { useTeacherPortal } from "@/context/TeacherPortalContext";
import { transportStore } from "@/lib/transport-store";
import { formatEtaMinutes, unreadTransportAlertCount } from "@/lib/transport-utils";
import { PageSkeleton } from "@/teacher-portal/shared/ui/PageSkeleton";

export function TeacherTransportPage() {
  const portal = useTeacherPortal();

  useEffect(() => {
    if (portal.isTeacher) {
      transportStore.init();
    }
  }, [portal.isTeacher]);

  const routeOverview = useSyncExternalStore(
    transportStore.subscribe,
    transportStore.getRouteOverview,
    transportStore.getRouteOverview,
  );
  const tracking = useSyncExternalStore(
    transportStore.subscribe,
    transportStore.getTracking,
    transportStore.getTracking,
  );
  const alerts = useSyncExternalStore(
    transportStore.subscribe,
    transportStore.getAlerts,
    transportStore.getAlerts,
  );
  const routeStudents = useSyncExternalStore(
    transportStore.subscribe,
    transportStore.getRouteStudents,
    transportStore.getRouteStudents,
  );

  const classStudents = useMemo(() => {
    if (!portal.isTeacher || !portal.profile) return routeStudents;
    return routeStudents.filter((s) => portal.profile!.classes.includes(s.className));
  }, [portal.isTeacher, portal.profile, routeStudents]);

  const displayStudents = classStudents.length > 0 ? classStudents : routeStudents;
  const onBusCount = displayStudents.filter(
    (s) => s.status === "picked_up" || s.status === "on_bus" || s.status === "dropped_school",
  ).length;
  const unreadAlerts = unreadTransportAlertCount(alerts);

  if (!portal.isTeacher) return <PageSkeleton rows={5} />;
  if (portal.isLoading || !portal.profile) return <PageSkeleton rows={6} />;

  const assignment = {
    bus: routeOverview.bus,
    pickupStop: routeOverview.stops[0]!,
    dropStop: routeOverview.stops[routeOverview.stops.length - 1]!,
    morningPickupTime: routeOverview.stops[0]!.scheduledTime,
    afternoonDropTime: "15:40",
  };

  return (
    <div className="min-w-0 max-w-full space-y-5">
      <PageHeader
        title="Transport management"
        subtitle={`Monitor ${routeOverview.routeName} · pickup status for students in your classes`}
      />

      <TransportEtaBanner tracking={tracking} />

      <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard
          icon={Bus}
          label="Assigned route"
          value={routeOverview.bus.routeCode}
          hint={routeOverview.routeName}
          tone="warning"
        />
        <StatCard
          icon={Clock}
          label="Next stop ETA"
          value={formatEtaMinutes(tracking.etaMinutes)}
          hint={tracking.nextStopName}
          tone={tracking.etaMinutes <= 5 ? "warning" : "primary"}
        />
        <StatCard
          icon={Users}
          label="Students tracked"
          value={`${onBusCount}/${displayStudents.length}`}
          hint={unreadAlerts > 0 ? `${unreadAlerts} new alerts` : "On route today"}
          tone={unreadAlerts > 0 ? "warning" : "success"}
        />
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-2">
        <TransportBusCard assignment={assignment} />
        <TransportTrackingPanel tracking={tracking} />
      </div>

      <TransportStudentsTable students={displayStudents} />

      <TransportRouteTimeline stops={routeOverview.stops} tracking={tracking} />

      <TransportAlertsList
        alerts={alerts}
        onMarkRead={transportStore.markAlertRead}
        onMarkAllRead={transportStore.markAllAlertsRead}
      />
    </div>
  );
}
