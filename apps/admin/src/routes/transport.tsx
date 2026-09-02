import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { AdminPageTransition } from "@/components/AdminPageTransition";
import { TransportHubNav } from "@/components/transport/TransportHubNav";
import { useTransportStore } from "@/components/transport/useTransportStore";
import { TransportEnrollmentsApiView } from "@/components/transport/TransportEnrollmentsApiView";
import { TransportDashboardApiView } from "@/components/transport/TransportDashboardApiView";
import { TransportDashboardView } from "@/components/transport/views/TransportDashboardView";
import { ApiReadUnavailablePanel } from "@/components/ApiReadUnavailablePanel";
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
import { TransportApprovalApiPanel } from "@/components/transport/TransportApprovalApiPanel";
import { TransportTripsApiPanel } from "@/components/transport/TransportTripsApiPanel";
import { TransportAttendanceApiPanel } from "@/components/transport/TransportAttendanceApiPanel";
import { TransportEmergenciesApiPanel } from "@/components/transport/TransportEmergenciesApiPanel";
import { TransportReviewsView } from "@/components/transport/views/TransportReviewsView";
import { parseHubView, validateHubViewSearch } from "@/lib/hub-view-search";
import { ADMIN_MODULE_LABELS as M } from "@/lib/admin-module-labels";
import { startTransportAdminNotificationSync } from "@/lib/transport-notification-sync";
import { useEffect, useMemo, useRef, useState } from "react";
import { isApiAuthMode } from "@/auth/auth-mode";
import { useInstituteContext } from "@/lib/institutes";
import { resolveWritesEnabled } from "@/lib/security/writes-enabled";
import {
  createDriver,
  createStop,
  createVehicle,
  deleteDriver,
  deleteEnrollment,
  deleteStop,
  deleteVehicle,
  loadTransportDriversList,
  loadTransportEnrollmentsList,
  loadTransportRoutesList,
  loadTransportSettings,
  loadTransportVehiclesList,
  resolveTransportDriversListView,
  resolveTransportEnrollmentsListView,
  resolveTransportRoutesListView,
  resolveTransportSettingsView,
  resolveTransportVehiclesListView,
  shouldCommitTransportDriversLoad,
  shouldCommitTransportEnrollmentsLoad,
  shouldCommitTransportRoutesLoad,
  shouldCommitTransportSettingsLoad,
  shouldCommitTransportVehiclesLoad,
  updateDriver,
  updateEnrollment,
  updateRoute,
  updateStop,
  updateVehicle,
  upsertTransportSettings,
  type TransportDriversListStatus,
  type TransportEnrollmentsListStatus,
  type TransportListStatus,
  type TransportRoutesListStatus,
  type TransportSettingsLoadStatus,
  type TransportVehiclesListStatus,
} from "@/lib/transport";
import type {
  TransportDriver,
  TransportRoute,
  TransportSettings,
  TransportVehicle,
} from "@/lib/transport-store";
import type { TransportEnrollmentListItem } from "@/lib/transport";
import { useAdminToast } from "@/components/AdminActionToast";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

function workingDayLabelsToNumbers(days: string[]): number[] {
  return days
    .map((label) => WEEKDAY_LABELS.indexOf(label as (typeof WEEKDAY_LABELS)[number]))
    .filter((index) => index >= 0);
}

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

function transportListHint(
  status: TransportListStatus,
  errorMessage: string | null,
  entityLabel: string,
  forbiddenFallback: string,
): string | null {
  if (status === "loading") return `Loading ${entityLabel}…`;
  if (status === "needs_institute") return `Select an institute to load ${entityLabel}.`;
  if (status === "forbidden") return errorMessage ?? forbiddenFallback;
  if (status === "error") return errorMessage ?? `Failed to load ${entityLabel}.`;
  if (status === "empty") return `No ${entityLabel} found for this institute.`;
  return null;
}

function TransportPage() {
  const { view } = Route.useSearch();
  const navigate = useNavigate();
  const notify = useAdminToast();
  const { snapshot, setSnapshot } = useTransportStore();
  const apiMode = isApiAuthMode();
  const instituteCtx = useInstituteContext();
  const writesEnabled = resolveWritesEnabled(apiMode, { status: instituteCtx.status, activeInstituteId: instituteCtx.activeInstituteId });
  const activeInstituteIdRef = useRef(instituteCtx.activeInstituteId);
  activeInstituteIdRef.current = instituteCtx.activeInstituteId;
  const [reloadKey, setReloadKey] = useState(0);

  const [apiVehicles, setApiVehicles] = useState<TransportVehicle[]>([]);
  const [vehiclesListStatus, setVehiclesListStatus] =
    useState<TransportVehiclesListStatus>(() => (apiMode ? "loading" : "demo"));
  const [vehiclesListError, setVehiclesListError] = useState<string | null>(null);
  const [vehiclesResolvedForInstituteId, setVehiclesResolvedForInstituteId] =
    useState<string | null>(null);

  const [apiDrivers, setApiDrivers] = useState<TransportDriver[]>([]);
  const [driversListStatus, setDriversListStatus] =
    useState<TransportDriversListStatus>(() => (apiMode ? "loading" : "demo"));
  const [driversListError, setDriversListError] = useState<string | null>(null);
  const [driversResolvedForInstituteId, setDriversResolvedForInstituteId] =
    useState<string | null>(null);

  const [apiRoutes, setApiRoutes] = useState<TransportRoute[]>([]);
  const [routesListStatus, setRoutesListStatus] =
    useState<TransportRoutesListStatus>(() => (apiMode ? "loading" : "demo"));
  const [routesListError, setRoutesListError] = useState<string | null>(null);
  const [routesResolvedForInstituteId, setRoutesResolvedForInstituteId] =
    useState<string | null>(null);

  const [apiSettings, setApiSettings] = useState<TransportSettings | null>(null);
  const [settingsLoadStatus, setSettingsLoadStatus] =
    useState<TransportSettingsLoadStatus>(() => (apiMode ? "loading" : "demo"));
  const [settingsLoadError, setSettingsLoadError] = useState<string | null>(null);
  const [settingsResolvedForInstituteId, setSettingsResolvedForInstituteId] =
    useState<string | null>(null);

  const [apiEnrollments, setApiEnrollments] = useState<TransportEnrollmentListItem[]>([]);
  const [enrollmentsListStatus, setEnrollmentsListStatus] =
    useState<TransportEnrollmentsListStatus>(() => (apiMode ? "loading" : "demo"));
  const [enrollmentsListError, setEnrollmentsListError] = useState<string | null>(null);
  const [enrollmentsResolvedForInstituteId, setEnrollmentsResolvedForInstituteId] =
    useState<string | null>(null);

  const vehiclesListView = resolveTransportVehiclesListView({
    apiMode,
    instituteStatus: instituteCtx.status,
    activeInstituteId: instituteCtx.activeInstituteId,
    resolvedForInstituteId: vehiclesResolvedForInstituteId,
    storedItems: apiVehicles,
    storedStatus: vehiclesListStatus,
    storedErrorMessage: vehiclesListError,
    instituteErrorMessage: instituteCtx.errorMessage,
  });

  const driversListView = resolveTransportDriversListView({
    apiMode,
    instituteStatus: instituteCtx.status,
    activeInstituteId: instituteCtx.activeInstituteId,
    resolvedForInstituteId: driversResolvedForInstituteId,
    storedItems: apiDrivers,
    storedStatus: driversListStatus,
    storedErrorMessage: driversListError,
    instituteErrorMessage: instituteCtx.errorMessage,
  });

  const routesListView = resolveTransportRoutesListView({
    apiMode,
    instituteStatus: instituteCtx.status,
    activeInstituteId: instituteCtx.activeInstituteId,
    resolvedForInstituteId: routesResolvedForInstituteId,
    storedItems: apiRoutes,
    storedStatus: routesListStatus,
    storedErrorMessage: routesListError,
    instituteErrorMessage: instituteCtx.errorMessage,
  });

  const enrollmentsListView = resolveTransportEnrollmentsListView({
    apiMode,
    instituteStatus: instituteCtx.status,
    activeInstituteId: instituteCtx.activeInstituteId,
    resolvedForInstituteId: enrollmentsResolvedForInstituteId,
    storedItems: apiEnrollments,
    storedStatus: enrollmentsListStatus,
    storedErrorMessage: enrollmentsListError,
    instituteErrorMessage: instituteCtx.errorMessage,
  });

  const settingsView = resolveTransportSettingsView({
    apiMode,
    instituteStatus: instituteCtx.status,
    activeInstituteId: instituteCtx.activeInstituteId,
    resolvedForInstituteId: settingsResolvedForInstituteId,
    storedSettings: apiSettings,
    storedStatus: settingsLoadStatus,
    storedErrorMessage: settingsLoadError,
    instituteErrorMessage: instituteCtx.errorMessage,
  });

  const vehiclesListHint = transportListHint(
    vehiclesListView.status,
    vehiclesListView.errorMessage,
    "vehicles",
    "You do not have access to transport vehicles for this institute.",
  );

  const driversListHint = transportListHint(
    driversListView.status,
    driversListView.errorMessage,
    "drivers",
    "You do not have access to transport drivers for this institute.",
  );

  const routesListHint = transportListHint(
    routesListView.status,
    routesListView.errorMessage,
    "routes",
    "You do not have access to transport routes for this institute.",
  );

  const stopsListHint = transportListHint(
    routesListView.status,
    routesListView.errorMessage,
    "route stops",
    "You do not have access to transport stops for this institute.",
  );

  const enrollmentsListHint = transportListHint(
    enrollmentsListView.status,
    enrollmentsListView.errorMessage,
    "transport enrollments",
    "You do not have access to transport enrollments for this institute.",
  );

  const settingsHint =
    settingsView.status === "loading"
      ? "Loading transport settings…"
      : settingsView.status === "needs_institute"
        ? "Select an institute to load transport settings."
        : settingsView.status === "forbidden"
          ? settingsView.errorMessage ??
            "You do not have access to transport settings for this institute."
          : settingsView.status === "error"
            ? settingsView.errorMessage ?? "Failed to load transport settings."
            : null;

  useEffect(() => {
    if (!apiMode || (view !== "vehicles" && view !== "dashboard")) return;

    if (instituteCtx.status === "loading") {
      setApiVehicles([]);
      setVehiclesListStatus("loading");
      setVehiclesListError(null);
      setVehiclesResolvedForInstituteId(null);
      return;
    }

    if (
      instituteCtx.status === "error" ||
      instituteCtx.status === "forbidden"
    ) {
      setApiVehicles([]);
      setVehiclesListStatus(
        instituteCtx.status === "forbidden" ? "forbidden" : "error",
      );
      setVehiclesListError(instituteCtx.errorMessage);
      setVehiclesResolvedForInstituteId(null);
      return;
    }

    if (
      instituteCtx.status === "needs_selection" ||
      instituteCtx.status === "empty" ||
      !instituteCtx.activeInstituteId
    ) {
      setApiVehicles([]);
      setVehiclesListStatus("needs_institute");
      setVehiclesListError(null);
      setVehiclesResolvedForInstituteId(null);
      return;
    }

    const requestInstituteId = instituteCtx.activeInstituteId;
    let cancelled = false;
    setVehiclesListStatus("loading");
    setVehiclesListError(null);
    void loadTransportVehiclesList(requestInstituteId).then((next) => {
      if (
        !shouldCommitTransportVehiclesLoad({
          cancelled,
          requestInstituteId,
          activeInstituteId: activeInstituteIdRef.current,
        })
      ) {
        return;
      }
      setApiVehicles(next.items);
      setVehiclesListStatus(next.status);
      setVehiclesListError(next.errorMessage);
      setVehiclesResolvedForInstituteId(requestInstituteId);
    });
    return () => {
      cancelled = true;
    };
  }, [
    apiMode,
    view,
    instituteCtx.status,
    instituteCtx.activeInstituteId,
    instituteCtx.errorMessage,
    reloadKey,
  ]);

  useEffect(() => {
    if (!apiMode || (view !== "drivers" && view !== "dashboard")) return;

    if (instituteCtx.status === "loading") {
      setApiDrivers([]);
      setDriversListStatus("loading");
      setDriversListError(null);
      setDriversResolvedForInstituteId(null);
      return;
    }

    if (
      instituteCtx.status === "error" ||
      instituteCtx.status === "forbidden"
    ) {
      setApiDrivers([]);
      setDriversListStatus(
        instituteCtx.status === "forbidden" ? "forbidden" : "error",
      );
      setDriversListError(instituteCtx.errorMessage);
      setDriversResolvedForInstituteId(null);
      return;
    }

    if (
      instituteCtx.status === "needs_selection" ||
      instituteCtx.status === "empty" ||
      !instituteCtx.activeInstituteId
    ) {
      setApiDrivers([]);
      setDriversListStatus("needs_institute");
      setDriversListError(null);
      setDriversResolvedForInstituteId(null);
      return;
    }

    const requestInstituteId = instituteCtx.activeInstituteId;
    let cancelled = false;
    setDriversListStatus("loading");
    setDriversListError(null);
    void loadTransportDriversList(requestInstituteId).then((next) => {
      if (
        !shouldCommitTransportDriversLoad({
          cancelled,
          requestInstituteId,
          activeInstituteId: activeInstituteIdRef.current,
        })
      ) {
        return;
      }
      setApiDrivers(next.items);
      setDriversListStatus(next.status);
      setDriversListError(next.errorMessage);
      setDriversResolvedForInstituteId(requestInstituteId);
    });
    return () => {
      cancelled = true;
    };
  }, [
    apiMode,
    view,
    instituteCtx.status,
    instituteCtx.activeInstituteId,
    instituteCtx.errorMessage,
    reloadKey,
  ]);

  useEffect(() => {
    if (!apiMode || (view !== "routes" && view !== "stops" && view !== "dashboard")) return;

    if (instituteCtx.status === "loading") {
      setApiRoutes([]);
      setRoutesListStatus("loading");
      setRoutesListError(null);
      setRoutesResolvedForInstituteId(null);
      return;
    }

    if (
      instituteCtx.status === "error" ||
      instituteCtx.status === "forbidden"
    ) {
      setApiRoutes([]);
      setRoutesListStatus(
        instituteCtx.status === "forbidden" ? "forbidden" : "error",
      );
      setRoutesListError(instituteCtx.errorMessage);
      setRoutesResolvedForInstituteId(null);
      return;
    }

    if (
      instituteCtx.status === "needs_selection" ||
      instituteCtx.status === "empty" ||
      !instituteCtx.activeInstituteId
    ) {
      setApiRoutes([]);
      setRoutesListStatus("needs_institute");
      setRoutesListError(null);
      setRoutesResolvedForInstituteId(null);
      return;
    }

    const requestInstituteId = instituteCtx.activeInstituteId;
    let cancelled = false;
    setRoutesListStatus("loading");
    setRoutesListError(null);
    void loadTransportRoutesList(requestInstituteId).then((next) => {
      if (
        !shouldCommitTransportRoutesLoad({
          cancelled,
          requestInstituteId,
          activeInstituteId: activeInstituteIdRef.current,
        })
      ) {
        return;
      }
      setApiRoutes(next.items);
      setRoutesListStatus(next.status);
      setRoutesListError(next.errorMessage);
      setRoutesResolvedForInstituteId(requestInstituteId);
    });
    return () => {
      cancelled = true;
    };
  }, [
    apiMode,
    view,
    instituteCtx.status,
    instituteCtx.activeInstituteId,
    instituteCtx.errorMessage,
    reloadKey,
  ]);

  useEffect(() => {
    if (!apiMode || (view !== "students" && view !== "dashboard")) return;

    if (instituteCtx.status === "loading") {
      setApiEnrollments([]);
      setEnrollmentsListStatus("loading");
      setEnrollmentsListError(null);
      setEnrollmentsResolvedForInstituteId(null);
      return;
    }

    if (
      instituteCtx.status === "error" ||
      instituteCtx.status === "forbidden"
    ) {
      setApiEnrollments([]);
      setEnrollmentsListStatus(
        instituteCtx.status === "forbidden" ? "forbidden" : "error",
      );
      setEnrollmentsListError(instituteCtx.errorMessage);
      setEnrollmentsResolvedForInstituteId(null);
      return;
    }

    if (
      instituteCtx.status === "needs_selection" ||
      instituteCtx.status === "empty" ||
      !instituteCtx.activeInstituteId
    ) {
      setApiEnrollments([]);
      setEnrollmentsListStatus("needs_institute");
      setEnrollmentsListError(null);
      setEnrollmentsResolvedForInstituteId(null);
      return;
    }

    const requestInstituteId = instituteCtx.activeInstituteId;
    let cancelled = false;
    setEnrollmentsListStatus("loading");
    setEnrollmentsListError(null);
    void loadTransportEnrollmentsList(requestInstituteId).then((next) => {
      if (
        !shouldCommitTransportEnrollmentsLoad({
          cancelled,
          requestInstituteId,
          activeInstituteId: activeInstituteIdRef.current,
        })
      ) {
        return;
      }
      setApiEnrollments(next.items);
      setEnrollmentsListStatus(next.status);
      setEnrollmentsListError(next.errorMessage);
      setEnrollmentsResolvedForInstituteId(requestInstituteId);
    });
    return () => {
      cancelled = true;
    };
  }, [
    apiMode,
    view,
    instituteCtx.status,
    instituteCtx.activeInstituteId,
    instituteCtx.errorMessage,
    reloadKey,
  ]);

  useEffect(() => {
    if (!apiMode || view !== "settings") return;

    if (instituteCtx.status === "loading") {
      setApiSettings(null);
      setSettingsLoadStatus("loading");
      setSettingsLoadError(null);
      setSettingsResolvedForInstituteId(null);
      return;
    }

    if (
      instituteCtx.status === "error" ||
      instituteCtx.status === "forbidden"
    ) {
      setApiSettings(null);
      setSettingsLoadStatus(
        instituteCtx.status === "forbidden" ? "forbidden" : "error",
      );
      setSettingsLoadError(instituteCtx.errorMessage);
      setSettingsResolvedForInstituteId(null);
      return;
    }

    if (
      instituteCtx.status === "needs_selection" ||
      instituteCtx.status === "empty" ||
      !instituteCtx.activeInstituteId
    ) {
      setApiSettings(null);
      setSettingsLoadStatus("needs_institute");
      setSettingsLoadError(null);
      setSettingsResolvedForInstituteId(null);
      return;
    }

    const requestInstituteId = instituteCtx.activeInstituteId;
    let cancelled = false;
    setSettingsLoadStatus("loading");
    setSettingsLoadError(null);
    void loadTransportSettings(requestInstituteId).then((next) => {
      if (
        !shouldCommitTransportSettingsLoad({
          cancelled,
          requestInstituteId,
          activeInstituteId: activeInstituteIdRef.current,
        })
      ) {
        return;
      }
      setApiSettings(next.settings);
      setSettingsLoadStatus(next.status);
      setSettingsLoadError(next.errorMessage);
      setSettingsResolvedForInstituteId(requestInstituteId);
    });
    return () => {
      cancelled = true;
    };
  }, [
    apiMode,
    view,
    instituteCtx.status,
    instituteCtx.activeInstituteId,
    instituteCtx.errorMessage,
    reloadKey,
  ]);

  const vehiclesSnapshot = useMemo(() => {
    if (!apiMode || view !== "vehicles" || !vehiclesListView.rowsValid) {
      return snapshot;
    }
    return { ...snapshot, vehicles: vehiclesListView.items };
  }, [apiMode, view, snapshot, vehiclesListView.items, vehiclesListView.rowsValid]);

  const driversSnapshot = useMemo(() => {
    if (!apiMode || view !== "drivers" || !driversListView.rowsValid) {
      return snapshot;
    }
    return { ...snapshot, drivers: driversListView.items };
  }, [apiMode, view, snapshot, driversListView.items, driversListView.rowsValid]);

  const routesSnapshot = useMemo(() => {
    if (
      !apiMode ||
      (view !== "routes" && view !== "stops" && view !== "dashboard") ||
      !routesListView.rowsValid
    ) {
      return snapshot;
    }
    return { ...snapshot, routes: routesListView.items };
  }, [apiMode, view, snapshot, routesListView.items, routesListView.rowsValid]);

  const settingsSnapshot = useMemo(() => {
    if (!apiMode || view !== "settings" || !settingsView.rowsValid || !settingsView.settings) {
      return snapshot;
    }
    return { ...snapshot, settings: settingsView.settings };
  }, [apiMode, view, snapshot, settingsView.settings, settingsView.rowsValid]);

  const stopsSnapshot = useMemo(() => {
    if (!apiMode || view !== "stops" || !routesListView.rowsValid) {
      return snapshot;
    }
    const defaultRadius =
      settingsView.settings?.defaultNotificationRadiusM ??
      snapshot.settings.defaultNotificationRadiusM;
    const stops = routesListView.items.flatMap((route) =>
      route.setupStops.map((stop) => ({
        id: stop.id,
        name: route.name ? `${route.name} · ${stop.name}` : stop.name,
        locationLabel: stop.locationLabel,
        lat: stop.latitude,
        lng: stop.longitude,
        notificationRadiusM: defaultRadius,
        routeId: route.id,
      })),
    );
    return { ...snapshot, stops };
  }, [
    apiMode,
    view,
    snapshot,
    routesListView.items,
    routesListView.rowsValid,
    settingsView.settings?.defaultNotificationRadiusM,
  ]);

  useEffect(() => {
    startTransportAdminNotificationSync();
  }, []);

  const goToView = (v: TransportHubView) =>
    navigate({ to: "/transport", search: { view: v } });

  return (
    <AppShell
      title={VIEW_TITLES[view]}
      subtitle={
        apiMode && view === "vehicles"
          ? `API mode · ${vehiclesListView.rowsValid ? vehiclesListView.items.length : "…"} vehicles`
          : apiMode && view === "dashboard"
            ? "API mode · fleet overview"
            : apiMode && view === "drivers"
            ? `API mode · ${driversListView.rowsValid ? driversListView.items.length : "…"} drivers`
            : apiMode && view === "routes"
              ? `API mode · ${routesListView.rowsValid ? routesListView.items.length : "…"} routes`
              : apiMode && view === "stops"
                ? `API mode · route stops`
                : apiMode && view === "students"
                  ? `API mode · ${enrollmentsListView.rowsValid ? enrollmentsListView.items.length : "…"} enrollments`
                  : apiMode && view === "settings"
                ? "API mode · transport settings"
                : apiMode &&
                    (view === "reviews" ||
                      view === "trips" ||
                      view === "attendance" ||
                      view === "emergencies" ||
                      view === "analytics")
                  ? "API mode · read unavailable · no institute read API"
                  : VIEW_SUBTITLES[view]
      }
    >
      <TransportHubNav active={view} />
      <AdminPageTransition pageKey={view}>
        {view === "dashboard" ? (
          apiMode ? (
            <TransportDashboardApiView
              vehiclesView={vehiclesListView}
              driversView={driversListView}
              routesView={routesListView}
              enrollmentsView={enrollmentsListView}
              onNavigate={goToView}
            />
          ) : (
            <TransportDashboardView snapshot={snapshot} onNavigate={goToView} />
          )
        ) : null}
        {view === "vehicles" && (
          <TransportVehiclesView
            snapshot={vehiclesSnapshot}
            onChange={setSnapshot}
            writesEnabled={writesEnabled}
            listBlocked={apiMode && !vehiclesListView.rowsValid}
            listHint={vehiclesListHint}
            onPersistVehicle={
              apiMode
                ? async (draft) => {
                    const instituteId = instituteCtx.activeInstituteId;
                    if (!instituteId) {
                      throw new Error("Select an institute before saving a vehicle");
                    }
                    if (draft.id) {
                      await updateVehicle(draft.id, {
                        vehicleNumber: draft.vehicleNumber,
                        registrationNumber: draft.registrationNumber,
                        capacity: draft.capacity,
                        status: draft.status,
                        notes: draft.notes || null,
                      });
                    } else {
                      await createVehicle({
                        instituteId,
                        vehicleNumber: draft.vehicleNumber,
                        registrationNumber: draft.registrationNumber,
                        capacity: draft.capacity,
                        status: draft.status,
                        notes: draft.notes || null,
                      });
                    }
                    setReloadKey((k) => k + 1);
                  }
                : undefined
            }
            onRemoveVehicle={
              apiMode
                ? async (id) => {
                    await deleteVehicle(id);
                    setReloadKey((k) => k + 1);
                  }
                : undefined
            }
          />
        )}
        {view === "drivers" && (
          <TransportDriversView
            snapshot={driversSnapshot}
            onChange={setSnapshot}
            writesEnabled={writesEnabled}
            listBlocked={apiMode && !driversListView.rowsValid}
            listHint={driversListHint}
            onPersistDriver={
              apiMode
                ? async (draft) => {
                    const instituteId = instituteCtx.activeInstituteId;
                    if (!instituteId) {
                      throw new Error("Select an institute before saving a driver");
                    }
                    if (draft.id) {
                      await updateDriver(draft.id, {
                        displayName: draft.name,
                        phone: draft.phone,
                        licenseNumber: draft.licenseNumber,
                        licenseExpiry: draft.licenseExpiry.trim() || null,
                        status: draft.status,
                        notes: draft.notes || null,
                      });
                    } else {
                      await createDriver({
                        instituteId,
                        displayName: draft.name,
                        phone: draft.phone,
                        licenseNumber: draft.licenseNumber,
                        licenseExpiry: draft.licenseExpiry.trim() || null,
                        status: draft.status,
                        notes: draft.notes || null,
                      });
                    }
                    setReloadKey((k) => k + 1);
                  }
                : undefined
            }
            onRemoveDriver={
              apiMode
                ? async (id) => {
                    await deleteDriver(id);
                    setReloadKey((k) => k + 1);
                  }
                : undefined
            }
          />
        )}
        {view === "stops" && (
          <TransportStopsView
            snapshot={stopsSnapshot}
            onChange={setSnapshot}
            writesEnabled={writesEnabled}
            listBlocked={apiMode && !routesListView.rowsValid}
            listHint={stopsListHint}
            routeOptions={
              apiMode && routesListView.rowsValid
                ? routesListView.items.map((route) => ({
                    id: route.id,
                    name: route.name,
                  }))
                : undefined
            }
            onPersistStop={
              apiMode
                ? async (input) => {
                    const instituteId = instituteCtx.activeInstituteId;
                    if (!instituteId) {
                      throw new Error("Select an institute before saving a stop");
                    }
                    if (!input.routeId) {
                      throw new Error("Select a route for this stop");
                    }
                    if (input.id) {
                      await updateStop(input.id, {
                        name: input.name,
                        locationLabel: input.locationLabel,
                        latitude: input.lat,
                        longitude: input.lng,
                        notificationRadiusM: input.notificationRadiusM,
                      });
                    } else {
                      const route = routesListView.items.find((r) => r.id === input.routeId);
                      await createStop({
                        instituteId,
                        routeId: input.routeId,
                        name: input.name,
                        locationLabel: input.locationLabel,
                        latitude: input.lat,
                        longitude: input.lng,
                        routeOrder: route?.setupStops.length ?? 0,
                        notificationRadiusM: input.notificationRadiusM,
                      });
                    }
                    setReloadKey((k) => k + 1);
                  }
                : undefined
            }
            onRemoveStop={
              apiMode
                ? async (id) => {
                    await deleteStop(id);
                    setReloadKey((k) => k + 1);
                  }
                : undefined
            }
          />
        )}
        {view === "routes" && (
          <TransportRoutesView
            snapshot={routesSnapshot}
            onChange={setSnapshot}
            writesEnabled={writesEnabled}
            listBlocked={apiMode && !routesListView.rowsValid}
            listHint={routesListHint}
            onLockRoute={
              apiMode
                ? async (routeId) => {
                    await updateRoute(routeId, { configStatus: "locked" });
                    setReloadKey((k) => k + 1);
                  }
                : undefined
            }
            onUnlockRoute={
              apiMode
                ? async (routeId) => {
                    await updateRoute(routeId, { configStatus: "configured" });
                    setReloadKey((k) => k + 1);
                  }
                : undefined
            }
          />
        )}
        {view === "students" ? (
          apiMode ? (
            <TransportEnrollmentsApiView
              items={enrollmentsListView.items}
              listBlocked={!enrollmentsListView.rowsValid}
              listHint={enrollmentsListHint}
              writesEnabled={writesEnabled}
              onEndEnrollment={async (id) => {
                try {
                  await updateEnrollment(id, { status: "ended" });
                  setReloadKey((k) => k + 1);
                  notify("Enrollment ended");
                } catch (err) {
                  notify(err instanceof Error ? err.message : "Failed to update enrollment");
                }
              }}
              onRemoveEnrollment={async (id) => {
                try {
                  await deleteEnrollment(id);
                  setReloadKey((k) => k + 1);
                  notify("Enrollment deleted");
                } catch (err) {
                  notify(err instanceof Error ? err.message : "Failed to delete enrollment");
                }
              }}
            />
          ) : (
            <TransportStudentsView snapshot={snapshot} onChange={setSnapshot} />
          )
        ) : null}
        {view === "reviews" ? (
          apiMode ? (
            <TransportApprovalApiPanel
              instituteId={instituteId}
              writesEnabled={writesEnabled}
              onNotify={notify}
            />
          ) : (
            <TransportReviewsView />
          )
        ) : null}
        {view === "trips" ? (
          apiMode ? (
            <TransportTripsApiPanel instituteId={instituteId} />
          ) : (
            <TransportTripsView snapshot={snapshot} />
          )
        ) : null}
        {view === "attendance" ? (
          apiMode ? (
            <TransportAttendanceApiPanel instituteId={instituteId} />
          ) : (
            <TransportAttendanceView />
          )
        ) : null}
        {view === "emergencies" ? (
          apiMode ? (
            <TransportEmergenciesApiPanel
              instituteId={instituteId}
              writesEnabled={writesEnabled}
              onNotify={notify}
            />
          ) : (
            <TransportEmergenciesView />
          )
        ) : null}
        {view === "analytics" ? (
          apiMode ? (
            <ApiReadUnavailablePanel
              title="Transport analytics unavailable in API mode"
              domainLabel="Transport analytics"
              hint="There is no institute-scoped read API for transport analytics exports. Demo KPIs are not shown in API mode."
            />
          ) : (
            <TransportAnalyticsView snapshot={snapshot} />
          )
        ) : null}
        {view === "settings" && (
          <TransportSettingsView
            snapshot={settingsSnapshot}
            onChange={setSnapshot}
            writesEnabled={writesEnabled}
            listBlocked={apiMode && !settingsView.rowsValid}
            listHint={settingsHint}
            onSaveSettings={
              apiMode
                ? async (settings) => {
                    const instituteId = instituteCtx.activeInstituteId;
                    if (!instituteId) {
                      throw new Error("Select an institute before saving settings");
                    }
                    await upsertTransportSettings({
                      instituteId,
                      defaultNotificationRadiusM: settings.defaultNotificationRadiusM,
                      defaultPickupBufferMins: settings.defaultPickupBufferMins,
                      workingDays: workingDayLabelsToNumbers(settings.workingDays),
                    });
                    setReloadKey((k) => k + 1);
                  }
                : undefined
            }
          />
        )}
      </AdminPageTransition>
    </AppShell>
  );
}
