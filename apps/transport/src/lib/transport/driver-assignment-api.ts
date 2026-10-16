import { normalizeIndianMobile } from "@/lib/auth/demo-drivers";
import { getDriverMe, getDriverRouteRoster, type DriverRouteRoster } from "@/lib/transport-api";
import type { DriverAssignment } from "./driver-assignment";
import type { BusAssignment, DriverProfile, RouteAssignment, TripAssignment } from "./types";
import { setApiAttendanceRoster } from "./attendance/store";
import { clearApiDriverRoster, setApiDriverRoster } from "./api-roster";

/** Last roster returned by assignment load — reused by hydrate (avoids a second roster GET). */
let lastAssignmentRoster: DriverRouteRoster | null = null;

export function takeLastAssignmentRoster(): DriverRouteRoster | null {
  return lastAssignmentRoster;
}

export async function loadApiDriverAssignment(input: {
  instituteId: string;
  driverId: string;
  displayName: string;
  phone: string;
  employeeId: string;
  licenseNumber?: string;
}): Promise<DriverAssignment> {
  // Parallel live APIs: driver profile + scoped roster (includes vehicle/route fields).
  // Avoid listing every institute route/vehicle on cold open.
  const [driverMe, roster] = await Promise.all([
    getDriverMe(input.instituteId),
    getDriverRouteRoster(input.instituteId).catch(() => null),
  ]);
  lastAssignmentRoster = roster;

  const instituteTimezone = driverMe.timezone?.trim() || "Asia/Kolkata";
  const phoneDigits = normalizeIndianMobile(input.phone || driverMe.phone);

  const account = {
    id: driverMe.driverId,
    adminDriverId: driverMe.driverId,
    employeeId: input.employeeId,
    phoneDigits,
    name: driverMe.displayName,
    licenseNumber: input.licenseNumber ?? "—",
    vehicleId: null as string | null,
    vehicleNumber: null as string | null,
    adminRouteId: null as string | null,
    status: "active" as const,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const driver: DriverProfile = {
    id: driverMe.driverId,
    name: driverMe.displayName,
    phone: input.phone || driverMe.phone,
    employeeId: input.employeeId,
    licenseNumber: input.licenseNumber ?? "—",
    busNumber: "—",
  };

  if (!roster?.routeId) {
    setApiAttendanceRoster([]);
    clearApiDriverRoster();
    return {
      status: "no_route",
      account,
      driver,
      bus: null,
      route: null,
      studentCount: 0,
      lockedByAdmin: false,
      tripAssignment: null,
      message: "No route assigned yet. Submit a route for admin approval.",
      timezone: instituteTimezone,
    };
  }

  const resolvedRouteId = roster.routeId;
  const resolvedRouteName = roster.routeName?.trim() || "Route";
  const vehicleId = roster.vehicleId ?? null;
  const busNumber = roster.vehicleNumber?.trim() || "—";
  const busVehicleId = vehicleId ?? "";

  account.vehicleId = busVehicleId || null;
  account.vehicleNumber = busNumber;
  account.adminRouteId = resolvedRouteId;
  driver.busNumber = busNumber;

  const capacity =
    typeof roster.vehicleCapacity === "number" &&
    Number.isFinite(roster.vehicleCapacity) &&
    roster.vehicleCapacity > 0
      ? roster.vehicleCapacity
      : null;

  const bus: BusAssignment = {
    vehicleId: busVehicleId,
    busNumber,
    vehicleNumber: busNumber,
    label: `${busNumber} · ${driverMe.displayName}`,
    capacity,
  };

  const usableStops = (roster.stops ?? [])
    .filter((s) => s.approvalStatus === "approved" || s.approvalStatus === "pending")
    .slice()
    .sort((a, b) => a.routeOrder - b.routeOrder);

  const routeAssignment: RouteAssignment = {
    adminRouteId: resolvedRouteId,
    code: resolvedRouteName.slice(0, 3).toUpperCase(),
    name: resolvedRouteName,
    stops: usableStops.map((s) => ({
      id: s.id,
      name: s.name,
      sequence: s.routeOrder + 1,
    })),
  };

  const usableStudents = (roster.students ?? []).filter(
    (s) => s.approvalStatus === "approved" || s.approvalStatus === "pending",
  );
  const expectedStudents = usableStudents.filter((s) => !s.notRidingToday);
  const studentCount = usableStudents.length;

  setApiDriverRoster(roster, {
    vehicleNumber: busNumber,
    vehicleId: busVehicleId || roster.vehicleId,
  });

  setApiAttendanceRoster(
    expectedStudents.map((s) => ({
      id: s.studentId,
      name: s.studentName,
      grade: s.classLabel,
      stopName: s.pickupStopName ?? "Stop assignment pending",
      stopId: s.pickupStopId,
      dropStopId: s.dropStopId ?? null,
      dropStopName: s.dropStopName ?? null,
      rollNo: s.rollNo,
    })),
  );

  const tripAssignment: TripAssignment = {
    driver,
    bus,
    route: routeAssignment,
    totalStudents: studentCount,
  };

  return {
    status: "ready",
    account,
    driver,
    bus,
    route: routeAssignment,
    studentCount,
    lockedByAdmin: roster.locked,
    tripAssignment,
    message: null,
    timezone: instituteTimezone,
  };
}

/** Roster payload used to hydrate route-setup after assignment scope is set. */
export async function loadDriverRosterForHydrate(instituteId: string) {
  const roster = await getDriverRouteRoster(instituteId).catch(() => null);
  if (roster) lastAssignmentRoster = roster;
  return roster;
}
