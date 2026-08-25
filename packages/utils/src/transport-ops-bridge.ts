/**
 * Shared Admin ↔ Driver transport ops bridge (localStorage demo).
 * Enrollments = student + bus (Admin). Stops/location = Driver only.
 * Fees are NOT linked here — Admin negotiates transport fee separately.
 */

export const TRANSPORT_OPS_STORAGE_KEY = "lumenx.transport.ops.v1";
export const TRANSPORT_OPS_CHANGED_EVENT = "lumenx-transport-ops-updated";

/** Admin assigns student to a bus; stop fields filled when driver updates. */
export type TransportBusEnrollment = {
  id: string;
  studentId: string;
  studentName: string;
  studentClass: string;
  vehicleId: string;
  vehicleNumber: string;
  /** Admin route for this bus when known */
  routeId: string | null;
  /** Set by driver when student is placed on a stop — no fee link */
  stopId: string | null;
  stopName: string | null;
  latitude: number | null;
  longitude: number | null;
  updatedAt: string;
};

/** Driver route stops projected for Admin auto-view */
export type TransportDriverStopSync = {
  routeId: string;
  /** Maps to Admin vehicle when known */
  vehicleId: string | null;
  vehicleNumber: string | null;
  updatedAt: string;
  stops: Array<{
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    studentIds: string[];
    routeOrder: number;
    timestampCreated: string;
    createdBy: string;
    createdByName: string;
  }>;
};

export type TransportRouteLock = {
  routeId: string;
  locked: boolean;
  lockedBy: string | null;
  updatedAt: string;
};

/** Transport app login — created in Admin, used by Driver app (demo/local). */
export type TransportDriverAccount = {
  id: string;
  adminDriverId: string;
  employeeId: string;
  /** 10-digit Indian mobile — login lookup key */
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

export type TransportOpsSnapshot = {
  enrollments: TransportBusEnrollment[];
  /** Keyed by driver or admin route id */
  driverStopsByRoute: Record<string, TransportDriverStopSync>;
  /** Admin-owned route lock state, keyed by route id. */
  routeLocksByRoute: Record<string, TransportRouteLock>;
  /** Driver Transport app accounts — one per admin driver roster row. */
  driverAccounts: TransportDriverAccount[];
};

function emptyOps(): TransportOpsSnapshot {
  return { enrollments: [], driverStopsByRoute: {}, routeLocksByRoute: {}, driverAccounts: [] };
}

export function normalizeTransportPhoneDigits(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) return digits.slice(1);
  return digits;
}

function canUseStorage(): boolean {
  return typeof localStorage !== "undefined";
}

function emitOpsChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(TRANSPORT_OPS_CHANGED_EVENT));
}

export function loadTransportOps(): TransportOpsSnapshot {
  if (!canUseStorage()) return emptyOps();
  try {
    const raw = localStorage.getItem(TRANSPORT_OPS_STORAGE_KEY);
    if (!raw) return seedTransportOps();
    const parsed = JSON.parse(raw) as TransportOpsSnapshot;
    return {
      enrollments: Array.isArray(parsed.enrollments) ? parsed.enrollments : [],
      driverStopsByRoute: parsed.driverStopsByRoute ?? {},
      routeLocksByRoute: parsed.routeLocksByRoute ?? {},
      driverAccounts: Array.isArray(parsed.driverAccounts) ? parsed.driverAccounts : [],
    };
  } catch {
    return seedTransportOps();
  }
}

export function saveTransportOps(snapshot: TransportOpsSnapshot): void {
  if (!canUseStorage()) return;
  try {
    localStorage.setItem(TRANSPORT_OPS_STORAGE_KEY, JSON.stringify(snapshot));
    emitOpsChanged();
  } catch {
    // ignore
  }
}

/** Demo enrollments — canonical STU-* IDs shared by Admin, Driver, Connect. */
export function seedTransportOps(): TransportOpsSnapshot {
  const now = "2026-07-21T10:00:00.000Z";
  const seed: TransportOpsSnapshot = {
    enrollments: [
      {
        id: "enr-01",
        studentId: "STU-1042",
        studentName: "Aarav Sharma",
        studentClass: "10-B",
        vehicleId: "VH-01",
        vehicleNumber: "BUS-01",
        routeId: "RT-01",
        stopId: "RST-01",
        stopName: "North Campus Gate",
        latitude: 28.7041,
        longitude: 77.1025,
        updatedAt: now,
      },
      {
        id: "enr-02",
        studentId: "STU-1043",
        studentName: "Noah Draxler",
        studentClass: "10-A",
        vehicleId: "VH-01",
        vehicleNumber: "BUS-01",
        routeId: "RT-01",
        stopId: null,
        stopName: null,
        latitude: null,
        longitude: null,
        updatedAt: now,
      },
      {
        id: "enr-03",
        studentId: "STU-1047",
        studentName: "Vihaan Sharma",
        studentClass: "11-A",
        vehicleId: "VH-01",
        vehicleNumber: "BUS-01",
        routeId: "RT-01",
        stopId: "RST-02",
        stopName: "Lakeview Gate",
        latitude: 28.5672,
        longitude: 77.2105,
        updatedAt: now,
      },
      {
        id: "enr-04",
        studentId: "STU-1049",
        studentName: "Aarav Mehta",
        studentClass: "9-A",
        vehicleId: "VH-01",
        vehicleNumber: "BUS-01",
        routeId: "RT-01",
        stopId: null,
        stopName: null,
        latitude: null,
        longitude: null,
        updatedAt: now,
      },
      {
        id: "enr-05",
        studentId: "STU-1044",
        studentName: "Anaya Sharma",
        studentClass: "10-B",
        vehicleId: "VH-02",
        vehicleNumber: "BUS-02",
        routeId: "RT-02",
        stopId: "RST-10",
        stopName: "Lakeview Apartments",
        latitude: 28.5672,
        longitude: 77.2105,
        updatedAt: now,
      },
      {
        id: "enr-06",
        studentId: "STU-1050",
        studentName: "Diya Kapoor",
        studentClass: "8-A",
        vehicleId: "VH-02",
        vehicleNumber: "BUS-02",
        routeId: "RT-02",
        stopId: null,
        stopName: null,
        latitude: null,
        longitude: null,
        updatedAt: now,
      },
    ],
    driverStopsByRoute: {},
    routeLocksByRoute: {},
    driverAccounts: [
      {
        id: "drv-1042",
        adminDriverId: "DR-01",
        employeeId: "DRV-1042",
        phoneDigits: "9876543210",
        name: "Rajesh Kumar",
        licenseNumber: "DL-4521-2024",
        vehicleId: "VH-01",
        vehicleNumber: "BUS-01",
        adminRouteId: "RT-01",
        status: "active",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "drv-1043",
        adminDriverId: "DR-02",
        employeeId: "DRV-1043",
        phoneDigits: "9876543211",
        name: "Suresh Nair",
        licenseNumber: "DL-8832-2023",
        vehicleId: "VH-02",
        vehicleNumber: "BUS-02",
        adminRouteId: "RT-02",
        status: "active",
        createdAt: now,
        updatedAt: now,
      },
    ],
  };
  saveTransportOps(seed);
  return seed;
}

export function listDriverAccounts(): TransportDriverAccount[] {
  return loadTransportOps().driverAccounts;
}

export function findDriverAccountByPhone(phone: string): TransportDriverAccount | null {
  const digits = normalizeTransportPhoneDigits(phone);
  if (digits.length !== 10) return null;
  return loadTransportOps().driverAccounts.find((a) => a.phoneDigits === digits) ?? null;
}

export function findDriverAccountByAdminDriverId(
  adminDriverId: string,
): TransportDriverAccount | null {
  return (
    loadTransportOps().driverAccounts.find((a) => a.adminDriverId === adminDriverId) ?? null
  );
}

/** Active driver account for a vehicle (Connect / Ops projection). */
export function findDriverAccountByVehicleId(
  vehicleId: string,
): TransportDriverAccount | null {
  if (!vehicleId) return null;
  return (
    loadTransportOps().driverAccounts.find(
      (a) => a.vehicleId === vehicleId && a.status === "active",
    ) ??
    loadTransportOps().driverAccounts.find((a) => a.vehicleId === vehicleId) ??
    null
  );
}

/** Demo route labels when trip meta has not synced yet. */
export const TRANSPORT_ROUTE_DISPLAY: Record<string, { code: string; name: string }> = {
  "RT-01": { code: "NCL", name: "North Campus Loop" },
  "RT-02": { code: "CCE", name: "City Center Express" },
};

function driverAccountSessionId(adminDriverId: string): string {
  const numeric = adminDriverId.replace(/\D/g, "") || Date.now().toString(36);
  return `drv-${numeric}`;
}

function driverEmployeeId(adminDriverId: string): string {
  const numeric = adminDriverId.replace(/\D/g, "") || "0000";
  return `DRV-${numeric.padStart(4, "0")}`;
}

/** Create or refresh a driver Transport app account from Admin roster data. */
export function upsertDriverAccountFromAdmin(input: {
  adminDriverId: string;
  name: string;
  phone: string;
  licenseNumber: string;
  vehicleId?: string | null;
  vehicleNumber?: string | null;
  adminRouteId?: string | null;
  status?: TransportDriverAccount["status"];
}): TransportOpsSnapshot {
  const ops = loadTransportOps();
  const phoneDigits = normalizeTransportPhoneDigits(input.phone);
  const now = new Date().toISOString();
  const existing = ops.driverAccounts.find((a) => a.adminDriverId === input.adminDriverId);
  const nextAccount: TransportDriverAccount = {
    id: existing?.id ?? driverAccountSessionId(input.adminDriverId),
    adminDriverId: input.adminDriverId,
    employeeId: existing?.employeeId ?? driverEmployeeId(input.adminDriverId),
    phoneDigits,
    name: input.name.trim(),
    licenseNumber: input.licenseNumber.trim(),
    vehicleId: input.vehicleId ?? null,
    vehicleNumber: input.vehicleNumber ?? null,
    adminRouteId: input.adminRouteId ?? null,
    status: input.status ?? existing?.status ?? "active",
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  const driverAccounts = existing
    ? ops.driverAccounts.map((a) => (a.adminDriverId === input.adminDriverId ? nextAccount : a))
    : [...ops.driverAccounts, nextAccount];

  const next = { ...ops, driverAccounts };
  saveTransportOps(next);
  return next;
}

export function setDriverAccountStatus(
  adminDriverId: string,
  status: TransportDriverAccount["status"],
): TransportOpsSnapshot {
  const ops = loadTransportOps();
  const driverAccounts = ops.driverAccounts.map((a) =>
    a.adminDriverId === adminDriverId
      ? { ...a, status, updatedAt: new Date().toISOString() }
      : a,
  );
  const next = { ...ops, driverAccounts };
  saveTransportOps(next);
  return next;
}

export function deleteDriverAccount(adminDriverId: string): TransportOpsSnapshot {
  const ops = loadTransportOps();
  const next = {
    ...ops,
    driverAccounts: ops.driverAccounts.filter((a) => a.adminDriverId !== adminDriverId),
  };
  saveTransportOps(next);
  return next;
}

export function syncRouteLockFromAdmin(input: {
  routeId: string;
  locked: boolean;
  lockedBy?: string | null;
}): TransportOpsSnapshot {
  const ops = loadTransportOps();
  const next: TransportOpsSnapshot = {
    ...ops,
    driverAccounts: ops.driverAccounts ?? [],
    routeLocksByRoute: {
      ...ops.routeLocksByRoute,
      [input.routeId]: {
        routeId: input.routeId,
        locked: input.locked,
        lockedBy: input.locked ? (input.lockedBy ?? "Admin") : null,
        updatedAt: new Date().toISOString(),
      },
    },
  };
  saveTransportOps(next);
  return next;
}

export function upsertBusEnrollment(
  enrollment: Omit<TransportBusEnrollment, "updatedAt"> & { updatedAt?: string },
): TransportOpsSnapshot {
  const ops = loadTransportOps();
  const row: TransportBusEnrollment = {
    ...enrollment,
    updatedAt: enrollment.updatedAt ?? new Date().toISOString(),
  };
  const idx = ops.enrollments.findIndex(
    (e) => e.id === row.id || e.studentId === row.studentId,
  );
  const enrollments =
    idx >= 0
      ? ops.enrollments.map((e, i) => (i === idx ? { ...e, ...row, id: e.id } : e))
      : [...ops.enrollments, row];
  const next = { ...ops, enrollments };
  saveTransportOps(next);
  return next;
}

export function deleteBusEnrollment(id: string): TransportOpsSnapshot {
  const ops = loadTransportOps();
  const next = {
    ...ops,
    enrollments: ops.enrollments.filter((e) => e.id !== id),
  };
  saveTransportOps(next);
  return next;
}

export function enrollmentsForVehicle(vehicleId: string): TransportBusEnrollment[] {
  return loadTransportOps().enrollments.filter((e) => e.vehicleId === vehicleId);
}

/** New = on this bus, no stop/location yet */
export function newEnrollmentsForVehicle(vehicleId: string): TransportBusEnrollment[] {
  return enrollmentsForVehicle(vehicleId).filter((e) => !e.stopId);
}

/** Existing = already on a stop */
export function existingEnrollmentsForVehicle(vehicleId: string): TransportBusEnrollment[] {
  return enrollmentsForVehicle(vehicleId).filter((e) => Boolean(e.stopId));
}

/**
 * After driver saves a stop with students — update enrollment locations
 * and push stop list for Admin to view (no fees).
 */
export function syncDriverStopAssignment(input: {
  routeId: string;
  vehicleId: string | null;
  vehicleNumber: string | null;
  createdBy: string;
  createdByName: string;
  stops: TransportDriverStopSync["stops"];
}): TransportOpsSnapshot {
  const ops = loadTransportOps();
  const updatedAt = new Date().toISOString();

  const stopByStudent = new Map<
    string,
    { stopId: string; stopName: string; latitude: number; longitude: number }
  >();
  for (const stop of input.stops) {
    for (const sid of stop.studentIds) {
      stopByStudent.set(sid, {
        stopId: stop.id,
        stopName: stop.name,
        latitude: stop.latitude,
        longitude: stop.longitude,
      });
    }
  }

  const enrollments = ops.enrollments.map((e) => {
    if (input.vehicleId && e.vehicleId !== input.vehicleId) return e;
    const hit = stopByStudent.get(e.studentId);
    if (!hit) {
      // Student was on a stop for this vehicle but removed from all stops
      if (input.vehicleId && e.vehicleId === input.vehicleId && e.stopId) {
        const stillOnRoute = input.stops.some((s) => s.studentIds.includes(e.studentId));
        if (!stillOnRoute) {
          return {
            ...e,
            stopId: null,
            stopName: null,
            latitude: null,
            longitude: null,
            updatedAt,
          };
        }
      }
      return e;
    }
    return {
      ...e,
      routeId: e.routeId ?? input.routeId,
      stopId: hit.stopId,
      stopName: hit.stopName,
      latitude: hit.latitude,
      longitude: hit.longitude,
      updatedAt,
    };
  });

  const driverStopsByRoute = {
    ...ops.driverStopsByRoute,
    [input.routeId]: {
      routeId: input.routeId,
      vehicleId: input.vehicleId,
      vehicleNumber: input.vehicleNumber,
      updatedAt,
      stops: input.stops,
    },
  };

  const next: TransportOpsSnapshot = {
    enrollments,
    driverStopsByRoute,
    routeLocksByRoute: ops.routeLocksByRoute ?? {},
    driverAccounts: ops.driverAccounts ?? [],
  };
  saveTransportOps(next);
  return next;
}

/** Canonical learner key (Connect C1 / S-2041) → Admin student id (STU-*). */
export const CONNECT_LEARNER_TO_STUDENT_ID: Record<string, string> = {
  C1: "STU-1042",
  "S-2041": "STU-1042",
  C2: "STU-1044",
  "S-2099": "STU-1044",
  C3: "STU-1047",
  "S-2105": "STU-1047",
};

/** Shared student directory — Admin / Driver / Connect ID alignment. */
export const CANONICAL_TRANSPORT_STUDENTS = [
  { id: "STU-1042", name: "Aarav Sharma", className: "10", section: "B", gradeLabel: "10-B" },
  { id: "STU-1043", name: "Noah Draxler", className: "10", section: "A", gradeLabel: "10-A" },
  { id: "STU-1044", name: "Anaya Sharma", className: "10", section: "B", gradeLabel: "10-B" },
  { id: "STU-1045", name: "Sana Khan", className: "12", section: "A", gradeLabel: "12-A" },
  { id: "STU-1046", name: "Liam Chen", className: "11", section: "B", gradeLabel: "11-B" },
  { id: "STU-1047", name: "Vihaan Sharma", className: "11", section: "A", gradeLabel: "11-A" },
  { id: "STU-1048", name: "Priya Patel", className: "9", section: "B", gradeLabel: "9-B" },
  { id: "STU-1049", name: "Aarav Mehta", className: "9", section: "A", gradeLabel: "9-A" },
  { id: "STU-1050", name: "Diya Kapoor", className: "8", section: "A", gradeLabel: "8-A" },
  { id: "STU-1051", name: "Rohan Sethi", className: "8", section: "B", gradeLabel: "8-B" },
] as const;

export function resolveCanonicalStudentId(learnerOrStudentId: string): string {
  return CONNECT_LEARNER_TO_STUDENT_ID[learnerOrStudentId] ?? learnerOrStudentId;
}

export function enrollmentForStudent(
  learnerOrStudentId: string,
): TransportBusEnrollment | null {
  const studentId = resolveCanonicalStudentId(learnerOrStudentId);
  return loadTransportOps().enrollments.find((e) => e.studentId === studentId) ?? null;
}

export function enrollmentsForRoute(routeId: string): TransportBusEnrollment[] {
  return loadTransportOps().enrollments.filter((e) => e.routeId === routeId);
}

/** Driver session id → Admin driver id */
export const DRIVER_SESSION_TO_ADMIN: Record<string, string> = {
  "drv-1042": "DR-01",
  "DRV-1042": "DR-01",
};

export type ConnectTransportProjection = {
  studentId: string;
  studentName: string;
  studentClass: string;
  vehicleId: string;
  vehicleNumber: string;
  routeId: string | null;
  routeCode: string | null;
  routeName: string | null;
  stopId: string | null;
  stopName: string | null;
  /** True when student is on a bus but has no assigned stop yet. */
  stopPending: boolean;
  latitude: number | null;
  longitude: number | null;
  driverName: string | null;
  driverPhoneDigits: string | null;
  routeStops: TransportDriverStopSync["stops"];
};

/** Connect read model — always derived from Admin→Driver ops bridge. */
export function projectConnectTransport(
  learnerOrStudentId: string,
): ConnectTransportProjection | null {
  const studentId = resolveCanonicalStudentId(learnerOrStudentId);
  const ops = loadTransportOps();
  const enrollment = ops.enrollments.find((e) => e.studentId === studentId) ?? null;
  if (!enrollment) return null;
  const routeStops =
    enrollment.routeId && ops.driverStopsByRoute[enrollment.routeId]
      ? ops.driverStopsByRoute[enrollment.routeId]!.stops
      : [];
  const synced = routeStops.find((s) => s.studentIds.includes(enrollment.studentId));
  const stopId = synced?.id ?? enrollment.stopId;
  const stopName = synced?.name ?? enrollment.stopName;
  const driver = findDriverAccountByVehicleId(enrollment.vehicleId);
  const routeId = enrollment.routeId ?? driver?.adminRouteId ?? null;
  const routeDisplay = routeId ? TRANSPORT_ROUTE_DISPLAY[routeId] : undefined;
  return {
    studentId: enrollment.studentId,
    studentName: enrollment.studentName,
    studentClass: enrollment.studentClass,
    vehicleId: enrollment.vehicleId,
    vehicleNumber: enrollment.vehicleNumber,
    routeId,
    routeCode: routeDisplay?.code ?? null,
    routeName: routeDisplay?.name ?? null,
    stopId,
    stopName,
    stopPending: !stopId,
    latitude: synced?.latitude ?? enrollment.latitude,
    longitude: synced?.longitude ?? enrollment.longitude,
    driverName: driver?.name ?? null,
    driverPhoneDigits: driver?.phoneDigits ?? null,
    routeStops,
  };
}
