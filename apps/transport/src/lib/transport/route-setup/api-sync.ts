import {
  getDriverRouteRoster,
  listTransportStops,
  submitTransportEnrollment,
  submitTransportStop,
  updateTransportEnrollment,
  updateTransportStop,
  type DriverRouteRoster,
  type StopDto,
} from "@/lib/transport-api";
import {
  listApiEnrollmentsForVehicle,
  setApiDriverRoster,
  listApprovedAttendanceRosterStudents,
} from "../api-roster";
import {
  applyApiApprovedHydration,
  setRouteSetupDriverScope,
  type RouteSetupDriverScope,
} from "./store";
import type { RouteSetupStop, StudentStopAssignment } from "./types";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

function resolveExistingEnrollmentId(
  scope: RouteSetupDriverScope,
  assignment: StudentStopAssignment,
): string | null {
  if (assignment.apiEnrollmentId && isUuid(assignment.apiEnrollmentId)) {
    return assignment.apiEnrollmentId;
  }
  const fromRoster = listApiEnrollmentsForVehicle(scope.vehicleId).find(
    (row) => row.studentId === assignment.studentId,
  );
  if (fromRoster?.id && isUuid(fromRoster.id)) {
    return fromRoster.id;
  }
  return null;
}

/** Pull stops + enrollments from the API into the in-memory route-setup store (API is SoT). */
export async function hydrateRouteSetupFromApi(
  scope: RouteSetupDriverScope,
  roster?: DriverRouteRoster | null,
): Promise<void> {
  if (!scope.instituteId || !isUuid(scope.routeId)) return;
  const data =
    roster && roster.routeId
      ? roster.routeId === scope.routeId
        ? roster
        : await getDriverRouteRoster(scope.instituteId)
      : await getDriverRouteRoster(scope.instituteId);
  if (!data.routeId) return;

  let activeScope = scope;
  if (data.routeId !== scope.routeId) {
    // Realign to roster route instead of silently skipping hydration.
    activeScope = {
      ...scope,
      routeId: data.routeId,
      routeName: data.routeName?.trim() || scope.routeName,
      routeCode: (data.routeName?.trim() || scope.routeName).slice(0, 3).toUpperCase(),
      vehicleId: data.vehicleId?.trim() || scope.vehicleId,
    };
    setRouteSetupDriverScope(activeScope);
  }

  setApiDriverRoster(data, {
    vehicleNumber: activeScope.vehicleNumber,
    vehicleId: activeScope.vehicleId || data.vehicleId,
  });
  const { setApiAttendanceRoster } = await import("../attendance/store");
  setApiAttendanceRoster(listApprovedAttendanceRosterStudents());
  applyApiApprovedHydration({
    lockedByAdmin: data.locked,
    stops: data.stops,
    students: data.students,
  });
}

/**
 * Assign an existing route stop to an enrolled student.
 * Mandatory Single-Stop Rule: sets both pickup and drop to the same stop.
 */
export async function assignEnrollmentPickupStop(
  scope: RouteSetupDriverScope,
  enrollmentId: string,
  pickupStopId: string,
): Promise<void> {
  if (!scope.instituteId || !isUuid(scope.routeId)) {
    throw new Error("Route is not ready for stop assignment");
  }
  if (!isUuid(enrollmentId) || !isUuid(pickupStopId)) {
    throw new Error("Select a valid pickup stop");
  }
  await updateTransportEnrollment(enrollmentId, {
    pickupStopId,
    dropStopId: pickupStopId,
  });
  await hydrateRouteSetupFromApi(scope);
}

/** Assign common stop — maintains identical pickup and drop. */
export async function assignEnrollmentDropStop(
  scope: RouteSetupDriverScope,
  enrollmentId: string,
  dropStopId: string,
): Promise<void> {
  if (!scope.instituteId || !isUuid(scope.routeId)) {
    throw new Error("Route is not ready for stop assignment");
  }
  if (!isUuid(enrollmentId) || !isUuid(dropStopId)) {
    throw new Error("Select a valid drop stop");
  }
  await updateTransportEnrollment(enrollmentId, {
    pickupStopId: dropStopId,
    dropStopId,
  });
  await hydrateRouteSetupFromApi(scope);
}

/** Push or refresh the driver parking / start endpoint for this route. */
export async function syncParkingStopToApi(
  scope: RouteSetupDriverScope,
  gps: { latitude: number; longitude: number; accuracyM?: number | null },
): Promise<StopDto> {
  if (!scope.instituteId || !isUuid(scope.routeId)) {
    throw new Error("Route is not ready for parking location");
  }

  const existing = (await listTransportStops({ routeId: scope.routeId })).find(
    (s) => s.kind === "parking",
  );
  if (existing?.id) {
    // GPS refresh: update ONLY coordinates — never radius/name/order/kind.
    return (await updateTransportStop(existing.id, {
      latitude: gps.latitude,
      longitude: gps.longitude,
    })) as StopDto;
  }

  const label =
    gps.accuracyM != null
      ? `Bus park · ±${Math.round(gps.accuracyM)}m`
      : "Bus park";
  return (await submitTransportStop({
    instituteId: scope.instituteId,
    routeId: scope.routeId,
    name: "Bus park",
    locationLabel: label,
    latitude: gps.latitude,
    longitude: gps.longitude,
    routeOrder: 0,
    kind: "parking",
  })) as StopDto;
}

/**
 * Allocate a free API route_order. Local UI uses 1..n for waypoints and 10000 for
 * school; subtracting 1 collided with Admin school stops that already occupy
 * route_order 1 in the API (409 CONFLICT).
 */
async function nextFreeRouteOrder(
  routeId: string,
  excludeStopId?: string | null,
): Promise<number> {
  const existing = await listTransportStops({ routeId });
  let maxOrder = -1;
  for (const row of existing) {
    if (excludeStopId && row.id === excludeStopId) continue;
    if (typeof row.routeOrder === "number" && Number.isFinite(row.routeOrder)) {
      maxOrder = Math.max(maxOrder, row.routeOrder);
    }
  }
  return maxOrder + 1;
}

/** Push a pending stop and its student enrollments to the transport API. */
export async function syncStopAndEnrollmentsToApi(
  scope: RouteSetupDriverScope,
  stop: RouteSetupStop,
  assignments: StudentStopAssignment[],
): Promise<{ apiStopId: string | null; syncedEnrollmentIds: string[] }> {
  if (!scope.instituteId) {
    return { apiStopId: null, syncedEnrollmentIds: [] };
  }
  if (stop.status !== "pending") {
    return { apiStopId: stop.apiStopId ?? null, syncedEnrollmentIds: [] };
  }
  if (!isUuid(scope.routeId)) {
    return { apiStopId: null, syncedEnrollmentIds: [] };
  }

  let apiStopId = stop.apiStopId ?? null;
  if (!apiStopId) {
    const routeOrder = await nextFreeRouteOrder(scope.routeId);
    const created = (await submitTransportStop({
      instituteId: scope.instituteId,
      routeId: scope.routeId,
      name: stop.name,
      locationLabel: stop.locationLabel,
      latitude: stop.latitude,
      longitude: stop.longitude,
      routeOrder,
      notificationRadiusM: stop.notificationRadiusM,
    })) as StopDto;
    apiStopId = created.id;
  } else if (isUuid(apiStopId)) {
    // Keep the persisted API order on edit/resubmit — do not remap from local index.
    const existingRows = await listTransportStops({ routeId: scope.routeId });
    const existingOrder = existingRows.find((s) => s.id === apiStopId)?.routeOrder;
    const routeOrder =
      typeof existingOrder === "number" && Number.isFinite(existingOrder)
        ? existingOrder
        : await nextFreeRouteOrder(scope.routeId, apiStopId);
    await updateTransportStop(apiStopId, {
      name: stop.name,
      locationLabel: stop.locationLabel,
      latitude: stop.latitude,
      longitude: stop.longitude,
      routeOrder,
      notificationRadiusM: stop.notificationRadiusM,
    });
  }

  // Single-Stop Rule: student's assigned stop is identical for both pickup and drop.
  const dropStopId = apiStopId;

  const syncedEnrollmentIds: string[] = [];
  for (const assignment of assignments) {
    if (assignment.stopId !== stop.id || assignment.status !== "pending") continue;
    if (!isUuid(assignment.studentId)) continue;

    const existingEnrollmentId = resolveExistingEnrollmentId(scope, assignment);
    if (existingEnrollmentId) {
      await updateTransportEnrollment(existingEnrollmentId, {
        pickupStopId: apiStopId,
        dropStopId,
      });
      assignment.apiEnrollmentId = existingEnrollmentId;
      syncedEnrollmentIds.push(assignment.id);
      continue;
    }

    const enrollment = (await submitTransportEnrollment({
      instituteId: scope.instituteId,
      studentId: assignment.studentId,
      routeId: scope.routeId,
      pickupStopId: apiStopId,
      dropStopId,
    })) as { id: string };
    syncedEnrollmentIds.push(assignment.id);
    assignment.apiEnrollmentId = enrollment.id;
  }

  return { apiStopId, syncedEnrollmentIds };
}
