import { useMemo } from "react";
import { Card, CardHeader, PageStack, Pill } from "@lumenx/ui-admin";
import {
  ArrowRight,
  Bus,
  ClipboardCheck,
  Navigation,
  Route,
  Siren,
  UserRound,
  Users,
} from "lucide-react";
import type { TransportHubView } from "@/routes/transport";
import type {
  TransportDriversListView,
  TransportEnrollmentsListView,
  TransportRoutesListView,
  TransportVehiclesListView,
} from "@/lib/transport";
import {
  useTransportAnalyticsOpsQuery,
  useTransportEmergenciesQuery,
  useTransportReviewQueueQuery,
  useTransportTripsQuery,
} from "@/lib/admin-queries";
import { useTransportRealtimeInvalidate } from "@/lib/transport/use-transport-realtime-invalidate";
import { isTripActive } from "@/lib/transport/monitor-helpers";
import { transportServiceDateToday } from "@/lib/transport/service-date";

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

export function TransportDashboardApiView({
  vehiclesView,
  driversView,
  routesView,
  enrollmentsView,
  instituteId,
  onNavigate,
}: Props) {
  const today = useMemo(() => transportServiceDateToday(), []);
  const analyticsQuery = useTransportAnalyticsOpsQuery(instituteId, today, Boolean(instituteId));
  const tripsQuery = useTransportTripsQuery(instituteId, today, Boolean(instituteId));
  const emergenciesQuery = useTransportEmergenciesQuery(instituteId, Boolean(instituteId));
  const reviewQueueQuery = useTransportReviewQueueQuery(instituteId ?? "");
  useTransportRealtimeInvalidate(instituteId ?? "");

  const analytics = analyticsQuery.data;
  const trips = tripsQuery.data ?? [];
  const emergencies = emergenciesQuery.data ?? [];
  const reviewQueue = reviewQueueQuery.data ?? [];

  const fleetValid =
    vehiclesView.rowsValid &&
    driversView.rowsValid &&
    routesView.rowsValid &&
    enrollmentsView.rowsValid;

  const totalBuses =
    analytics?.totalVehicles ?? (fleetValid ? vehiclesView.items.length : vehiclesView.items.length);
  const totalDrivers =
    analytics?.totalDrivers ?? (fleetValid ? driversView.items.length : driversView.items.length);
  const totalRoutes =
    analytics?.totalRoutes ?? (fleetValid ? routesView.items.length : routesView.items.length);
  const studentsUsing =
    analytics?.studentsUsingTransport ??
    (fleetValid
      ? enrollmentsView.items.filter((e) => e.status === "active").length
      : enrollmentsView.items.length);

  const activeBuses =
    analytics?.activeBuses ??
    new Set(trips.filter(isTripActive).map((t) => t.vehicleId)).size;
  const activeTrips = analytics?.activeTrips ?? trips.filter(isTripActive).length;
  const openEmergencies =
    analytics?.openEmergencies ??
    emergencies.filter((e) => e.status === "active" || e.status === "acknowledged").length;

  const pendingStopApprovals = reviewQueue.filter(
    (item) => item.kind === "stop" || item.kind === "route",
  ).length;

  const handleKeyNavigation = (e: React.KeyboardEvent, targetView: TransportHubView) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onNavigate(targetView);
    }
  };

  return (
    <PageStack className="gap-5">
      {/* Primary Management Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* 1. Vehicles Card */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => onNavigate("vehicles")}
          onKeyDown={(e) => handleKeyNavigation(e, "vehicles")}
          className="group relative flex flex-col justify-between rounded-xl border border-border bg-card p-5 shadow-sm transition-all duration-150 hover:border-primary/50 hover:shadow-md cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary select-none"
          aria-label="Vehicles module — view and manage fleet"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Vehicles
            </span>
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary transition-transform group-hover:scale-110">
              <Bus className="size-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-bold tracking-tight text-foreground tabular-nums">
              {totalBuses}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Total vehicles</p>
          </div>
          <div className="mt-4 flex items-center gap-1 text-xs font-medium text-primary opacity-80 transition-all group-hover:opacity-100 group-hover:translate-x-0.5">
            <span>Manage vehicles</span>
            <ArrowRight className="size-3" />
          </div>
        </div>

        {/* 2. Drivers Card */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => onNavigate("drivers")}
          onKeyDown={(e) => handleKeyNavigation(e, "drivers")}
          className="group relative flex flex-col justify-between rounded-xl border border-border bg-card p-5 shadow-sm transition-all duration-150 hover:border-primary/50 hover:shadow-md cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary select-none"
          aria-label="Drivers module — view and manage drivers"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Drivers
            </span>
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary transition-transform group-hover:scale-110">
              <UserRound className="size-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-bold tracking-tight text-foreground tabular-nums">
              {totalDrivers}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Total drivers</p>
          </div>
          <div className="mt-4 flex items-center gap-1 text-xs font-medium text-primary opacity-80 transition-all group-hover:opacity-100 group-hover:translate-x-0.5">
            <span>Manage drivers</span>
            <ArrowRight className="size-3" />
          </div>
        </div>

        {/* 3. Routes & Stops Card */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => onNavigate("routes")}
          onKeyDown={(e) => handleKeyNavigation(e, "routes")}
          className="group relative flex flex-col justify-between rounded-xl border border-border bg-card p-5 shadow-sm transition-all duration-150 hover:border-primary/50 hover:shadow-md cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary select-none"
          aria-label="Routes and stops module — view and configure routes"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Routes &amp; Stops
            </span>
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary transition-transform group-hover:scale-110">
              <Route className="size-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-bold tracking-tight text-foreground tabular-nums">
              {totalRoutes}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Total routes</p>
          </div>
          <div className="mt-4 flex items-center gap-1 text-xs font-medium text-primary opacity-80 transition-all group-hover:opacity-100 group-hover:translate-x-0.5">
            <span>Manage routes</span>
            <ArrowRight className="size-3" />
          </div>
        </div>

        {/* 4. Students Card */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => onNavigate("students")}
          onKeyDown={(e) => handleKeyNavigation(e, "students")}
          className="group relative flex flex-col justify-between rounded-xl border border-border bg-card p-5 shadow-sm transition-all duration-150 hover:border-primary/50 hover:shadow-md cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary select-none"
          aria-label="Students transport module — view and assign students"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Students
            </span>
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary transition-transform group-hover:scale-110">
              <Users className="size-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-bold tracking-tight text-foreground tabular-nums">
              {studentsUsing}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Students using Transport</p>
          </div>
          <div className="mt-4 flex items-center gap-1 text-xs font-medium text-primary opacity-80 transition-all group-hover:opacity-100 group-hover:translate-x-0.5">
            <span>Manage students</span>
            <ArrowRight className="size-3" />
          </div>
        </div>
      </div>

      {/* Compact Live Operations Section */}
      <Card>
        <CardHeader
          title="Live Operations"
          hint="Real-time operations, vehicle status, and pending approvals"
        />
        <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4 sm:p-5">
          {/* Active Trips */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => onNavigate("trips")}
            onKeyDown={(e) => handleKeyNavigation(e, "trips")}
            className="flex items-center justify-between rounded-lg border border-border bg-background/50 p-3.5 transition-all duration-150 hover:border-primary/40 hover:bg-accent/40 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary select-none group"
            aria-label="View Active Trips"
          >
            <div className="flex items-center gap-3">
              <div className="flex size-8 items-center justify-center rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <Navigation className="size-4" />
              </div>
              <div>
                <div className="text-base font-semibold text-foreground tabular-nums">
                  {activeTrips}
                </div>
                <p className="text-xs text-muted-foreground">Active trips</p>
              </div>
            </div>
            <Pill tone={activeTrips > 0 ? "success" : "neutral"}>
              {activeTrips > 0 ? `${activeTrips} running` : "Idle"}
            </Pill>
          </div>

          {/* Active Buses */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => onNavigate("vehicles")}
            onKeyDown={(e) => handleKeyNavigation(e, "vehicles")}
            className="flex items-center justify-between rounded-lg border border-border bg-background/50 p-3.5 transition-all duration-150 hover:border-primary/40 hover:bg-accent/40 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary select-none group"
            aria-label="View Active Buses"
          >
            <div className="flex items-center gap-3">
              <div className="flex size-8 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <Bus className="size-4" />
              </div>
              <div>
                <div className="text-base font-semibold text-foreground tabular-nums">
                  {activeBuses}
                </div>
                <p className="text-xs text-muted-foreground">Active buses</p>
              </div>
            </div>
            <Pill tone={activeBuses > 0 ? "success" : "neutral"}>
              {activeBuses > 0 ? `${activeBuses} on road` : "0 on road"}
            </Pill>
          </div>

          {/* Emergencies */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => onNavigate("emergencies")}
            onKeyDown={(e) => handleKeyNavigation(e, "emergencies")}
            className="flex items-center justify-between rounded-lg border border-border bg-background/50 p-3.5 transition-all duration-150 hover:border-primary/40 hover:bg-accent/40 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary select-none group"
            aria-label="View Transport Emergencies"
          >
            <div className="flex items-center gap-3">
              <div
                className={`flex size-8 items-center justify-center rounded-md ${
                  openEmergencies > 0
                    ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                <Siren className="size-4" />
              </div>
              <div>
                <div className="text-base font-semibold text-foreground tabular-nums">
                  {openEmergencies}
                </div>
                <p className="text-xs text-muted-foreground">Emergencies</p>
              </div>
            </div>
            <Pill tone={openEmergencies > 0 ? "danger" : "neutral"}>
              {openEmergencies > 0 ? `${openEmergencies} active` : "Clear"}
            </Pill>
          </div>

          {/* Pending Stop Approvals */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => onNavigate("reviews")}
            onKeyDown={(e) => handleKeyNavigation(e, "reviews")}
            className="flex items-center justify-between rounded-lg border border-border bg-background/50 p-3.5 transition-all duration-150 hover:border-primary/40 hover:bg-accent/40 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary select-none group"
            aria-label="View Pending Stop Approvals"
          >
            <div className="flex items-center gap-3">
              <div
                className={`flex size-8 items-center justify-center rounded-md ${
                  pendingStopApprovals > 0
                    ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                <ClipboardCheck className="size-4" />
              </div>
              <div>
                <div className="text-base font-semibold text-foreground tabular-nums">
                  {pendingStopApprovals}
                </div>
                <p className="text-xs text-muted-foreground">Pending approvals</p>
              </div>
            </div>
            <Pill tone={pendingStopApprovals > 0 ? "warning" : "neutral"}>
              {pendingStopApprovals > 0 ? `${pendingStopApprovals} pending` : "All reviewed"}
            </Pill>
          </div>
        </div>
      </Card>
    </PageStack>
  );
}
