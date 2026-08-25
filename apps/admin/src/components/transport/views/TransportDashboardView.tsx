import { useEffect, useMemo, useSyncExternalStore } from "react";
import { Card, CardHeader, Kpi, Button, PageStack, Pill } from "@lumenx/ui-admin";
import {
  Bus,
  MapPin,
  Route,
  Lock,
  Siren,
  ClipboardCheck,
  Navigation,
  UserRound,
} from "lucide-react";
import {
  getActiveTransportEmergencyCount,
  listActiveTransportEmergencies,
  subscribeTransportEmergencies,
  transportEmergencyTypeLabel,
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
  TRIP_STATUS_LABEL,
  type TransportSnapshot,
} from "@/lib/transport-store";
import type { TransportHubView } from "@/routes/transport";
import { TransportApprovalPanel } from "@/components/transport/TransportApprovalPanel";

type Props = {
  snapshot: TransportSnapshot;
  onNavigate: (view: TransportHubView) => void;
};

function formatWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

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
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  useEffect(() => {
    ensureTripsForDate(today);
  }, [today, snapshot.routes.length]);

  const d = getTransportDashboard(snapshot);

  const pendingCount = useSyncExternalStore(
    subscribeApprovals,
    countPendingTransportReviews,
    countPendingTransportReviews,
  );
  const pendingStops = useSyncExternalStore(
    subscribeApprovals,
    () => loadPendingStopRequests().length,
    () => 0,
  );

  const activeCount = useSyncExternalStore(
    subscribeTransportEmergencies,
    getActiveTransportEmergencyCount,
    getActiveTransportEmergencyCount,
  );
  const activeList = useSyncExternalStore(
    subscribeTransportEmergencies,
    listActiveTransportEmergencies,
    listActiveTransportEmergencies,
  );

  const todayTrips = snapshot.trips
    .filter((t) => t.date === today || normalizeTripStatus(t.status) === "running")
    .slice(0, 6)
    .map((t) => ({
      ...t,
      status: normalizeTripStatus(t.status),
    }));

  return (
    <PageStack>
      <div className="lx-kpi-grid">
        <Kpi label="Drivers" value={String(snapshot.drivers.length)} />
        <Kpi label="Buses" value={String(snapshot.vehicles.length)} />
        <Kpi label="Routes" value={String(d.totalRoutes)} />
        <Kpi label="Configured" value={String(d.configuredRoutes)} />
        <Kpi label="Locked routes" value={String(d.lockedRoutes)} />
        <Kpi label="Pending requests" value={String(pendingCount)} />
        <Kpi label="Pending stops" value={String(pendingStops)} />
        <Kpi label="Active SOS" value={String(activeCount)} />
      </div>

      {pendingCount > 0 ? (
        <div className="mt-4 space-y-2">
          <TransportApprovalPanel
            title="Pending requests needing review"
            hint="Approve activates for the driver · Decline requires a reason"
          />
          <Button size="sm" variant="outline" onClick={() => onNavigate("reviews")}>
            <ClipboardCheck className="size-3.5" /> Open full review queue
          </Button>
        </div>
      ) : (
        <Card className="mt-4">
          <CardHeader title="Pending requests" hint="Driver stop and assignment submissions" />
          <div className="px-5 pb-5 flex flex-wrap items-center gap-2">
            <p className="text-sm text-muted-foreground">No pending Transport requests.</p>
            <Button size="sm" onClick={() => onNavigate("reviews")}>
              <ClipboardCheck className="size-3.5" /> Review queue
            </Button>
          </div>
        </Card>
      )}

      <Card className="mt-4">
        <CardHeader
          title="Today trips"
          hint="Driver · Bus · Route · Status"
          action={
            <Button size="sm" onClick={() => onNavigate("trips")}>
              <Navigation className="size-3.5" /> All trips
            </Button>
          }
        />
        <div className="px-5 pb-5">
          {todayTrips.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No trips yet. Configure routes to generate morning/evening schedules.
            </p>
          ) : (
            <ul className="divide-y divide-border rounded-lg border border-border">
              {todayTrips.map((t) => (
                <li
                  key={t.id}
                  className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">
                      {t.driverName} · {t.vehicleLabel}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {t.routeName} · {t.slot} · {t.studentsCount} students
                    </p>
                  </div>
                  <Pill
                    tone={
                      t.status === "running"
                        ? "warning"
                        : t.status === "completed"
                          ? "success"
                          : t.status === "ready"
                            ? "warning"
                            : "neutral"
                    }
                  >
                    {TRIP_STATUS_LABEL[t.status] ?? t.status}
                  </Pill>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>

      <Card className="mt-4">
        <CardHeader
          title="Transport emergencies"
          hint="Driver SOS · frontend only · no SMS / push / calls"
          action={
            <Pill tone={activeCount ? "danger" : "neutral"}>{activeCount} active</Pill>
          }
        />
        <div className="px-5 pb-5 space-y-3">
          {activeList.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No active SOS. Open Emergencies for history and resolved cases.
            </p>
          ) : (
            <ul className="divide-y divide-border rounded-lg border border-border">
              {activeList.slice(0, 4).map((e) => (
                <li key={e.id} className="flex items-start justify-between gap-3 px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">
                      {e.id} · {transportEmergencyTypeLabel(e.type)}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {e.routeCode} · {e.vehicleNumber} · {e.driverName} ·{" "}
                      {formatWhen(e.createdAt)}
                    </p>
                  </div>
                  <Pill tone="danger">active</Pill>
                </li>
              ))}
            </ul>
          )}
          <Button variant="primary" size="sm" onClick={() => onNavigate("emergencies")}>
            <Siren className="size-3.5" /> Open emergencies
          </Button>
        </div>
      </Card>

      <Card className="mt-4">
        <CardHeader title="Quick actions" hint="Admin Transport controls" />
        <div className="px-5 pb-5 flex flex-wrap gap-2">
          <Button variant="primary" size="sm" onClick={() => onNavigate("reviews")}>
            <ClipboardCheck className="size-3.5" /> Pending requests
          </Button>
          <Button size="sm" onClick={() => onNavigate("routes")}>
            <Route className="size-3.5" /> Routes and lock
          </Button>
          <Button size="sm" onClick={() => onNavigate("routes")}>
            <Lock className="size-3.5" /> Lock / Unlock
          </Button>
          <Button size="sm" onClick={() => onNavigate("trips")}>
            <Navigation className="size-3.5" /> Trip overview
          </Button>
          <Button size="sm" onClick={() => onNavigate("vehicles")}>
            <Bus className="size-3.5" /> Vehicles
          </Button>
          <Button size="sm" onClick={() => onNavigate("drivers")}>
            <UserRound className="size-3.5" /> Drivers
          </Button>
          <Button size="sm" onClick={() => onNavigate("stops")}>
            <MapPin className="size-3.5" /> Catalogue Stops
          </Button>
          <Button size="sm" onClick={() => onNavigate("emergencies")}>
            <Siren className="size-3.5" /> Emergencies
          </Button>
        </div>
      </Card>
    </PageStack>
  );
}
