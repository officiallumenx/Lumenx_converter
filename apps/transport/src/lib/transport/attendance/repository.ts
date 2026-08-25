import type { BoardingStatus, DroppingStatus } from "../types";
import { repositoryDelay } from "../utils";
import {
  finalizeAttendanceForActiveTrip,
  getAttendanceSnapshot,
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
    return markBoardingInStore(id, status, options);
  },

  async markDropping(
    id: string,
    status: DroppingStatus,
    options?: { confirmChange?: boolean },
  ): Promise<AttendanceActionResult> {
    await repositoryDelay(40);
    return markDroppingInStore(id, status, options);
  },

  finalizeActiveTrip() {
    finalizeAttendanceForActiveTrip();
  },

  reset() {
    resetAttendanceStore();
  },
};

export type { AttendanceActionResult };
