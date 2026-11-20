import type { DriverRouteRoster } from "@/lib/transport-api";
import {
  loadDriverRosterForHydrate,
  takeLastAssignmentRoster,
} from "@/lib/transport/driver-assignment-api";
import { hydrateRouteSetupFromApi } from "@/lib/transport/route-setup/api-sync";
import type { RouteSetupDriverScope } from "@/lib/transport/route-setup/store";
import { tripRepository } from "@/lib/transport/trip/repository";
import { attendanceRepository } from "@/lib/transport/attendance/repository";
import { getTripSessionSnapshot, setRouteHydrated } from "@/lib/transport/trip/store";
import { resolveTransportServiceDate } from "@/lib/transport/trip/service-date";

type HydrateArgs = {
  instituteId: string;
  scope: RouteSetupDriverScope;
};

let inFlightKey: string | null = null;
let inFlight: Promise<void> | null = null;
let lastCompletedKey: string | null = null;

function hydrateKey(instituteId: string, scope: RouteSetupDriverScope): string {
  const date = resolveTransportServiceDate(new Date(), scope.timezone);
  return `${instituteId}:${scope.routeId}:${scope.vehicleId}:${date}`;
}

/**
 * Live-API hydrate for route-setup + today's trip + attendance.
 * Coalesces duplicate callers (AppShell + Home both mount the assignment hook).
 * Reuses the roster just fetched by assignment when still matching.
 */
export function hydrateDriverSessionFromAssignment(args: HydrateArgs): Promise<void> {
  const key = hydrateKey(args.instituteId, args.scope);
  if (inFlight && inFlightKey === key) return inFlight;

  const sameScopeAlreadyReady =
    lastCompletedKey === key && getTripSessionSnapshot().routeHydrated;

  // First paint / scope change: gate Home CTAs. Soft re-entry: refresh APIs without loading flash.
  if (!sameScopeAlreadyReady) {
    setRouteHydrated(false);
  }

  inFlightKey = key;
  inFlight = (async () => {
    const cached = takeLastAssignmentRoster();
    const rosterMatches =
      cached &&
      cached.routeId === args.scope.routeId &&
      (!args.scope.vehicleId ||
        !cached.vehicleId ||
        cached.vehicleId === args.scope.vehicleId);

    const rosterPromise: Promise<DriverRouteRoster | null> = rosterMatches
      ? Promise.resolve(cached)
      : loadDriverRosterForHydrate(args.instituteId);

    await Promise.all([
      rosterPromise.then((roster) => hydrateRouteSetupFromApi(args.scope, roster)),
      tripRepository.hydrateFromApi().then(() => attendanceRepository.hydrateFromApi()),
    ]);
  })()
    .catch(() => undefined)
    .finally(() => {
      setRouteHydrated(true);
      lastCompletedKey = key;
      if (inFlightKey === key) {
        inFlightKey = null;
        inFlight = null;
      }
    });

  return inFlight;
}

/** Drop coalesce state on sign-out / hard reset. */
export function resetDriverSessionHydrateGate(): void {
  inFlightKey = null;
  inFlight = null;
  lastCompletedKey = null;
}
