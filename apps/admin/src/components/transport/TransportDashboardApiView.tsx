import { Card, CardHeader, Button, PageStack, Pill } from "@lumenx/ui-admin";
import {
  AlertTriangle,
  Bus,
  MapPin,
  Navigation,
  Route,
  Siren,
  UserRound,
  Users,
} from "lucide-react";
import type { ReactNode } from "react";
import { useMemo } from "react";
import type { TransportHubView } from "@/routes/transport";
import type {
  TransportDriversListView,
  TransportEnrollmentsListView,
  TransportRoutesListView,
  TransportVehiclesListView,
} from "@/lib/transport";
import { TransportPendingStopsActionCard } from "@/components/transport/TransportPendingStopsActionCard";
import {
  useTransportAnalyticsOpsQuery,
  useTransportEmergenciesQuery,
  useTransportTripsQuery,
} from "@/lib/admin-queries";
import { useTransportRealtimeInvalidate } from "@/lib/transport/use-transport-realtime-invalidate";
import {
  filterMonitorTrips,
  isTripActive,
  isTripDelayed,
  isTripGpsStale,
} from "@/lib/transport/monitor-helpers";

type Props = {
  vehiclesView: TransportVehiclesListView;
  driversView: TransportDriversListView;
  routesView: TransportRoutesListView;
  enrollmentsView: TransportEnrollmentsListView;
  instituteId?: string | null;
  writesEnabled?: boolean;
  onNotify?: (message: string) => void;
  onNavigate: (view: TransportHubView) => void;
};

function countOrDash(valid: boolean, value: number | undefined | null): string {
  if (!valid || value == null) return "…";
  return String(value);
}

function StatCell({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: string;
  icon?: ReactNode;
  tone?: "default" | "warning" | "danger" | "success";
}) {
  const toneClass =
    tone === "danger"
      ? "bg-destructive/10"
      : tone === "warning"
        ? "bg-warning/10"
        : tone === "success"
          ? "bg-success/10"
          : "bg-muted/40";
  return (
    <div className={`min-w-0 rounded-md px-2.5 py-2 ${toneClass}`}>
      <div className="flex items-center justify-between gap-1">
        <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        {icon ? <span className="text-muted-foreground" aria-hidden>{icon}</span> : null}
      </div>
      <p className="mt-0.5 text-lg font-semibold tabular-nums leading-none">{value}</p>
    </div>
  );
}

export function TransportDashboardApiView({
  vehiclesView,
  driversView,
  routesView,
  enrollmentsView,
  instituteId,
  writesEnabled = true,
  onNotify,
  onNavigate,
}: Props) {
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const analyticsQuery = useTransportAnalyticsOpsQuery(instituteId, today, Boolean(instituteId));
  const tripsQuery = useTransportTripsQuery(instituteId, today, Boolean(instituteId));
  const emergenciesQuery = useTransportEmergenciesQuery(instituteId, Boolean(instituteId));
  useTransportRealtimeInvalidate(instituteId ?? "");

  const analytics = analyticsQuery.data;
  const trips = tripsQuery.data ?? [];
  const emergencies = emergenciesQuery.data ?? [];
  const opsReady = Boolean(analytics) || trips.length > 0 || !analyticsQuery.isLoading;

  const fleetValid =
    vehiclesView.rowsValid &&
    driversView.rowsValid &&
    routesView.rowsValid &&
    enrollmentsView.rowsValid;

  const activeBuses =
    analytics?.activeBuses ??
    new Set(trips.filter(isTripActive).map((t) => t.vehicleId)).size;
  const totalBuses = analytics?.totalVehicles ?? (fleetValid ? vehiclesView.items.length : null);
  const activeDrivers =
    analytics?.activeDrivers ??
    new Set(trips.filter(isTripActive).map((t) => t.driverId)).size;
  const totalDrivers = analytics?.totalDrivers ?? (fleetValid ? driversView.items.length : null);
  const studentsUsing =
    analytics?.studentsUsingTransport ??
    (fleetValid
      ? enrollmentsView.items.filter((e) => e.status === "active").length
      : null);
  const activeTrips = analytics?.activeTrips ?? trips.filter(isTripActive).length;
  const delayedTrips =
    analytics?.delayedTrips ?? trips.filter((t) => isTripActive(t) && isTripDelayed(t)).length;
  const openEmergencies =
    analytics?.openEmergencies ??
    emergencies.filter((e) => e.status === "active" || e.status === "acknowledged").length;
  const staleGps =
    analytics?.busesWithStaleGps ?? trips.filter(isTripGpsStale).length;

  const activePreview = filterMonitorTrips(trips, "active", emergencies).slice(0, 4);

  return (
    <PageStack className="gap-3">
      <Card>
        <CardHeader
          title="Operations command center"
          hint={
            opsReady
              ? `Live for ${today} · realtime updates without full reload`
              : "Loading live transport metrics…"
          }
          action={
            <div className="flex flex-wrap gap-1.5">
              <Button size="sm" variant="outline" onClick={() => onNavigate("trips")}>
                Monitor trips
              </Button>
              <Button size="sm" variant="outline" onClick={() => onNavigate("emergencies")}>
                Emergencies
              </Button>
            </div>
          }
        />
        <div className="grid grid-cols-2 gap-2 px-4 pb-3 sm:grid-cols-3 lg:grid-cols-5 sm:px-5">
          <StatCell
            label="Active buses"
            value={countOrDash(opsReady, activeBuses)}
            icon={<Bus className="size-3.5" />}
            tone={activeBuses ? "success" : "default"}
          />
          <StatCell
            label="Total buses"
            value={countOrDash(opsReady || fleetValid, totalBuses)}
            icon={<Bus className="size-3.5" />}
          />
          <StatCell
            label="Active drivers"
            value={countOrDash(opsReady, activeDrivers)}
            icon={<UserRound className="size-3.5" />}
          />
          <StatCell
            label="Total drivers"
            value={countOrDash(opsReady || fleetValid, totalDrivers)}
            icon={<UserRound className="size-3.5" />}
          />
          <StatCell
            label="Students using transport"
            value={countOrDash(opsReady || fleetValid, studentsUsing)}
            icon={<Users className="size-3.5" />}
          />
          <StatCell
            label="Active trips"
            value={countOrDash(opsReady, activeTrips)}
            icon={<Navigation className="size-3.5" />}
            tone={activeTrips ? "warning" : "default"}
          />
          <StatCell
            label="Delayed trips"
            value={countOrDash(opsReady, delayedTrips)}
            icon={<AlertTriangle className="size-3.5" />}
            tone={delayedTrips ? "warning" : "default"}
          />
          <StatCell
            label="Emergencies"
            value={countOrDash(opsReady, openEmergencies)}
            icon={<Siren className="size-3.5" />}
            tone={openEmergencies ? "danger" : "default"}
          />
          <StatCell
            label="Buses with stale GPS"
            value={countOrDash(opsReady, staleGps)}
            icon={<MapPin className="size-3.5" />}
            tone={staleGps ? "danger" : "default"}
          />
          <StatCell
            label="Routes"
            value={countOrDash(
              fleetValid,
              analytics?.totalRoutes ?? routesView.items.length,
            )}
            icon={<Route className="size-3.5" />}
          />
        </div>
      </Card>

      {instituteId ? (
        <TransportPendingStopsActionCard
          instituteId={instituteId}
          writesEnabled={writesEnabled}
          onNotify={onNotify}
          onOpenReviews={() => onNavigate("reviews")}
        />
      ) : null}

      <Card>
        <CardHeader
          title="Active now"
          hint="Tap Monitor trips for filters, search, and bus detail"
          action={
            <Pill tone={activePreview.length ? "warning" : "neutral"}>
              {activePreview.length} showing
            </Pill>
          }
        />
        <div className="space-y-2 px-4 pb-4">
          {activePreview.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No active trips right now. Drivers start trips from the Transport app.
            </p>
          ) : (
            activePreview.map((trip) => (
              <button
                key={trip.id}
                type="button"
                className="flex w-full flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-left text-sm hover:bg-muted/40"
                onClick={() => onNavigate("trips")}
              >
                <span className="font-medium text-foreground">
                  {trip.vehicleNumber ?? "Bus"} · {trip.routeName ?? "Route"}
                </span>
                <span className="text-muted-foreground">
                  {trip.driverName ?? "—"} · {trip.phase}
                  {trip.currentStopName ? ` · ${trip.currentStopName}` : ""}
                </span>
              </button>
            ))
          )}
          <div className="flex flex-wrap gap-2 pt-1">
            <Button size="sm" onClick={() => onNavigate("trips")}>
              Open live monitor
            </Button>
            <Button size="sm" variant="outline" onClick={() => onNavigate("vehicles")}>
              Fleet setup
            </Button>
            <Button size="sm" variant="outline" onClick={() => onNavigate("attendance")}>
              Attendance
            </Button>
          </div>
        </div>
      </Card>
    </PageStack>
  );
}
