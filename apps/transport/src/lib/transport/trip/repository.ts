import { resetAttendanceStore, finalizeAttendanceForActiveTrip } from "../attendance/store";
import { repositoryDelay } from "../utils";
import {
  advanceStopViaApi,
  confirmStartTripViaApi,
  endTripViaApi,
  hydrateActiveTripFromApi,
  setLifecyclePhaseViaApi,
} from "./api-ops";
import { getAssignmentReadiness } from "./assignment-readiness";
import type { TripEndSummary } from "./lifecycle";
import {
  dismissCompletedTripSession,
  getTripAssignmentSnapshot,
  getTripSessionSnapshot,
  resetTripSession,
  beginStartTripSession,
  subscribeTripSession,
  type TripActionResult,
} from "./store";

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
    return this.confirmStartTrip();
  },

  async confirmStartTrip(): Promise<TripActionResult> {
    await repositoryDelay(40);
    const result = await confirmStartTripViaApi();
    if (result.ok) resetAttendanceStore();
    return result;
  },

  async setLifecyclePhase(
    phase: "running" | "boarding" | "dropping",
  ): Promise<TripActionResult> {
    await repositoryDelay(20);
    return setLifecyclePhaseViaApi(phase);
  },

  async advanceStop(): Promise<TripActionResult> {
    await repositoryDelay(20);
    return advanceStopViaApi();
  },

  async endTrip(_summary?: TripEndSummary | null): Promise<TripActionResult> {
    await repositoryDelay(40);
    const result = await endTripViaApi();
    if (result.ok) finalizeAttendanceForActiveTrip();
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
