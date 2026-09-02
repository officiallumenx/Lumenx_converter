import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardHeader, Kpi, PageStack, Pill } from "@lumenx/ui-admin";
import { Link } from "@tanstack/react-router";
import { Bus, MapPin, Route, Siren, Users } from "lucide-react";
import { subscribeTransportRealtime } from "@lumenx/utils";
import { ADMIN_MODULE_LABELS as M } from "@/lib/admin-module-labels";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { getTransportAnalytics } from "@/lib/transport/ops-api";
import type { TransportAnalyticsDto } from "@/lib/transport/types";

type Props = {
  instituteId: string;
};

export function TransportAnalyticsApiPanel({ instituteId }: Props) {
  const [analytics, setAnalytics] = useState<TransportAnalyticsDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getTransportAnalytics({ instituteId, tripDate: today });
      setAnalytics(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }, [instituteId, today]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    try {
      const supabase = getSupabaseBrowserClient();
      return subscribeTransportRealtime(supabase, {
        instituteId,
        onChange: () => {
          void reload();
        },
      });
    } catch {
      return undefined;
    }
  }, [instituteId, reload]);

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading analytics…</p>;
  }

  if (error) {
    return <p className="text-sm text-destructive">{error}</p>;
  }

  if (!analytics) {
    return <p className="text-sm text-muted-foreground">No analytics available.</p>;
  }

  return (
    <PageStack>
      <Pill tone="neutral">Analytics · API mode · {analytics.tripDate}</Pill>

      <div className="lx-kpi-grid">
        <Kpi label="Configured routes" value={String(analytics.configuredRoutes)} icon={<Route className="size-3.5" />} />
        <Kpi label="Locked routes" value={String(analytics.lockedRoutes)} />
        <Kpi label="Pending setup" value={String(analytics.pendingRouteSetup)} />
        <Kpi
          label="Transport students"
          value={String(analytics.approvedEnrollments)}
          icon={<Users className="size-3.5" />}
        />
        <Kpi label="Fleet buses" value={String(analytics.totalVehicles)} icon={<Bus className="size-3.5" />} />
        <Kpi label="Approved stops" value={String(analytics.approvedStops)} icon={<MapPin className="size-3.5" />} />
        <Kpi label="Trips today" value={String(analytics.tripsToday)} />
        <Kpi label="Active trips" value={String(analytics.activeTrips)} />
        <Kpi label="Boarded today" value={String(analytics.boardedToday)} />
        <Kpi
          label="Open SOS"
          value={String(analytics.openEmergencies)}
          icon={<Siren className="size-3.5" />}
        />
      </div>

      <Card className="mt-4">
        <CardHeader
          title="Transport insights"
          hint="Live KPIs from fleet, enrollments, trips, and emergencies"
        />
        <div className="space-y-3 px-5 pb-5 text-xs text-muted-foreground">
          <p>
            Counts reflect approved routes, stops, and enrollments plus operational trip data
            for {analytics.tripDate}. This view is analytics only — download Excel, PDF, or CSV
            from the Reporting Center.
          </p>
          <ul className="list-disc space-y-1 pl-4">
            <li>
              {analytics.totalRoutes} routes · {analytics.totalDrivers} drivers ·{" "}
              {analytics.totalStops} total stops
            </li>
            <li>
              {analytics.activeEnrollments} active enrollments · {analytics.completedTripsToday}{" "}
              completed trips today
            </li>
            <li>{analytics.boardingMarksToday} attendance marks recorded today</li>
          </ul>
          <p>
            <Link to="/reports" className="font-medium text-primary hover:underline">
              Open {M.reports}
            </Link>{" "}
            for transport exports.
          </p>
        </div>
      </Card>
    </PageStack>
  );
}
