import type { AttendanceStudentState, BoardingStatus, DroppingStatus, RosterStudent } from "../types";
import type { TransportBoardingEventDto } from "../../transport-api";
import { getTripSessionSnapshot, subscribeTripSession } from "../trip/store";
import { listBoardingViaApi } from "../trip/api-ops";
import { getPendingAttendanceOps, type OpsOutboxEvent } from "../ops-outbox";
import { normalizeStopId } from "./stop-id";

const listeners = new Set<() => void>();

/** Monotonic hydration & mutation sequence clocks to prevent stale out-of-order poll responses from clobbering newer state. */
let hydrationSeq = 0;
let lastAppliedHydrationSeq = 0;
let localMutationSeq = 0;
const studentMutationSeq = new Map<string, number>();

/** Active bus for attendance — set from logged-in driver assignment. */
let activeVehicleId: string | null = null;

/** API roster seeded from driver-route-roster. */
let apiRosterBase: RosterStudent[] | null = null;

function normalizeRosterStudent(student: RosterStudent): RosterStudent {
  const location = String(student.stopLocationLabel ?? "").trim();
  const commonStopId =
    normalizeStopId(student.stopId) ??
    normalizeStopId(student.dropStopId) ??
    null;
  const commonStopName =
    String(student.stopName ?? "").trim() ||
    String(student.dropStopName ?? "").trim() ||
    "Stop not assigned";
  return {
    ...student,
    stopId: commonStopId ?? undefined,
    dropStopId: commonStopId ?? undefined,
    stopName: commonStopName,
    dropStopName: commonStopName,
    stopLocationLabel: location || null,
  };
}

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

function shouldPreserveLocalMarks(prior: AttendanceStudentState | undefined): boolean {
  if (!prior) return false;
  return (
    prior.syncStatus === "syncing" ||
    prior.syncStatus === "error" ||
    prior.syncStatus === "confirmed"
  );
}

/** Merge identity fields from a fresh roster without wiping in-flight / confirmed marks. */
function mergeRosterWithPrior(
  nextBase: AttendanceStudentState[],
  priorStudents: AttendanceStudentState[],
): AttendanceStudentState[] {
  const priorById = new Map(priorStudents.map((s) => [s.id, s]));
  return nextBase.map((student) => {
    const prior = priorById.get(student.id);
    if (!prior) return student;
    if (!shouldPreserveLocalMarks(prior)) {
      // Keep idle server-applied marks if we already hydrated this student.
      if (
        prior.boarding !== "pending" ||
        prior.dropping !== "pending" ||
        prior.boardedAt ||
        prior.droppedAt
      ) {
        return {
          ...student,
          boarding: prior.boarding,
          dropping: prior.dropping,
          boardedAt: prior.boardedAt,
          droppedAt: prior.droppedAt,
          syncStatus: prior.syncStatus ?? "idle",
        };
      }
      return student;
    }
    return {
      ...student,
      boarding: prior.boarding,
      dropping: prior.dropping,
      boardedAt: prior.boardedAt,
      droppedAt: prior.droppedAt,
      syncStatus: prior.syncStatus,
    };
  });
}

/** Seed attendance roster from transport API enrollments (API auth mode). */
export function setApiAttendanceRoster(roster: RosterStudent[]): void {
  const prior = students;
  apiRosterBase = roster.map((s) => normalizeRosterStudent(s));
  students = mergeRosterWithPrior(createRosterBase(), prior);
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
  localMutationSeq += 1;
  studentMutationSeq.set(id, localMutationSeq);
  const next = updater(students[index]!);
  students = students.map((s, i) => (i === index ? next : s));
  emit();
  return next;
}

/** Bind attendance roster to the logged-in driver's vehicle. */
export function setAttendanceVehicleScope(vehicleId: string | null): void {
  if (activeVehicleId === vehicleId) return;
  activeVehicleId = vehicleId;
  const prior = students;
  students = mergeRosterWithPrior(createRosterBase(), prior);
  emit();
  void hydrateAttendanceFromApi();
}

export function getAttendanceVehicleScope(): string | null {
  return activeVehicleId;
}

// Clear legacy shared attendance key (API boarding events are SoT).
if (typeof window !== "undefined") {
  try {
    globalThis.localStorage?.removeItem("lumenx.transport.trip-attendance.v1");
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
  hydrationSeq = 0;
  lastAppliedHydrationSeq = 0;
  localMutationSeq = 0;
  studentMutationSeq.clear();
  students = createRosterBase();
  emit();
}

export type AttendanceActionResult = {
  ok: boolean;
  reason?: string;
  code?: "not_found" | "invalid" | "confirm_required" | "finalized" | "busy";
  student?: AttendanceStudentState | null;
  /** Mark accepted locally; server confirmation still pending. */
  pending?: boolean;
  /** Event queued because the device is offline. */
  queuedOffline?: boolean;
};

/** Instant local boarding mark — UI updates before the API round-trip. */
export function applyLocalBoarding(
  id: string,
  status: BoardingStatus,
  fallbackStop?: { id: string; name: string },
): AttendanceActionResult {
  const now = new Date().toISOString();
  const student = replaceStudent(id, (current) => {
    const stopId = current.stopId || fallbackStop?.id || undefined;
    const stopName = current.stopName || fallbackStop?.name || "Current stop";
    if (status === "boarded") {
      return {
        ...current,
        stopId,
        stopName,
        boarding: "boarded",
        boardedAt: now,
        syncStatus: "syncing",
      };
    }
    if (status === "not_boarded") {
      return {
        ...current,
        stopId,
        stopName,
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
  fallbackStop?: { id: string; name: string },
): AttendanceActionResult {
  const now = new Date().toISOString();
  const student = replaceStudent(id, (current) => {
    const dropStopId = current.dropStopId || current.stopId || fallbackStop?.id || undefined;
    const dropStopName = current.dropStopName || current.stopName || fallbackStop?.name || undefined;
    if (status === "dropped") {
      return {
        ...current,
        dropStopId,
        dropStopName,
        dropping: "dropped",
        droppedAt: now,
        syncStatus: "syncing",
      };
    }
    if (status === "not_dropped") {
      return {
        ...current,
        dropStopId,
        dropStopName,
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

/** Immediately adopt authoritative server timestamps/statuses from a confirmed POST response. */
export function applyConfirmedAttendanceDto(
  id: string,
  dto?: Partial<TransportBoardingEventDto> | null,
): void {
  replaceStudent(id, (current) => {
    if (!dto) {
      return { ...current, syncStatus: "confirmed" };
    }
    const commonStopId =
      normalizeStopId(dto.stopId) ?? current.stopId ?? current.dropStopId ?? undefined;
    const commonStopName =
      dto.stopName || current.stopName || current.dropStopName || "Stop not assigned";
    return {
      ...current,
      boarding: dto.boardingStatus ?? current.boarding,
      dropping: dto.droppingStatus ?? current.dropping,
      boardedAt: dto.boardedAt !== undefined ? dto.boardedAt : current.boardedAt,
      droppedAt: dto.droppedAt !== undefined ? dto.droppedAt : current.droppedAt,
      stopId: commonStopId,
      dropStopId: commonStopId,
      stopName: commonStopName,
      dropStopName: commonStopName,
      syncStatus: "confirmed",
    };
  });
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

function hasRosterChanged(
  prev: AttendanceStudentState[],
  next: AttendanceStudentState[],
): boolean {
  if (prev.length !== next.length) return true;
  for (let i = 0; i < prev.length; i++) {
    const p = prev[i]!;
    const n = next[i]!;
    if (
      p.id !== n.id ||
      p.boarding !== n.boarding ||
      p.dropping !== n.dropping ||
      p.syncStatus !== n.syncStatus ||
      p.boardedAt !== n.boardedAt ||
      p.droppedAt !== n.droppedAt ||
      p.stopId !== n.stopId ||
      p.dropStopId !== n.dropStopId ||
      p.name !== n.name ||
      p.stopName !== n.stopName ||
      p.dropStopName !== n.dropStopName
    ) {
      return true;
    }
  }
  return false;
}

function resolvePendingBoardingStatus(op: OpsOutboxEvent): BoardingStatus {
  const raw = op.payload?.boardingStatus;
  if (raw === "pending" || raw === "boarded" || raw === "not_boarded") {
    return raw;
  }
  return op.eventType === "boarding" ? "boarded" : "not_boarded";
}

function resolvePendingDroppingStatus(op: OpsOutboxEvent): DroppingStatus {
  const raw = op.payload?.droppingStatus;
  if (raw === "pending" || raw === "dropped" || raw === "not_dropped") {
    return raw;
  }
  return op.eventType === "drop" ? "dropped" : "not_dropped";
}

export async function hydrateAttendanceFromApi(): Promise<void> {
  const trip = getTripSessionSnapshot();
  if (!trip?.tripId) {
    const next = createRosterBase();
    if (hasRosterChanged(students, next)) {
      students = next;
      emit();
    }
    return;
  }
  const hydrateTripId = trip.tripId;
  const seqAtStart = ++hydrationSeq;
  const localSeqAtStart = localMutationSeq;
  try {
    const shared = await listBoardingViaApi(hydrateTripId);
    // Stale response if the driver switched trips mid-flight.
    if (getTripSessionSnapshot().tripId !== hydrateTripId) return;
    // Stale response if a newer hydration request has already settled.
    if (seqAtStart < lastAppliedHydrationSeq) return;
    lastAppliedHydrationSeq = seqAtStart;

    const base = createRosterBase();
    const byId = new Map(shared.map((m) => [m.studentId, m]));
    const priorById = new Map(students.map((s) => [s.id, s]));

    // Query pending/retrying offline outbox operations per leg for this trip
    // so in-flight boarding AND dropping survive app backgrounding and rehydration.
    const pendingOps = getPendingAttendanceOps(hydrateTripId);
    const pendingBoardingByStudent = new Map<string, OpsOutboxEvent>();
    const pendingDroppingByStudent = new Map<string, OpsOutboxEvent>();
    for (const op of pendingOps) {
      if (!op.studentId) continue;
      if (op.eventType === "boarding" || op.eventType === "not_boarded") {
        pendingBoardingByStudent.set(op.studentId, op);
      } else if (op.eventType === "drop" || op.eventType === "not_dropped") {
        pendingDroppingByStudent.set(op.studentId, op);
      }
    }

    const nextStudents: AttendanceStudentState[] = base.map((student) => {
      const prior = priorById.get(student.id);
      const pendingBoarding = pendingBoardingByStudent.get(student.id);
      const pendingDropping = pendingDroppingByStudent.get(student.id);
      const mark = byId.get(student.id);
      const mutatedDuringPoll =
        (studentMutationSeq.get(student.id) ?? 0) > localSeqAtStart;

      // Never let a poll that started BEFORE a local mutation clobber the newer local state.
      if (mutatedDuringPoll && prior) {
        return prior;
      }

      // Preserve in-flight syncing and error states independently of whether a DB row already exists
      // (e.g., morning boarding already exists while afternoon dropping is syncing or errored).
      if (prior && prior.syncStatus === "error") {
        if (!mark) return prior;
        const adoptServerBoarding =
          !pendingBoarding &&
          prior.boarding === "pending" &&
          mark.boardingStatus !== "pending";
        return {
          ...prior,
          boarding: adoptServerBoarding ? mark.boardingStatus : prior.boarding,
          boardedAt: adoptServerBoarding ? mark.boardedAt : prior.boardedAt,
        };
      }

      if (prior && prior.syncStatus === "syncing") {
        if (pendingBoarding || pendingDropping || !mark) {
          return prior;
        }
        // Only settle syncing -> idle when no outbox op remains AND the server row
        // already matches both legs of prior state (so a stale pending leg never clobbers local state).
        if (
          mark.boardingStatus === prior.boarding &&
          mark.droppingStatus === prior.dropping
        ) {
          const commonStopId =
            normalizeStopId(mark.stopId) || prior.stopId || student.stopId;
          const commonStopName = mark.stopName || prior.stopName || student.stopName;
          return {
            ...student,
            boarding: mark.boardingStatus,
            dropping: mark.droppingStatus,
            boardedAt: mark.boardedAt,
            droppedAt: mark.droppedAt,
            stopName: commonStopName,
            dropStopName: commonStopName,
            stopId: commonStopId,
            dropStopId: commonStopId,
            syncStatus: "idle",
          };
        }
        return prior;
      }

      // Recently confirmed marks settle to idle only once the fetched server row agrees with them
      // and no local/outbox operation for the student remains queued.
      if (prior && prior.syncStatus === "confirmed") {
        if (pendingBoarding || pendingDropping || !mark) {
          return prior;
        }
        if (
          mark.boardingStatus === prior.boarding &&
          mark.droppingStatus === prior.dropping
        ) {
          const commonStopId =
            normalizeStopId(mark.stopId) || prior.stopId || student.stopId;
          const commonStopName = mark.stopName || prior.stopName || student.stopName;
          return {
            ...student,
            boarding: mark.boardingStatus,
            dropping: mark.droppingStatus,
            boardedAt: mark.boardedAt,
            droppedAt: mark.droppedAt,
            stopName: commonStopName,
            dropStopName: commonStopName,
            stopId: commonStopId,
            dropStopId: commonStopId,
            syncStatus: "idle",
          };
        }
        return prior;
      }

      // App restart / cold rehydration with pending offline outbox events
      if (pendingBoarding || pendingDropping) {
        const hasFailed =
          pendingBoarding?.status === "failed" ||
          pendingDropping?.status === "failed";
        const commonStopId =
          normalizeStopId(
            pendingDropping?.stopId ||
              pendingBoarding?.stopId ||
              mark?.stopId ||
              prior?.stopId,
          ) || student.stopId;
        const commonStopName =
          mark?.stopName || prior?.stopName || student.stopName;
        return {
          ...student,
          boarding: pendingBoarding
            ? resolvePendingBoardingStatus(pendingBoarding)
            : (mark?.boardingStatus ?? prior?.boarding ?? student.boarding),
          dropping: pendingDropping
            ? resolvePendingDroppingStatus(pendingDropping)
            : (mark?.droppingStatus ?? prior?.dropping ?? student.dropping),
          boardedAt: pendingBoarding ? (prior?.boardedAt ?? null) : (mark?.boardedAt ?? prior?.boardedAt ?? null),
          droppedAt: pendingDropping ? (prior?.droppedAt ?? null) : (mark?.droppedAt ?? prior?.droppedAt ?? null),
          stopId: commonStopId,
          dropStopId: commonStopId,
          stopName: commonStopName,
          dropStopName: commonStopName,
          syncStatus: hasFailed ? "error" : "syncing",
        };
      }

      if (!mark) {
        // If prior already had an established mark (idle), keep it to avoid blinking when polling
        if (prior && (prior.boarding !== "pending" || prior.dropping !== "pending")) {
          return {
            ...student,
            boarding: prior.boarding,
            dropping: prior.dropping,
            boardedAt: prior.boardedAt,
            droppedAt: prior.droppedAt,
            stopName: prior.stopName || student.stopName,
            dropStopName: prior.dropStopName || prior.stopName || student.dropStopName,
            stopId: prior.stopId || student.stopId,
            dropStopId: prior.dropStopId || prior.stopId || student.dropStopId,
            syncStatus: prior.syncStatus ?? "idle",
          };
        }
        return { ...student, syncStatus: student.syncStatus ?? "idle" };
      }

      const commonStopId =
        normalizeStopId(mark.stopId) || prior?.stopId || student.stopId;
      const commonStopName = mark.stopName || prior?.stopName || student.stopName;
      return {
        ...student,
        boarding: mark.boardingStatus,
        dropping: mark.droppingStatus,
        boardedAt: mark.boardedAt,
        droppedAt: mark.droppedAt,
        stopName: commonStopName,
        dropStopName: commonStopName,
        stopId: commonStopId,
        dropStopId: commonStopId,
        syncStatus: "idle",
      };
    });

    if (hasRosterChanged(students, nextStudents)) {
      students = nextStudents;
      emit();
    }
  } catch {
    // Keep whatever is already on screen (including optimistic marks).
  }
}
