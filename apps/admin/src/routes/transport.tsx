import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { AdminPageTransition } from "@/components/AdminPageTransition";
import { TransportHubNav } from "@/components/transport/TransportHubNav";
import { useTransportStore } from "@/components/transport/useTransportStore";
import { TransportDashboardView } from "@/components/transport/views/TransportDashboardView";
import { TransportVehiclesView } from "@/components/transport/views/TransportVehiclesView";
import { TransportDriversView } from "@/components/transport/views/TransportDriversView";
import { TransportStopsView } from "@/components/transport/views/TransportStopsView";
import { TransportRoutesView } from "@/components/transport/views/TransportRoutesView";
import { TransportStudentsView } from "@/components/transport/views/TransportStudentsView";
import { TransportTripsView } from "@/components/transport/views/TransportTripsView";
import { TransportAttendanceView } from "@/components/transport/views/TransportAttendanceView";
import { TransportAnalyticsView } from "@/components/transport/views/TransportAnalyticsView";
import { TransportSettingsView } from "@/components/transport/views/TransportSettingsView";
import { TransportEmergenciesView } from "@/components/transport/views/TransportEmergenciesView";
import { TransportReviewsView } from "@/components/transport/views/TransportReviewsView";
import { parseHubView, validateHubViewSearch } from "@/lib/hub-view-search";
import { ADMIN_MODULE_LABELS as M } from "@/lib/admin-module-labels";
import { startTransportAdminNotificationSync } from "@/lib/transport-notification-sync";
import { useEffect } from "react";

export type TransportHubView =
  | "dashboard"
  | "vehicles"
  | "drivers"
  | "stops"
  | "routes"
  | "students"
  | "reviews"
  | "trips"
  | "attendance"
  | "emergencies"
  | "analytics"
  | "settings";

const VIEW_TITLES: Record<TransportHubView, string> = {
  dashboard: "Transport",
  vehicles: "Vehicles",
  drivers: "Drivers",
  stops: "Stops",
  routes: "Routes",
  students: "Students",
  reviews: "Pending Requests",
  trips: "Trips",
  attendance: "Attendance",
  emergencies: "Emergencies",
  analytics: "Transport Analytics",
  settings: "Transport Settings",
};

const VIEW_SUBTITLES: Record<TransportHubView, string> = {
  dashboard: "Route setup status · fleet and student coverage",
  vehicles: "Manage buses and vans · capacity, status, assigned drivers",
  drivers: "Driver roster · licenses, vehicles, and status",
  stops: "Catalogue stops · optional manual locations",
  routes: "Review driver-configured routes · lock when ready",
  students: "Assign students to a bus · stops sync from driver",
  reviews: "Approve or decline driver stop and assignment requests",
  trips: "Driver · bus · route · trip status overview",
  attendance: "Live boarding and dropping · shared Transport mock",
  emergencies: "Driver SOS · active cases, details, resolve, history",
  analytics: `Live KPIs and insights · exports are in ${M.reports}`,
  settings: "Default radius, pickup buffer, and working days",
};

const TRANSPORT_VIEW_CONFIG = {
  views: [
    "dashboard",
    "vehicles",
    "drivers",
    "stops",
    "routes",
    "students",
    "reviews",
    "trips",
    "attendance",
    "emergencies",
    "analytics",
    "settings",
  ] as const,
  defaultView: "dashboard" as const,
  aliases: {
    assignments: "students",
    reports: "analytics",
    sos: "emergencies",
    emergency: "emergencies",
    pending: "reviews",
    approvals: "reviews",
    boarding: "attendance",
  } as const,
};

export const Route = createFileRoute("/transport")({
  head: () => ({ meta: [{ title: "Transport — LumenX Admin" }] }),
  validateSearch: (search: Record<string, unknown>) =>
    validateHubViewSearch(search, TRANSPORT_VIEW_CONFIG),
  component: TransportPage,
});

function TransportPage() {
  const { view } = Route.useSearch();
  const navigate = useNavigate();
  const { snapshot, setSnapshot } = useTransportStore();

  useEffect(() => {
    startTransportAdminNotificationSync();
  }, []);

  const goToView = (v: TransportHubView) =>
    navigate({ to: "/transport", search: { view: v } });

  return (
    <AppShell title={VIEW_TITLES[view]} subtitle={VIEW_SUBTITLES[view]}>
      <TransportHubNav active={view} />
      <AdminPageTransition pageKey={view}>
        {view === "dashboard" && (
          <TransportDashboardView snapshot={snapshot} onNavigate={goToView} />
        )}
        {view === "vehicles" && (
          <TransportVehiclesView snapshot={snapshot} onChange={setSnapshot} />
        )}
        {view === "drivers" && (
          <TransportDriversView snapshot={snapshot} onChange={setSnapshot} />
        )}
        {view === "stops" && <TransportStopsView snapshot={snapshot} onChange={setSnapshot} />}
        {view === "routes" && <TransportRoutesView snapshot={snapshot} onChange={setSnapshot} />}
        {view === "students" && (
          <TransportStudentsView snapshot={snapshot} onChange={setSnapshot} />
        )}
        {view === "reviews" && <TransportReviewsView />}
        {view === "trips" && <TransportTripsView snapshot={snapshot} />}
        {view === "attendance" && <TransportAttendanceView />}
        {view === "emergencies" && <TransportEmergenciesView />}
        {view === "analytics" && <TransportAnalyticsView snapshot={snapshot} />}
        {view === "settings" && (
          <TransportSettingsView snapshot={snapshot} onChange={setSnapshot} />
        )}
      </AdminPageTransition>
    </AppShell>
  );
}
