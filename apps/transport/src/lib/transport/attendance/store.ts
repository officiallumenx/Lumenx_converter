import {
  enrollmentsForVehicle,
  finalizeTripAttendance,
  getMarkForStudent,
  listMarksForTrip,
  syncSharedTripMeta,
  upsertBoardingMark,
  upsertDroppingMark,
  TRANSPORT_ATTENDANCE_CHANGED_EVENT,
  TRANSPORT_OPS_CHANGED_EVENT,
  type AttendanceMarkResult,
} from "@lumenx/utils";
import type { AttendanceStudentState, BoardingStatus, DroppingStatus } from "../types";
import { getTripSessionSnapshot, subscribeTripSession } from "../trip/store";
import { isApiAuthMode } from "@/lib/auth/auth-mode";
import { listBoardingViaApi } from "../trip/api-ops";

const listeners = new Set<() => void>();

/** Active bus for attendance — set from logged-in driver assignment. */
let activeVehicleId: string | null = null;

function createRosterBase(): AttendanceStudentState[] {
  if (!activeVehicleId) return [];
  const enrollments = enrollmentsForVehicle(activeVehicleId);
  return enrollments.map((student) => ({
    id: student.studentId,
    name: student.studentName,
    grade: student.studentClass,
    stopName: student.stopName ?? "Stop assignment pending",
    stopId: student.stopId ?? undefined,
    rollNo: student.studentId,
    boarding: "pending" as const,
    dropping: "pending" as const,
    boardedAt: null,
    droppedAt: null,
  }));
}

let students: AttendanceStudentState[] = createRosterBase();

function emit() {
  listeners.forEach((listener) => listener());
}

function hydrateFromShared() {
  const trip = getTripSessionSnapshot();
  const base = createRosterBase();
  if (!trip.tripId) {
    students = base;
    return;
  }
  const shared = listMarksForTrip(trip.tripId);
  const byId = new Map(shared.map((m) => [m.studentId, m]));
  students = base.map((student) => {
    const mark = byId.get(student.id);
    if (!mark) return student;
    return {
      ...student,
      boarding: mark.boarding,
      dropping: mark.dropping,
      boardedAt: mark.boardedAt,
      droppedAt: mark.droppedAt,
      stopName: mark.stopName || student.stopName,
      stopId: mark.stopId || student.stopId,
    };
  });
}

function refreshRosterFromAdmin() {
  hydrateFromShared();
  emit();
}

function pushTripMeta() {
  const trip = getTripSessionSnapshot();
  if (!trip.tripId) return;
  const stops = trip.assignment.route.stops;
  const current = stops[trip.currentStopIndex] ?? null;
  syncSharedTripMeta({
    tripId: trip.tripId,
    driverId: trip.assignment.driver.id,
    driverName: trip.assignment.driver.name,
    vehicleId: trip.assignment.bus.vehicleId,
    vehicleNumber: trip.assignment.bus.busNumber,
    routeId: trip.assignment.route.adminRouteId,
    routeCode: trip.assignment.route.code,
    routeName: trip.assignment.route.name,
    startedAt: trip.startedAt,
    completedAt: trip.completedAt,
    currentStopId: current?.id ?? null,
    currentStopName: current?.name ?? null,
    phase: trip.phase,
    finalized: trip.phase === "completed",
  });
}

/** Bind attendance roster to the logged-in driver's vehicle. */
export function setAttendanceVehicleScope(vehicleId: string | null): void {
  if (activeVehicleId === vehicleId) return;
  activeVehicleId = vehicleId;
  hydrateFromShared();
  emit();
}

export function getAttendanceVehicleScope(): string | null {
  return activeVehicleId;
}

if (typeof window !== "undefined") {
  window.addEventListener(TRANSPORT_OPS_CHANGED_EVENT, refreshRosterFromAdmin);
  window.addEventListener(TRANSPORT_ATTENDANCE_CHANGED_EVENT, () => {
    hydrateFromShared();
    emit();
  });
  window.addEventListener("storage", (e) => {
    if (
      e.key === "lumenx.transport.trip-attendance.v1" ||
      e.key === null
    ) {
      hydrateFromShared();
      emit();
    }
  });
  subscribeTripSession(() => {
    pushTripMeta();
    hydrateFromShared();
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

export type AttendanceActionResult = AttendanceMarkResult & {
  student?: AttendanceStudentState | null;
};

function currentStopContext() {
  const trip = getTripSessionSnapshot();
  const stops = trip.assignment.route.stops;
  const current = stops[trip.currentStopIndex] ?? null;
  return { trip, current };
}

export function markBoardingInStore(
  id: string,
  status: BoardingStatus,
  options?: { confirmChange?: boolean },
): AttendanceActionResult {
  const student = students.find((s) => s.id === id);
  if (!student) {
    return { ok: false, reason: "Student not found on this roster.", code: "not_found" };
  }

  const { trip, current } = currentStopContext();
  if (!trip.tripId || !current) {
    return {
      ok: false,
      reason: "No active trip stop. Start the trip and set the current stop first.",
      code: "invalid",
    };
  }

  const result = upsertBoardingMark({
    tripId: trip.tripId,
    driverId: trip.assignment.driver.id,
    driverName: trip.assignment.driver.name,
    vehicleId: trip.assignment.bus.vehicleId,
    vehicleNumber: trip.assignment.bus.busNumber,
    routeId: trip.assignment.route.adminRouteId,
    routeCode: trip.assignment.route.code,
    routeName: trip.assignment.route.name,
    currentStopId: current.id,
    currentStopName: current.name,
    studentStopId: student.stopId ?? "",
    studentStopName: student.stopName,
    studentId: student.id,
    studentName: student.name,
    studentClass: student.grade,
    boarding: status,
    confirmChange: options?.confirmChange,
  });

  if (!result.ok) return { ...result, student: null };

  pushTripMeta();
  hydrateFromShared();
  emit();
  return {
    ok: true,
    mark: result.mark,
    student: students.find((s) => s.id === id) ?? null,
  };
}

export function markDroppingInStore(
  id: string,
  status: DroppingStatus,
  options?: { confirmChange?: boolean },
): AttendanceActionResult {
  const student = students.find((s) => s.id === id);
  if (!student) {
    return { ok: false, reason: "Student not found on this roster.", code: "not_found" };
  }

  const { trip, current } = currentStopContext();
  if (!trip.tripId) {
    return { ok: false, reason: "No active trip.", code: "invalid" };
  }

  const destination =
    (student.stopId || student.stopName
      ? { id: student.stopId ?? "", name: student.stopName }
      : null) ??
    trip.assignment.route.stops[trip.assignment.route.stops.length - 1] ??
    current;

  const result = upsertDroppingMark({
    tripId: trip.tripId,
    driverId: trip.assignment.driver.id,
    driverName: trip.assignment.driver.name,
    vehicleId: trip.assignment.bus.vehicleId,
    vehicleNumber: trip.assignment.bus.busNumber,
    routeId: trip.assignment.route.adminRouteId,
    routeCode: trip.assignment.route.code,
    routeName: trip.assignment.route.name,
    stopId: destination?.id ?? student.stopId ?? "",
    stopName: destination?.name ?? "Destination",
    studentId: student.id,
    studentName: student.name,
    studentClass: student.grade,
    dropping: status,
    confirmChange: options?.confirmChange,
  });

  if (!result.ok) return { ...result, student: null };

  pushTripMeta();
  hydrateFromShared();
  emit();
  return {
    ok: true,
    mark: result.mark,
    student: students.find((s) => s.id === id) ?? null,
  };
}

/** Finalize shared marks when the driver ends the trip. */
export function finalizeAttendanceForActiveTrip() {
  const trip = getTripSessionSnapshot();
  if (!trip.tripId) return;
  finalizeTripAttendance(trip.tripId, trip.completedAt ?? new Date().toISOString());
  pushTripMeta();
  hydrateFromShared();
  emit();
}

export function peekSharedMark(studentId: string) {
  const trip = getTripSessionSnapshot();
  if (!trip.tripId) return null;
  return getMarkForStudent(trip.tripId, studentId);
}

export async function hydrateAttendanceFromApi(): Promise<void> {
  if (!isApiAuthMode()) return;
  const trip = getTripSessionSnapshot();
  if (!trip.tripId) {
    students = createRosterBase();
    emit();
    return;
  }
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
}

/** @deprecated Local key removed — shared SoT is lumenx.transport.trip-attendance.v1 */
export const ATTENDANCE_STORAGE_KEY = "lumenx.transport.trip-attendance.v1";
