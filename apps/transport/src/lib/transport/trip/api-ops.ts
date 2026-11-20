import { TRANSPORT_STORAGE_KEYS } from "@lumenx/auth";
import {
  endTransportTrip,
  getActiveTripForVehicle,
  listTransportTrips,
  listTripBoardingEvents,
  markTripBoarding,
  markTripDropping,
  startTransportTrip,
  type TransportBoardingEventDto,
  type TransportTripDto,
  updateTransportTripPhase,
} from "@/lib/transport-api";
import { enqueueOpsEvent, flushOpsOutbox, isOpsOutboxOnline } from "../ops-outbox";
import { getRouteSetupDriverScope } from "../route-setup/store";
import {
  abortStartTripSession,
  applyTodayTripCompletions,
  clearTripEndSyncPending,
  dismissCompletedTripSession,
  getPendingStartSlot,
  getTripSessionSnapshot,
  markTripEndSyncPending,
  syncTripFromApiDto,
  type TripActionResult,
  type TripSlot,
} from "./store";
import { isTripActive } from "./lifecycle";
import { resolveTransportServiceDate } from "./service-date";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: string | null | undefined): value is string {
  return Boolean(value && UUID_RE.test(value));
}

function newClientEventId(prefix: string): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function driverScopeOrThrow() {
  const scope = getRouteSetupDriverScope();
  if (
    !scope?.instituteId ||
    !scope.driverId ||
    !scope.vehicleId ||
    !scope.routeId
  ) {
    throw new Error("Driver assignment is incomplete");
  }
  if (
    !isUuid(scope.instituteId) ||
    !isUuid(scope.driverId) ||
    !isUuid(scope.vehicleId) ||
    !isUuid(scope.routeId)
  ) {
    throw new Error(
      "Driver assignment ids are invalid. Sign out and sign in again to refresh your bus assignment.",
    );
  }
  return scope;
}

export async function confirmStartTripViaApi(
  intendedSlot?: TripSlot,
): Promise<TripActionResult> {
  const scope = driverScopeOrThrow();
  const today = resolveTransportServiceDate();
  const slot: TripSlot =
    intendedSlot ?? getPendingStartSlot() ?? "morning";
  const clientEventId = newClientEventId("tstart");

  try {
    if (!isOpsOutboxOnline()) {
      enqueueOpsEvent({
        eventType: "trip_start",
        clientEventId,
        payload: {
          instituteId: scope.instituteId,
          routeId: scope.routeId,
          vehicleId: scope.vehicleId,
          driverId: scope.driverId,
          tripDate: today,
          slot,
        },
      });
      throw new Error(
        "Offline — trip start queued. Reconnect to confirm the trip before boarding.",
      );
    }

    const created = await startTransportTrip({
      instituteId: scope.instituteId!,
      routeId: scope.routeId,
      vehicleId: scope.vehicleId,
      driverId: scope.driverId,
      tripDate: today,
      slot,
      phase: "running",
      clientEventId,
    });
    if (!isUuid(created.id)) {
      throw new Error("Server returned an invalid trip id");
    }
    return syncTripFromApiDto(created);
  } catch (err) {
    abortStartTripSession();
    throw err;
  }
}

export async function setLifecyclePhaseViaApi(
  phase: "running" | "boarding" | "dropping",
): Promise<TripActionResult> {
  const scope = driverScopeOrThrow();
  const session = getTripSessionSnapshot();
  const active =
    session.tripId && isTripActive(session.phase)
      ? null
      : await getActiveTripForVehicle(scope.vehicleId).catch(() => null);
  const tripId = session.tripId || active?.id;
  if (!tripId) throw new Error("No active trip");
  const clientEventId = newClientEventId("tphase");

  if (!isOpsOutboxOnline()) {
    enqueueOpsEvent({
      eventType: "trip_phase",
      tripId,
      clientEventId,
      payload: { phase },
    });
    return syncTripFromApiDto({
      id: tripId,
      phase,
      startedAt: session.startedAt ?? active?.startedAt ?? new Date().toISOString(),
      completedAt: active?.completedAt ?? null,
      vehicleId: scope.vehicleId,
      routeId: scope.routeId,
      currentStopIndex: session.currentStopIndex ?? active?.currentStopIndex ?? 0,
    });
  }

  const updated = await updateTransportTripPhase(tripId, { phase, clientEventId });
  return syncTripFromApiDto(updated);
}

export async function advanceStopViaApi(): Promise<TripActionResult> {
  const scope = driverScopeOrThrow();
  const session = getTripSessionSnapshot();
  const active =
    session.tripId && isTripActive(session.phase)
      ? null
      : await getActiveTripForVehicle(scope.vehicleId).catch(() => null);
  const tripId = session.tripId || active?.id;
  if (!tripId) throw new Error("No active trip");
  const currentPhase = session.phase ?? active?.phase ?? "running";
  const currentIndex = session.currentStopIndex ?? active?.currentStopIndex ?? 0;
  const nextIndex = currentIndex + 1;
  const clientEventId = newClientEventId("tadv");

  if (!isOpsOutboxOnline()) {
    enqueueOpsEvent({
      eventType: "trip_phase",
      tripId,
      clientEventId,
      payload: { phase: currentPhase, currentStopIndex: nextIndex },
    });
    return syncTripFromApiDto({
      id: tripId,
      phase: currentPhase as "running" | "boarding" | "dropping" | "starting" | "ready" | "completed",
      startedAt: session.startedAt ?? active?.startedAt ?? null,
      completedAt: active?.completedAt ?? null,
      vehicleId: scope.vehicleId,
      routeId: scope.routeId,
      currentStopIndex: nextIndex,
    });
  }

  const updated = await updateTransportTripPhase(tripId, {
    phase: currentPhase,
    currentStopIndex: nextIndex,
    clientEventId,
  });
  return syncTripFromApiDto(updated);
}

export async function endTripViaApi(): Promise<TripActionResult> {
  const scope = driverScopeOrThrow();
  const snap = getTripSessionSnapshot();
  const activeTrip =
    snap.tripId && isTripActive(snap.phase)
      ? { id: snap.tripId, slot: snap.slot ?? "morning" }
      : await getActiveTripForVehicle(scope.vehicleId).catch(() => null);
  if (!activeTrip?.id) throw new Error("No active trip");
  const clientEventId = newClientEventId("tend");

  if (!isOpsOutboxOnline()) {
    enqueueOpsEvent({
      eventType: "trip_end",
      tripId: activeTrip.id,
      clientEventId,
      payload: { slot: activeTrip.slot },
    });
    // Keep local phase active; do not set morning/evening completed until ack.
    return markTripEndSyncPending();
  }

  clearTripEndSyncPending();
  const updated = await endTransportTrip(activeTrip.id, clientEventId);
  syncTripFromApiDto(updated);

  // Directly apply completion flags from authoritative end response
  const isMorning = updated.slot === "morning";
  const isEvening = updated.slot === "evening";
  applyTodayTripCompletions({
    morningCompleted: isMorning || snap.morningCompletedToday,
    eveningCompleted: isEvening || snap.eveningCompletedToday,
    authoritative: false,
  });
  dismissCompletedTripSession();

  // Background non-blocking reconciliation for day flags/outbox flush
  void hydrateActiveTripFromApi();

  return {
    ok: true,
    session: getTripSessionSnapshot(),
  };
}

/** Prefer route scope; fall back to persisted transport session (login). */
function resolveHydrateInstituteId(
  scopeInstituteId: string | null | undefined,
): string | null {
  if (scopeInstituteId && isUuid(scopeInstituteId)) return scopeInstituteId;
  try {
    if (typeof window === "undefined") return null;
    const raw = globalThis.localStorage?.getItem(TRANSPORT_STORAGE_KEYS.session);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { instituteId?: string };
    return isUuid(parsed?.instituteId) ? parsed.instituteId! : null;
  } catch {
    return null;
  }
}

export async function hydrateActiveTripFromApi(): Promise<void> {
  const scope = getRouteSetupDriverScope();
  const vehicleId = scope?.vehicleId && isUuid(scope.vehicleId) ? scope.vehicleId : null;
  const instituteId = resolveHydrateInstituteId(scope?.instituteId);
  if (!vehicleId && !instituteId) return;

  const today = resolveTransportServiceDate();

  const activePromise = vehicleId
    ? getActiveTripForVehicle(vehicleId).catch(() => null)
    : Promise.resolve(null);

  let todays: TransportTripDto[] | null = null;
  if (instituteId) {
    try {
      todays = await listTransportTrips({
        instituteId,
        tripDate: today,
      });
    } catch {
      // Keep existing day flags when list fails (e.g. brief offline after endTrip).
      todays = null;
    }
  }

  const [active] = await Promise.all([activePromise]);

  if (todays && vehicleId) {
    const vehicleTrips = todays.filter((t) => t.vehicleId === vehicleId);
    const morningCompleted = vehicleTrips.some(
      (t) => t.slot === "morning" && (t.phase === "completed" || t.finalized),
    );
    const eveningCompleted = vehicleTrips.some(
      (t) => t.slot === "evening" && (t.phase === "completed" || t.finalized),
    );
    applyTodayTripCompletions({
      morningCompleted,
      eveningCompleted,
      authoritative: true,
    });
  }

  const morningCompleted = getTripSessionSnapshot().morningCompletedToday;
  const eveningCompleted = getTripSessionSnapshot().eveningCompletedToday;

  if (active) {
    syncTripFromApiDto(active);
  } else if (vehicleId) {
    const snap = getTripSessionSnapshot();
    if (snap.endSyncPending || isTripActive(snap.phase)) {
      // Server has no active trip after end ack / restart — reconcile local chrome.
      const slot = snap.slot ?? (eveningCompleted ? "evening" : "morning");
      if (snap.tripId || morningCompleted || eveningCompleted) {
        syncTripFromApiDto({
          id: snap.tripId ?? "reconciled-end",
          phase: "completed",
          startedAt: snap.startedAt,
          completedAt: new Date().toISOString(),
          vehicleId: snap.vehicleId ?? vehicleId,
          routeId: snap.routeId ?? "",
          currentStopIndex: snap.currentStopIndex,
          slot,
        });
        dismissCompletedTripSession();
      } else {
        clearTripEndSyncPending();
      }
    } else if (
      morningCompleted &&
      !eveningCompleted &&
      !isTripActive(snap.phase)
    ) {
      // Ensure Drop is available after Pickup end / refresh (no stale completed chrome).
      dismissCompletedTripSession();
    }
  }
  void flushOpsOutbox();
}

export async function listBoardingViaApi(tripId: string): Promise<TransportBoardingEventDto[]> {
  return listTripBoardingEvents(tripId);
}

export async function markBoardingViaApi(
  tripId: string,
  input: {
    studentId: string;
    stopId: string;
    boardingStatus: "pending" | "boarded" | "not_boarded";
    clientEventId: string;
  },
): Promise<TransportBoardingEventDto> {
  return markTripBoarding(tripId, input);
}

export async function markDroppingViaApi(
  tripId: string,
  input: {
    studentId: string;
    stopId: string;
    droppingStatus: "pending" | "dropped" | "not_dropped";
    clientEventId: string;
  },
): Promise<TransportBoardingEventDto> {
  return markTripDropping(tripId, input);
}

export type { TransportTripDto };
