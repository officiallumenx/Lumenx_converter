import {
  markBoardingViaApi,
  markDroppingViaApi,
} from "../trip/api-ops";
import type { BoardingStatus, DroppingStatus } from "../types";
import { getTripSessionSnapshot } from "../trip/store";
import {
  applyLocalBoarding,
  applyLocalDropping,
  getAttendanceSnapshot,
  hydrateAttendanceFromApi,
  resetAttendanceStore,
  restoreAttendanceStudent,
  finalizeAttendanceForActiveTrip,
  subscribeAttendanceStore,
  type AttendanceActionResult,
} from "./store";

function notifySyncFailed() {
  if (typeof window === "undefined") return;
  void import("sonner").then(({ toast }) => {
    toast.error("Could not save mark", {
      description: "Check internet and tap the student again.",
    });
  });
}

function syncBoardingInBackground(
  tripId: string,
  studentId: string,
  stopId: string,
  status: BoardingStatus,
  previous: NonNullable<ReturnType<typeof getAttendanceSnapshot>[number]>,
) {
  void markBoardingViaApi(tripId, {
    studentId,
    stopId,
    boardingStatus: status,
  })
    .then(() => {
      void hydrateAttendanceFromApi();
    })
    .catch(() => {
      restoreAttendanceStudent(previous);
      notifySyncFailed();
    });
}

function syncDroppingInBackground(
  tripId: string,
  studentId: string,
  stopId: string,
  status: DroppingStatus,
  previous: NonNullable<ReturnType<typeof getAttendanceSnapshot>[number]>,
) {
  void markDroppingViaApi(tripId, {
    studentId,
    stopId,
    droppingStatus: status,
  })
    .then(() => {
      void hydrateAttendanceFromApi();
    })
    .catch(() => {
      restoreAttendanceStudent(previous);
      notifySyncFailed();
    });
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

    syncBoardingInBackground(
      trip.tripId,
      id,
      previous.stopId ?? stop.id,
      status,
      previous,
    );
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
    const destination =
      (previous.stopId ? stops.find((s) => s.id === previous.stopId) : null) ??
      stops[stops.length - 1];

    const local = applyLocalDropping(id, status);
    if (!local.ok) return local;

    syncDroppingInBackground(
      trip.tripId,
      id,
      destination?.id ?? previous.stopId ?? "",
      status,
      previous,
    );
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
