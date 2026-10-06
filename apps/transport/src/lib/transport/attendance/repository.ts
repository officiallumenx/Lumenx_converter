import {
  enqueueOpsEvent,
  flushOpsOutbox,
  isOpsOutboxOnline,
  retryFailedStudentEvents,
} from "../ops-outbox";
import type { BoardingStatus, DroppingStatus } from "../types";
import { getTripSessionSnapshot } from "../trip/store";
import {
  applyLocalBoarding,
  applyLocalDropping,
  getAttendanceSnapshot,
  hydrateAttendanceFromApi,
  resetAttendanceStore,
  setStudentSyncStatus,
  finalizeAttendanceForActiveTrip,
  subscribeAttendanceStore,
  type AttendanceActionResult,
} from "./store";

function newClientEventId(prefix: string): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Listen once for outbox confirm/fail to update boarding sync chips. */
function ensureAttendanceOutboxBridge() {
  if (typeof window === "undefined") return;
  const w = window as Window & { __lxAttendanceOutboxBridge?: boolean };
  if (w.__lxAttendanceOutboxBridge) return;
  w.__lxAttendanceOutboxBridge = true;

  window.addEventListener("lumenx-transport-ops-confirmed", ((ev: CustomEvent) => {
    const studentId = ev.detail?.studentId as string | undefined;
    const eventType = ev.detail?.eventType as string | undefined;
    if (!studentId) return;
    if (
      eventType === "boarding" ||
      eventType === "not_boarded" ||
      eventType === "drop" ||
      eventType === "not_dropped"
    ) {
      setStudentSyncStatus(studentId, "confirmed");
      void hydrateAttendanceFromApi();
      if (eventType === "drop" || eventType === "not_dropped") {
        void import("../trip/api-ops").then((m) => m.hydrateActiveTripFromApi());
      }
    }
  }) as EventListener);

  window.addEventListener("lumenx-transport-ops-conflict", ((ev: CustomEvent) => {
    const studentId = ev.detail?.studentId as string | undefined;
    const message = ev.detail?.message as string | undefined;
    if (studentId) {
      setStudentSyncStatus(studentId, "confirmed");
      void hydrateAttendanceFromApi();
    }
    if (message) {
      void import("sonner").then(({ toast }) => {
        toast.message("Server updated", { description: message });
      });
    }
  }) as EventListener);

  window.addEventListener("lumenx-transport-ops-failed", ((ev: CustomEvent) => {
    const studentId = ev.detail?.studentId as string | undefined;
    const message = ev.detail?.message as string | undefined;
    if (studentId) setStudentSyncStatus(studentId, "error");
    if (message) {
      void import("sonner").then(({ toast }) => {
        toast.error("Sync failed — retry", { description: message });
      });
    }
  }) as EventListener);
}

ensureAttendanceOutboxBridge();

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
    const trip = getTripSessionSnapshot();
    const previous = getAttendanceSnapshot().find((s) => s.id === id) ?? null;
    if (!trip.tripId || !previous) {
      return { ok: false, reason: "No active trip or student.", code: "invalid" };
    }
    const stops = trip.assignment.route.stops;
    const stop = stops[trip.currentStopIndex] ?? stops[0];
    if (!stop) {
      return { ok: false, reason: "No stop context.", code: "invalid" };
    }

    const local = applyLocalBoarding(id, status);
    if (!local.ok) return local;

    // If previously failed, retry same queued event(s) for this student.
    if (previous.syncStatus === "error") {
      retryFailedStudentEvents(id);
      setStudentSyncStatus(id, "syncing");
      void flushOpsOutbox();
      return local;
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
    if (isOpsOutboxOnline()) void flushOpsOutbox();
    return local;
  },

  async markDropping(
    id: string,
    status: DroppingStatus,
    _options?: { confirmChange?: boolean },
  ): Promise<AttendanceActionResult> {
    const trip = getTripSessionSnapshot();
    const previous = getAttendanceSnapshot().find((s) => s.id === id) ?? null;
    if (!trip.tripId || !previous) {
      return { ok: false, reason: "No active trip or student.", code: "invalid" };
    }
    const stops = trip.assignment.route.stops;
    const dropStopId =
      previous.dropStopId?.trim() ||
      (previous.stopId ? previous.stopId : null) ||
      stops[stops.length - 1]?.id ||
      "";

    const local = applyLocalDropping(id, status);
    if (!local.ok) return local;

    if (previous.syncStatus === "error") {
      retryFailedStudentEvents(id);
      setStudentSyncStatus(id, "syncing");
      void flushOpsOutbox();
      return local;
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
    if (isOpsOutboxOnline()) void flushOpsOutbox();
    return local;
  },

  async hydrateFromApi() {
    await hydrateAttendanceFromApi();
  },

  finalizeActiveTrip() {
    finalizeAttendanceForActiveTrip();
  },

  reset() {
    resetAttendanceStore();
  },
};

export type { AttendanceActionResult };
