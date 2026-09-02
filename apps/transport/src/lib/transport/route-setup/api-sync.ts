import { isApiAuthMode } from "@/lib/auth/auth-mode";
import {
  getDriverRouteRoster,
  listTransportStops,
  submitTransportEnrollment,
  submitTransportStop,
  type DriverRouteRoster,
  type StopDto,
} from "@/lib/transport-api";
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
  const sorted = [...stops].sort((a, b) => b.routeOrder - a.routeOrder);
  return sorted[0]?.id ?? pickupStopId;
}

/** Pull approved stops + enrollments from the API into the local route-setup store. */
export async function hydrateRouteSetupFromApi(
  scope: RouteSetupDriverScope,
  roster?: DriverRouteRoster | null,
): Promise<void> {
  if (!isApiAuthMode() || !scope.instituteId || !isUuid(scope.routeId)) return;
  const data =
    roster && roster.routeId === scope.routeId
      ? roster
      : await getDriverRouteRoster(scope.instituteId);
  if (!data.routeId || data.routeId !== scope.routeId) return;
  applyApiApprovedHydration({
    lockedByAdmin: data.locked,
    stops: data.stops,
    students: data.students,
  });
}

/** Push a pending stop and its student enrollments to the transport API. */
export async function syncStopAndEnrollmentsToApi(
  scope: RouteSetupDriverScope,
  stop: RouteSetupStop,
  assignments: StudentStopAssignment[],
): Promise<{ apiStopId: string | null; syncedEnrollmentIds: string[] }> {
  if (!isApiAuthMode() || !scope.instituteId) {
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
    })) as StopDto;
    apiStopId = created.id;
  }

  const dropStopId = await resolveDropStopId(scope.routeId, apiStopId);

  const syncedEnrollmentIds: string[] = [];
  for (const assignment of assignments) {
    if (assignment.stopId !== stop.id || assignment.status !== "pending") continue;
    if (assignment.apiEnrollmentId) continue;
    if (!isUuid(assignment.studentId)) continue;

    try {
      const enrollment = (await submitTransportEnrollment({
        instituteId: scope.instituteId,
        studentId: assignment.studentId,
        routeId: scope.routeId,
        pickupStopId: apiStopId,
        dropStopId,
      })) as { id: string };
      syncedEnrollmentIds.push(assignment.id);
      assignment.apiEnrollmentId = enrollment.id;
    } catch {
      // Leave local pending — driver can retry on next save.
    }
  }

  return { apiStopId, syncedEnrollmentIds };
}
