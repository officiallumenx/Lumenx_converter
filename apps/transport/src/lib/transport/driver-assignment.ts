/**
 * Resolve the logged-in driver's assignment from the shared ops bridge
 * (Admin-created Transport accounts + enrollments). Frontend-only.
 */

import { DEMO_TRANSPORT_OTP } from "@lumenx/auth";
import {
  enrollmentsForVehicle,
  findDriverAccountByPhone,
  loadTransportOps,
  listDriverAccounts,
  TRANSPORT_OPS_CHANGED_EVENT,
  type TransportDriverAccount,
} from "@lumenx/utils";

import { formatIndianMobile, normalizeIndianMobile } from "@/lib/auth/demo-drivers";
import type { BusAssignment, DriverProfile, RouteAssignment, TripAssignment } from "./types";

/** Display labels for known demo routes when Admin has not synced a name. */
const ROUTE_DISPLAY: Record<string, { code: string; name: string }> = {
  "RT-01": { code: "NCL", name: "North Campus Loop" },
  "RT-02": { code: "LVL", name: "Lakeview Loop" },
};

export type DriverAssignmentStatus =
  | "ready"
  | "loading"
  | "no_session"
  | "inactive"
  | "not_found"
  | "no_bus"
  | "no_route";

export type DriverAssignment = {
  status: DriverAssignmentStatus;
  account: TransportDriverAccount | null;
  driver: DriverProfile | null;
  bus: BusAssignment | null;
  route: RouteAssignment | null;
  studentCount: number;
  lockedByAdmin: boolean;
  tripAssignment: TripAssignment | null;
  message: string | null;
};

function routeDisplay(adminRouteId: string): { code: string; name: string } {
  return (
    ROUTE_DISPLAY[adminRouteId] ?? {
      code: adminRouteId,
      name: `Route ${adminRouteId}`,
    }
  );
}

/** Stable snapshot for useSyncExternalStore — must not allocate a new object each read. */
let cachedAssignmentPhone: string | null = null;
let cachedAssignmentOpsRaw: string | null = null;
let cachedAssignment: DriverAssignment | null = null;

function readOpsRaw(): string {
  try {
    return localStorage.getItem("lumenx.transport.ops.v1") ?? "";
  } catch {
    return "";
  }
}

function buildDriverAssignment(phone: string | null | undefined): DriverAssignment {
  if (!phone?.trim()) {
    return {
      status: "no_session",
      account: null,
      driver: null,
      bus: null,
      route: null,
      studentCount: 0,
      lockedByAdmin: false,
      tripAssignment: null,
      message: "Sign in to see your bus assignment.",
    };
  }

  const digits = normalizeIndianMobile(phone);
  const account = findDriverAccountByPhone(digits);

  if (!account) {
    return {
      status: "not_found",
      account: null,
      driver: null,
      bus: null,
      route: null,
      studentCount: 0,
      lockedByAdmin: false,
      tripAssignment: null,
      message: "No Transport account found for this phone. Ask Admin to create one.",
    };
  }

  if (account.status !== "active") {
    return {
      status: "inactive",
      account,
      driver: {
        id: account.id,
        name: account.name,
        phone: formatIndianMobile(account.phoneDigits),
        employeeId: account.employeeId,
        licenseNumber: account.licenseNumber,
        busNumber: account.vehicleNumber ?? "—",
      },
      bus: null,
      route: null,
      studentCount: 0,
      lockedByAdmin: false,
      tripAssignment: null,
      message: "Your Transport account is inactive. Contact Admin.",
    };
  }

  const vehicleId = account.vehicleId?.trim() || null;
  const vehicleNumber = account.vehicleNumber?.trim() || null;
  const adminRouteId = account.adminRouteId?.trim() || null;

  if (!vehicleId || !vehicleNumber) {
    return {
      status: "no_bus",
      account,
      driver: {
        id: account.id,
        name: account.name,
        phone: formatIndianMobile(account.phoneDigits),
        employeeId: account.employeeId,
        licenseNumber: account.licenseNumber,
        busNumber: "—",
      },
      bus: null,
      route: null,
      studentCount: 0,
      lockedByAdmin: false,
      tripAssignment: null,
      message: "No bus assigned yet. Ask Admin to assign a vehicle.",
    };
  }

  if (!adminRouteId) {
    return {
      status: "no_route",
      account,
      driver: {
        id: account.id,
        name: account.name,
        phone: formatIndianMobile(account.phoneDigits),
        employeeId: account.employeeId,
        licenseNumber: account.licenseNumber,
        busNumber: vehicleNumber,
      },
      bus: {
        vehicleId,
        busNumber: vehicleNumber,
        vehicleNumber,
        label: `${vehicleNumber} · ${account.name}`,
        capacity: 40,
      },
      route: null,
      studentCount: enrollmentsForVehicle(vehicleId).length,
      lockedByAdmin: false,
      tripAssignment: null,
      message: "No route assigned yet. Ask Admin to assign a route.",
    };
  }

  const ops = loadTransportOps();
  const lockedByAdmin = Boolean(ops.routeLocksByRoute[adminRouteId]?.locked);
  const enrollments = enrollmentsForVehicle(vehicleId);
  const display = routeDisplay(adminRouteId);
  const approvedStops = ops.driverStopsByRoute[adminRouteId]?.stops ?? [];

  const driver: DriverProfile = {
    id: account.id,
    name: account.name,
    phone: formatIndianMobile(account.phoneDigits),
    employeeId: account.employeeId,
    licenseNumber: account.licenseNumber,
    busNumber: vehicleNumber,
  };

  const bus: BusAssignment = {
    vehicleId,
    busNumber: vehicleNumber,
    vehicleNumber,
    label: `${vehicleNumber} · ${account.name}`,
    capacity: 40,
  };

  const route: RouteAssignment = {
    code: display.code,
    name: display.name,
    adminRouteId,
    stops: [...approvedStops]
      .sort((a, b) => a.routeOrder - b.routeOrder)
      .map((s) => ({
        id: s.id,
        name: s.name,
        sequence: s.routeOrder,
      })),
  };

  const tripAssignment: TripAssignment = {
    driver,
    bus,
    route,
    totalStudents: enrollments.length,
  };

  return {
    status: "ready",
    account,
    driver,
    bus,
    route,
    studentCount: enrollments.length,
    lockedByAdmin,
    tripAssignment,
    message:
      enrollments.length === 0
        ? "No students assigned to your bus yet. Ask Admin to enroll students."
        : null,
  };
}

export function resolveDriverAssignment(phone: string | null | undefined): DriverAssignment {
  const phoneKey = phone?.trim() || null;
  const opsRaw = typeof localStorage !== "undefined" ? readOpsRaw() : "";
  if (
    cachedAssignment &&
    cachedAssignmentPhone === phoneKey &&
    cachedAssignmentOpsRaw === opsRaw
  ) {
    return cachedAssignment;
  }
  const next = buildDriverAssignment(phone);
  cachedAssignmentPhone = phoneKey;
  cachedAssignmentOpsRaw = opsRaw;
  cachedAssignment = next;
  return next;
}

export function subscribeDriverAssignment(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  window.addEventListener(TRANSPORT_OPS_CHANGED_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(TRANSPORT_OPS_CHANGED_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** Demo phones listed on the login card — resolved live from ops accounts. */
export function listDemoDriverHints(): Array<{
  phoneDigits: string;
  phoneDisplay: string;
  name: string;
  busNumber: string;
  routeLabel: string;
  otp: string;
}> {
  return listDriverAccounts()
    .filter((a) => a.status === "active")
    .map((a) => {
      const routeId = a.adminRouteId ?? "";
      const display = routeId ? routeDisplay(routeId) : { code: "—", name: "No route" };
      return {
        phoneDigits: a.phoneDigits,
        phoneDisplay: formatIndianMobile(a.phoneDigits),
        name: a.name,
        busNumber: a.vehicleNumber ?? "—",
        routeLabel: display.name,
        otp: DEMO_TRANSPORT_OTP,
      };
    });
}
