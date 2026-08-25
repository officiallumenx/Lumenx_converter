/** Transport foundation — types + mock localStorage repository. */

import { readAdminDataScopeKey } from "@/lib/admin-tenant";
import {
  deleteDriverAccount,
  enrollmentsForVehicle,
  findDriverAccountByAdminDriverId,
  loadTransportOps,
  notifyDriverRouteLocked,
  notifyDriverRouteUnlocked,
  syncRouteLockFromAdmin,
  TRANSPORT_OPS_CHANGED_EVENT,
  upsertDriverAccountFromAdmin,
} from "@lumenx/utils";
import { createLocalStorageStore } from "@/lib/client-data-store";

export type EntityStatus = "active" | "inactive" | "maintenance";

/** Pill tone for vehicle/driver entity status (shared by transport tables). */
export const ENTITY_STATUS_PILL_TONE: Record<
  EntityStatus,
  "success" | "warning" | "neutral"
> = {
  active: "success",
  maintenance: "warning",
  inactive: "neutral",
};

/** Mirrors Transport App route-setup status for Admin review. */
export type RouteConfigStatus = "not_configured" | "configured" | "locked";

export type TransportVehicle = {
  id: string;
  vehicleNumber: string;
  registrationNumber: string;
  capacity: number;
  status: EntityStatus;
  assignedDriverId: string | null;
  notes: string;
};

export type TransportDriver = {
  id: string;
  name: string;
  phone: string;
  licenseNumber: string;
  licenseExpiry: string;
  assignedVehicleId: string | null;
  status: EntityStatus;
  notes: string;
};

export type TransportStop = {
  id: string;
  name: string;
  locationLabel: string;
  lat: number;
  lng: number;
  notificationRadiusM: number;
};

/**
 * Stop captured by Transport App (driver) — Admin can review/edit.
 * Compatible with driver `RouteSetupStop` for future shared sync.
 */
export type AdminRouteStop = {
  id: string;
  name: string;
  locationLabel: string;
  latitude: number;
  longitude: number;
  timestampCreated: string;
  createdBy: string;
  createdByName: string;
  studentIds: string[];
  routeOrder: number;
};

export type TransportRoute = {
  id: string;
  name: string;
  vehicleId: string | null;
  driverId: string | null;
  /** Legacy catalogue stop refs (kept in sync with setupStops when present). */
  stopIds: string[];
  status: EntityStatus;
  /** Driver setup state · Admin lock overlays as "locked". */
  configStatus: RouteConfigStatus;
  /** Ordered GPS stops from Transport App (source of truth for route review). */
  setupStops: AdminRouteStop[];
  lockedBy: string | null;
  lockedAt: string | null;
  setupFinishedAt: string | null;
};

export type TransportAssignment = {
  id: string;
  studentId: string;
  studentName: string;
  studentClass: string;
  routeId: string;
  pickupStopId: string;
  dropStopId: string;
};

export type TripSlot = "morning" | "evening";
/** Admin trip overview statuses (legacy scheduled/in_progress normalized on load). */
export type TripStatus =
  | "not_started"
  | "ready"
  | "running"
  | "completed"
  | "emergency"
  | "scheduled"
  | "in_progress"
  | "cancelled";

export type TransportTrip = {
  id: string;
  routeId: string;
  routeName: string;
  vehicleLabel: string;
  driverName: string;
  slot: TripSlot;
  date: string;
  scheduledAt: string;
  status: TripStatus;
  studentsCount: number;
};

export const TRIP_STATUS_LABEL: Record<string, string> = {
  not_started: "Not Started",
  ready: "Ready",
  running: "Running",
  completed: "Completed",
  emergency: "Emergency",
  scheduled: "Not Started",
  in_progress: "Running",
  cancelled: "Completed",
};

export function normalizeTripStatus(status: string): TripStatus {
  if (status === "scheduled") return "not_started";
  if (status === "in_progress") return "running";
  if (status === "cancelled") return "completed";
  if (
    status === "not_started" ||
    status === "ready" ||
    status === "running" ||
    status === "completed" ||
    status === "emergency"
  ) {
    return status;
  }
  return "not_started";
}

export type TransportSettings = {
  defaultNotificationRadiusM: number;
  defaultPickupBufferMins: number;
  workingDays: string[];
};

export type TransportSnapshot = {
  vehicles: TransportVehicle[];
  drivers: TransportDriver[];
  stops: TransportStop[];
  routes: TransportRoute[];
  assignments: TransportAssignment[];
  trips: TransportTrip[];
  settings: TransportSettings;
};

const STORAGE_KEY_PREFIX = "lumenx.admin.transport.v2";
const TRANSPORT_SNAPSHOT_EVENT = "lumenx-admin-transport-changed";

function storageKey(): string {
  return `${STORAGE_KEY_PREFIX}.${readAdminDataScopeKey()}`;
}

function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function renumberStops(stops: AdminRouteStop[]): AdminRouteStop[] {
  return stops.map((s, i) => ({ ...s, routeOrder: i + 1 }));
}

function syncStopIds(setupStops: AdminRouteStop[]): string[] {
  return [...setupStops]
    .sort((a, b) => a.routeOrder - b.routeOrder)
    .map((s) => s.id);
}

function normalizeRoute(r: TransportRoute): TransportRoute {
  const setupStops = Array.isArray(r.setupStops) ? renumberStops(r.setupStops) : [];
  let configStatus = r.configStatus ?? "not_configured";
  if (r.lockedBy || configStatus === "locked") {
    configStatus = "locked";
  } else if (setupStops.length > 0) {
    configStatus = configStatus === "not_configured" ? "configured" : configStatus;
  } else {
    configStatus = "not_configured";
  }
  return {
    ...r,
    driverId: r.driverId ?? null,
    setupStops,
    stopIds: setupStops.length > 0 ? syncStopIds(setupStops) : (r.stopIds ?? []),
    configStatus,
    lockedBy: configStatus === "locked" ? (r.lockedBy ?? "Admin") : null,
    lockedAt: configStatus === "locked" ? (r.lockedAt ?? null) : null,
    setupFinishedAt: r.setupFinishedAt ?? null,
  };
}

function normalizeSnapshot(raw: TransportSnapshot): TransportSnapshot {
  const asList = <T,>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);
  return {
    ...raw,
    vehicles: asList(raw.vehicles),
    drivers: asList(raw.drivers),
    stops: asList(raw.stops),
    assignments: asList(raw.assignments),
    trips: asList<TransportTrip>(raw.trips).map((t) => ({
      ...t,
      status: normalizeTripStatus(t.status),
    })),
    routes: asList<TransportRoute>(raw.routes).map((r) => normalizeRoute(r)),
    settings: {
      defaultNotificationRadiusM: raw.settings?.defaultNotificationRadiusM ?? 100,
      defaultPickupBufferMins: raw.settings?.defaultPickupBufferMins ?? 5,
      workingDays: Array.isArray(raw.settings?.workingDays)
        ? raw.settings.workingDays
        : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    },
  };
}

function seedSnapshot(): TransportSnapshot {
  const drivers: TransportDriver[] = [
    {
      id: "DR-01",
      name: "Rajesh Kumar",
      phone: "+91 98765 43210",
      licenseNumber: "DL-4521-2024",
      licenseExpiry: "2027-08-15",
      assignedVehicleId: "VH-01",
      status: "active",
      notes: "",
    },
    {
      id: "DR-02",
      name: "Suresh Nair",
      phone: "+91 98765 43211",
      licenseNumber: "DL-8832-2023",
      licenseExpiry: "2026-11-30",
      assignedVehicleId: "VH-02",
      status: "active",
      notes: "",
    },
    {
      id: "DR-03",
      name: "Anil Verma",
      phone: "+91 98765 43212",
      licenseNumber: "DL-1190-2022",
      licenseExpiry: "2026-09-01",
      assignedVehicleId: "VH-03",
      status: "active",
      notes: "License renewing soon",
    },
  ];

  const vehicles: TransportVehicle[] = [
    {
      id: "VH-01",
      vehicleNumber: "BUS-01",
      registrationNumber: "KA-01-LX-4521",
      capacity: 40,
      status: "active",
      assignedDriverId: "DR-01",
      notes: "Tata Starbus",
    },
    {
      id: "VH-02",
      vehicleNumber: "BUS-02",
      registrationNumber: "KA-01-LX-8832",
      capacity: 35,
      status: "active",
      assignedDriverId: "DR-02",
      notes: "Ashok Leyland",
    },
    {
      id: "VH-03",
      vehicleNumber: "BUS-03",
      registrationNumber: "KA-01-LX-1190",
      capacity: 28,
      status: "maintenance",
      assignedDriverId: "DR-03",
      notes: "Force Traveller · service due",
    },
  ];

  const stops: TransportStop[] = [
    {
      id: "ST-01",
      name: "Green Park Gate",
      locationLabel: "Green Park Metro, New Delhi",
      lat: 28.5597,
      lng: 77.2069,
      notificationRadiusM: 100,
    },
    {
      id: "ST-02",
      name: "Central Library",
      locationLabel: "Central Library Circle, New Delhi",
      lat: 28.6139,
      lng: 77.209,
      notificationRadiusM: 100,
    },
    {
      id: "ST-03",
      name: "Lakeview Apartments",
      locationLabel: "Lakeview Apartments, New Delhi",
      lat: 28.5672,
      lng: 77.2105,
      notificationRadiusM: 120,
    },
    {
      id: "ST-04",
      name: "East Gate Circle",
      locationLabel: "East Gate Circle, New Delhi",
      lat: 28.628,
      lng: 77.241,
      notificationRadiusM: 100,
    },
    {
      id: "ST-05",
      name: "Sharma Residence Stop",
      locationLabel: "14 Lake View Road, New Delhi",
      lat: 28.545,
      lng: 77.192,
      notificationRadiusM: 80,
    },
  ];

  const routes: TransportRoute[] = [
    {
      id: "RT-01",
      name: "North Campus Loop",
      vehicleId: "VH-01",
      driverId: "DR-01",
      stopIds: [],
      status: "active",
      configStatus: "configured",
      setupFinishedAt: "2026-07-18T09:40:00.000Z",
      lockedBy: null,
      lockedAt: null,
      setupStops: [
        {
          id: "RST-01",
          name: "North Campus Gate",
          locationLabel: "North Campus Gate, New Delhi",
          latitude: 28.7041,
          longitude: 77.1025,
          timestampCreated: "2026-07-18T08:15:00.000Z",
          createdBy: "drv-1042",
          createdByName: "Rajesh Kumar",
          studentIds: ["STU-1042", "STU-1043"],
          routeOrder: 1,
        },
        {
          id: "RST-02",
          name: "Lakeview Gate",
          locationLabel: "Lakeview Gate, New Delhi",
          latitude: 28.5672,
          longitude: 77.2105,
          timestampCreated: "2026-07-18T08:28:00.000Z",
          createdBy: "drv-1042",
          createdByName: "Rajesh Kumar",
          studentIds: ["STU-1047"],
          routeOrder: 2,
        },
        {
          id: "RST-03",
          name: "Green Park",
          locationLabel: "Green Park Metro, New Delhi",
          latitude: 28.5597,
          longitude: 77.2069,
          timestampCreated: "2026-07-18T08:41:00.000Z",
          createdBy: "drv-1042",
          createdByName: "Rajesh Kumar",
          studentIds: ["STU-1045"],
          routeOrder: 3,
        },
        {
          id: "RST-04",
          name: "School Main Entrance",
          locationLabel: "School Main Entrance",
          latitude: 28.6139,
          longitude: 77.209,
          timestampCreated: "2026-07-18T09:05:00.000Z",
          createdBy: "drv-1042",
          createdByName: "Rajesh Kumar",
          studentIds: [],
          routeOrder: 4,
        },
      ],
    },
    {
      id: "RT-02",
      name: "City Center Express",
      vehicleId: "VH-02",
      driverId: "DR-02",
      stopIds: [],
      status: "active",
      configStatus: "locked",
      setupFinishedAt: "2026-07-17T10:20:00.000Z",
      lockedBy: "Admin · Priya Desai",
      lockedAt: "2026-07-19T11:00:00.000Z",
      setupStops: [
        {
          id: "RST-10",
          name: "Lakeview Apartments",
          locationLabel: "Lakeview Apartments, New Delhi",
          latitude: 28.5672,
          longitude: 77.2105,
          timestampCreated: "2026-07-17T09:10:00.000Z",
          createdBy: "drv-1043",
          createdByName: "Suresh Nair",
          studentIds: ["STU-1044", "STU-1048"],
          routeOrder: 1,
        },
        {
          id: "RST-11",
          name: "East Gate Circle",
          locationLabel: "East Gate Circle, New Delhi",
          latitude: 28.628,
          longitude: 77.241,
          timestampCreated: "2026-07-17T09:35:00.000Z",
          createdBy: "drv-1043",
          createdByName: "Suresh Nair",
          studentIds: ["STU-1046"],
          routeOrder: 2,
        },
        {
          id: "RST-12",
          name: "School Annex",
          locationLabel: "School Annex Drop",
          latitude: 28.615,
          longitude: 77.211,
          timestampCreated: "2026-07-17T09:55:00.000Z",
          createdBy: "drv-1043",
          createdByName: "Suresh Nair",
          studentIds: [],
          routeOrder: 3,
        },
      ],
    },
    {
      id: "RT-03",
      name: "East Gate Shuttle",
      vehicleId: "VH-03",
      driverId: "DR-03",
      stopIds: [],
      status: "active",
      configStatus: "not_configured",
      setupStops: [],
      lockedBy: null,
      lockedAt: null,
      setupFinishedAt: null,
    },
  ].map((r) => normalizeRoute(r as TransportRoute));

  const assignments: TransportAssignment[] = [
    {
      id: "AS-01",
      studentId: "STU-1042",
      studentName: "Aarav Sharma",
      studentClass: "10-B",
      routeId: "RT-01",
      pickupStopId: "RST-01",
      dropStopId: "RST-04",
    },
    {
      id: "AS-02",
      studentId: "STU-1044",
      studentName: "Anaya Sharma",
      studentClass: "10-B",
      routeId: "RT-02",
      pickupStopId: "RST-10",
      dropStopId: "RST-12",
    },
    {
      id: "AS-03",
      studentId: "STU-1045",
      studentName: "Sana Khan",
      studentClass: "12-A",
      routeId: "RT-01",
      pickupStopId: "RST-03",
      dropStopId: "RST-04",
    },
    {
      id: "AS-04",
      studentId: "STU-1047",
      studentName: "Vihaan Sharma",
      studentClass: "11-A",
      routeId: "RT-01",
      pickupStopId: "RST-02",
      dropStopId: "RST-04",
    },
    {
      id: "AS-05",
      studentId: "STU-1048",
      studentName: "Priya Patel",
      studentClass: "9-B",
      routeId: "RT-02",
      pickupStopId: "RST-10",
      dropStopId: "RST-12",
    },
  ];

  const today = "2026-07-21";
  const yesterday = "2026-07-20";
  const trips: TransportTrip[] = [
    {
      id: "TR-1001",
      routeId: "RT-01",
      routeName: "North Campus Loop",
      vehicleLabel: "BUS-01 · KA-01-LX-4521",
      driverName: "Rajesh Kumar",
      slot: "morning",
      date: today,
      scheduledAt: `${today}T07:15`,
      status: "in_progress",
      studentsCount: 34,
    },
    {
      id: "TR-1002",
      routeId: "RT-02",
      routeName: "City Center Express",
      vehicleLabel: "BUS-02 · KA-01-LX-8832",
      driverName: "Suresh Nair",
      slot: "morning",
      date: today,
      scheduledAt: `${today}T07:30`,
      status: "scheduled",
      studentsCount: 28,
    },
    {
      id: "TR-1003",
      routeId: "RT-01",
      routeName: "North Campus Loop",
      vehicleLabel: "BUS-01 · KA-01-LX-4521",
      driverName: "Rajesh Kumar",
      slot: "evening",
      date: today,
      scheduledAt: `${today}T15:40`,
      status: "scheduled",
      studentsCount: 34,
    },
    {
      id: "TR-0990",
      routeId: "RT-02",
      routeName: "City Center Express",
      vehicleLabel: "BUS-02 · KA-01-LX-8832",
      driverName: "Suresh Nair",
      slot: "morning",
      date: yesterday,
      scheduledAt: `${yesterday}T07:30`,
      status: "completed",
      studentsCount: 27,
    },
    {
      id: "TR-0991",
      routeId: "RT-01",
      routeName: "North Campus Loop",
      vehicleLabel: "BUS-01 · KA-01-LX-4521",
      driverName: "Rajesh Kumar",
      slot: "evening",
      date: yesterday,
      scheduledAt: `${yesterday}T15:40`,
      status: "completed",
      studentsCount: 33,
    },
  ];

  return {
    vehicles,
    drivers,
    stops,
    routes,
    assignments,
    trips,
    settings: {
      defaultNotificationRadiusM: 100,
      defaultPickupBufferMins: 5,
      workingDays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    },
  };
}

export function loadTransportSnapshot(): TransportSnapshot {
  return transportSnapshotStore.load();
}

/** Apply driver-synced stops onto matching Admin routes (by vehicle / route id). */
function mergeDriverStopsIntoSnapshot(snapshot: TransportSnapshot): TransportSnapshot {
  const ops = loadTransportOps();
  const syncEntries = Object.values(ops.driverStopsByRoute);
  if (syncEntries.length === 0) return snapshot;

  const routes = snapshot.routes.map((route) => {
    const sync =
      syncEntries.find((s) => s.routeId === route.id) ??
      syncEntries.find((s) => s.vehicleId && s.vehicleId === route.vehicleId);
    if (!sync || sync.stops.length === 0) return route;

    const setupStops: AdminRouteStop[] = sync.stops.map((s) => ({
      id: s.id,
      name: s.name,
      locationLabel: `${s.latitude.toFixed(5)}, ${s.longitude.toFixed(5)}`,
      latitude: s.latitude,
      longitude: s.longitude,
      timestampCreated: s.timestampCreated,
      createdBy: s.createdBy,
      createdByName: s.createdByName,
      studentIds: [...s.studentIds],
      routeOrder: s.routeOrder,
    }));

    return normalizeRoute({
      ...route,
      setupStops,
      configStatus: route.lockedBy ? "locked" : "configured",
      setupFinishedAt: sync.updatedAt,
    });
  });

  return { ...snapshot, routes };
}

export function saveTransportSnapshot(snapshot: TransportSnapshot): void {
  transportSnapshotStore.set(snapshot);
}

function parseTransportSnapshot(raw: string): TransportSnapshot {
  const parsed = JSON.parse(raw) as TransportSnapshot;
  const seed = seedSnapshot();
  return mergeDriverStopsIntoSnapshot(
    normalizeSnapshot({
      ...seed,
      ...parsed,
      settings: { ...seed.settings, ...parsed.settings },
      routes: (parsed.routes?.length ? parsed.routes : seed.routes) as TransportRoute[],
    }),
  );
}

const transportSnapshotStore = createLocalStorageStore<TransportSnapshot>({
  storageKey,
  eventName: TRANSPORT_SNAPSHOT_EVENT,
  externalEvents: [TRANSPORT_OPS_CHANGED_EVENT],
  seed: () => mergeDriverStopsIntoSnapshot(seedSnapshot()),
  parse: parseTransportSnapshot,
  normalize: normalizeSnapshot,
});

export function subscribeTransportSnapshot(listener: () => void): () => void {
  return transportSnapshotStore.subscribe(listener);
}

export function useTransportSnapshot(): TransportSnapshot {
  return transportSnapshotStore.useSnapshot();
}

export function getTransportDashboard(snapshot: TransportSnapshot) {
  const routes = snapshot.routes.map(normalizeRoute);
  const allSetupStops = routes.flatMap((r) => r.setupStops);
  const studentIds = new Set(allSetupStops.flatMap((s) => s.studentIds));
  // Prefer live ops enrollments (Admin → Driver bridge) over legacy snapshot assignments.
  const opsEnrollmentCount = loadTransportOps().enrollments.length;
  const transportStudents =
    opsEnrollmentCount || studentIds.size || snapshot.assignments.length;
  return {
    totalVehicles: snapshot.vehicles.length,
    drivers: snapshot.drivers.length,
    routes: routes.length,
    stops: allSetupStops.length || snapshot.stops.length,
    studentsUsingTransport: transportStudents,
    activeTrips: snapshot.trips.filter((t) => t.status === "in_progress").length,
    totalRoutes: routes.length,
    configuredRoutes: routes.filter((r) => r.configStatus === "configured").length,
    lockedRoutes: routes.filter((r) => r.configStatus === "locked").length,
    pendingRouteSetup: routes.filter((r) => r.configStatus === "not_configured").length,
    totalStops: allSetupStops.length,
    totalTransportStudents: transportStudents,
  };
}

export function uniqueStudentsOnRoute(route: TransportRoute): number {
  return new Set(route.setupStops.flatMap((s) => s.studentIds)).size;
}

export function routeDriverLabel(snapshot: TransportSnapshot, route: TransportRoute): string {
  const d = snapshot.drivers.find((x) => x.id === route.driverId);
  return d?.name ?? "—";
}

export function routeVehicleLabel(snapshot: TransportSnapshot, route: TransportRoute): string {
  const v = snapshot.vehicles.find((x) => x.id === route.vehicleId);
  return v ? `${v.vehicleNumber} · ${v.registrationNumber}` : "—";
}

export function routeForVehicle(snapshot: TransportSnapshot, vehicleId: string): TransportRoute | null {
  return snapshot.routes.find((r) => r.vehicleId === vehicleId) ?? null;
}

export type TransportVehicleDetail = {
  vehicle: TransportVehicle;
  driver: TransportDriver | null;
  route: TransportRoute | null;
  driverAccount: ReturnType<typeof findDriverAccountByAdminDriverId>;
  totalStudents: number;
  configuredStops: number;
};

export function getVehicleDetail(
  snapshot: TransportSnapshot,
  vehicleId: string,
): TransportVehicleDetail | null {
  const vehicle = snapshot.vehicles.find((v) => v.id === vehicleId);
  if (!vehicle) return null;
  const driver = vehicle.assignedDriverId
    ? snapshot.drivers.find((d) => d.id === vehicle.assignedDriverId) ?? null
    : null;
  const route = routeForVehicle(snapshot, vehicleId);
  const driverAccount = driver ? findDriverAccountByAdminDriverId(driver.id) : null;
  return {
    vehicle,
    driver,
    route,
    driverAccount,
    totalStudents: enrollmentsForVehicle(vehicleId).length,
    configuredStops: route?.setupStops.length ?? 0,
  };
}

function syncDriverTransportAccount(
  snapshot: TransportSnapshot,
  driver: TransportDriver,
): void {
  const vehicle = driver.assignedVehicleId
    ? snapshot.vehicles.find((v) => v.id === driver.assignedVehicleId)
    : undefined;
  const route = vehicle ? routeForVehicle(snapshot, vehicle.id) : null;
  const existing = findDriverAccountByAdminDriverId(driver.id);
  if (!existing) return;
  upsertDriverAccountFromAdmin({
    adminDriverId: driver.id,
    name: driver.name,
    phone: driver.phone,
    licenseNumber: driver.licenseNumber,
    vehicleId: vehicle?.id ?? null,
    vehicleNumber: vehicle?.vehicleNumber ?? null,
    adminRouteId: route?.id ?? null,
    status: driver.status === "inactive" ? "inactive" : existing.status,
  });
}

/** Create a Transport app login for an admin driver roster row. */
export function createDriverTransportAccount(
  snapshot: TransportSnapshot,
  adminDriverId: string,
): void {
  const driver = snapshot.drivers.find((d) => d.id === adminDriverId);
  if (!driver) return;
  const vehicle = driver.assignedVehicleId
    ? snapshot.vehicles.find((v) => v.id === driver.assignedVehicleId)
    : undefined;
  const route = vehicle ? routeForVehicle(snapshot, vehicle.id) : null;
  upsertDriverAccountFromAdmin({
    adminDriverId: driver.id,
    name: driver.name,
    phone: driver.phone,
    licenseNumber: driver.licenseNumber,
    vehicleId: vehicle?.id ?? null,
    vehicleNumber: vehicle?.vehicleNumber ?? null,
    adminRouteId: route?.id ?? null,
    status: driver.status === "inactive" ? "inactive" : "active",
  });
}

function ensureRouteForVehicle(
  snapshot: TransportSnapshot,
  vehicle: TransportVehicle,
): TransportRoute[] {
  const existing = routeForVehicle(snapshot, vehicle.id);
  if (existing) {
    return snapshot.routes.map((r) =>
      r.id === existing.id
        ? normalizeRoute({
            ...r,
            driverId: vehicle.assignedDriverId,
            vehicleId: vehicle.id,
          })
        : r,
    );
  }
  return [
    ...snapshot.routes,
    normalizeRoute({
      id: uid("RT"),
      name: `${vehicle.vehicleNumber} Route`,
      vehicleId: vehicle.id,
      driverId: vehicle.assignedDriverId,
      stopIds: [],
      status: "active",
      configStatus: "not_configured",
      setupStops: [],
      lockedBy: null,
      lockedAt: null,
      setupFinishedAt: null,
    }),
  ];
}

function routeStudentCount(snapshot: TransportSnapshot, route: TransportRoute): number {
  return uniqueStudentsOnRoute(route) || snapshot.assignments.filter((a) => a.routeId === route.id).length;
}

/** Create morning/evening trips for locked or configured routes. No-op when rows already exist. */
export function ensureTripsForDate(date: string): TransportSnapshot {
  const snapshot = loadTransportSnapshot();
  const routes = snapshot.routes.filter(
    (route) =>
      (route.configStatus === "locked" || route.configStatus === "configured") &&
      (route.vehicleId || route.driverId),
  );
  const slotTimes: Record<TripSlot, string> = { morning: "07:15", evening: "15:40" };
  const nextTrips = [...snapshot.trips];
  let added = false;

  for (const route of routes) {
    for (const slot of ["morning", "evening"] as const) {
      const exists = nextTrips.some(
        (trip) => trip.routeId === route.id && trip.date === date && trip.slot === slot,
      );
      if (exists) continue;
      nextTrips.push({
        id: uid("TR"),
        routeId: route.id,
        routeName: route.name,
        vehicleLabel: routeVehicleLabel(snapshot, route),
        driverName: routeDriverLabel(snapshot, route),
        slot,
        date,
        scheduledAt: `${date}T${slotTimes[slot]}`,
        status: route.configStatus === "not_configured" ? "not_started" : "ready",
        studentsCount: routeStudentCount(snapshot, route),
      });
      added = true;
    }
  }

  if (!added) return snapshot;
  const next = { ...snapshot, trips: nextTrips };
  saveTransportSnapshot(next);
  return next;
}

export function updateTripStatus(tripId: string, status: TripStatus): TransportSnapshot {
  const snapshot = loadTransportSnapshot();
  const next = {
    ...snapshot,
    trips: snapshot.trips.map((trip) =>
      trip.id === tripId ? { ...trip, status: normalizeTripStatus(status) } : trip,
    ),
  };
  saveTransportSnapshot(next);
  return next;
}

export function nextTripStatus(status: TripStatus): TripStatus | null {
  const normalized = normalizeTripStatus(status);
  if (normalized === "not_started") return "ready";
  if (normalized === "ready") return "running";
  if (normalized === "running") return "completed";
  return null;
}

export function tripStatusAdvanceLabel(status: TripStatus): string | null {
  const next = nextTripStatus(status);
  if (!next) return null;
  if (next === "ready") return "Mark Ready";
  if (next === "running") return "Start Trip";
  if (next === "completed") return "Complete";
  return TRIP_STATUS_LABEL[next] ?? null;
}

/* ── Vehicles ── */

export function upsertVehicle(
  snapshot: TransportSnapshot,
  draft: Omit<TransportVehicle, "id"> & { id?: string },
): TransportSnapshot {
  const id = draft.id ?? uid("VH");
  const previous = draft.id ? snapshot.vehicles.find((v) => v.id === id) : undefined;
  const next: TransportVehicle = { ...draft, id };

  // Clear this driver from any other vehicle, and clear any prior driver of this vehicle.
  let vehicles = draft.id
    ? snapshot.vehicles.map((v) => (v.id === id ? next : v))
    : [...snapshot.vehicles, next];

  vehicles = vehicles.map((v) => {
    if (v.id === id) return next;
    if (next.assignedDriverId && v.assignedDriverId === next.assignedDriverId) {
      return { ...v, assignedDriverId: null };
    }
    return v;
  });

  const drivers = snapshot.drivers.map((d) => {
    // Driver newly assigned to this vehicle
    if (next.assignedDriverId && d.id === next.assignedDriverId) {
      return { ...d, assignedVehicleId: id };
    }
    // Driver previously on this vehicle but no longer
    if (d.assignedVehicleId === id && d.id !== next.assignedDriverId) {
      return { ...d, assignedVehicleId: null };
    }
    // If previous assignment moved away, already handled above
    if (previous?.assignedDriverId === d.id && previous.assignedDriverId !== next.assignedDriverId) {
      return { ...d, assignedVehicleId: null };
    }
    return d;
  });

  // Keep route.driverId aligned when this vehicle is on a route
  let routes = ensureRouteForVehicle(snapshot, next);

  const out = { ...snapshot, vehicles, drivers, routes };
  saveTransportSnapshot(out);
  const affectedDriverIds = new Set<string>();
  if (next.assignedDriverId) affectedDriverIds.add(next.assignedDriverId);
  if (previous?.assignedDriverId) affectedDriverIds.add(previous.assignedDriverId);
  for (const driverId of affectedDriverIds) {
    const savedDriver = out.drivers.find((d) => d.id === driverId);
    if (savedDriver) syncDriverTransportAccount(out, savedDriver);
  }
  return out;
}

export function deleteVehicle(snapshot: TransportSnapshot, id: string): TransportSnapshot {
  const out: TransportSnapshot = {
    ...snapshot,
    vehicles: snapshot.vehicles.filter((v) => v.id !== id),
    drivers: snapshot.drivers.map((d) =>
      d.assignedVehicleId === id ? { ...d, assignedVehicleId: null } : d,
    ),
    routes: snapshot.routes.map((r) =>
      r.vehicleId === id ? { ...r, vehicleId: null } : r,
    ),
  };
  saveTransportSnapshot(out);
  return out;
}

/* ── Drivers ── */

export function upsertDriver(
  snapshot: TransportSnapshot,
  draft: Omit<TransportDriver, "id"> & { id?: string },
): TransportSnapshot {
  const id = draft.id ?? uid("DR");
  const previous = draft.id ? snapshot.drivers.find((d) => d.id === id) : undefined;
  const next: TransportDriver = { ...draft, id };

  let drivers = draft.id
    ? snapshot.drivers.map((d) => (d.id === id ? next : d))
    : [...snapshot.drivers, next];

  drivers = drivers.map((d) => {
    if (d.id === id) return next;
    if (next.assignedVehicleId && d.assignedVehicleId === next.assignedVehicleId) {
      return { ...d, assignedVehicleId: null };
    }
    return d;
  });

  const vehicles = snapshot.vehicles.map((v) => {
    if (next.assignedVehicleId && v.id === next.assignedVehicleId) {
      return { ...v, assignedDriverId: id };
    }
    if (v.assignedDriverId === id && v.id !== next.assignedVehicleId) {
      return { ...v, assignedDriverId: null };
    }
    if (
      previous?.assignedVehicleId === v.id &&
      previous.assignedVehicleId !== next.assignedVehicleId
    ) {
      return { ...v, assignedDriverId: null };
    }
    return v;
  });

  const routes = snapshot.routes.map((r) => {
    if (next.assignedVehicleId && r.vehicleId === next.assignedVehicleId) {
      return { ...r, driverId: id };
    }
    return r;
  });

  const out = { ...snapshot, drivers, vehicles, routes };
  saveTransportSnapshot(out);
  syncDriverTransportAccount(out, next);
  return out;
}

export function deleteDriver(snapshot: TransportSnapshot, id: string): TransportSnapshot {
  deleteDriverAccount(id);
  const out: TransportSnapshot = {
    ...snapshot,
    drivers: snapshot.drivers.filter((d) => d.id !== id),
    vehicles: snapshot.vehicles.map((v) =>
      v.assignedDriverId === id ? { ...v, assignedDriverId: null } : v,
    ),
  };
  saveTransportSnapshot(out);
  return out;
}

/* ── Stops ── */

export function upsertStop(
  snapshot: TransportSnapshot,
  draft: Omit<TransportStop, "id"> & { id?: string },
): TransportSnapshot {
  const id = draft.id ?? uid("ST");
  const next: TransportStop = { ...draft, id };
  const stops = draft.id
    ? snapshot.stops.map((s) => (s.id === id ? next : s))
    : [...snapshot.stops, next];
  const out = { ...snapshot, stops };
  saveTransportSnapshot(out);
  return out;
}

export function deleteStop(snapshot: TransportSnapshot, id: string): TransportSnapshot {
  const out: TransportSnapshot = {
    ...snapshot,
    stops: snapshot.stops.filter((s) => s.id !== id),
    routes: snapshot.routes.map((r) => ({
      ...r,
      stopIds: r.stopIds.filter((sid) => sid !== id),
    })),
    assignments: snapshot.assignments.filter(
      (a) => a.pickupStopId !== id && a.dropStopId !== id,
    ),
  };
  saveTransportSnapshot(out);
  return out;
}

/* ── Routes ── */

export function upsertRoute(
  snapshot: TransportSnapshot,
  draft: Omit<TransportRoute, "id"> & { id?: string },
): TransportSnapshot {
  const id = draft.id ?? uid("RT");
  const next = normalizeRoute({ ...draft, id });
  const routes = draft.id
    ? snapshot.routes.map((r) => (r.id === id ? next : r))
    : [...snapshot.routes, next];
  const out = { ...snapshot, routes };
  saveTransportSnapshot(out);
  return out;
}

export function deleteRoute(snapshot: TransportSnapshot, id: string): TransportSnapshot {
  const out: TransportSnapshot = {
    ...snapshot,
    routes: snapshot.routes.filter((r) => r.id !== id),
    assignments: snapshot.assignments.filter((a) => a.routeId !== id),
  };
  saveTransportSnapshot(out);
  return out;
}

function patchRoute(
  snapshot: TransportSnapshot,
  routeId: string,
  patch: (route: TransportRoute) => TransportRoute,
): TransportSnapshot {
  const routes = snapshot.routes.map((r) =>
    r.id === routeId ? normalizeRoute(patch(normalizeRoute(r))) : r,
  );
  const out = { ...snapshot, routes };
  saveTransportSnapshot(out);
  return out;
}

export function lockRoute(
  snapshot: TransportSnapshot,
  routeId: string,
  lockedBy = "Admin",
): TransportSnapshot {
  const next = patchRoute(snapshot, routeId, (r) => {
    if (r.setupStops.length === 0) return r;
    return {
      ...r,
      configStatus: "locked",
      lockedBy,
      lockedAt: new Date().toISOString(),
    };
  });
  const route = next.routes.find((item) => item.id === routeId);
  if (route?.configStatus === "locked") {
    syncRouteLockFromAdmin({ routeId, locked: true, lockedBy });
    notifyDriverRouteLocked({
      routeId,
      routeName: route.name || routeId,
    });
  }
  return next;
}

export function unlockRoute(snapshot: TransportSnapshot, routeId: string): TransportSnapshot {
  const prev = snapshot.routes.find((item) => item.id === routeId);
  const next = patchRoute(snapshot, routeId, (r) => ({
    ...r,
    configStatus: r.setupStops.length > 0 ? "configured" : "not_configured",
    lockedBy: null,
    lockedAt: null,
  }));
  syncRouteLockFromAdmin({ routeId, locked: false });
  notifyDriverRouteUnlocked({
    routeId,
    routeName: prev?.name || routeId,
  });
  return next;
}

export function upsertRouteSetupStop(
  snapshot: TransportSnapshot,
  routeId: string,
  draft: Omit<AdminRouteStop, "routeOrder"> & { routeOrder?: number },
): TransportSnapshot {
  return patchRoute(snapshot, routeId, (r) => {
    if (r.configStatus === "locked") return r;
    const existing = r.setupStops.find((s) => s.id === draft.id);
    let setupStops: AdminRouteStop[];
    if (existing) {
      setupStops = r.setupStops.map((s) =>
        s.id === draft.id
          ? {
              ...s,
              ...draft,
              id: s.id,
              routeOrder: s.routeOrder,
            }
          : s,
      );
    } else {
      const next: AdminRouteStop = {
        ...draft,
        id: draft.id || uid("RST"),
        routeOrder: r.setupStops.length + 1,
      };
      setupStops = [...r.setupStops, next];
    }
    setupStops = renumberStops(setupStops);
    return {
      ...r,
      setupStops,
      stopIds: syncStopIds(setupStops),
      configStatus: "configured",
      setupFinishedAt: r.setupFinishedAt ?? new Date().toISOString(),
    };
  });
}

export function deleteRouteSetupStop(
  snapshot: TransportSnapshot,
  routeId: string,
  stopId: string,
): TransportSnapshot {
  return patchRoute(snapshot, routeId, (r) => {
    if (r.configStatus === "locked") return r;
    const setupStops = renumberStops(r.setupStops.filter((s) => s.id !== stopId));
    return {
      ...r,
      setupStops,
      stopIds: syncStopIds(setupStops),
      configStatus: setupStops.length === 0 ? "not_configured" : "configured",
      setupFinishedAt: setupStops.length === 0 ? null : r.setupFinishedAt,
    };
  });
}

export function reorderRouteSetupStop(
  snapshot: TransportSnapshot,
  routeId: string,
  stopId: string,
  direction: "up" | "down",
): TransportSnapshot {
  return patchRoute(snapshot, routeId, (r) => {
    if (r.configStatus === "locked") return r;
    const index = r.setupStops.findIndex((s) => s.id === stopId);
    if (index < 0) return r;
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= r.setupStops.length) return r;
    const next = [...r.setupStops];
    const [moved] = next.splice(index, 1);
    if (!moved) return r;
    next.splice(target, 0, moved);
    const setupStops = renumberStops(next);
    return { ...r, setupStops, stopIds: syncStopIds(setupStops) };
  });
}

export function setRouteStopStudents(
  snapshot: TransportSnapshot,
  routeId: string,
  stopId: string,
  studentIds: string[],
): TransportSnapshot {
  return patchRoute(snapshot, routeId, (r) => {
    if (r.configStatus === "locked") return r;
    return {
      ...r,
      setupStops: r.setupStops.map((s) =>
        s.id === stopId ? { ...s, studentIds: [...studentIds] } : s,
      ),
    };
  });
}

export function moveStudentsBetweenStops(
  snapshot: TransportSnapshot,
  routeId: string,
  fromStopId: string,
  toStopId: string,
  studentIds: string[],
): TransportSnapshot {
  return patchRoute(snapshot, routeId, (r) => {
    if (r.configStatus === "locked") return r;
    const move = new Set(studentIds);
    return {
      ...r,
      setupStops: r.setupStops.map((s) => {
        if (s.id === fromStopId) {
          return { ...s, studentIds: s.studentIds.filter((id) => !move.has(id)) };
        }
        if (s.id === toStopId) {
          const merged = [...s.studentIds];
          for (const id of studentIds) {
            if (!merged.includes(id)) merged.push(id);
          }
          return { ...s, studentIds: merged };
        }
        return s;
      }),
    };
  });
}

/* ── Assignments ── */

export function upsertAssignment(
  snapshot: TransportSnapshot,
  draft: Omit<TransportAssignment, "id"> & { id?: string },
): TransportSnapshot {
  const id = draft.id ?? uid("AS");
  const next: TransportAssignment = { ...draft, id };
  const assignments = draft.id
    ? snapshot.assignments.map((a) => (a.id === id ? next : a))
    : [...snapshot.assignments, next];
  const out = { ...snapshot, assignments };
  saveTransportSnapshot(out);
  return out;
}

export function deleteAssignment(snapshot: TransportSnapshot, id: string): TransportSnapshot {
  const out = {
    ...snapshot,
    assignments: snapshot.assignments.filter((a) => a.id !== id),
  };
  saveTransportSnapshot(out);
  return out;
}

/* ── Settings ── */

export function saveTransportSettings(
  snapshot: TransportSnapshot,
  settings: TransportSettings,
): TransportSnapshot {
  const out = { ...snapshot, settings };
  saveTransportSnapshot(out);
  return out;
}

export const STUDENT_OPTIONS = [
  { id: "STU-1042", name: "Aarav Sharma", className: "10", section: "B", gradeLabel: "10-B" },
  { id: "STU-1043", name: "Noah Draxler", className: "10", section: "A", gradeLabel: "10-A" },
  { id: "STU-1044", name: "Anaya Sharma", className: "10", section: "B", gradeLabel: "10-B" },
  { id: "STU-1045", name: "Sana Khan", className: "12", section: "A", gradeLabel: "12-A" },
  { id: "STU-1046", name: "Liam Chen", className: "11", section: "B", gradeLabel: "11-B" },
  { id: "STU-1047", name: "Vihaan Sharma", className: "11", section: "A", gradeLabel: "11-A" },
  { id: "STU-1048", name: "Priya Patel", className: "9", section: "B", gradeLabel: "9-B" },
  { id: "STU-1049", name: "Aarav Mehta", className: "9", section: "A", gradeLabel: "9-A" },
  { id: "STU-1050", name: "Diya Kapoor", className: "8", section: "A", gradeLabel: "8-A" },
  { id: "STU-1051", name: "Rohan Sethi", className: "8", section: "B", gradeLabel: "8-B" },
] as const;

export function studentDirectoryClasses(): string[] {
  return [...new Set(STUDENT_OPTIONS.map((s) => s.className))].sort(
    (a, b) => Number(a) - Number(b),
  );
}

export function studentDirectorySections(className: string): string[] {
  return [
    ...new Set(
      STUDENT_OPTIONS.filter((s) => s.className === className).map((s) => s.section),
    ),
  ].sort();
}

export function studentDirectoryFor(className: string, section: string) {
  return STUDENT_OPTIONS.filter((s) => s.className === className && s.section === section);
}

export function studentsByIds(ids: string[]) {
  const set = new Set(ids);
  return STUDENT_OPTIONS.filter((s) => set.has(s.id));
}
