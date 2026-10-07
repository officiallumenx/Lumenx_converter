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
  type RouteSetupDriverScope,
} from "./store";
import type { RouteSetupStop, StudentStopAssignment } from "./types";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

async function resolveDropStopId(routeId: string, pickupStopId: string): Promise<string> {
  const stops = await listTransportStops({ routeId });
  if (stops.length === 0) return pickupStopId;
  const school = stops.find((s) => s.kind === "school");
  if (school?.id) return school.id;
  const sorted = [...stops].sort((a, b) => b.routeOrder - a.routeOrder);
  return sorted[0]?.id ?? pickupStopId;
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
    roster && roster.routeId === scope.routeId
      ? roster
      : await getDriverRouteRoster(scope.instituteId);
  if (!data.routeId || data.routeId !== scope.routeId) return;
  setApiDriverRoster(data, { vehicleNumber: scope.vehicleNumber });
  const { setApiAttendanceRoster } = await import("../attendance/store");
  setApiAttendanceRoster(listApprovedAttendanceRosterStudents());
  applyApiApprovedHydration({
    lockedByAdmin: data.locked,
    stops: data.stops,
    students: data.students,
  });
}

/**
 * Assign an existing route pickup stop to an enrolled student who has no (or orphan) pickup.
 * Does not invent stops — caller must pass an explicit waypoint stop id.
 * If drop is still null, also sets drop to school (or last stop) when available —
 * only as the existing resolveDropStopId helper, never inventing a new stop.
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
  const fromRoster = listApiEnrollmentsForVehicle(scope.vehicleId).find(
    (row) => row.id === enrollmentId,
  );
  const dropStopId = fromRoster?.dropStopId
    ? fromRoster.dropStopId
    : await resolveDropStopId(scope.routeId, pickupStopId);
  await updateTransportEnrollment(enrollmentId, {
    pickupStopId,
    dropStopId,
  });
  await hydrateRouteSetupFromApi(scope);
}

/** Assign drop only — explicit school/waypoint choice; never invents a stop. */
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
  await updateTransportEnrollment(enrollmentId, { dropStopId });
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
    const created = (await submitTransportStop({
      instituteId: scope.instituteId,
      routeId: scope.routeId,
      name: stop.name,
      locationLabel: stop.locationLabel,
      latitude: stop.latitude,
      longitude: stop.longitude,
      routeOrder: Math.max(0, stop.routeOrder - 1),
      notificationRadiusM: stop.notificationRadiusM,
    })) as StopDto;
    apiStopId = created.id;
  } else if (isUuid(apiStopId)) {
    await updateTransportStop(apiStopId, {
      name: stop.name,
      locationLabel: stop.locationLabel,
      latitude: stop.latitude,
      longitude: stop.longitude,
      routeOrder: Math.max(0, stop.routeOrder - 1),
      notificationRadiusM: stop.notificationRadiusM,
    });
  }

  const dropStopId = await resolveDropStopId(scope.routeId, apiStopId);

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
