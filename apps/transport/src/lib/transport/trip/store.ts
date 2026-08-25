import { enrollmentsForVehicle, listTransportAttendanceMarks, notifyAdminTransportAttendancePending, notifyAdminTripEnded, notifyAdminTripStarted, notifyConnectBoardingStarted, notifyConnectReachedSchool } from "@lumenx/utils";

import {
  getRouteSetupDriverScope,
  getRouteSetupSnapshot,
  subscribeRouteSetup,
} from "../route-setup/store";
import type { TripAssignment } from "../types";
import { isTripActive, type TripEndSummary, type TripPhase } from "./lifecycle";

export type { TripPhase };

export type TripSession = {
  phase: TripPhase;
  tripId: string | null;
  startedAt: string | null;
  completedAt: string | null;
  vehicleId: string | null;
  routeId: string | null;
  currentStopIndex: number;
  lastSummary: TripEndSummary | null;
  assignment: TripAssignment;
};

export type TripActionResult =
  | { ok: true; session: TripSession }
  | { ok: false; reason: string; session: TripSession };

const STORAGE_KEY = "lumenx.transport.trip.v1";

type PersistedTrip = {
  version: 1;
  phase: TripPhase;
  tripId: string | null;
  startedAt: string | null;
  completedAt: string | null;
  vehicleId: string | null;
  routeId: string | null;
  currentStopIndex: number;
  lastSummary: TripEndSummary | null;
};

const listeners = new Set<() => void>();

let phase: TripPhase = "ready";
let tripId: string | null = null;
let startedAt: string | null = null;
let completedAt: string | null = null;
let vehicleId: string | null = null;
let routeId: string | null = null;
let currentStopIndex = 0;
let lastSummary: TripEndSummary | null = null;

let cachedSession: TripSession | null = null;
let cachedSessionKey = "";
let cachedSetupRevision = "";

const EMPTY_ASSIGNMENT: TripAssignment = {
  driver: {
    id: "",
    name: "—",
    phone: "—",
    employeeId: "—",
    licenseNumber: "—",
    busNumber: "—",
  },
  bus: {
    vehicleId: "",
    busNumber: "—",
    vehicleNumber: "—",
    label: "—",
    capacity: 0,
  },
  route: {
    code: "—",
    name: "—",
    adminRouteId: "",
    stops: [],
  },
  totalStudents: 0,
};

function emit() {
  listeners.forEach((listener) => listener());
}

function setupRevision(): string {
  const s = getRouteSetupSnapshot();
  const scope = getRouteSetupDriverScope();
  return `${scope?.routeId ?? ""}:${scope?.vehicleId ?? ""}:${s.status}:${s.stops.length}:${s.setupFinishedAt ?? ""}:${s.stops.map((x) => `${x.id}:${x.status}`).join(",")}`;
}

function sessionCacheKey(): string {
  return [
    phase,
    tripId ?? "",
    startedAt ?? "",
    completedAt ?? "",
    vehicleId ?? "",
    routeId ?? "",
    String(currentStopIndex),
    lastSummary
      ? `${lastSummary.studentsBoarded}:${lastSummary.studentsDropped}:${lastSummary.studentsRemaining}:${lastSummary.stopsCompleted}`
      : "",
  ].join("|");
}

function normalizeLegacyPhase(raw: unknown): TripPhase {
  if (raw === "idle") return "ready";
  if (raw === "in_progress") return "running";
  if (
    raw === "ready" ||
    raw === "starting" ||
    raw === "running" ||
    raw === "boarding" ||
    raw === "dropping" ||
    raw === "completed"
  ) {
    return raw;
  }
  return "ready";
}

function canUseLocalStorage(): boolean {
  try {
    return typeof localStorage !== "undefined" && localStorage != null;
  } catch {
    return false;
  }
}

function readPersisted(): PersistedTrip | null {
  if (!canUseLocalStorage()) return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PersistedTrip> & { phase?: unknown };
    if (!parsed || typeof parsed !== "object") return null;
    return {
      version: 1,
      phase: normalizeLegacyPhase(parsed.phase),
      tripId: typeof parsed.tripId === "string" ? parsed.tripId : null,
      startedAt: typeof parsed.startedAt === "string" ? parsed.startedAt : null,
      completedAt: typeof parsed.completedAt === "string" ? parsed.completedAt : null,
      vehicleId: typeof parsed.vehicleId === "string" ? parsed.vehicleId : null,
      routeId: typeof parsed.routeId === "string" ? parsed.routeId : null,
      currentStopIndex:
        typeof parsed.currentStopIndex === "number" && parsed.currentStopIndex >= 0
          ? parsed.currentStopIndex
          : 0,
      lastSummary:
        parsed.lastSummary && typeof parsed.lastSummary === "object"
          ? (parsed.lastSummary as TripEndSummary)
          : null,
    };
  } catch {
    return null;
  }
}

function persist() {
  if (!canUseLocalStorage()) return;
  const payload: PersistedTrip = {
    version: 1,
    phase,
    tripId,
    startedAt,
    completedAt,
    vehicleId,
    routeId,
    currentStopIndex,
    lastSummary,
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore quota / private mode failures — in-memory state still works.
  }
}

function hydrateFromStorage() {
  const saved = readPersisted();
  if (!saved) return;
  phase = saved.phase;
  tripId = saved.tripId;
  startedAt = saved.startedAt;
  completedAt = saved.completedAt;
  vehicleId = saved.vehicleId;
  routeId = saved.routeId;
  currentStopIndex = saved.currentStopIndex;
  lastSummary = saved.lastSummary;
  // Incomplete start must not become a live trip after refresh.
  if (phase === "starting") {
    phase = "ready";
    tripId = null;
    startedAt = null;
    completedAt = null;
    currentStopIndex = 0;
    persist();
  }
}

hydrateFromStorage();

if (typeof window !== "undefined" && typeof window.addEventListener === "function") {
  window.addEventListener("storage", (e) => {
    if (e.key !== STORAGE_KEY && e.key !== null) return;
    hydrateFromStorage();
    cachedSession = null;
    emit();
  });
}

/** Trip assignment from logged-in driver scope + approved route-setup stops. */
export function getTripAssignmentSnapshot(): TripAssignment {
  const scope = getRouteSetupDriverScope();
  if (!scope) return EMPTY_ASSIGNMENT;

  const setup = getRouteSetupSnapshot();
  const approved = setup.stops.filter((s) => s.status === "approved");
  const sourceStops = approved.length > 0 ? approved : [];
  const stops =
    sourceStops.length > 0
      ? [...sourceStops]
          .sort((a, b) => a.routeOrder - b.routeOrder)
          .map((s) => ({
            id: s.id,
            name: s.name,
            sequence: s.routeOrder,
          }))
      : [];

  const enrollments = enrollmentsForVehicle(scope.vehicleId);

  return {
    driver: {
      id: scope.driverId,
      name: scope.driverName,
      phone: scope.driverPhone,
      employeeId: scope.employeeId,
      licenseNumber: scope.licenseNumber,
      busNumber: scope.vehicleNumber,
    },
    bus: {
      vehicleId: scope.vehicleId,
      busNumber: scope.vehicleNumber,
      vehicleNumber: scope.vehicleNumber,
      label: `${scope.vehicleNumber} · ${scope.driverName}`,
      capacity: 40,
    },
    route: {
      code: setup.routeCode || scope.routeCode,
      name: setup.routeName || scope.routeName,
      adminRouteId: scope.routeId,
      stops,
    },
    totalStudents: enrollments.length,
  };
}

export function subscribeTripSession(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Keep trip session subscribers in sync when route setup / driver scope changes. */
subscribeRouteSetup(() => {
  cachedSession = null;
  cachedSetupRevision = "";
  emit();
});

export function getTripSessionSnapshot(): TripSession {
  const revision = setupRevision();
  const key = sessionCacheKey();
  if (cachedSession && cachedSessionKey === key && cachedSetupRevision === revision) {
    return cachedSession;
  }

  cachedSessionKey = key;
  cachedSetupRevision = revision;
  cachedSession = {
    phase,
    tripId,
    startedAt,
    completedAt,
    vehicleId,
    routeId,
    currentStopIndex,
    lastSummary,
    assignment: getTripAssignmentSnapshot(),
  };
  return cachedSession;
}

function beginStartValidation(): TripActionResult | null {
  const session = getTripSessionSnapshot();
  if (isTripActive(phase)) {
    return {
      ok: false,
      reason: "A trip is already running. Continue attendance or end the current trip first.",
      session,
    };
  }
  if (phase === "completed") {
    return {
      ok: false,
      reason: "This trip is already completed. Dismiss it before starting a new trip.",
      session,
    };
  }

  const assignment = getTripAssignmentSnapshot();
  if (!assignment.bus.vehicleId) {
    return {
      ok: false,
      reason: "No bus is assigned. You cannot start a trip yet.",
      session,
    };
  }
  if (!assignment.route.adminRouteId && assignment.route.code === "—") {
    return {
      ok: false,
      reason: "No route is assigned. You cannot start a trip yet.",
      session,
    };
  }
  if (assignment.route.stops.length === 0) {
    return {
      ok: false,
      reason: "No approved stops yet. Finish Route Setup and wait for Admin approval.",
      session,
    };
  }
  if (assignment.totalStudents <= 0) {
    return {
      ok: false,
      reason: "No students on this bus. Ask Admin to enroll students before starting.",
      session,
    };
  }
  return null;
}

/** Mark STARTING (confirmation accepted). Does not leave an active trip until confirmStartTripSession. */
export function beginStartTripSession(): TripActionResult {
  const blocked = beginStartValidation();
  if (blocked) return blocked;

  const assignment = getTripAssignmentSnapshot();
  phase = "starting";
  tripId = `trip-${Date.now()}`;
  startedAt = null;
  completedAt = null;
  vehicleId = assignment.bus.vehicleId;
  routeId = assignment.route.adminRouteId || null;
  currentStopIndex = 0;
  lastSummary = null;
  cachedSession = null;
  persist();
  emit();
  return { ok: true, session: getTripSessionSnapshot() };
}

/** Promote STARTING → RUNNING (or start directly if already validated). */
export function confirmStartTripSession(): TripActionResult {
  if (phase !== "starting") {
    const blocked = beginStartValidation();
    if (blocked) return blocked;
    const begin = beginStartTripSession();
    if (!begin.ok) return begin;
  }

  const assignment = getTripAssignmentSnapshot();
  phase = "running";
  if (!tripId) tripId = `trip-${Date.now()}`;
  startedAt = new Date().toISOString();
  completedAt = null;
  vehicleId = assignment.bus.vehicleId;
  routeId = assignment.route.adminRouteId || null;
  currentStopIndex = 0;
  lastSummary = null;
  cachedSession = null;
  persist();
  emit();
  notifyAdminTripStarted({
    tripId: tripId!,
    busNumber: assignment.bus.busNumber,
    routeCode: assignment.route.code,
    driverName: assignment.driver.name,
  });
  return { ok: true, session: getTripSessionSnapshot() };
}

/** @deprecated Prefer confirmStartTripSession — kept for callers that expect a single start. */
export function startTripSession(): TripActionResult {
  return confirmStartTripSession();
}

export function setTripLifecyclePhase(
  next: Extract<TripPhase, "running" | "boarding" | "dropping">,
): TripActionResult {
  if (!isTripActive(phase)) {
    return {
      ok: false,
      reason: "No active trip. Start a trip before updating boarding or dropping.",
      session: getTripSessionSnapshot(),
    };
  }
  if (phase === "starting") {
    return {
      ok: false,
      reason: "Trip is still starting. Wait a moment and try again.",
      session: getTripSessionSnapshot(),
    };
  }
  phase = next;
  cachedSession = null;
  persist();
  emit();
  if (next === "boarding" && tripId) {
    const assignment = getTripAssignmentSnapshot();
    notifyConnectBoardingStarted({
      tripId,
      busNumber: assignment.bus.busNumber,
      routeCode: assignment.route.code,
    });
  }
  return { ok: true, session: getTripSessionSnapshot() };
}

export function advanceTripStop(): TripActionResult {
  if (!isTripActive(phase)) {
    return {
      ok: false,
      reason: "No active trip.",
      session: getTripSessionSnapshot(),
    };
  }
  const stops = getTripAssignmentSnapshot().route.stops;
  if (stops.length === 0) {
    return {
      ok: false,
      reason: "No approved stops on this route.",
      session: getTripSessionSnapshot(),
    };
  }
  if (currentStopIndex >= stops.length - 1) {
    return {
      ok: false,
      reason: "Already at the last stop.",
      session: getTripSessionSnapshot(),
    };
  }
  currentStopIndex += 1;
  cachedSession = null;
  persist();
  emit();
  if (currentStopIndex >= stops.length - 1 && tripId) {
    const assignment = getTripAssignmentSnapshot();
    notifyConnectReachedSchool({
      tripId,
      busNumber: assignment.bus.busNumber,
      routeCode: assignment.route.code,
    });
  }
  return { ok: true, session: getTripSessionSnapshot() };
}

export function endTripSession(summary?: TripEndSummary | null): TripActionResult {
  if (phase === "completed") {
    return {
      ok: false,
      reason: "This trip is already completed.",
      session: getTripSessionSnapshot(),
    };
  }
  if (!isTripActive(phase)) {
    return {
      ok: false,
      reason: "No active trip to end.",
      session: getTripSessionSnapshot(),
    };
  }

  const stopsTotal = getTripAssignmentSnapshot().route.stops.length;
  const stopsCompleted = Math.min(currentStopIndex + 1, stopsTotal);
  phase = "completed";
  completedAt = new Date().toISOString();
  lastSummary =
    summary ??
    ({
      studentsBoarded: 0,
      studentsDropped: 0,
      studentsRemaining: 0,
      stopsCompleted,
      stopsTotal,
    } satisfies TripEndSummary);
  cachedSession = null;
  persist();
  emit();
  {
    const assignment = getTripAssignmentSnapshot();
    if (tripId) {
      notifyAdminTripEnded({
        tripId,
        busNumber: assignment.bus.busNumber,
        routeCode: assignment.route.code,
        driverName: assignment.driver.name,
      });
      const pending = listTransportAttendanceMarks().filter(
        (m) => m.tripId === tripId && m.boarding === "pending",
      ).length;
      if (pending > 0) {
        notifyAdminTransportAttendancePending({
          tripId,
          busNumber: assignment.bus.busNumber,
          routeCode: assignment.route.code,
          driverName: assignment.driver.name,
          pendingCount: pending,
        });
      }
    }
  }
  return { ok: true, session: getTripSessionSnapshot() };
}

/** Clear COMPLETED and return to READY for the next shift. */
export function dismissCompletedTripSession(): TripActionResult {
  if (phase !== "completed" && phase !== "ready") {
    if (isTripActive(phase)) {
      return {
        ok: false,
        reason: "End the active trip before starting over.",
        session: getTripSessionSnapshot(),
      };
    }
  }
  phase = "ready";
  tripId = null;
  startedAt = null;
  completedAt = null;
  vehicleId = null;
  routeId = null;
  currentStopIndex = 0;
  lastSummary = null;
  cachedSession = null;
  persist();
  emit();
  return { ok: true, session: getTripSessionSnapshot() };
}

export function resetTripSession() {
  phase = "ready";
  tripId = null;
  startedAt = null;
  completedAt = null;
  vehicleId = null;
  routeId = null;
  currentStopIndex = 0;
  lastSummary = null;
  cachedSession = null;
  if (canUseLocalStorage()) {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }
  emit();
}

export { STORAGE_KEY as TRIP_STORAGE_KEY };
