import { useEffect, useMemo, useSyncExternalStore } from "react";
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
import {
  getActiveTransportEmergencyCount,
  subscribeTransportEmergencies,
} from "@lumenx/utils";
import {
  countPendingTransportReviews,
  loadPendingStopRequests,
  TRANSPORT_APPROVAL_CHANGED_EVENT,
} from "@/lib/transport-approval-store";
import {
  ensureTripsForDate,
  getTransportDashboard,
  normalizeTripStatus,
  type TransportSnapshot,
} from "@/lib/transport-store";
import type { TransportHubView } from "@/routes/transport";
import { transportServiceDateToday } from "@/lib/transport/service-date";

type Props = {
  snapshot: TransportSnapshot;
  onNavigate: (view: TransportHubView) => void;
};

function subscribeApprovals(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => undefined;
  window.addEventListener(TRANSPORT_APPROVAL_CHANGED_EVENT, onStoreChange);
  window.addEventListener("storage", onStoreChange);
  return () => {
    window.removeEventListener(TRANSPORT_APPROVAL_CHANGED_EVENT, onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

export function TransportDashboardView({ snapshot, onNavigate }: Props) {
  const today = useMemo(() => transportServiceDateToday(), []);

  useEffect(() => {
    ensureTripsForDate(today);
  }, [today, snapshot.routes.length]);

  const d = getTransportDashboard(snapshot);

  const pendingStops = useSyncExternalStore(
    subscribeApprovals,
    () => loadPendingStopRequests().length,
    () => 0,
  );
  const totalPending = useSyncExternalStore(
    subscribeApprovals,
    countPendingTransportReviews,
    countPendingTransportReviews,
  );
  const pendingStopApprovals = pendingStops > 0 ? pendingStops : totalPending;

  const activeEmergencyCount = useSyncExternalStore(
    subscribeTransportEmergencies,
    getActiveTransportEmergencyCount,
    getActiveTransportEmergencyCount,
  );

  const runningTrips = snapshot.trips.filter(
    (t) => normalizeTripStatus(t.status) === "running",
  );
  const activeTripsCount = runningTrips.length;
  const activeBusesCount = new Set(
    runningTrips.map((t) => t.vehicleLabel).filter(Boolean),
  ).size;

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
              {snapshot.vehicles.length}
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
              {snapshot.drivers.length}
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
              {snapshot.routes.length}
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
              {d.studentsUsingTransport}
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
                  {activeTripsCount}
                </div>
                <p className="text-xs text-muted-foreground">Active trips</p>
              </div>
            </div>
            <Pill tone={activeTripsCount > 0 ? "success" : "neutral"}>
              {activeTripsCount > 0 ? `${activeTripsCount} running` : "Idle"}
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
                  {activeBusesCount}
                </div>
                <p className="text-xs text-muted-foreground">Active buses</p>
              </div>
            </div>
            <Pill tone={activeBusesCount > 0 ? "success" : "neutral"}>
              {activeBusesCount > 0 ? `${activeBusesCount} on road` : "0 on road"}
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
                  activeEmergencyCount > 0
                    ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                <Siren className="size-4" />
              </div>
              <div>
                <div className="text-base font-semibold text-foreground tabular-nums">
                  {activeEmergencyCount}
                </div>
                <p className="text-xs text-muted-foreground">Emergencies</p>
              </div>
            </div>
            <Pill tone={activeEmergencyCount > 0 ? "danger" : "neutral"}>
              {activeEmergencyCount > 0 ? `${activeEmergencyCount} active` : "Clear"}
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
