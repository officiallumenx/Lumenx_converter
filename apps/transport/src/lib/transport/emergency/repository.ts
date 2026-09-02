import { repositoryDelay } from "../utils";
import { captureCurrentGps } from "../capture-gps";
import { isApiAuthMode } from "@/lib/auth/auth-mode";
import {
  createTransportEmergency as createTransportEmergencyApi,
  getOpenEmergencyForVehicle as getOpenEmergencyForVehicleApi,
  type TransportEmergencyDto,
} from "@/lib/transport-api";
import { getRouteSetupDriverScope } from "../route-setup/store";
import { getTripSessionSnapshot } from "../trip/store";
import {
  createTransportEmergency,
  findOpenEmergencyForDriver,
  findOpenEmergencyForVehicle,
  getTransportEmergencyById,
  listActiveTransportEmergencies,
  listResolvedTransportEmergencies,
  listTransportEmergencies,
  notifyAdminEmergency,
  type TransportEmergency,
} from "@lumenx/utils";

let apiOpenEmergencyCache: TransportEmergency | null = null;

function mapApiEmergencyToLocal(
  dto: TransportEmergencyDto,
  driverName?: string,
  vehicleNumber?: string,
  route?: { code: string; name: string },
): TransportEmergency {
  const now = new Date().toISOString();
  return {
    id: dto.id,
    type: (dto.emergencyType as TransportEmergency["type"]) ?? "general",
    status: dto.status,
    createdAt: now,
    acknowledgedAt: null,
    acknowledgedBy: null,
    resolvedAt: null,
    resolvedBy: null,
    resolveNote: null,
    driverId: dto.driverId,
    driverName: driverName ?? "Driver",
    vehicleId: dto.vehicleId,
    vehicleNumber: vehicleNumber ?? "—",
    routeCode: route?.code ?? "—",
    routeName: route?.name ?? "—",
    latitude: dto.latitude,
    longitude: dto.longitude,
    note: dto.note,
    timeline: [{ id: "1", at: now, label: "SOS triggered" }],
  };
}

export async function refreshApiOpenEmergency(): Promise<void> {
  if (!isApiAuthMode()) return;
  const session = getTripSessionSnapshot();
  const vehicleId = session.assignment.bus.vehicleId;
  if (!vehicleId) {
    apiOpenEmergencyCache = null;
    return;
  }
  const open = await getOpenEmergencyForVehicleApi(vehicleId);
  apiOpenEmergencyCache = open
    ? mapApiEmergencyToLocal(
        open,
        session.assignment.driver.name,
        session.assignment.bus.vehicleNumber,
        session.assignment.route,
      )
    : null;
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

/**
 * Emergency actions — frontend demo store (shared with Admin via localStorage).
 * No SMS, push, or phone calls.
 */
export const emergencyRepository = {
  list(): TransportEmergency[] {
    return listTransportEmergencies();
  },

  listActive(): TransportEmergency[] {
    return listActiveTransportEmergencies();
  },

  listHistory(): TransportEmergency[] {
    return listResolvedTransportEmergencies();
  },

  getById(id: string): TransportEmergency | null {
    return getTransportEmergencyById(id);
  },

  getOpenForCurrentDriver(): TransportEmergency | null {
    if (isApiAuthMode()) {
      return apiOpenEmergencyCache;
    }
    const session = getTripSessionSnapshot();
    const driverId = session.assignment.driver.employeeId || session.assignment.driver.id;
    const vehicleId = session.assignment.bus.vehicleId;
    return (
      findOpenEmergencyForDriver(driverId) ?? findOpenEmergencyForVehicle(vehicleId) ?? null
    );
  },

  async triggerEmergency(): Promise<EmergencyTriggerResult> {
    await repositoryDelay(80);
    const session = getTripSessionSnapshot();
    const { driver, bus, route } = session.assignment;
    const driverId = driver.employeeId || driver.id;

    let latitude: number | null = null;
    let longitude: number | null = null;
    try {
      const fix = await captureCurrentGps({ allowDemo: true });
      latitude = fix.latitude;
      longitude = fix.longitude;
    } catch {
      // Location optional for SOS — still create emergency without coords
    }

    if (isApiAuthMode()) {
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
    }

    const result = createTransportEmergency({
      type: "general",
      driverId,
      driverName: driver.name,
      vehicleId: bus.vehicleId,
      vehicleNumber: bus.vehicleNumber || bus.busNumber,
      routeCode: route.code,
      routeName: route.name,
      latitude,
      longitude,
    });

    if (!result.ok) {
      return {
        ok: false,
        created: false,
        message: result.reason,
        emergency: result.emergency,
      };
    }

    const kind =
      result.emergency.type === "breakdown"
        ? ("breakdown" as const)
        : result.emergency.type === "delay"
          ? ("delay" as const)
          : result.emergency.type === "route_issue"
            ? ("route_issue" as const)
            : ("sos" as const);
    notifyAdminEmergency({
      emergencyId: result.emergency.id,
      driverName: driver.name,
      vehicleNumber: bus.vehicleNumber || bus.busNumber,
      routeCode: route.code,
      kind,
    });

    return {
      ok: true,
      created: true,
      simulated: true,
      message: `Emergency ${result.emergency.id} created`,
      emergency: result.emergency,
    };
  },
};
