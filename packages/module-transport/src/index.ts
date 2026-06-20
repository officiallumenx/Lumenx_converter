import { MODULE_IDS } from "@lumenx/config/module-ids";
import type { RouteEntity, VehicleEntity, DriverEntity } from "@lumenx/database";

export const MODULE_ID = MODULE_IDS.transport;
export const MIN_PLAN = "plus" as const;
export const OWNER_APP = "transport" as const;

export type TripStatus = "scheduled" | "in_progress" | "completed" | "delayed" | "cancelled";

export interface TransportRoute extends Pick<RouteEntity, "id" | "name" | "code" | "stopCount" | "status"> {
  vehicleReg?: string;
  driverName?: string;
}

export interface TransportTrip {
  id: string;
  routeId: string;
  routeName: string;
  scheduledAt: string;
  status: TripStatus;
  studentsOnBoard: number;
}

export const MOCK_TRANSPORT_ROUTES: TransportRoute[] = [
  { id: "RT-01", name: "North Campus Loop", code: "NCL", stopCount: 12, status: "active", vehicleReg: "KA-01-LX-4521", driverName: "Rajesh Kumar" },
  { id: "RT-02", name: "City Center Express", code: "CCE", stopCount: 8, status: "active", vehicleReg: "KA-01-LX-8832", driverName: "Suresh Nair" },
  { id: "RT-03", name: "East Gate Shuttle", code: "EGS", stopCount: 6, status: "active", vehicleReg: "KA-01-LX-1190", driverName: "Anil Verma" },
];

export const MOCK_TRANSPORT_TRIPS: TransportTrip[] = [
  { id: "TR-1001", routeId: "RT-01", routeName: "North Campus Loop", scheduledAt: "2026-05-31T07:15:00", status: "in_progress", studentsOnBoard: 34 },
  { id: "TR-1002", routeId: "RT-02", routeName: "City Center Express", scheduledAt: "2026-05-31T07:30:00", status: "scheduled", studentsOnBoard: 0 },
  { id: "TR-1003", routeId: "RT-03", routeName: "East Gate Shuttle", scheduledAt: "2026-05-31T14:45:00", status: "scheduled", studentsOnBoard: 0 },
];

export type TransportVehicle = Pick<VehicleEntity, "id" | "registrationNo" | "capacity" | "status">;
export type TransportDriver = Pick<DriverEntity, "id" | "name" | "phone" | "status">;

export const MOCK_VEHICLES: TransportVehicle[] = [
  { id: "VH-01", registrationNo: "KA-01-LX-4521", capacity: 40, status: "active" },
  { id: "VH-02", registrationNo: "KA-01-LX-8832", capacity: 35, status: "active" },
  { id: "VH-03", registrationNo: "KA-01-LX-1190", capacity: 28, status: "active" },
];

export const MOCK_DRIVERS: TransportDriver[] = [
  { id: "DR-01", name: "Rajesh Kumar", phone: "+91 98765 43210", status: "active" },
  { id: "DR-02", name: "Suresh Nair", phone: "+91 98765 43211", status: "active" },
  { id: "DR-03", name: "Anil Verma", phone: "+91 98765 43212", status: "active" },
];
