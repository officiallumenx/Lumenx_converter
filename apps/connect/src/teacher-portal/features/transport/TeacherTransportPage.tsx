import { useEffect, useMemo, useState, useSyncExternalStore, useCallback } from "react";
import { Bus, Clock, Users } from "lucide-react";
import { subscribeTransportRealtime } from "@lumenx/utils";
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
import { useApp } from "@/lib/app-state";
import { isApiAuthMode } from "@/auth/auth-mode";
import { loadTeacherClassTransport } from "@/lib/transport";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { transportStore } from "@/lib/transport-store";
import { formatEtaMinutes, unreadTransportAlertCount } from "@/lib/transport-utils";
import { PageSkeleton } from "@/teacher-portal/shared/ui/PageSkeleton";
import { EmptyState } from "@/teacher-portal/shared/ui/EmptyState";
import type { TeacherClassTransportRow } from "@/lib/transport";

export function TeacherTransportPage() {
  const portal = useTeacherPortal();
  const { activeInstituteId } = useApp();
  const apiMode = isApiAuthMode();
  const hasTransport = portal.isTeacher && portal.profile?.hasTransport === true;
  const [apiRoster, setApiRoster] = useState<TeacherClassTransportRow[]>([]);
  const [apiRosterLoading, setApiRosterLoading] = useState(false);

  const reloadApiRoster = useCallback(() => {
    if (!apiMode || !hasTransport || !activeInstituteId) return;
    setApiRosterLoading(true);
    void loadTeacherClassTransport({ instituteId: activeInstituteId }).then((state) => {
      if (state.status === "ready") setApiRoster(state.rows);
      setApiRosterLoading(false);
    });
  }, [apiMode, hasTransport, activeInstituteId]);

  useEffect(() => {
    reloadApiRoster();
  }, [reloadApiRoster, portal.classes.length]);

  useEffect(() => {
    if (!apiMode || !activeInstituteId) return;
    try {
      const supabase = getSupabaseBrowserClient();
      return subscribeTransportRealtime(supabase, {
        instituteId: activeInstituteId,
        onChange: reloadApiRoster,
      });
    } catch {
      return undefined;
    }
  }, [apiMode, activeInstituteId, reloadApiRoster]);

  useEffect(() => {
    if (hasTransport && !apiMode) {
      transportStore.init(undefined, "teacher");
    }
  }, [hasTransport, apiMode]);

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

  if (apiMode) {
    const assignedCount = apiRoster.filter((r) => r.busNumber).length;
    return (
      <div className="min-w-0 max-w-full space-y-5">
        <PageHeader
          title="Transport management"
          subtitle="Bus assignments for students in your classes"
        />

        <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
          <StatCard
            icon={Users}
            label="Students listed"
            value={String(apiRoster.length)}
            hint="From approved enrollments"
            tone="primary"
          />
          <StatCard
            icon={Bus}
            label="With bus assigned"
            value={String(assignedCount)}
            hint="Active route enrollments"
            tone="success"
          />
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <h2 className="text-sm font-semibold text-foreground">Class bus assignments</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Approved enrollments from the institute transport API. Live ETA and trip tracking are not
            shown here yet.
          </p>
          {apiRosterLoading ? (
            <p className="mt-3 text-sm text-muted-foreground">Loading roster…</p>
          ) : apiRoster.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No bus assignments found.</p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="py-2 pr-4 font-medium">Student</th>
                    <th className="py-2 pr-4 font-medium">Class</th>
                    <th className="py-2 pr-4 font-medium">Roll</th>
                    <th className="py-2 pr-4 font-medium">Route</th>
                    <th className="py-2 font-medium">Bus</th>
                  </tr>
                </thead>
                <tbody>
                  {apiRoster.map((row) => (
                    <tr key={row.studentId} className="border-b border-border/60">
                      <td className="py-2 pr-4">{row.studentName}</td>
                      <td className="py-2 pr-4">
                        {row.classLabel}
                        {row.sectionLabel !== "—" ? ` · ${row.sectionLabel}` : ""}
                      </td>
                      <td className="py-2 pr-4">{row.rollNo}</td>
                      <td className="py-2 pr-4">{row.routeName ?? "—"}</td>
                      <td className="py-2">{row.busNumber ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
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
