import type { BusAssignment, DriverProfile, RouteAssignment, TripAssignment } from "./types";

export type DriverAssignmentStatus =
  | "ready"
  | "loading"
  | "no_session"
  | "inactive"
  | "not_found"
  | "no_bus"
  | "no_route";

/** Driver account snapshot from the transport API (not ops localStorage). */
export type DriverAccountSnapshot = {
  id: string;
  adminDriverId: string;
  employeeId: string;
  phoneDigits: string;
  name: string;
  licenseNumber: string;
  vehicleId: string | null;
  vehicleNumber: string | null;
  adminRouteId: string | null;
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
};

export type DriverAssignment = {
  status: DriverAssignmentStatus;
  account: DriverAccountSnapshot | null;
  driver: DriverProfile | null;
  bus: BusAssignment | null;
  route: RouteAssignment | null;
  studentCount: number;
  lockedByAdmin: boolean;
  tripAssignment: TripAssignment | null;
  message: string | null;
};
