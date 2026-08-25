import { repositoryDelay } from "../utils";
import { captureCurrentGps } from "../capture-gps";
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

export type EmergencyTriggerResult =
  | {
      ok: true;
      created: true;
      simulated: true;
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
