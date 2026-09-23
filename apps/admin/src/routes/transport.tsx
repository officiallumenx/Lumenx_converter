import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  useTransportVehiclesQuery,
  useTransportDriversQuery,
  useTransportRoutesQuery,
  useTransportEnrollmentsQuery,
  useTransportSettingsQuery,
  useCatalogClassesQuery,
  useCatalogYearsQuery,
  adminModulePrefix, adminQueryRoots,
} from "@/lib/admin-queries";
import { invalidateAdminCache } from "@/lib/admin-resource-cache";
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
import { TransportAnalyticsApiPanel } from "@/components/transport/TransportAnalyticsApiPanel";
import { TransportReviewsView } from "@/components/transport/views/TransportReviewsView";
import { parseHubView, validateHubViewSearch } from "@/lib/hub-view-search";
import { ADMIN_MODULE_LABELS as M } from "@/lib/admin-module-labels";
import { startTransportAdminNotificationSync } from "@/lib/transport-notification-sync";
import { useEffect, useMemo, useRef, useState } from "react";
import { isApiAuthMode } from "@/auth/auth-mode";
import { useInstituteContext } from "@/lib/institutes";
import { resolveWritesEnabled } from "@/lib/security/writes-enabled";
import {
  approveTransportStop,
  rejectTransportStop,
} from "@/lib/transport/approval-mutations";
import {
  createDriver,
  createEnrollment,
  createVehicle,
  deleteDriver,
  deleteEnrollment,
  deleteStop,
  deleteVehicle,
  resolveTransportDriversListView,
  resolveTransportEnrollmentsListView,
  resolveTransportRoutesListView,
  resolveTransportSettingsView,
  resolveTransportVehiclesListView,
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
import { listStudents } from "@/lib/students/api";
import { studentDtosToListItems } from "@/lib/students/map";
import { buildStudentClassOptions } from "@/lib/students/class-options";
import type { StudentListItem } from "@/lib/students/types";
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
  reviews: "Publish Requests",
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
  stops: "Driver stops · publish pending submissions for Connect & trips",
  routes: "Review driver-configured routes · lock when ready",
  students: "Assign students to a bus · stops sync from driver",
  reviews: "Approve or decline driver routes, stops, and enrollments",
  trips: "Live and completed trips from the transport API",
  attendance: "Live boarding and dropping from the transport API",
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
  const instituteId = instituteCtx.activeInstituteId;
  const activeInstituteIdRef = useRef(instituteCtx.activeInstituteId);
  activeInstituteIdRef.current = instituteCtx.activeInstituteId;
  const queryClient = useQueryClient();
  const listEnabled =
    apiMode &&
    instituteCtx.status === "ready" &&
    Boolean(instituteCtx.activeInstituteId);
  const vehiclesQuery = useTransportVehiclesQuery(instituteCtx.activeInstituteId, listEnabled);
  const driversQuery = useTransportDriversQuery(instituteCtx.activeInstituteId, listEnabled);
  const routesQuery = useTransportRoutesQuery(instituteCtx.activeInstituteId, listEnabled);
  const enrollmentsQuery = useTransportEnrollmentsQuery(instituteCtx.activeInstituteId, listEnabled);
  const settingsQuery = useTransportSettingsQuery(instituteCtx.activeInstituteId, listEnabled);
  const classesCatalogQuery = useCatalogClassesQuery(
    instituteCtx.activeInstituteId,
    listEnabled && view === "students",
  );
  const yearsCatalogQuery = useCatalogYearsQuery(
    instituteCtx.activeInstituteId,
    listEnabled && view === "students",
  );
  const bumpTransportReload = () => {
    invalidateAdminCache("admin:transport");
    if (instituteCtx.activeInstituteId) {
      void queryClient.invalidateQueries({
        queryKey: adminModulePrefix(instituteCtx.activeInstituteId, adminQueryRoots.transport),
      });
    }
  };

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

  const [studentsCatalog, setStudentsCatalog] = useState<StudentListItem[]>([]);

  const transportStudentClassOptions = useMemo(() => {
    const classes = classesCatalogQuery.data?.classes;
    const sections = classesCatalogQuery.data?.sections;
    const years = yearsCatalogQuery.data;
    if (!classes || !sections) return [];
    const activeYearId =
      years?.find((item) => item.status === "active")?.id ?? null;
    return buildStudentClassOptions({
      classes,
      sections,
      activeAcademicYearId: activeYearId,
    });
  }, [classesCatalogQuery.data, yearsCatalogQuery.data]);

  const vehiclesListView = resolveTransportVehiclesListView({
    apiMode,
    instituteStatus: instituteCtx.status,
    activeInstituteId: instituteCtx.activeInstituteId,
    resolvedForInstituteId: vehiclesResolvedForInstituteId,
    storedItems: apiVehicles,
    storedStatus:
      vehiclesQuery.isLoading && !vehiclesQuery.data ? "loading" : vehiclesListStatus,
    storedErrorMessage: vehiclesListError,
    instituteErrorMessage: instituteCtx.errorMessage,
  });

  const driversListView = resolveTransportDriversListView({
    apiMode,
    instituteStatus: instituteCtx.status,
    activeInstituteId: instituteCtx.activeInstituteId,
    resolvedForInstituteId: driversResolvedForInstituteId,
    storedItems: apiDrivers,
    storedStatus:
      driversQuery.isLoading && !driversQuery.data ? "loading" : driversListStatus,
    storedErrorMessage: driversListError,
    instituteErrorMessage: instituteCtx.errorMessage,
  });

  const routesListView = resolveTransportRoutesListView({
    apiMode,
    instituteStatus: instituteCtx.status,
    activeInstituteId: instituteCtx.activeInstituteId,
    resolvedForInstituteId: routesResolvedForInstituteId,
    storedItems: apiRoutes,
    storedStatus:
      routesQuery.isLoading && !routesQuery.data ? "loading" : routesListStatus,
    storedErrorMessage: routesListError,
    instituteErrorMessage: instituteCtx.errorMessage,
  });

  const enrollmentsListView = resolveTransportEnrollmentsListView({
    apiMode,
    instituteStatus: instituteCtx.status,
    activeInstituteId: instituteCtx.activeInstituteId,
    resolvedForInstituteId: enrollmentsResolvedForInstituteId,
    storedItems: apiEnrollments,
    storedStatus:
      enrollmentsQuery.isLoading && !enrollmentsQuery.data ? "loading" : enrollmentsListStatus,
    storedErrorMessage: enrollmentsListError,
    instituteErrorMessage: instituteCtx.errorMessage,
  });

  const settingsView = resolveTransportSettingsView({
    apiMode,
    instituteStatus: instituteCtx.status,
    activeInstituteId: instituteCtx.activeInstituteId,
    resolvedForInstituteId: settingsResolvedForInstituteId,
    storedSettings: apiSettings,
    storedStatus:
      settingsQuery.isLoading && !settingsQuery.data ? "loading" : settingsLoadStatus,
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
    if (!apiMode || (view !== "vehicles" && view !== "dashboard" && view !== "students" && view !== "drivers")) return;

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

    if (vehiclesQuery.isLoading && !vehiclesQuery.data) {
      setVehiclesListStatus("loading");
      setVehiclesListError(null);
      return;
    }
    if (!vehiclesQuery.data) return;

    const next = vehiclesQuery.data;
    setApiVehicles(next.items);
    setVehiclesListStatus(next.status);
    setVehiclesListError(next.errorMessage);
    setVehiclesResolvedForInstituteId(instituteCtx.activeInstituteId);
  }, [
    apiMode,
    instituteCtx.status,
    instituteCtx.activeInstituteId,
    instituteCtx.errorMessage,
    vehiclesQuery.data,
    vehiclesQuery.isLoading,
  ]);

  useEffect(() => {
    if (!apiMode || (view !== "drivers" && view !== "dashboard" && view !== "vehicles")) return;

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

    if (driversQuery.isLoading && !driversQuery.data) {
      setDriversListStatus("loading");
      setDriversListError(null);
      return;
    }
    if (!driversQuery.data) return;

    const next = driversQuery.data;
    setApiDrivers(next.items);
    setDriversListStatus(next.status);
    setDriversListError(next.errorMessage);
    setDriversResolvedForInstituteId(instituteCtx.activeInstituteId);
  }, [
    apiMode,
    instituteCtx.status,
    instituteCtx.activeInstituteId,
    instituteCtx.errorMessage,
    driversQuery.data,
    driversQuery.isLoading,
  ]);

  useEffect(() => {
    if (!apiMode || (view !== "routes" && view !== "stops" && view !== "dashboard" && view !== "students")) return;

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

    if (routesQuery.isLoading && !routesQuery.data) {
      setRoutesListStatus("loading");
      setRoutesListError(null);
      return;
    }
    if (!routesQuery.data) return;

    const next = routesQuery.data;
    setApiRoutes(next.items);
    setRoutesListStatus(next.status);
    setRoutesListError(next.errorMessage);
    setRoutesResolvedForInstituteId(instituteCtx.activeInstituteId);
  }, [
    apiMode,
    instituteCtx.status,
    instituteCtx.activeInstituteId,
    instituteCtx.errorMessage,
    routesQuery.data,
    routesQuery.isLoading,
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

    if (enrollmentsQuery.isLoading && !enrollmentsQuery.data) {
      setEnrollmentsListStatus("loading");
      setEnrollmentsListError(null);
      return;
    }
    if (!enrollmentsQuery.data) return;

    const next = enrollmentsQuery.data;
    setApiEnrollments(next.items);
    setEnrollmentsListStatus(next.status);
    setEnrollmentsListError(next.errorMessage);
    setEnrollmentsResolvedForInstituteId(instituteCtx.activeInstituteId);
  }, [
    apiMode,
    instituteCtx.status,
    instituteCtx.activeInstituteId,
    instituteCtx.errorMessage,
    enrollmentsQuery.data,
    enrollmentsQuery.isLoading,
  ]);

  useEffect(() => {
    if (!apiMode || view !== "students") return;

    if (
      instituteCtx.status === "loading" ||
      instituteCtx.status === "error" ||
      instituteCtx.status === "forbidden" ||
      instituteCtx.status === "needs_selection" ||
      instituteCtx.status === "empty" ||
      !instituteCtx.activeInstituteId
    ) {
      setStudentsCatalog([]);
      return;
    }

    const requestInstituteId = instituteCtx.activeInstituteId;
    let cancelled = false;
    void listStudents({ instituteId: requestInstituteId })
      .then((rows) => {
        if (cancelled || activeInstituteIdRef.current !== requestInstituteId) return;
        setStudentsCatalog(studentDtosToListItems(rows));
      })
      .catch(() => {
        if (cancelled || activeInstituteIdRef.current !== requestInstituteId) return;
        setStudentsCatalog([]);
        notify("Could not load students for transport enrollment");
      });
    return () => {
      cancelled = true;
    };
  }, [
    apiMode,
    view,
    instituteCtx.status,
    instituteCtx.activeInstituteId,
    notify,
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

    if (settingsQuery.isLoading && !settingsQuery.data) {
      setSettingsLoadStatus("loading");
      setSettingsLoadError(null);
      return;
    }
    if (!settingsQuery.data) return;

    const next = settingsQuery.data;
    setApiSettings(next.settings);
    setSettingsLoadStatus(next.status);
    setSettingsLoadError(next.errorMessage);
    setSettingsResolvedForInstituteId(instituteCtx.activeInstituteId);
  }, [
    apiMode,
    instituteCtx.status,
    instituteCtx.activeInstituteId,
    instituteCtx.errorMessage,
    settingsQuery.data,
    settingsQuery.isLoading,
  ]);

  const vehiclesSnapshot = useMemo(() => {
    if (!apiMode || view !== "vehicles" || !vehiclesListView.rowsValid) {
      return snapshot;
    }
    return {
      ...snapshot,
      vehicles: vehiclesListView.items,
      drivers: driversListView.rowsValid ? driversListView.items : snapshot.drivers,
    };
  }, [
    apiMode,
    view,
    snapshot,
    vehiclesListView.items,
    vehiclesListView.rowsValid,
    driversListView.items,
    driversListView.rowsValid,
  ]);

  const driversSnapshot = useMemo(() => {
    if (!apiMode || view !== "drivers" || !driversListView.rowsValid) {
      return snapshot;
    }
    return {
      ...snapshot,
      drivers: driversListView.items,
      vehicles: vehiclesListView.rowsValid ? vehiclesListView.items : snapshot.vehicles,
    };
  }, [
    apiMode,
    view,
    snapshot,
    driversListView.items,
    driversListView.rowsValid,
    vehiclesListView.items,
    vehiclesListView.rowsValid,
  ]);

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
        notificationRadiusM: stop.notificationRadiusM ?? defaultRadius,
        routeId: route.id,
        approvalStatus: stop.approvalStatus,
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
          ? `${vehiclesListView.rowsValid ? vehiclesListView.items.length : "…"} vehicles`
          : apiMode && view === "dashboard"
            ? "Fleet overview"
            : apiMode && view === "drivers"
            ? `${driversListView.rowsValid ? driversListView.items.length : "…"} drivers`
            : apiMode && view === "routes"
              ? `${routesListView.rowsValid ? routesListView.items.length : "…"} routes`
              : apiMode && view === "stops"
                ? "Route stops"
                : apiMode && view === "students"
                  ? `${enrollmentsListView.rowsValid ? enrollmentsListView.items.length : "…"} enrollments`
                  : apiMode && view === "settings"
                ? "Transport settings"
                : apiMode && view === "reviews"
                  ? "Pending stop & assignment reviews"
                  : apiMode && view === "trips"
                    ? "Live and completed trips"
                    : apiMode && view === "attendance"
                      ? "Boarding and dropping"
                      : apiMode && view === "emergencies"
                        ? "SOS and emergencies"
                        : apiMode && view === "analytics"
                          ? "Transport analytics"
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
                        assignedDriverId: draft.assignedDriverId,
                      });
                    } else {
                      await createVehicle({
                        instituteId,
                        vehicleNumber: draft.vehicleNumber,
                        registrationNumber: draft.registrationNumber,
                        capacity: draft.capacity,
                        status: draft.status,
                        notes: draft.notes || null,
                        assignedDriverId: draft.assignedDriverId,
                      });
                    }
                    bumpTransportReload();
                  }
                : undefined
            }
            onRemoveVehicle={
              apiMode
                ? async (id) => {
                    await deleteVehicle(id);
                    bumpTransportReload();
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
                        assignedVehicleId: draft.assignedVehicleId,
                        appAccountPin: draft.appAccountPin?.trim() || undefined,
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
                        assignedVehicleId: draft.assignedVehicleId,
                        appAccountPin: draft.appAccountPin?.trim() || null,
                      });
                    }
                    bumpTransportReload();
                  }
                : undefined
            }
            onRemoveDriver={
              apiMode
                ? async (id) => {
                    await deleteDriver(id);
                    bumpTransportReload();
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
            allowCreate={!apiMode}
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
                    if (!input.id) {
                      throw new Error(
                        "Admin cannot create stops — approve driver submissions in Reviews",
                      );
                    }
                    if (!input.routeId) {
                      throw new Error("Select a route for this stop");
                    }
                    await updateStop(input.id, {
                      name: input.name,
                      locationLabel: input.locationLabel,
                      latitude: input.lat,
                      longitude: input.lng,
                      notificationRadiusM: input.notificationRadiusM,
                    });
                    bumpTransportReload();
                  }
                : undefined
            }
            onRemoveStop={
              apiMode
                ? async (id) => {
                    await deleteStop(id);
                    bumpTransportReload();
                  }
                : undefined
            }
            onPublishStop={
              apiMode
                ? async (id) => {
                    await approveTransportStop(id);
                    bumpTransportReload();
                  }
                : undefined
            }
            onDeclineStop={
              apiMode
                ? async (id, reason) => {
                    await rejectTransportStop(id, reason);
                    bumpTransportReload();
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
                    bumpTransportReload();
                  }
                : undefined
            }
            onUnlockRoute={
              apiMode
                ? async (routeId) => {
                    await updateRoute(routeId, { configStatus: "configured" });
                    bumpTransportReload();
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
              routes={
                routesListView.rowsValid
                  ? routesListView.items.map((route) => ({
                      id: route.id,
                      name: route.name,
                      vehicleId: route.vehicleId,
                    }))
                  : []
              }
              vehicles={
                vehiclesListView.rowsValid
                  ? vehiclesListView.items.map((vehicle) => ({
                      id: vehicle.id,
                      vehicleNumber: vehicle.vehicleNumber,
                    }))
                  : []
              }
              studentsCatalog={studentsCatalog.map((student) => ({
                id: student.id,
                name: student.name,
                grade: student.classLabel?.trim() || student.grade,
                section: student.sectionLabel,
              }))}
              classOptions={transportStudentClassOptions}
              onAssignStudent={
                writesEnabled
                  ? async ({ studentId, routeId }) => {
                      const instituteId = instituteCtx.activeInstituteId;
                      if (!instituteId) {
                        throw new Error("Select an institute before assigning a student");
                      }
                      await createEnrollment({
                        instituteId,
                        studentId,
                        routeId,
                        pickupStopId: null,
                        dropStopId: null,
                      });
                      bumpTransportReload();
                    }
                  : undefined
              }
              onEndEnrollment={async (id) => {
                try {
                  await updateEnrollment(id, { status: "ended" });
                  bumpTransportReload();
                  notify("Enrollment ended");
                } catch (err) {
                  notify(err instanceof Error ? err.message : "Failed to update enrollment");
                }
              }}
              onRemoveEnrollment={async (id) => {
                try {
                  await deleteEnrollment(id);
                  bumpTransportReload();
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
              instituteId={instituteId ?? ""}
              writesEnabled={writesEnabled}
              onNotify={notify}
            />
          ) : (
            <TransportReviewsView />
          )
        ) : null}
        {view === "trips" ? (
          apiMode ? (
            <TransportTripsApiPanel instituteId={instituteId ?? ""} />
          ) : (
            <TransportTripsView snapshot={snapshot} />
          )
        ) : null}
        {view === "attendance" ? (
          apiMode ? (
            <TransportAttendanceApiPanel instituteId={instituteId ?? ""} />
          ) : (
            <TransportAttendanceView />
          )
        ) : null}
        {view === "emergencies" ? (
          apiMode ? (
            <TransportEmergenciesApiPanel
              instituteId={instituteId ?? ""}
              writesEnabled={writesEnabled}
              onNotify={notify}
            />
          ) : (
            <TransportEmergenciesView />
          )
        ) : null}
        {view === "analytics" ? (
          apiMode ? (
            <TransportAnalyticsApiPanel
              instituteId={instituteId ?? ""}
              writesEnabled={writesEnabled}
              onNotify={notify}
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
                      notificationsEnabled: settings.notificationsEnabled !== false,
                      rememberEnabled: settings.rememberEnabled !== false,
                      defaultPickupTime: settings.defaultPickupTime?.trim() || "07:30",
                    });
                    bumpTransportReload();
                  }
                : undefined
            }
          />
        )}
      </AdminPageTransition>
    </AppShell>
  );
}
