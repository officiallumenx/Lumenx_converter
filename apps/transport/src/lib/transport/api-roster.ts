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
  approvalStatus: string;
  rollNo: string;
};

type ApiRosterState = {
  vehicleId: string | null;
  vehicleNumber: string | null;
  routeId: string | null;
  locked: boolean;
  students: ApiRosterEnrollment[];
};

const listeners = new Set<() => void>();

let state: ApiRosterState = {
  vehicleId: null,
  vehicleNumber: null,
  routeId: null,
  locked: false,
  students: [],
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
  return {
    id: student.enrollmentId,
    studentId: student.studentId,
    studentName: student.studentName,
    studentClass: student.classLabel,
    vehicleId,
    vehicleNumber,
    stopId,
    stopName: student.pickupStopName,
    approvalStatus: student.approvalStatus,
    rollNo: student.rollNo?.trim() || "—",
  };
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
    };
    emit();
    return;
  }
  const vehicleId = roster.vehicleId ?? "";
  const vehicleNumber = extras?.vehicleNumber ?? "—";
  state = {
    vehicleId: roster.vehicleId,
    vehicleNumber,
    routeId: roster.routeId,
    locked: roster.locked,
    students: roster.students.map((s) => mapStudent(s, vehicleId, vehicleNumber)),
  };
  emit();
}

/** Approved roster rows mapped for the attendance seed. */
export function listApprovedAttendanceRosterStudents(): Array<{
  id: string;
  name: string;
  grade: string;
  stopName: string;
  stopId: string | null;
  rollNo: string;
}> {
  return state.students
    .filter((s) => s.approvalStatus === "approved")
    .map((s) => ({
      id: s.studentId,
      name: s.studentName,
      grade: s.studentClass,
      stopName: s.stopName ?? "Stop assignment pending",
      stopId: s.stopId,
      rollNo: s.rollNo,
    }));
}

export function clearApiDriverRoster(): void {
  setApiDriverRoster(null);
}

export function getApiDriverRoster(): ApiRosterState {
  return state;
}

/** Approved students on this bus (start-trip gate). */
export function getApiApprovedStudentCount(vehicleId?: string | null): number {
  const students = listApiEnrollmentsForVehicle(vehicleId);
  return students.filter((s) => s.approvalStatus === "approved").length;
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
