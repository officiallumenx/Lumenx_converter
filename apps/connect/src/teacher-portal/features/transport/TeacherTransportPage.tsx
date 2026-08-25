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
import { EmptyState } from "@/teacher-portal/shared/ui/EmptyState";

export function TeacherTransportPage() {
  const portal = useTeacherPortal();
  const hasTransport = portal.isTeacher && portal.profile?.hasTransport === true;

  useEffect(() => {
    if (hasTransport) {
      transportStore.init(undefined, "teacher");
    }
  }, [hasTransport]);

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

  if (!portal.isTeacher) return <PageSkeleton rows={5} />;
  if (portal.isLoading || !portal.profile) return <PageSkeleton rows={6} />;

  if (!hasTransport) {
    return (
      <div className="min-w-0 max-w-full space-y-5">
        <PageHeader
          title="Transport"
          subtitle="School bus routes and pickup tracking"
        />
        <EmptyState
          icon={Bus}
          title="No transport for you"
          description="Your school has not enabled transport access on your account, or this institute does not run a bus service for staff. Contact the admin office if you believe this is a mistake."
        />
      </div>
    );
  }

  const pickupStop = routeOverview.stops[0];
  const dropStop = routeOverview.stops[routeOverview.stops.length - 1];

  // First paint / empty ops can briefly have no stops — never crash on stops[0]!.
  if (!pickupStop || !dropStop) {
    return <PageSkeleton rows={6} />;
  }

  const displayStudents = classStudents.length > 0 ? classStudents : routeStudents;
  const onBusCount = displayStudents.filter(
    (s) => s.status === "picked_up" || s.status === "on_bus" || s.status === "dropped_school",
  ).length;
  const unreadAlerts = unreadTransportAlertCount(alerts);

  const assignment = {
    bus: routeOverview.bus,
    pickupStop,
    dropStop,
    morningPickupTime: pickupStop.scheduledTime,
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
