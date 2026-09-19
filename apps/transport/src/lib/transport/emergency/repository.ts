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

function emitApi() {
  apiListeners.forEach((listener) => listener());
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
  const vehicleId = session.assignment.bus.vehicleId;
  const scope = getRouteSetupDriverScope();

  if (scope?.instituteId) {
    try {
      const rows = await listTransportEmergenciesApi({ instituteId: scope.instituteId });
      apiEmergencyListCache = rows.map((row) =>
        mapApiEmergencyToLocal(
          row,
          session.assignment.driver.name,
          session.assignment.bus.vehicleNumber,
          session.assignment.route,
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
        session.assignment.driver.name,
        session.assignment.bus.vehicleNumber,
        session.assignment.route,
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
    const { driver, bus, route } = session.assignment;
    const driverId = driver.employeeId || driver.id;

    let latitude: number | null = null;
    let longitude: number | null = null;
    try {
      const fix = await captureCurrentGps({ allowDemo: false });
      latitude = fix.latitude;
      longitude = fix.longitude;
    } catch {
      // Location optional for SOS — still create emergency without coords
    }

    const scope = getRouteSetupDriverScope();
    if (!scope?.instituteId) {
      return {
        ok: false,
        created: false,
        message: "Institute context missing",
        emergency: mapApiEmergencyToLocal({
          id: "pending",
          status: "active",
          emergencyType: "general",
          note: null,
          latitude,
          longitude,
          vehicleId: bus.vehicleId,
          driverId,
        }),
      };
    }
    try {
      const created = await createTransportEmergencyApi({
        instituteId: scope.instituteId,
        tripId: session.tripId,
        driverId: scope.driverId ?? driverId,
        vehicleId: bus.vehicleId,
        note: "SOS triggered by driver",
        latitude,
        longitude,
      });
      const emergency = mapApiEmergencyToLocal(created, driver.name, bus.vehicleNumber, route);
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
      return {
        ok: false,
        created: false,
        message: err instanceof Error ? err.message : "Failed to trigger SOS",
        emergency: mapApiEmergencyToLocal({
          id: "failed",
          status: "active",
          emergencyType: "general",
          note: null,
          latitude,
          longitude,
          vehicleId: bus.vehicleId,
          driverId,
        }),
      };
    }
  },
};
