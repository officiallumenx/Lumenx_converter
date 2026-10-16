import {
  enqueueOpsEvent,
  flushOpsOutbox,
  isOpsOutboxOnline,
  retryFailedStudentEvents,
} from "../ops-outbox";
import type { BoardingStatus, DroppingStatus } from "../types";
import { getTripSessionSnapshot } from "../trip/store";
import { resolveDropStopIdForMark } from "./drop-stop";
import {
  applyLocalBoarding,
  applyLocalDropping,
  getAttendanceSnapshot,
  hydrateAttendanceFromApi,
  resetAttendanceStore,
  restoreAttendanceStudent,
  setStudentSyncStatus,
  finalizeAttendanceForActiveTrip,
  subscribeAttendanceStore,
  type AttendanceActionResult,
  type AttendanceStudentState,
} from "./store";

function newClientEventId(prefix: string): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Snapshot before optimistic apply — restored if the outbox event fails. */
const rollbackByStudentId = new Map<string, AttendanceStudentState>();

function rememberRollback(previous: AttendanceStudentState): void {
  rollbackByStudentId.set(previous.id, { ...previous });
}

function clearRollback(studentId: string): void {
  rollbackByStudentId.delete(studentId);
}

function rollbackStudent(studentId: string): void {
  const previous = rollbackByStudentId.get(studentId);
  if (!previous) {
    setStudentSyncStatus(studentId, "error");
    return;
  }
  restoreAttendanceStudent({ ...previous, syncStatus: "error" });
  clearRollback(studentId);
}

function toastAttendanceSuccess(studentId: string, eventType: string): void {
  const student = getAttendanceSnapshot().find((s) => s.id === studentId);
  const name = student?.name ?? "Student";
  let message = `${name} updated`;
  if (eventType === "boarding") message = `${name} boarded`;
  else if (eventType === "not_boarded") message = `${name} marked not boarded`;
  else if (eventType === "drop") message = `${name} dropped`;
  else if (eventType === "not_dropped") message = `${name} marked not dropped`;
  void import("sonner").then(({ toast }) => {
    if (eventType === "boarding" || eventType === "drop") {
      toast.success(message);
    } else {
      toast.message(message);
    }
  });
}

type AttendanceOutboxDetail = {
  studentId?: string;
  eventType?: string;
  message?: string;
  clientEventId?: string;
};

function onAttendanceOpsConfirmed(detail: AttendanceOutboxDetail): void {
  const studentId = detail.studentId;
  const eventType = detail.eventType;
  if (
    eventType === "trip_start" ||
    eventType === "trip_end" ||
    eventType === "trip_phase"
  ) {
    void import("../trip/api-ops").then((m) => m.hydrateActiveTripFromApi());
    return;
  }
  if (!studentId) return;
  if (
    eventType === "boarding" ||
    eventType === "not_boarded" ||
    eventType === "drop" ||
    eventType === "not_dropped"
  ) {
    clearRollback(studentId);
    setStudentSyncStatus(studentId, "confirmed");
    toastAttendanceSuccess(studentId, eventType);
    void hydrateAttendanceFromApi();
    if (eventType === "drop" || eventType === "not_dropped") {
      void import("../trip/api-ops").then((m) => m.hydrateActiveTripFromApi());
    }
  }
}

function onAttendanceOpsConflict(detail: AttendanceOutboxDetail): void {
  const studentId = detail.studentId;
  const message = detail.message;
  const eventType = detail.eventType;
  if (
    eventType === "trip_start" ||
    eventType === "trip_end" ||
    eventType === "trip_phase"
  ) {
    void import("../trip/api-ops").then((m) => m.hydrateActiveTripFromApi());
    return;
  }
  if (studentId) {
    clearRollback(studentId);
    setStudentSyncStatus(studentId, "confirmed");
    void hydrateAttendanceFromApi();
  }
  const attendanceConflict =
    eventType === "boarding" ||
    eventType === "not_boarded" ||
    eventType === "drop" ||
    eventType === "not_dropped" ||
    Boolean(studentId);
  if (attendanceConflict && message) {
    void import("sonner").then(({ toast }) => {
      toast.message("Server updated", { description: message });
    });
  }
}

function onAttendanceOpsFailed(detail: AttendanceOutboxDetail): void {
  const studentId = detail.studentId;
  const message = detail.message;
  const eventType = detail.eventType;
  const attendanceFail =
    eventType === "boarding" ||
    eventType === "not_boarded" ||
    eventType === "drop" ||
    eventType === "not_dropped" ||
    Boolean(studentId);
  if (studentId && attendanceFail) {
    rollbackStudent(studentId);
  } else if (studentId) {
    setStudentSyncStatus(studentId, "error");
  }
  if (attendanceFail && message) {
    void import("sonner").then(({ toast }) => {
      toast.error("Could not save — tap to retry", { description: message });
    });
  }
}

/** Listen once for outbox confirm/fail to update boarding sync chips. */
function ensureAttendanceOutboxBridge() {
  if (typeof window === "undefined") return;
  const w = window as Window & { __lxAttendanceOutboxBridge?: boolean };
  if (w.__lxAttendanceOutboxBridge) return;
  w.__lxAttendanceOutboxBridge = true;

  window.addEventListener("lumenx-transport-ops-confirmed", ((ev: CustomEvent) => {
    onAttendanceOpsConfirmed(ev.detail ?? {});
  }) as EventListener);

  window.addEventListener("lumenx-transport-ops-conflict", ((ev: CustomEvent) => {
    onAttendanceOpsConflict(ev.detail ?? {});
  }) as EventListener);

  window.addEventListener("lumenx-transport-ops-failed", ((ev: CustomEvent) => {
    onAttendanceOpsFailed(ev.detail ?? {});
  }) as EventListener);
}

ensureAttendanceOutboxBridge();

/** Test helper — simulate outbox lifecycle without a DOM EventTarget. */
export function __notifyAttendanceOutboxForTests(
  kind: "confirmed" | "conflict" | "failed",
  detail: AttendanceOutboxDetail,
): void {
  if (kind === "confirmed") onAttendanceOpsConfirmed(detail);
  else if (kind === "conflict") onAttendanceOpsConflict(detail);
  else onAttendanceOpsFailed(detail);
}

function guardInFlight(previous: AttendanceStudentState): AttendanceActionResult | null {
  if (previous.syncStatus === "syncing") {
    return {
      ok: false,
      reason: "Already saving this student. Wait for confirmation.",
      code: "busy",
      student: previous,
    };
  }
  return null;
}

export const attendanceRepository = {
  subscribe: subscribeAttendanceStore,
  getSnapshot: getAttendanceSnapshot,

  async list() {
    return getAttendanceSnapshot();
  },

  async markBoarding(
    id: string,
    status: BoardingStatus,
    _options?: { confirmChange?: boolean },
  ): Promise<AttendanceActionResult> {
    ensureAttendanceOutboxBridge();
    const trip = getTripSessionSnapshot();
    const previous = getAttendanceSnapshot().find((s) => s.id === id) ?? null;
    if (!trip.tripId || !previous) {
      return { ok: false, reason: "No active trip or student.", code: "invalid" };
    }
    const busy = guardInFlight(previous);
    if (busy) return busy;

    const stops = trip.assignment.route.stops;
    const stop = stops[trip.currentStopIndex] ?? stops[0];
    if (!stop) {
      return { ok: false, reason: "No stop context.", code: "invalid" };
    }

    rememberRollback(previous);

    const local = applyLocalBoarding(id, status);
    if (!local.ok) {
      clearRollback(id);
      return local;
    }

    // Re-arm any prior failed outbox rows, then always enqueue a fresh mark
    // so retry works even if the failed event was already dead-lettered.
    if (previous.syncStatus === "error") {
      retryFailedStudentEvents(id);
    }

    const stopId = previous.stopId ?? stop.id;
    const clientEventId = newClientEventId(status === "boarded" ? "board" : "nboard");
    enqueueOpsEvent({
      eventType: status === "boarded" ? "boarding" : "not_boarded",
      tripId: trip.tripId,
      studentId: id,
      stopId,
      clientEventId,
      payload: {
        boardingStatus: status,
      },
    });
    setStudentSyncStatus(id, "syncing");
    const online = isOpsOutboxOnline();
    if (online) void flushOpsOutbox();
    return { ...local, pending: true, queuedOffline: !online };
  },

  async markDropping(
    id: string,
    status: DroppingStatus,
    _options?: { confirmChange?: boolean },
  ): Promise<AttendanceActionResult> {
    ensureAttendanceOutboxBridge();
    const trip = getTripSessionSnapshot();
    const previous = getAttendanceSnapshot().find((s) => s.id === id) ?? null;
    if (!trip.tripId || !previous) {
      return { ok: false, reason: "No active trip or student.", code: "invalid" };
    }
    const busy = guardInFlight(previous);
    if (busy) return busy;

    const stops = trip.assignment.route.stops;
    const dropStopId = resolveDropStopIdForMark({
      dropStopId: previous.dropStopId,
      pickupStopId: previous.stopId,
      routeStopIds: stops.map((s) => s.id),
    });
    if (!dropStopId) {
      return {
        ok: false,
        reason: "No drop stop assigned for this student.",
        code: "invalid",
      };
    }

    rememberRollback(previous);

    const local = applyLocalDropping(id, status);
    if (!local.ok) {
      clearRollback(id);
      return local;
    }

    if (previous.syncStatus === "error") {
      retryFailedStudentEvents(id);
    }

    const clientEventId = newClientEventId(status === "dropped" ? "drop" : "ndrop");
    enqueueOpsEvent({
      eventType: status === "dropped" ? "drop" : "not_dropped",
      tripId: trip.tripId,
      studentId: id,
      stopId: dropStopId,
      clientEventId,
      payload: {
        droppingStatus: status,
      },
    });
    setStudentSyncStatus(id, "syncing");
    const online = isOpsOutboxOnline();
    if (online) void flushOpsOutbox();
    return { ...local, pending: true, queuedOffline: !online };
  },

  async hydrateFromApi() {
    await hydrateAttendanceFromApi();
  },

  finalizeActiveTrip() {
    finalizeAttendanceForActiveTrip();
  },

  reset() {
    rollbackByStudentId.clear();
    resetAttendanceStore();
  },
};

export type { AttendanceActionResult };
