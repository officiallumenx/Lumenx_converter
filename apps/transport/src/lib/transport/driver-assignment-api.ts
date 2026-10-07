import { normalizeIndianMobile } from "@/lib/auth/demo-drivers";
import { getDriverMe, getDriverRouteRoster } from "@/lib/transport-api";
import type { DriverAssignment } from "./driver-assignment";
import type { BusAssignment, DriverProfile, RouteAssignment, TripAssignment } from "./types";
import { setApiAttendanceRoster } from "./attendance/store";
import { clearApiDriverRoster, setApiDriverRoster } from "./api-roster";

export type TransportRouteDto = {
  id: string;
  instituteId: string;
  name: string;
  vehicleId: string | null;
  driverId: string | null;
  status: string;
  configStatus: string;
  approvalStatus: string;
};

type VehicleDto = {
  id: string;
  vehicleNumber: string;
  registrationNumber: string;
  capacity?: number | null;
};

async function transportGet<T>(path: string): Promise<T> {
  const base = (import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8787").replace(/\/+$/, "");
  const { getSupabaseAccessToken } = await import("@/lib/supabase-browser");
  const token = await getSupabaseAccessToken();
  if (!token) throw new Error("Authentication required");
  const response = await fetch(`${base}${path}`, {
    headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
  });
  const json = (await response.json()) as { data?: T; error?: { message?: string } };
  if (!response.ok) throw new Error(json.error?.message ?? "Request failed");
  return json.data as T;
}

async function listRoutes(instituteId: string): Promise<TransportRouteDto[]> {
  const query = new URLSearchParams({ institute_id: instituteId });
  return transportGet<TransportRouteDto[]>(`/api/v1/transport/routes?${query.toString()}`);
}

async function listVehicles(instituteId: string): Promise<VehicleDto[]> {
  const query = new URLSearchParams({ institute_id: instituteId });
  return transportGet<VehicleDto[]>(`/api/v1/transport/vehicles?${query.toString()}`);
}

export async function loadApiDriverAssignment(input: {
  instituteId: string;
  driverId: string;
  displayName: string;
  phone: string;
  employeeId: string;
  licenseNumber?: string;
}): Promise<DriverAssignment> {
  const driverMe = await getDriverMe(input.instituteId);
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

  const [routes, vehicles, roster] = await Promise.all([
    listRoutes(input.instituteId),
    listVehicles(input.instituteId).catch(() => [] as VehicleDto[]),
    getDriverRouteRoster(input.instituteId).catch(() => null),
  ]);

  // Prefer the roster's route (backend SoT) so enrollments and assignment stay aligned.
  const routeFromRoster = roster?.routeId
    ? (routes.find((r) => r.id === roster.routeId) ?? null)
    : null;
  const route =
    routeFromRoster ??
    routes.find(
      (r) =>
        r.driverId === driverMe.driverId &&
        (r.approvalStatus === "approved" || r.approvalStatus === "pending"),
    ) ??
    routes.find((r) => r.driverId === driverMe.driverId) ??
    null;

  if (!route && !roster?.routeId) {
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
    };
  }

  const resolvedRouteId = route?.id ?? roster?.routeId ?? null;
  const resolvedRouteName = route?.name ?? roster?.routeName ?? "Route";
  // Never invent vehicleId from route.id — that breaks New-student roster matching.
  const vehicleId = route?.vehicleId ?? roster?.vehicleId ?? null;
  const vehicle = vehicleId ? vehicles.find((v) => v.id === vehicleId) : undefined;
  const busNumber = vehicle?.vehicleNumber ?? "—";
  const busVehicleId = vehicleId ?? "";

  account.vehicleId = busVehicleId || null;
  account.vehicleNumber = busNumber;
  account.adminRouteId = resolvedRouteId;
  driver.busNumber = busNumber;

  const capacity =
    typeof vehicle?.capacity === "number" &&
    Number.isFinite(vehicle.capacity) &&
    vehicle.capacity > 0
      ? vehicle.capacity
      : null;

  const bus: BusAssignment = {
    vehicleId: busVehicleId,
    busNumber,
    vehicleNumber: busNumber,
    label: `${busNumber} · ${driverMe.displayName}`,
    capacity,
  };

  const usableStops = (roster?.stops ?? [])
    .filter((s) => s.approvalStatus === "approved" || s.approvalStatus === "pending")
    .slice()
    .sort((a, b) => a.routeOrder - b.routeOrder);

  const routeAssignment: RouteAssignment = {
    adminRouteId: resolvedRouteId ?? "",
    code: resolvedRouteName.slice(0, 3).toUpperCase(),
    name: resolvedRouteName,
    stops: usableStops.map((s) => ({
      id: s.id,
      name: s.name,
      sequence: s.routeOrder + 1,
    })),
  };

  const usableStudents = (roster?.students ?? []).filter(
    (s) => s.approvalStatus === "approved" || s.approvalStatus === "pending",
  );
  const expectedStudents = usableStudents.filter((s) => !s.notRidingToday);
  const studentCount = usableStudents.length;

  if (roster) {
    setApiDriverRoster(roster, {
      vehicleNumber: busNumber,
      vehicleId: busVehicleId || roster.vehicleId,
    });
  } else {
    clearApiDriverRoster();
  }

  setApiAttendanceRoster(
    expectedStudents.map((s) => ({
      id: s.studentId,
      name: s.studentName,
      grade: s.classLabel,
      stopName: s.pickupStopName ?? "Stop assignment pending",
      stopId: s.pickupStopId,
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
    lockedByAdmin: roster?.locked ?? route?.configStatus === "locked",
    tripAssignment,
    message: null,
  };
}

/** Roster payload used to hydrate route-setup after assignment scope is set. */
export async function loadDriverRosterForHydrate(instituteId: string) {
  return getDriverRouteRoster(instituteId).catch(() => null);
}
