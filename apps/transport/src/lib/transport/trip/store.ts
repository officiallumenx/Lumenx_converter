import { getApiApprovedStudentCount } from "../api-roster";
import {
  getRouteSetupDriverScope,
  getRouteSetupSnapshot,
  subscribeRouteSetup,
} from "../route-setup/store";
import type { TripAssignment } from "../types";
import {
  deriveDriverHomeAction,
  type DriverHomeAction,
  type TripSlot,
} from "./day-state";
import { isTripActive, type TripEndSummary, type TripPhase } from "./lifecycle";
import { resolveTransportServiceDate } from "./service-date";

export type { TripPhase, TripSlot };

export type TripSession = {
  phase: TripPhase;
  tripId: string | null;
  /** morning = Pickup trip, evening = Drop trip */
  slot: TripSlot | null;
  startedAt: string | null;
  completedAt: string | null;
  vehicleId: string | null;
  routeId: string | null;
  currentStopIndex: number;
  lastSummary: TripEndSummary | null;
  assignment: TripAssignment;
  /** Route-setup API hydrate finished for current scope. */
  routeHydrated: boolean;
  morningCompletedToday: boolean;
  eveningCompletedToday: boolean;
  /**
   * Offline `trip_end` queued — trip is not server-confirmed complete.
   * Home stays on continue_* until outbox ack + hydrate.
   */
  endSyncPending: boolean;
  homeAction: DriverHomeAction;
};

export type TripActionResult =
  | { ok: true; session: TripSession }
  | { ok: false; reason: string; session: TripSession };

const listeners = new Set<() => void>();

let phase: TripPhase = "ready";
let tripId: string | null = null;
let slot: TripSlot | null = null;
let startedAt: string | null = null;
let completedAt: string | null = null;
let vehicleId: string | null = null;
let routeId: string | null = null;
let currentStopIndex = 0;
let lastSummary: TripEndSummary | null = null;
let routeHydrated = false;
let morningCompletedToday = false;
let eveningCompletedToday = false;
let endSyncPending = false;
/** Slot chosen for an in-flight start (before API confirms). */
let pendingStartSlot: TripSlot | null = null;
let serviceDate = resolveTransportServiceDate();

let cachedSession: TripSession | null = null;
let cachedSessionKey = "";
let cachedSetupRevision = "";

function todayIso(): string {
  return resolveTransportServiceDate();
}

function ensureServiceDate(): void {
  const today = todayIso();
  if (serviceDate !== today) {
    serviceDate = today;
    morningCompletedToday = false;
    eveningCompletedToday = false;
    endSyncPending = false;
  }
}

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
    slot ?? "",
    startedAt ?? "",
    completedAt ?? "",
    vehicleId ?? "",
    routeId ?? "",
    String(currentStopIndex),
    routeHydrated ? "1" : "0",
    morningCompletedToday ? "1" : "0",
    eveningCompletedToday ? "1" : "0",
    endSyncPending ? "1" : "0",
    lastSummary
      ? `${lastSummary.studentsBoarded}:${lastSummary.studentsDropped}:${lastSummary.studentsRemaining}:${lastSummary.stopsCompleted}`
      : "",
  ].join("|");
}

function computeHomeAction(): DriverHomeAction {
  ensureServiceDate();
  const setup = getRouteSetupSnapshot();
  const assignment = getTripAssignmentSnapshot();
  const hasUsableStops = assignment.route.stops.length > 0;
  return deriveDriverHomeAction({
    routeHydrated,
    hasAssignedRoute: Boolean(assignment.route.adminRouteId),
    hasUsableStops,
    lockedByAdmin: setup.lockedByAdmin,
    routeSetupStatus: setup.status,
    phase,
    slot,
    morningCompletedToday,
    eveningCompletedToday,
  });
}

// Clear legacy trip chrome key once (restore via active-trip API only).
if (typeof window !== "undefined") {
  try {
    globalThis.localStorage?.removeItem("lumenx.transport.trip.v1");
  } catch {
    /* ignore */
  }
}

/** Trip assignment from logged-in driver scope + approved route-setup stops. */
export function getTripAssignmentSnapshot(): TripAssignment {
  const scope = getRouteSetupDriverScope();
  if (!scope) return EMPTY_ASSIGNMENT;

  const setup = getRouteSetupSnapshot();
  const usable = setup.stops.filter(
    (s) => s.status === "approved" || s.status === "pending",
  );
  const sourceStops = usable.length > 0 ? usable : [];
  const stops =
    sourceStops.length > 0
      ? [...sourceStops]
          .sort((a, b) => a.routeOrder - b.routeOrder)
          .map((s) => ({
            // Prefer API stop id so attendance enrollments (pickup_stop_id) match.
            id: s.apiStopId?.trim() || s.id,
            name: s.name,
            sequence: s.routeOrder,
          }))
      : [];

  const totalStudents = getApiApprovedStudentCount(scope.vehicleId);

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
      // Capacity comes from driver assignment / vehicle API — not invented here.
      capacity: null,
    },
    route: {
      code: setup.routeCode || scope.routeCode,
      name: setup.routeName || scope.routeName,
      adminRouteId: scope.routeId,
      stops,
    },
    totalStudents,
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

if (typeof window !== "undefined") {
  void import("../api-roster").then(({ subscribeApiDriverRoster }) => {
    subscribeApiDriverRoster(() => {
      cachedSession = null;
      emit();
    });
  });
}

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
    slot,
    startedAt,
    completedAt,
    vehicleId,
    routeId,
    currentStopIndex,
    lastSummary,
    assignment: getTripAssignmentSnapshot(),
    routeHydrated,
    morningCompletedToday,
    eveningCompletedToday,
    endSyncPending,
    homeAction: computeHomeAction(),
  };
  return cachedSession;
}

/** Mark offline trip_end as pending sync (does not set completed flags). */
export function markTripEndSyncPending(): TripActionResult {
  endSyncPending = true;
  cachedSession = null;
  emit();
  return { ok: true, session: getTripSessionSnapshot() };
}

export function clearTripEndSyncPending(): void {
  if (!endSyncPending) return;
  endSyncPending = false;
  cachedSession = null;
  emit();
}

function beginStartValidation(intendedSlot: TripSlot): TripActionResult | null {
  ensureServiceDate();
  const session = getTripSessionSnapshot();
  if (endSyncPending) {
    return {
      ok: false,
      reason: "Trip end is syncing. Reconnect to finish before starting another trip.",
      session,
    };
  }
  if (isTripActive(phase)) {
    return {
      ok: false,
      reason: "A trip is already running. Continue attendance or end the current trip first.",
      session,
    };
  }

  // Allow starting Drop after Pickup completed without a manual dismiss,
  // and allow starting Pickup after a stale completed chrome is cleared.
  if (phase === "completed") {
    if (intendedSlot === "evening" && morningCompletedToday && !eveningCompletedToday) {
      // OK — transition Pickup complete → Drop start
    } else if (intendedSlot === "morning" && !morningCompletedToday) {
      // OK — retry / fresh day after clearing completed chrome
    } else if (intendedSlot === "evening" && eveningCompletedToday) {
      return {
        ok: false,
        reason: "Drop trip is already completed for today.",
        session,
      };
    } else if (intendedSlot === "morning" && morningCompletedToday) {
      return {
        ok: false,
        reason: "Pickup is already completed. Start the Drop trip next.",
        session,
      };
    }
  }

  if (intendedSlot === "morning" && morningCompletedToday && !isTripActive(phase)) {
    return {
      ok: false,
      reason: "Pickup is already completed for today. Start the Drop trip next.",
      session,
    };
  }
  if (intendedSlot === "evening" && eveningCompletedToday) {
    return {
      ok: false,
      reason: "Drop trip is already completed for today.",
      session,
    };
  }
  if (intendedSlot === "evening" && !morningCompletedToday) {
    // Require Pickup completion regardless of local phase chrome (ready/completed).
    return {
      ok: false,
      reason: "Complete the Pickup trip before starting Drop.",
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
      reason: "No stops yet. Add stops in Route Setup before starting.",
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

/** Mark STARTING (confirmation accepted). Does not leave an active trip until API confirm. */
export function beginStartTripSession(
  intendedSlot: TripSlot = "morning",
): TripActionResult {
  const blocked = beginStartValidation(intendedSlot);
  if (blocked) return blocked;

  const assignment = getTripAssignmentSnapshot();
  phase = "starting";
  pendingStartSlot = intendedSlot;
  slot = intendedSlot;
  // Never invent client trip ids — API paths require UUIDs (`/trips/:id/...`).
  tripId = null;
  startedAt = null;
  completedAt = null;
  vehicleId = assignment.bus.vehicleId;
  routeId = assignment.route.adminRouteId || null;
  currentStopIndex = 0;
  lastSummary = null;
  cachedSession = null;
  emit();
  return { ok: true, session: getTripSessionSnapshot() };
}

export function getPendingStartSlot(): TripSlot | null {
  return pendingStartSlot;
}

/** Roll back STARTING when confirm/API fails so GPS/outbox never see a fake trip id. */
export function abortStartTripSession(): TripActionResult {
  if (phase !== "starting") {
    return { ok: true, session: getTripSessionSnapshot() };
  }
  phase = "ready";
  tripId = null;
  slot = null;
  pendingStartSlot = null;
  startedAt = null;
  completedAt = null;
  vehicleId = null;
  routeId = null;
  currentStopIndex = 0;
  lastSummary = null;
  cachedSession = null;
  emit();
  return { ok: true, session: getTripSessionSnapshot() };
}

/** Promote STARTING → RUNNING (or start directly if already validated). */
export function confirmStartTripSession(intendedSlot?: TripSlot): TripActionResult {
  if (phase !== "starting") {
    const nextSlot = intendedSlot ?? pendingStartSlot ?? "morning";
    const blocked = beginStartValidation(nextSlot);
    if (blocked) return blocked;
    const begin = beginStartTripSession(nextSlot);
    if (!begin.ok) return begin;
  }

  if (!tripId) {
    return {
      ok: false,
      reason: "Trip is not confirmed yet. Start again while online.",
      session: getTripSessionSnapshot(),
    };
  }

  const assignment = getTripAssignmentSnapshot();
  phase = "running";
  startedAt = new Date().toISOString();
  completedAt = null;
  vehicleId = assignment.bus.vehicleId;
  routeId = assignment.route.adminRouteId || null;
  currentStopIndex = 0;
  lastSummary = null;
  cachedSession = null;
  emit();
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
  emit();
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
  emit();
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

  ensureServiceDate();
  const stopsTotal = getTripAssignmentSnapshot().route.stops.length;
  const stopsCompleted = Math.min(currentStopIndex + 1, stopsTotal);
  phase = "completed";
  completedAt = new Date().toISOString();
  if (slot === "evening") {
    eveningCompletedToday = true;
  } else {
    morningCompletedToday = true;
    slot = slot ?? "morning";
  }
  pendingStartSlot = null;
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
  emit();
  return { ok: true, session: getTripSessionSnapshot() };
}

function asTripPhase(value: string): TripPhase {
  switch (value) {
    case "ready":
    case "starting":
    case "running":
    case "boarding":
    case "dropping":
    case "completed":
      return value;
    default:
      return "ready";
  }
}

/** Apply server trip state after API ops (API auth mode). */
export function syncTripFromApiDto(dto: {
  id: string;
  phase: TripPhase | string;
  startedAt: string | null;
  completedAt: string | null;
  vehicleId: string;
  routeId: string;
  currentStopIndex: number;
  slot?: TripSlot | string | null;
}): TripActionResult {
  ensureServiceDate();
  phase = asTripPhase(String(dto.phase));
  tripId = dto.id;
  if (dto.slot === "morning" || dto.slot === "evening") {
    slot = dto.slot;
  } else if (!slot && pendingStartSlot) {
    slot = pendingStartSlot;
  }
  startedAt = dto.startedAt;
  completedAt = dto.completedAt;
  vehicleId = dto.vehicleId;
  routeId = dto.routeId;
  currentStopIndex = dto.currentStopIndex;
  if (dto.phase === "completed") {
    if (slot === "evening") eveningCompletedToday = true;
    else morningCompletedToday = true;
    endSyncPending = false;
  } else {
    lastSummary = null;
  }
  if (dto.phase !== "starting") {
    pendingStartSlot = null;
  }
  cachedSession = null;
  emit();
  return { ok: true, session: getTripSessionSnapshot() };
}

/**
 * Apply today's completed slots from list-trips API (authoritative for reopen).
 * Does not invent trips; only marks completion flags for morning/evening.
 *
 * When `authoritative` is true (successful list-trips fetch), flags are replaced
 * from the API so a refresh cannot leave a stale Start Pickup after Pickup ended.
 * When false (merge), only sets true — used when list failed so a just-ended
 * Pickup from syncTripFromApiDto is not wiped.
 */
export function applyTodayTripCompletions(input: {
  morningCompleted: boolean;
  eveningCompleted: boolean;
  /** Replace flags from API list (default false = merge-only). */
  authoritative?: boolean;
}): void {
  ensureServiceDate();
  if (input.authoritative) {
    morningCompletedToday = input.morningCompleted;
    eveningCompletedToday = input.eveningCompleted;
  } else {
    if (input.morningCompleted) morningCompletedToday = true;
    if (input.eveningCompleted) eveningCompletedToday = true;
  }
  // If local chrome still shows an ended morning trip but Drop is next, clear active fields.
  if (
    !isTripActive(phase) &&
    morningCompletedToday &&
    !eveningCompletedToday &&
    phase === "completed" &&
    slot !== "evening"
  ) {
    phase = "ready";
    tripId = null;
    startedAt = null;
    completedAt = null;
    vehicleId = null;
    routeId = null;
    currentStopIndex = 0;
    lastSummary = null;
    slot = null;
  }
  if (eveningCompletedToday && !isTripActive(phase)) {
    phase = "completed";
    slot = "evening";
  } else if (
    !eveningCompletedToday &&
    !isTripActive(phase) &&
    morningCompletedToday &&
    phase === "completed" &&
    slot === "evening"
  ) {
    // Authoritative refresh: evening no longer complete — clear stale day-complete chrome.
    phase = "ready";
    tripId = null;
    startedAt = null;
    completedAt = null;
    vehicleId = null;
    routeId = null;
    currentStopIndex = 0;
    lastSummary = null;
    slot = null;
  }
  cachedSession = null;
  emit();
}

export function setRouteHydrated(value: boolean): void {
  if (routeHydrated === value) return;
  routeHydrated = value;
  cachedSession = null;
  emit();
}

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
  // Keep morningCompletedToday / eveningCompletedToday — Drop must remain available.
  phase = "ready";
  tripId = null;
  slot = null;
  pendingStartSlot = null;
  startedAt = null;
  completedAt = null;
  vehicleId = null;
  routeId = null;
  currentStopIndex = 0;
  lastSummary = null;
  cachedSession = null;
  emit();
  return { ok: true, session: getTripSessionSnapshot() };
}

export function resetTripSession() {
  phase = "ready";
  tripId = null;
  slot = null;
  pendingStartSlot = null;
  startedAt = null;
  completedAt = null;
  vehicleId = null;
  routeId = null;
  currentStopIndex = 0;
  lastSummary = null;
  routeHydrated = false;
  morningCompletedToday = false;
  eveningCompletedToday = false;
  endSyncPending = false;
  serviceDate = todayIso();
  cachedSession = null;
  if (typeof window !== "undefined") {
    try {
      globalThis.localStorage?.removeItem("lumenx.transport.trip.v1");
    } catch {
      // ignore
    }
  }
  emit();
}
