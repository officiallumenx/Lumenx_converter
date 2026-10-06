import { useMemo } from "react";
import { Card, CardHeader, Kpi, PageStack, Pill } from "@lumenx/ui-admin";
import { Link } from "@tanstack/react-router";
import { Bus, MapPin, Route, Siren, Users } from "lucide-react";
import { ADMIN_MODULE_LABELS as M } from "@/lib/admin-module-labels";
import { useTransportAnalyticsOpsQuery } from "@/lib/admin-queries";
import { useTransportRealtimeInvalidate } from "@/lib/transport/use-transport-realtime-invalidate";

type Props = {
  instituteId: string;
  writesEnabled?: boolean;
  onNotify?: (message: string) => void;
};

export function TransportAnalyticsApiPanel({
  instituteId,
}: Props) {
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const analyticsQuery = useTransportAnalyticsOpsQuery(instituteId, today);
  useTransportRealtimeInvalidate(instituteId);

  const analytics = analyticsQuery.data ?? null;

  if (analyticsQuery.isLoading && !analytics) {
    return <p className="text-sm text-muted-foreground">Loading analytics…</p>;
  }

  if (analyticsQuery.isError && !analytics) {
    return (
      <p className="text-sm text-destructive">
        {analyticsQuery.error instanceof Error
          ? analyticsQuery.error.message
          : "Failed to load analytics"}
      </p>
    );
  }

  if (!analytics) {
    return <p className="text-sm text-muted-foreground">No analytics available.</p>;
  }

  return (
    <PageStack>
      <Pill tone="neutral">Analytics · {analytics.tripDate}</Pill>

      <div className="lx-kpi-grid">
        <Kpi label="Active buses" value={String(analytics.activeBuses ?? 0)} icon={<Bus className="size-3.5" />} />
        <Kpi label="Total buses" value={String(analytics.totalVehicles)} icon={<Bus className="size-3.5" />} />
        <Kpi label="Active drivers" value={String(analytics.activeDrivers ?? 0)} />
        <Kpi label="Total drivers" value={String(analytics.totalDrivers)} />
        <Kpi
          label="Students using transport"
          value={String(analytics.studentsUsingTransport ?? analytics.activeEnrollments)}
          icon={<Users className="size-3.5" />}
        />
        <Kpi label="Active trips" value={String(analytics.activeTrips)} />
        <Kpi label="Delayed trips" value={String(analytics.delayedTrips ?? 0)} />
        <Kpi
          label="Open SOS"
          value={String(analytics.openEmergencies)}
          icon={<Siren className="size-3.5" />}
        />
        <Kpi
          label="Buses with stale GPS"
          value={String(analytics.busesWithStaleGps ?? 0)}
          icon={<MapPin className="size-3.5" />}
        />
        <Kpi label="Configured routes" value={String(analytics.configuredRoutes)} icon={<Route className="size-3.5" />} />
        <Kpi label="Trips today" value={String(analytics.tripsToday)} />
        <Kpi label="Boarded today" value={String(analytics.boardedToday)} />
      </div>

      <Card>
        <CardHeader
          title={`${M.transport} snapshot`}
          hint="Live vehicles overview"
        />
        <p className="px-5 pb-5 text-sm text-muted-foreground">
          Showing route configuration, enrollments, trips, and emergencies for {analytics.tripDate}.
          CSV exports live in{" "}
          <Link to="/reports" className="text-primary underline-offset-2 hover:underline">
            Reports
          </Link>
          .
        </p>
      </Card>
    </PageStack>
  );
}
