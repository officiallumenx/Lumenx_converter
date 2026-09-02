import { isApiAuthMode } from "@/lib/auth/auth-mode";
import { submitTransportStop } from "@/lib/transport-api";
import type { RouteSetupDriverScope } from "./store";
import type { RouteSetupStop } from "./types";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

/** Push a pending stop submission to the transport API (driver workflow). */
export async function syncStopSubmissionToApi(
  scope: RouteSetupDriverScope,
  stop: RouteSetupStop,
): Promise<void> {
  if (!isApiAuthMode() || !scope.instituteId) return;
  if (stop.status !== "pending") return;
  if (!isUuid(scope.routeId)) return;

  await submitTransportStop({
    instituteId: scope.instituteId,
    routeId: scope.routeId,
    name: stop.name,
    locationLabel: stop.locationLabel,
    latitude: stop.latitude,
    longitude: stop.longitude,
    routeOrder: Math.max(0, stop.routeOrder - 1),
  });
}
