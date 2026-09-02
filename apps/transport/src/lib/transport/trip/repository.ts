import { getAttendanceSnapshot, resetAttendanceStore, finalizeAttendanceForActiveTrip } from "../attendance/store";
import { repositoryDelay } from "../utils";
import { isApiAuthMode } from "@/lib/auth/auth-mode";
import {
  advanceStopViaApi,
  confirmStartTripViaApi,
  endTripViaApi,
  hydrateActiveTripFromApi,
  setLifecyclePhaseViaApi,
} from "./api-ops";
import { getAssignmentReadiness } from "./assignment-readiness";
import { buildTripEndSummary, type TripEndSummary } from "./lifecycle";
import {
  advanceTripStop,
  beginStartTripSession,
  confirmStartTripSession,
  dismissCompletedTripSession,
  endTripSession,
  getTripAssignmentSnapshot,
  getTripSessionSnapshot,
  resetTripSession,
  setTripLifecyclePhase,
  startTripSession,
  subscribeTripSession,
  type TripActionResult,
} from "./store";

function withFreshAttendance(result: TripActionResult): TripActionResult {
  if (result.ok) resetAttendanceStore();
  return result;
}

export const tripRepository = {
  subscribe: subscribeTripSession,
  getSnapshot: getTripAssignmentSnapshot,
  getSessionSnapshot: getTripSessionSnapshot,
  getAssignmentReadiness,

  async getAssignment() {
    await repositoryDelay();
    return getTripAssignmentSnapshot();
  },

  async getSession() {
    await repositoryDelay();
    return getTripSessionSnapshot();
  },

  async beginStartTrip(): Promise<TripActionResult> {
    await repositoryDelay(40);
    return beginStartTripSession();
  },

  async startTrip(): Promise<TripActionResult> {
    await repositoryDelay(40);
    return withFreshAttendance(startTripSession());
  },

  async confirmStartTrip(): Promise<TripActionResult> {
    await repositoryDelay(40);
    if (isApiAuthMode()) {
      const result = await confirmStartTripViaApi();
      if (result.ok) resetAttendanceStore();
      return result;
    }
    return withFreshAttendance(confirmStartTripSession());
  },

  async setLifecyclePhase(
    phase: "running" | "boarding" | "dropping",
  ): Promise<TripActionResult> {
    await repositoryDelay(20);
    if (isApiAuthMode()) return setLifecyclePhaseViaApi(phase);
    return setTripLifecyclePhase(phase);
  },

  async advanceStop(): Promise<TripActionResult> {
    await repositoryDelay(20);
    if (isApiAuthMode()) return advanceStopViaApi();
    return advanceTripStop();
  },

  async endTrip(summary?: TripEndSummary | null): Promise<TripActionResult> {
    await repositoryDelay(40);
    if (isApiAuthMode()) {
      const result = await endTripViaApi();
      if (result.ok) finalizeAttendanceForActiveTrip();
      return result;
    }
    const session = getTripSessionSnapshot();
    const stopsTotal = session.assignment.route.stops.length;
    const stopsCompleted = Math.min(session.currentStopIndex + 1, stopsTotal);
    const resolved =
      summary ?? buildTripEndSummary(getAttendanceSnapshot(), stopsCompleted, stopsTotal);
    const result = endTripSession(resolved);
    if (result.ok) {
      finalizeAttendanceForActiveTrip();
    }
    return result;
  },

  async dismissCompleted(): Promise<TripActionResult> {
    await repositoryDelay(20);
    const result = dismissCompletedTripSession();
    if (result.ok) resetAttendanceStore();
    return result;
  },

  reset() {
    resetTripSession();
    resetAttendanceStore();
  },

  async hydrateFromApi() {
    await hydrateActiveTripFromApi();
  },
};
