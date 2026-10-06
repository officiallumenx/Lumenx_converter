import type { AttendanceStudentState, BoardingStatus, DroppingStatus, RosterStudent } from "../types";
import { getTripSessionSnapshot, subscribeTripSession } from "../trip/store";
import { listBoardingViaApi } from "../trip/api-ops";

const listeners = new Set<() => void>();

/** Active bus for attendance — set from logged-in driver assignment. */
let activeVehicleId: string | null = null;

/** API roster seeded from driver-route-roster. */
let apiRosterBase: RosterStudent[] | null = null;

function createRosterBase(): AttendanceStudentState[] {
  if (!apiRosterBase) return [];
  return apiRosterBase.map((student) => ({
    ...student,
    boarding: "pending" as const,
    dropping: "pending" as const,
    boardedAt: null,
    droppedAt: null,
    syncStatus: "idle" as const,
  }));
}

/** Seed attendance roster from transport API enrollments (API auth mode). */
export function setApiAttendanceRoster(roster: RosterStudent[]): void {
  apiRosterBase = roster.map((s) => ({ ...s }));
  students = createRosterBase();
  emit();
  void hydrateAttendanceFromApi();
}

export function clearApiAttendanceRoster(): void {
  apiRosterBase = null;
}

let students: AttendanceStudentState[] = createRosterBase();

function emit() {
  listeners.forEach((listener) => listener());
}

function replaceStudent(
  id: string,
  updater: (current: AttendanceStudentState) => AttendanceStudentState,
): AttendanceStudentState | null {
  const index = students.findIndex((s) => s.id === id);
  if (index < 0) return null;
  const next = updater(students[index]!);
  students = students.map((s, i) => (i === index ? next : s));
  emit();
  return next;
}

/** Bind attendance roster to the logged-in driver's vehicle. */
export function setAttendanceVehicleScope(vehicleId: string | null): void {
  if (activeVehicleId === vehicleId) return;
  activeVehicleId = vehicleId;
  students = createRosterBase();
  emit();
  void hydrateAttendanceFromApi();
}

export function getAttendanceVehicleScope(): string | null {
  return activeVehicleId;
}

// Clear legacy shared attendance key (API boarding events are SoT).
if (typeof window !== "undefined") {
  try {
    localStorage.removeItem("lumenx.transport.trip-attendance.v1");
  } catch {
    /* ignore */
  }
  subscribeTripSession(() => {
    emit();
  });
}

export function subscribeAttendanceStore(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getAttendanceSnapshot(): AttendanceStudentState[] {
  return students;
}

export function resetAttendanceStore() {
  students = createRosterBase();
  emit();
}

export type AttendanceActionResult = {
  ok: boolean;
  reason?: string;
  code?: "not_found" | "invalid" | "confirm_required" | "finalized";
  student?: AttendanceStudentState | null;
};

/** Instant local boarding mark — UI updates before the API round-trip. */
export function applyLocalBoarding(
  id: string,
  status: BoardingStatus,
): AttendanceActionResult {
  const now = new Date().toISOString();
  const student = replaceStudent(id, (current) => {
    if (status === "boarded") {
      return {
        ...current,
        boarding: "boarded",
        boardedAt: now,
        syncStatus: "syncing",
      };
    }
    if (status === "not_boarded") {
      return {
        ...current,
        boarding: "not_boarded",
        boardedAt: null,
        dropping: "pending",
        droppedAt: null,
        syncStatus: "syncing",
      };
    }
    return {
      ...current,
      boarding: "pending",
      boardedAt: null,
      dropping: "pending",
      droppedAt: null,
      syncStatus: "syncing",
    };
  });

  if (!student) {
    return { ok: false, reason: "Student not found.", code: "not_found", student: null };
  }
  return { ok: true, student };
}

/** Instant local dropping mark — UI updates before the API round-trip. */
export function applyLocalDropping(
  id: string,
  status: DroppingStatus,
): AttendanceActionResult {
  const now = new Date().toISOString();
  const student = replaceStudent(id, (current) => {
    if (status === "dropped") {
      return {
        ...current,
        dropping: "dropped",
        droppedAt: now,
        syncStatus: "syncing",
      };
    }
    if (status === "not_dropped") {
      return {
        ...current,
        dropping: "not_dropped",
        droppedAt: null,
        syncStatus: "syncing",
      };
    }
    return {
      ...current,
      dropping: "pending",
      droppedAt: null,
      syncStatus: "syncing",
    };
  });

  if (!student) {
    return { ok: false, reason: "Student not found.", code: "not_found", student: null };
  }
  return { ok: true, student };
}

export function setStudentSyncStatus(
  id: string,
  syncStatus: NonNullable<AttendanceStudentState["syncStatus"]>,
): void {
  replaceStudent(id, (current) => ({ ...current, syncStatus }));
}

/** Restore a prior student row after a failed API sync. */
export function restoreAttendanceStudent(previous: AttendanceStudentState): void {
  replaceStudent(previous.id, () => ({ ...previous }));
}

/** @deprecated Prefer applyLocalBoarding. */
export function markBoardingInStore(
  id: string,
  status: BoardingStatus,
  _options?: { confirmChange?: boolean },
): AttendanceActionResult {
  return applyLocalBoarding(id, status);
}

/** @deprecated Prefer applyLocalDropping. */
export function markDroppingInStore(
  id: string,
  status: DroppingStatus,
  _options?: { confirmChange?: boolean },
): AttendanceActionResult {
  return applyLocalDropping(id, status);
}

/** No shared localStorage finalize — boarding events live on the API. */
export function finalizeAttendanceForActiveTrip() {
  // Intentionally empty: trip end is persisted via endTripViaApi.
}

export async function hydrateAttendanceFromApi(): Promise<void> {
  const trip = getTripSessionSnapshot();
  if (!trip.tripId) {
    students = createRosterBase();
    emit();
    return;
  }
  try {
    const shared = await listBoardingViaApi(trip.tripId);
    const base = createRosterBase();
    const byId = new Map(shared.map((m) => [m.studentId, m]));
    students = base.map((student) => {
      const mark = byId.get(student.id);
      if (!mark) return { ...student, syncStatus: student.syncStatus ?? "idle" };
      return {
        ...student,
        boarding: mark.boardingStatus,
        dropping: mark.droppingStatus,
        boardedAt: mark.boardedAt,
        droppedAt: mark.droppedAt,
        stopName: mark.stopName || student.stopName,
        stopId: mark.stopId || student.stopId,
        syncStatus: "idle",
      };
    });
    emit();
  } catch {
    // Keep whatever is already on screen (including optimistic marks).
  }
}
