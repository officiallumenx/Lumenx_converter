import type { DriverRouteRoster, DriverRouteRosterStudent } from "@/lib/transport-api";

export type ApiRosterEnrollment = {
  id: string;
  studentId: string;
  studentName: string;
  studentClass: string;
  vehicleId: string;
  vehicleNumber: string;
  stopId: string | null;
  stopName: string | null;
  dropStopId: string | null;
  dropStopName: string | null;
  approvalStatus: string;
  rollNo: string;
  notRidingToday: boolean;
  rideExceptionId: string | null;
};

type ApiRosterState = {
  vehicleId: string | null;
  vehicleNumber: string | null;
  routeId: string | null;
  locked: boolean;
  students: ApiRosterEnrollment[];
  expectedCount: number;
  notRidingCount: number;
  expectedOnboardCount: number;
};

const listeners = new Set<() => void>();

let state: ApiRosterState = {
  vehicleId: null,
  vehicleNumber: null,
  routeId: null,
  locked: false,
  students: [],
  expectedCount: 0,
  notRidingCount: 0,
  expectedOnboardCount: 0,
};

function emit() {
  listeners.forEach((listener) => listener());
}

function mapStudent(
  student: DriverRouteRosterStudent,
  vehicleId: string,
  vehicleNumber: string,
): ApiRosterEnrollment {
  const stopId = student.pickupStopId?.trim() ? student.pickupStopId : null;
  const dropStopId = student.dropStopId?.trim() ? student.dropStopId : null;
  return {
    id: student.enrollmentId,
    studentId: student.studentId,
    studentName: student.studentName,
    studentClass: student.classLabel,
    vehicleId,
    vehicleNumber,
    stopId,
    stopName: student.pickupStopName,
    dropStopId,
    dropStopName: student.dropStopName ?? null,
    approvalStatus: student.approvalStatus,
    notRidingToday: Boolean(student.notRidingToday),
    rideExceptionId: student.rideExceptionId ?? null,
    rollNo: student.rollNo?.trim() || "—",
  };
}

function isOperationalApproval(status: string): boolean {
  return status === "approved" || status === "pending";
}

/** Replace the in-memory driver roster SoT (API mode). */
export function setApiDriverRoster(
  roster: DriverRouteRoster | null,
  extras?: { vehicleNumber?: string | null },
): void {
  if (!roster) {
    state = {
      vehicleId: null,
      vehicleNumber: null,
      routeId: null,
      locked: false,
      students: [],
      expectedCount: 0,
      notRidingCount: 0,
      expectedOnboardCount: 0,
    };
    emit();
    return;
  }
  const vehicleId = roster.vehicleId ?? "";
  const vehicleNumber = extras?.vehicleNumber ?? "—";
  const students = roster.students.map((s) => mapStudent(s, vehicleId, vehicleNumber));
  const expectedCount = roster.expectedCount ?? students.length;
  const notRidingCount =
    roster.notRidingCount ?? students.filter((s) => s.notRidingToday).length;
  const expectedOnboardCount =
    roster.expectedOnboardCount ?? expectedCount - notRidingCount;
  state = {
    vehicleId: roster.vehicleId,
    vehicleNumber,
    routeId: roster.routeId,
    locked: roster.locked,
    students,
    expectedCount,
    notRidingCount,
    expectedOnboardCount,
  };
  emit();
}

/** Operational roster rows mapped for the attendance seed (excludes Not Riding Today). */
export function listApprovedAttendanceRosterStudents(): Array<{
  id: string;
  name: string;
  grade: string;
  stopName: string;
  stopId: string | null;
  dropStopId: string | null;
  dropStopName: string | null;
  rollNo: string;
}> {
  return state.students
    .filter((s) => isOperationalApproval(s.approvalStatus) && !s.notRidingToday)
    .map((s) => ({
      id: s.studentId,
      name: s.studentName,
      grade: s.studentClass,
      stopName: s.stopName ?? "Stop not assigned",
      stopId: s.stopId,
      dropStopId: s.dropStopId,
      dropStopName: s.dropStopName,
      rollNo: s.rollNo,
    }));
}

export function clearApiDriverRoster(): void {
  setApiDriverRoster(null);
}

export function getApiDriverRoster(): ApiRosterState {
  return state;
}

/** Operational students on this bus (start-trip gate). Pending is usable. */
export function getApiApprovedStudentCount(vehicleId?: string | null): number {
  const students = listApiEnrollmentsForVehicle(vehicleId);
  return students.filter((s) => isOperationalApproval(s.approvalStatus)).length;
}

export function getApiRosterParticipationCounts(vehicleId?: string | null): {
  expectedCount: number;
  notRidingCount: number;
  expectedOnboardCount: number;
} {
  if (vehicleId && state.vehicleId && state.vehicleId !== vehicleId) {
    return { expectedCount: 0, notRidingCount: 0, expectedOnboardCount: 0 };
  }
  return {
    expectedCount: state.expectedCount,
    notRidingCount: state.notRidingCount,
    expectedOnboardCount: state.expectedOnboardCount,
  };
}

export function listApiNotRidingStudents(vehicleId?: string | null): ApiRosterEnrollment[] {
  return listApiEnrollmentsForVehicle(vehicleId).filter((s) => s.notRidingToday);
}

/** Students enrolled on the bus but not yet assigned a stop. */
export function getApiPendingStopCount(vehicleId?: string | null): number {
  return listApiNewEnrollmentsForVehicle(vehicleId).length;
}

export function listApiEnrollmentsForVehicle(vehicleId?: string | null): ApiRosterEnrollment[] {
  if (!vehicleId) {
    return state.vehicleId ? state.students : [];
  }
  if (state.vehicleId && state.vehicleId !== vehicleId) {
    // Scope mismatch — still return empty rather than cross-bus data.
    return [];
  }
  return state.students.filter((s) => !vehicleId || s.vehicleId === vehicleId || !s.vehicleId);
}

/** New = on this bus, no stop/location yet */
export function listApiNewEnrollmentsForVehicle(vehicleId?: string | null): ApiRosterEnrollment[] {
  return listApiEnrollmentsForVehicle(vehicleId).filter((s) => !s.stopId);
}

/** Existing = already on a stop */
export function listApiExistingEnrollmentsForVehicle(
  vehicleId?: string | null,
): ApiRosterEnrollment[] {
  return listApiEnrollmentsForVehicle(vehicleId).filter((s) => Boolean(s.stopId));
}

export function subscribeApiDriverRoster(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
