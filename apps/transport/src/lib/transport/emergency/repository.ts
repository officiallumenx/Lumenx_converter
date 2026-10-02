import { repositoryDelay } from "../utils";
import { captureCurrentGps } from "../capture-gps";
import {
  createTransportEmergency as createTransportEmergencyApi,
  getOpenEmergencyForVehicle as getOpenEmergencyForVehicleApi,
  listTransportEmergenciesApi,
  type TransportEmergencyDto,
} from "@/lib/transport-api";
import { getRouteSetupDriverScope } from "../route-setup/store";
import { getTripSessionSnapshot } from "../trip/store";
import type { TransportEmergency } from "@lumenx/utils";

let apiOpenEmergencyCache: TransportEmergency | null = null;
let apiEmergencyListCache: TransportEmergency[] = [];
const apiListeners = new Set<() => void>();

type EmergencySnapshot = {
  emergencies: TransportEmergency[];
  open: TransportEmergency | null;
  rev: number;
};

let snapshotRev = 0;
let snapshotCache: EmergencySnapshot = {
  emergencies: apiEmergencyListCache,
  open: apiOpenEmergencyCache,
  rev: snapshotRev,
};

function rebuildSnapshot() {
  snapshotRev += 1;
  snapshotCache = {
    emergencies: apiEmergencyListCache,
    open: apiOpenEmergencyCache,
    rev: snapshotRev,
  };
}

function emitApi() {
  rebuildSnapshot();
  apiListeners.forEach((listener) => listener());
}

export function getEmergencySnapshot(): EmergencySnapshot {
  return snapshotCache;
}

function isUuid(value: string | null | undefined): value is string {
  if (!value) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function mapApiEmergencyToLocal(
  dto: TransportEmergencyDto,
  driverName?: string,
  vehicleNumber?: string,
  route?: { code: string; name: string },
): TransportEmergency {
  const createdAt = dto.createdAt ?? new Date().toISOString();
  return {
    id: dto.id,
    type: (dto.emergencyType as TransportEmergency["type"]) ?? "general",
    status: dto.status,
    createdAt,
    acknowledgedAt: dto.acknowledgedAt ?? null,
    acknowledgedBy: null,
    resolvedAt: dto.resolvedAt ?? null,
    resolvedBy: null,
    resolveNote: dto.resolveNote ?? null,
    driverId: dto.driverId,
    driverName: dto.driverName ?? driverName ?? "Driver",
    vehicleId: dto.vehicleId,
    vehicleNumber: dto.vehicleNumber ?? vehicleNumber ?? "—",
    routeCode: route?.code ?? "—",
    routeName: dto.routeName ?? route?.name ?? "—",
    latitude: dto.latitude,
    longitude: dto.longitude,
    note: dto.note,
    timeline:
      dto.timeline && dto.timeline.length > 0
        ? dto.timeline.map((t) => ({ id: t.id, at: t.at, label: t.label }))
        : [{ id: "1", at: createdAt, label: "SOS triggered" }],
  };
}

export function subscribeApiEmergencies(listener: () => void): () => void {
  apiListeners.add(listener);
  return () => apiListeners.delete(listener);
}

export async function refreshApiOpenEmergency(): Promise<void> {
  const session = getTripSessionSnapshot();
  const scope = getRouteSetupDriverScope();
  const vehicleId =
    (isUuid(scope?.vehicleId) ? scope!.vehicleId : null) ||
    (isUuid(session.assignment.bus.vehicleId) ? session.assignment.bus.vehicleId : null) ||
    (isUuid(session.vehicleId) ? session.vehicleId : null);

  if (scope?.instituteId) {
    try {
      const rows = await listTransportEmergenciesApi({ instituteId: scope.instituteId });
      apiEmergencyListCache = rows.map((row) =>
        mapApiEmergencyToLocal(
          row,
          scope.driverName ?? session.assignment.driver.name,
          scope.vehicleNumber ?? session.assignment.bus.vehicleNumber,
          {
            code: scope.routeCode ?? session.assignment.route.code,
            name: scope.routeName ?? session.assignment.route.name,
          },
        ),
      );
    } catch {
      // Keep prior cache on transient failures.
    }
  }

  if (!vehicleId) {
    apiOpenEmergencyCache = null;
    emitApi();
    return;
  }

  const open = await getOpenEmergencyForVehicleApi(vehicleId).catch(() => null);
  apiOpenEmergencyCache = open
    ? mapApiEmergencyToLocal(
        open,
        scope?.driverName ?? session.assignment.driver.name,
        scope?.vehicleNumber ?? session.assignment.bus.vehicleNumber,
        {
          code: scope?.routeCode ?? session.assignment.route.code,
          name: scope?.routeName ?? session.assignment.route.name,
        },
      )
    : null;
  emitApi();
}

export type EmergencyTriggerResult =
  | {
      ok: true;
      created: true;
      simulated: boolean;
      message: string;
      emergency: TransportEmergency;
    }
  | {
      ok: false;
      created: false;
      message: string;
      emergency: TransportEmergency;
    };

/** Emergency actions — API list/create only. */
export const emergencyRepository = {
  list(): TransportEmergency[] {
    return apiEmergencyListCache;
  },

  listActive(): TransportEmergency[] {
    return apiEmergencyListCache.filter(
      (e) => e.status === "active" || e.status === "acknowledged",
    );
  },

  listHistory(): TransportEmergency[] {
    return apiEmergencyListCache.filter((e) => e.status === "resolved");
  },

  getById(id: string): TransportEmergency | null {
    return apiEmergencyListCache.find((e) => e.id === id) ?? null;
  },

  getOpenForCurrentDriver(): TransportEmergency | null {
    return apiOpenEmergencyCache;
  },

  async triggerEmergency(): Promise<EmergencyTriggerResult> {
    await repositoryDelay(80);
    const session = getTripSessionSnapshot();
    const scope = getRouteSetupDriverScope();
    const { driver, bus, route } = session.assignment;

    const instituteId = scope?.instituteId ?? null;
    const driverId = (isUuid(scope?.driverId) ? scope!.driverId : null) ||
      (isUuid(driver.id) ? driver.id : null) ||
      (isUuid(driver.employeeId) ? driver.employeeId : null);
    const vehicleId =
      (isUuid(scope?.vehicleId) ? scope!.vehicleId : null) ||
      (isUuid(bus.vehicleId) ? bus.vehicleId : null);
    const tripId = isUuid(session.tripId) ? session.tripId : null;
    const driverName = scope?.driverName ?? driver.name;
    const vehicleNumber = scope?.vehicleNumber ?? bus.vehicleNumber;
    const routeMeta = {
      code: scope?.routeCode ?? route.code,
      name: scope?.routeName ?? route.name,
    };

    let latitude: number | null = null;
    let longitude: number | null = null;
    try {
      const fix = await captureCurrentGps({ allowDemo: false });
      latitude = fix.latitude;
      longitude = fix.longitude;
    } catch {
      // Location optional for SOS — still create emergency without coords
    }

    const placeholder = (): TransportEmergency =>
      mapApiEmergencyToLocal(
        {
          id: "pending",
          status: "active",
          emergencyType: "general",
          note: null,
          latitude,
          longitude,
          vehicleId: vehicleId ?? "unknown",
          driverId: driverId ?? "unknown",
        },
        driverName,
        vehicleNumber,
        routeMeta,
      );

    if (!instituteId) {
      return {
        ok: false,
        created: false,
        message: "Institute context missing. Sign in again, then retry SOS.",
        emergency: placeholder(),
      };
    }
    if (!driverId || !vehicleId) {
      return {
        ok: false,
        created: false,
        message: "Bus assignment incomplete. Ask Admin to assign your vehicle, then retry.",
        emergency: placeholder(),
      };
    }

    try {
      const created = await createTransportEmergencyApi({
        instituteId,
        tripId,
        driverId,
        vehicleId,
        note: "SOS triggered by driver",
        latitude,
        longitude,
      });
      const emergency = mapApiEmergencyToLocal(created, driverName, vehicleNumber, routeMeta);
      apiOpenEmergencyCache = emergency;
      apiEmergencyListCache = [
        emergency,
        ...apiEmergencyListCache.filter((e) => e.id !== emergency.id),
      ];
      emitApi();
      return {
        ok: true,
        created: true,
        simulated: false,
        message: `Emergency ${created.id} created`,
        emergency,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to trigger SOS";
      // Refresh open state so a conflict ("already open") surfaces correctly.
      await refreshApiOpenEmergency().catch(() => undefined);
      const open = apiOpenEmergencyCache;
      return {
        ok: false,
        created: false,
        message,
        emergency: open ?? placeholder(),
      };
    }
  },
};
