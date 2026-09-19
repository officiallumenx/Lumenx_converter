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
  code?: "not_found" | "invalid" | "confirm_required";
  student?: AttendanceStudentState | null;
};

/** @deprecated Local shared-bridge marks removed — use API hydrate. */
export function markBoardingInStore(
  _id: string,
  _status: BoardingStatus,
  _options?: { confirmChange?: boolean },
): AttendanceActionResult {
  return {
    ok: false,
    reason: "Use attendance API mark path.",
    code: "invalid",
    student: null,
  };
}

/** @deprecated Local shared-bridge marks removed — use API hydrate. */
export function markDroppingInStore(
  _id: string,
  _status: DroppingStatus,
  _options?: { confirmChange?: boolean },
): AttendanceActionResult {
  return {
    ok: false,
    reason: "Use attendance API mark path.",
    code: "invalid",
    student: null,
  };
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
      if (!mark) return student;
      return {
        ...student,
        boarding: mark.boardingStatus,
        dropping: mark.droppingStatus,
        boardedAt: mark.boardedAt,
        droppedAt: mark.droppedAt,
        stopName: mark.stopName || student.stopName,
        stopId: mark.stopId || student.stopId,
      };
    });
    emit();
  } catch {
    // Keep the seeded roster visible even if boarding events fail to load.
    students = createRosterBase();
    emit();
  }
}
