/**
 * Shared Transport trip attendance (boarding/dropping) — Admin ↔ Transport ↔ Connect.
 * Frontend/localStorage mock only — no backend.
 */

import {
  notifyConnectStudentBoarded,
  notifyConnectStudentDropped,
  notifyConnectStudentNotBoarded,
} from "./transport-notification-bridge";

export const TRANSPORT_ATTENDANCE_STORAGE_KEY = "lumenx.transport.trip-attendance.v1";
export const TRANSPORT_ATTENDANCE_CHANGED_EVENT = "lumenx-transport-trip-attendance-updated";

export type SharedBoardingStatus = "pending" | "boarded" | "not_boarded";
export type SharedDroppingStatus = "pending" | "dropped" | "not_dropped";

export type SharedTripAttendanceMark = {
  id: string;
  tripId: string;
  driverId: string;
  driverName: string;
  vehicleId: string;
  vehicleNumber: string;
  routeId: string;
  routeCode: string;
  routeName: string;
  stopId: string;
  stopName: string;
  studentId: string;
  studentName: string;
  studentClass: string;
  boarding: SharedBoardingStatus;
  dropping: SharedDroppingStatus;
  boardedAt: string | null;
  droppedAt: string | null;
  updatedAt: string;
  /** True after driver ends trip — further edits need confirmChange. */
  finalized: boolean;
};

export type SharedTripAttendanceMeta = {
  tripId: string;
  driverId: string;
  driverName: string;
  vehicleId: string;
  vehicleNumber: string;
  routeId: string;
  routeCode: string;
  routeName: string;
  startedAt: string | null;
  completedAt: string | null;
  currentStopId: string | null;
  currentStopName: string | null;
  phase: string;
  finalized: boolean;
};

export type TransportAttendanceSnapshot = {
  version: 1;
  trips: SharedTripAttendanceMeta[];
  marks: SharedTripAttendanceMark[];
};

export type UpsertBoardingInput = {
  tripId: string;
  driverId: string;
  driverName: string;
  vehicleId: string;
  vehicleNumber: string;
  routeId: string;
  routeCode: string;
  routeName: string;
  /** Stop where boarding is happening (current trip stop). */
  currentStopId: string;
  currentStopName: string;
  /** Student's assigned pickup stop. */
  studentStopId: string;
  studentStopName: string;
  studentId: string;
  studentName: string;
  studentClass: string;
  boarding: SharedBoardingStatus;
  /** Required to undo/change an already boarded/not_boarded or finalized mark. */
  confirmChange?: boolean;
};

export type UpsertDroppingInput = {
  tripId: string;
  driverId: string;
  driverName: string;
  vehicleId: string;
  vehicleNumber: string;
  routeId: string;
  routeCode: string;
  routeName: string;
  stopId: string;
  stopName: string;
  studentId: string;
  studentName: string;
  studentClass: string;
  dropping: SharedDroppingStatus;
  confirmChange?: boolean;
};

export type AttendanceMarkResult =
  | { ok: true; mark: SharedTripAttendanceMark }
  | { ok: false; reason: string; code: AttendanceRuleCode };

export type AttendanceRuleCode =
  | "duplicate_boarding"
  | "duplicate_dropping"
  | "drop_before_board"
  | "wrong_stop"
  | "finalized"
  | "not_found"
  | "invalid";

function emptySnapshot(): TransportAttendanceSnapshot {
  return { version: 1, trips: [], marks: [] };
}

function canUseStorage(): boolean {
  try {
    return typeof localStorage !== "undefined" && localStorage != null;
  } catch {
    return false;
  }
}

let cachedMarks: SharedTripAttendanceMark[] | null = null;
let cachedTrips: SharedTripAttendanceMeta[] | null = null;

function invalidateCache() {
  cachedMarks = null;
  cachedTrips = null;
}

function emitChanged() {
  invalidateCache();
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(TRANSPORT_ATTENDANCE_CHANGED_EVENT));
}

function markId(tripId: string, studentId: string) {
  return `${tripId}:${studentId}`;
}

export function loadTransportAttendance(): TransportAttendanceSnapshot {
  if (!canUseStorage()) return emptySnapshot();
  try {
    const raw = localStorage.getItem(TRANSPORT_ATTENDANCE_STORAGE_KEY);
    if (!raw) return emptySnapshot();
    const parsed = JSON.parse(raw) as Partial<TransportAttendanceSnapshot>;
    if (!parsed || parsed.version !== 1) return emptySnapshot();
    return {
      version: 1,
      trips: Array.isArray(parsed.trips) ? parsed.trips : [],
      marks: Array.isArray(parsed.marks) ? parsed.marks : [],
    };
  } catch {
    return emptySnapshot();
  }
}

export function saveTransportAttendance(snapshot: TransportAttendanceSnapshot): void {
  if (!canUseStorage()) return;
  try {
    localStorage.setItem(TRANSPORT_ATTENDANCE_STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // ignore quota
  }
  emitChanged();
}

function mutate(
  updater: (snap: TransportAttendanceSnapshot) => TransportAttendanceSnapshot,
): TransportAttendanceSnapshot {
  const next = updater(loadTransportAttendance());
  saveTransportAttendance(next);
  return next;
}

export function listTransportAttendanceMarks(): SharedTripAttendanceMark[] {
  if (cachedMarks) return cachedMarks;
  cachedMarks = loadTransportAttendance().marks;
  return cachedMarks;
}

export function listTransportAttendanceTrips(): SharedTripAttendanceMeta[] {
  if (cachedTrips) return cachedTrips;
  cachedTrips = loadTransportAttendance().trips;
  return cachedTrips;
}

/** Latest non-ready trip for a vehicle (active preferred, else most recent). */
export function findTripMetaForVehicle(
  vehicleId: string,
): SharedTripAttendanceMeta | null {
  if (!vehicleId) return null;
  const trips = listTransportAttendanceTrips()
    .filter((t) => t.vehicleId === vehicleId)
    .sort((a, b) => {
      const aActive = !a.finalized && a.phase !== "ready" && a.phase !== "completed";
      const bActive = !b.finalized && b.phase !== "ready" && b.phase !== "completed";
      if (aActive !== bActive) return aActive ? -1 : 1;
      const aAt = a.startedAt ?? a.completedAt ?? "";
      const bAt = b.startedAt ?? b.completedAt ?? "";
      return aAt < bAt ? 1 : -1;
    });
  return trips[0] ?? null;
}

export function isSharedTripActive(meta: SharedTripAttendanceMeta | null): boolean {
  if (!meta) return false;
  if (meta.finalized || meta.phase === "completed") return false;
  if (meta.phase === "ready") return false;
  return Boolean(meta.startedAt) || meta.phase === "running" || meta.phase === "boarding" || meta.phase === "dropping" || meta.phase === "starting";
}

export function listMarksForTrip(tripId: string): SharedTripAttendanceMark[] {
  return listTransportAttendanceMarks().filter((m) => m.tripId === tripId);
}

export function listActiveTripAttendanceMarks(): SharedTripAttendanceMark[] {
  const trips = listTransportAttendanceTrips();
  const activeIds = new Set(
    trips.filter((t) => !t.finalized && t.phase !== "ready" && t.phase !== "completed").map((t) => t.tripId),
  );
  // Also include marks whose trip meta is missing but not finalized
  return listTransportAttendanceMarks().filter(
    (m) => activeIds.has(m.tripId) || (!m.finalized && !trips.some((t) => t.tripId === m.tripId)),
  );
}

export function getMarkForStudent(
  tripId: string,
  studentId: string,
): SharedTripAttendanceMark | null {
  const id = markId(tripId, studentId);
  return listTransportAttendanceMarks().find((m) => m.id === id) ?? null;
}

export function syncSharedTripMeta(meta: SharedTripAttendanceMeta): SharedTripAttendanceMeta {
  mutate((snap) => {
    const idx = snap.trips.findIndex((t) => t.tripId === meta.tripId);
    const trips =
      idx >= 0
        ? snap.trips.map((t, i) => (i === idx ? { ...t, ...meta } : t))
        : [...snap.trips, meta];
    return { ...snap, trips };
  });
  return meta;
}

export function finalizeTripAttendance(tripId: string, completedAt?: string): void {
  const at = completedAt ?? new Date().toISOString();
  mutate((snap) => ({
    version: 1,
    trips: snap.trips.map((t) =>
      t.tripId === tripId
        ? { ...t, finalized: true, phase: "completed", completedAt: at }
        : t,
    ),
    marks: snap.marks.map((m) =>
      m.tripId === tripId ? { ...m, finalized: true, updatedAt: at } : m,
    ),
  }));
}

export function clearTripAttendance(tripId: string): void {
  mutate((snap) => ({
    version: 1,
    trips: snap.trips.filter((t) => t.tripId !== tripId),
    marks: snap.marks.filter((m) => m.tripId !== tripId),
  }));
}

export function upsertBoardingMark(input: UpsertBoardingInput): AttendanceMarkResult {
  if (!input.tripId || !input.studentId) {
    return { ok: false, reason: "Missing trip or student.", code: "invalid" };
  }

  const studentStop = (input.studentStopId || "").trim();
  const currentStop = (input.currentStopId || "").trim();
  const studentStopName = (input.studentStopName || "").trim().toLowerCase();
  const currentStopName = (input.currentStopName || "").trim().toLowerCase();

  const stopMatches =
    (studentStop && currentStop && studentStop === currentStop) ||
    (Boolean(studentStopName) &&
      Boolean(currentStopName) &&
      studentStopName === currentStopName);

  // Boarding must happen at the student's assigned stop.
  if (input.boarding === "boarded" || input.boarding === "not_boarded") {
    if (!studentStop && studentStopName.includes("pending")) {
      return {
        ok: false,
        reason: `${input.studentName} has no approved stop yet.`,
        code: "wrong_stop",
      };
    }
    if (!stopMatches) {
      return {
        ok: false,
        reason: `${input.studentName} is assigned to ${input.studentStopName}, not the current stop (${input.currentStopName}).`,
        code: "wrong_stop",
      };
    }
  }

  const existing = getMarkForStudent(input.tripId, input.studentId);
  const now = new Date().toISOString();

  if (existing?.finalized && !input.confirmChange) {
    return {
      ok: false,
      reason: "This trip is completed. Confirm to change a finalized boarding record.",
      code: "finalized",
    };
  }

  if (
    existing &&
    existing.boarding === "boarded" &&
    input.boarding === "boarded" &&
    !input.confirmChange
  ) {
    return {
      ok: false,
      reason: `${input.studentName} is already boarded.`,
      code: "duplicate_boarding",
    };
  }

  if (
    existing &&
    (existing.boarding === "boarded" || existing.boarding === "not_boarded") &&
    input.boarding === "pending" &&
    !input.confirmChange
  ) {
    return {
      ok: false,
      reason: `Confirm to undo boarding for ${input.studentName}.`,
      code: "finalized",
    };
  }

  if (
    existing &&
    existing.boarding !== "pending" &&
    existing.boarding !== input.boarding &&
    input.boarding !== "pending" &&
    !input.confirmChange
  ) {
    return {
      ok: false,
      reason: `Confirm to change boarding status for ${input.studentName}.`,
      code: "finalized",
    };
  }

  const boardedAt =
    input.boarding === "boarded"
      ? existing?.boarding === "boarded" && existing.boardedAt
        ? existing.boardedAt
        : now
      : null;

  const mark: SharedTripAttendanceMark = {
    id: markId(input.tripId, input.studentId),
    tripId: input.tripId,
    driverId: input.driverId,
    driverName: input.driverName,
    vehicleId: input.vehicleId,
    vehicleNumber: input.vehicleNumber,
    routeId: input.routeId,
    routeCode: input.routeCode,
    routeName: input.routeName,
    stopId: input.studentStopId || input.currentStopId,
    stopName: input.studentStopName || input.currentStopName,
    studentId: input.studentId,
    studentName: input.studentName,
    studentClass: input.studentClass,
    boarding: input.boarding,
    dropping: existing?.dropping ?? "pending",
    boardedAt,
    droppedAt: existing?.droppedAt ?? null,
    updatedAt: now,
    finalized: existing?.finalized ?? false,
  };

  // Reset dropping if undoing board
  if (input.boarding !== "boarded" && mark.dropping !== "pending") {
    mark.dropping = "pending";
    mark.droppedAt = null;
  }

  mutate((snap) => {
    const marks = snap.marks.filter((m) => m.id !== mark.id);
    marks.push(mark);
    return { ...snap, marks };
  });

  if (input.boarding === "boarded") {
    notifyConnectStudentBoarded({
      tripId: input.tripId,
      studentId: input.studentId,
      studentName: input.studentName,
      stopName: mark.stopName,
      vehicleNumber: input.vehicleNumber,
    });
  } else if (input.boarding === "not_boarded") {
    notifyConnectStudentNotBoarded({
      tripId: input.tripId,
      studentId: input.studentId,
      studentName: input.studentName,
      stopName: mark.stopName,
      vehicleNumber: input.vehicleNumber,
    });
  }

  return { ok: true, mark };
}

export function upsertDroppingMark(input: UpsertDroppingInput): AttendanceMarkResult {
  if (!input.tripId || !input.studentId) {
    return { ok: false, reason: "Missing trip or student.", code: "invalid" };
  }

  const existing = getMarkForStudent(input.tripId, input.studentId);
  const now = new Date().toISOString();

  if (!existing || existing.boarding !== "boarded") {
    return {
      ok: false,
      reason: `${input.studentName} must be boarded before dropping.`,
      code: "drop_before_board",
    };
  }

  if (existing.finalized && !input.confirmChange) {
    return {
      ok: false,
      reason: "This trip is completed. Confirm to change a finalized dropping record.",
      code: "finalized",
    };
  }

  if (existing.dropping === "dropped" && input.dropping === "dropped" && !input.confirmChange) {
    return {
      ok: false,
      reason: `${input.studentName} is already dropped.`,
      code: "duplicate_dropping",
    };
  }

  if (
    (existing.dropping === "dropped" || existing.dropping === "not_dropped") &&
    input.dropping === "pending" &&
    !input.confirmChange
  ) {
    return {
      ok: false,
      reason: `Confirm to undo dropping for ${input.studentName}.`,
      code: "finalized",
    };
  }

  if (
    existing.dropping !== "pending" &&
    existing.dropping !== input.dropping &&
    input.dropping !== "pending" &&
    !input.confirmChange
  ) {
    return {
      ok: false,
      reason: `Confirm to change dropping status for ${input.studentName}.`,
      code: "finalized",
    };
  }

  const droppedAt =
    input.dropping === "dropped"
      ? existing.dropping === "dropped" && existing.droppedAt
        ? existing.droppedAt
        : now
      : null;

  const mark: SharedTripAttendanceMark = {
    ...existing,
    stopId: input.stopId || existing.stopId,
    stopName: input.stopName || existing.stopName,
    dropping: input.dropping,
    droppedAt,
    updatedAt: now,
  };

  mutate((snap) => {
    const marks = snap.marks.filter((m) => m.id !== mark.id);
    marks.push(mark);
    return { ...snap, marks };
  });

  if (input.dropping === "dropped") {
    notifyConnectStudentDropped({
      tripId: input.tripId,
      studentId: input.studentId,
      studentName: input.studentName,
      stopName: mark.stopName,
      vehicleNumber: input.vehicleNumber,
    });
  }

  return { ok: true, mark };
}

/** Connect: latest mark for a canonical student id across active (or any) trips. */
export function projectConnectAttendanceForStudent(
  studentId: string,
): SharedTripAttendanceMark | null {
  const marks = listTransportAttendanceMarks()
    .filter((m) => m.studentId === studentId)
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  return marks[0] ?? null;
}

export function resetTransportAttendance(): void {
  saveTransportAttendance(emptySnapshot());
}

export function subscribeTransportAttendance(listener: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  const onCustom = () => listener();
  const onStorage = (e: StorageEvent) => {
    if (e.key === TRANSPORT_ATTENDANCE_STORAGE_KEY || e.key === null) listener();
  };
  window.addEventListener(TRANSPORT_ATTENDANCE_CHANGED_EVENT, onCustom);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(TRANSPORT_ATTENDANCE_CHANGED_EVENT, onCustom);
    window.removeEventListener("storage", onStorage);
  };
}
