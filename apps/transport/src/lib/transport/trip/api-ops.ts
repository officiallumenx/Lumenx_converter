import { isApiAuthMode } from "@/lib/auth/auth-mode";
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
import { getRouteSetupDriverScope } from "../route-setup/store";
import {
  syncTripFromApiDto,
  type TripActionResult,
} from "./store";

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
  const created = await startTransportTrip({
    instituteId: scope.instituteId,
    routeId: scope.routeId,
    vehicleId: scope.vehicleId,
    driverId: scope.driverId,
    tripDate: today,
  });
  const running = await updateTransportTripPhase(created.id, { phase: "running" });
  return syncTripFromApiDto(running);
}

export async function setLifecyclePhaseViaApi(
  phase: "running" | "boarding" | "dropping",
): Promise<TripActionResult> {
  const scope = driverScopeOrThrow();
  const active = await getActiveTripForVehicle(scope.vehicleId);
  if (!active) throw new Error("No active trip");
  const updated = await updateTransportTripPhase(active.id, { phase });
  return syncTripFromApiDto(updated);
}

export async function advanceStopViaApi(): Promise<TripActionResult> {
  const scope = driverScopeOrThrow();
  const active = await getActiveTripForVehicle(scope.vehicleId);
  if (!active) throw new Error("No active trip");
  const nextIndex = active.currentStopIndex + 1;
  const updated = await updateTransportTripPhase(active.id, {
    phase: active.phase,
    currentStopIndex: nextIndex,
  });
  return syncTripFromApiDto(updated);
}

export async function endTripViaApi(): Promise<TripActionResult> {
  const scope = driverScopeOrThrow();
  const active = await getActiveTripForVehicle(scope.vehicleId);
  if (!active) throw new Error("No active trip");
  const updated = await endTransportTrip(active.id);
  return syncTripFromApiDto(updated);
}

export async function hydrateActiveTripFromApi(): Promise<void> {
  if (!isApiAuthMode()) return;
  const scope = getRouteSetupDriverScope();
  if (!scope?.vehicleId) return;
  const active = await getActiveTripForVehicle(scope.vehicleId);
  if (active) syncTripFromApiDto(active);
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
  },
): Promise<TransportBoardingEventDto> {
  return markTripDropping(tripId, input);
}

export type { TransportTripDto };
