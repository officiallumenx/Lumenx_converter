import {
  endTransportTrip,
  getActiveTripForVehicle,
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
  syncTripFromApiDto,
  type TripActionResult,
} from "./store";

function newClientEventId(prefix: string): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function driverScopeOrThrow() {
  const scope = getRouteSetupDriverScope();
  if (!scope?.instituteId || !scope.driverId || !scope.vehicleId || !scope.routeId) {
    throw new Error("Driver assignment is incomplete");
  }
  return scope;
}

export async function confirmStartTripViaApi(): Promise<TripActionResult> {
  const scope = driverScopeOrThrow();
  const today = new Date().toISOString().slice(0, 10);
  const clientEventId = newClientEventId("tstart");

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
      },
    });
    throw new Error(
      "Offline — trip start queued. Reconnect to confirm the trip before boarding.",
    );
  }

  const created = await startTransportTrip({
    instituteId: scope.instituteId,
    routeId: scope.routeId,
    vehicleId: scope.vehicleId,
    driverId: scope.driverId,
    tripDate: today,
    clientEventId,
  });
  const phaseId = newClientEventId("tphase");
  const running = await updateTransportTripPhase(created.id, {
    phase: "running",
    clientEventId: phaseId,
  });
  return syncTripFromApiDto(running);
}

export async function setLifecyclePhaseViaApi(
  phase: "running" | "boarding" | "dropping",
): Promise<TripActionResult> {
  const scope = driverScopeOrThrow();
  const active = await getActiveTripForVehicle(scope.vehicleId).catch(() => null);
  const tripId = active?.id;
  if (!tripId) throw new Error("No active trip");
  const clientEventId = newClientEventId("tphase");

  if (!isOpsOutboxOnline()) {
    enqueueOpsEvent({
      eventType: "trip_phase",
      tripId,
      clientEventId,
      payload: { phase },
    });
    if (active) {
      return syncTripFromApiDto({
        id: active.id,
        phase,
        startedAt: active.startedAt,
        completedAt: active.completedAt,
        vehicleId: active.vehicleId,
        routeId: active.routeId,
        currentStopIndex: active.currentStopIndex,
      });
    }
    throw new Error("Offline — phase change queued.");
  }

  const updated = await updateTransportTripPhase(tripId, { phase, clientEventId });
  return syncTripFromApiDto(updated);
}

export async function advanceStopViaApi(): Promise<TripActionResult> {
  const scope = driverScopeOrThrow();
  const active = await getActiveTripForVehicle(scope.vehicleId);
  if (!active) throw new Error("No active trip");
  const nextIndex = active.currentStopIndex + 1;
  const clientEventId = newClientEventId("tadv");

  if (!isOpsOutboxOnline()) {
    enqueueOpsEvent({
      eventType: "trip_phase",
      tripId: active.id,
      clientEventId,
      payload: { phase: active.phase, currentStopIndex: nextIndex },
    });
    return syncTripFromApiDto({
      id: active.id,
      phase: active.phase as "running" | "boarding" | "dropping" | "starting" | "ready" | "completed",
      startedAt: active.startedAt,
      completedAt: active.completedAt,
      vehicleId: active.vehicleId,
      routeId: active.routeId,
      currentStopIndex: nextIndex,
    });
  }

  const updated = await updateTransportTripPhase(active.id, {
    phase: active.phase,
    currentStopIndex: nextIndex,
    clientEventId,
  });
  return syncTripFromApiDto(updated);
}

export async function endTripViaApi(): Promise<TripActionResult> {
  const scope = driverScopeOrThrow();
  const active = await getActiveTripForVehicle(scope.vehicleId).catch(() => null);
  if (!active) throw new Error("No active trip");
  const clientEventId = newClientEventId("tend");

  if (!isOpsOutboxOnline()) {
    enqueueOpsEvent({
      eventType: "trip_end",
      tripId: active.id,
      clientEventId,
      payload: {},
    });
    return syncTripFromApiDto({
      id: active.id,
      phase: "completed",
      startedAt: active.startedAt,
      completedAt: new Date().toISOString(),
      vehicleId: active.vehicleId,
      routeId: active.routeId,
      currentStopIndex: active.currentStopIndex,
    });
  }

  const updated = await endTransportTrip(active.id, clientEventId);
  return syncTripFromApiDto(updated);
}

export async function hydrateActiveTripFromApi(): Promise<void> {
  const scope = getRouteSetupDriverScope();
  if (!scope?.vehicleId) return;
  const active = await getActiveTripForVehicle(scope.vehicleId);
  if (active) syncTripFromApiDto(active);
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
