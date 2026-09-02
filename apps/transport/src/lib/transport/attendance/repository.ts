import { isApiAuthMode } from "@/lib/auth/auth-mode";
import { markBoardingViaApi, markDroppingViaApi } from "../trip/api-ops";
import type { BoardingStatus, DroppingStatus } from "../types";
import { repositoryDelay } from "../utils";
import { getTripSessionSnapshot } from "../trip/store";
import { getRouteSetupDriverScope } from "../route-setup/store";
import {
  finalizeAttendanceForActiveTrip,
  getAttendanceSnapshot,
  hydrateAttendanceFromApi,
  markBoardingInStore,
  markDroppingInStore,
  resetAttendanceStore,
  subscribeAttendanceStore,
  type AttendanceActionResult,
} from "./store";

export const attendanceRepository = {
  subscribe: subscribeAttendanceStore,
  getSnapshot: getAttendanceSnapshot,

  async list() {
    await repositoryDelay();
    return getAttendanceSnapshot();
  },

  async markBoarding(
    id: string,
    status: BoardingStatus,
    options?: { confirmChange?: boolean },
  ): Promise<AttendanceActionResult> {
    await repositoryDelay(40);
    if (isApiAuthMode()) {
      const trip = getTripSessionSnapshot();
      const student = getAttendanceSnapshot().find((s) => s.id === id);
      if (!trip.tripId || !student) {
        return { ok: false, reason: "No active trip or student.", code: "invalid" };
      }
      const stops = trip.assignment.route.stops;
      const stop = stops[trip.currentStopIndex] ?? stops[0];
      if (!stop) {
        return { ok: false, reason: "No stop context.", code: "invalid" };
      }
      await markBoardingViaApi(trip.tripId, {
        studentId: id,
        stopId: student.stopId ?? stop.id,
        boardingStatus: status,
      });
      await hydrateAttendanceFromApi();
      return {
        ok: true,
        student: getAttendanceSnapshot().find((s) => s.id === id) ?? null,
      };
    }
    return markBoardingInStore(id, status, options);
  },

  async markDropping(
    id: string,
    status: DroppingStatus,
    options?: { confirmChange?: boolean },
  ): Promise<AttendanceActionResult> {
    await repositoryDelay(40);
    if (isApiAuthMode()) {
      const trip = getTripSessionSnapshot();
      const student = getAttendanceSnapshot().find((s) => s.id === id);
      if (!trip.tripId || !student) {
        return { ok: false, reason: "No active trip or student.", code: "invalid" };
      }
      const stops = trip.assignment.route.stops;
      const destination =
        (student.stopId ? stops.find((s) => s.id === student.stopId) : null) ??
        stops[stops.length - 1];
      await markDroppingViaApi(trip.tripId, {
        studentId: id,
        stopId: destination?.id ?? student.stopId ?? "",
        droppingStatus: status,
      });
      await hydrateAttendanceFromApi();
      return {
        ok: true,
        student: getAttendanceSnapshot().find((s) => s.id === id) ?? null,
      };
    }
    return markDroppingInStore(id, status, options);
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
