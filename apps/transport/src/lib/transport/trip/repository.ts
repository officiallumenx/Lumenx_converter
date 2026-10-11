import {
  resetAttendanceStore,
  finalizeAttendanceForActiveTrip,
  hydrateAttendanceFromApi,
} from "../attendance/store";
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
  abortStartTripSession,
  dismissCompletedTripSession,
  getTripAssignmentSnapshot,
  getTripSessionSnapshot,
  resetTripSession,
  beginStartTripSession,
  subscribeTripSession,
  type TripActionResult,
  type TripSlot,
} from "./store";

function startFailureMessage(slot: TripSlot | undefined, err: unknown): string {
  const kind = slot === "evening" ? "drop" : "pickup";
  if (err instanceof Error && err.message.trim()) {
    // Prefer driver-friendly fixed copy for network/server failures.
    const raw = err.message.toLowerCase();
    if (
      raw.includes("offline") ||
      raw.includes("network") ||
      raw.includes("timeout") ||
      raw.includes("failed")
    ) {
      return `Couldn't start ${kind} trip. Please try again.`;
    }
  }
  return `Couldn't start ${kind} trip. Please try again.`;
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

  async beginStartTrip(slot: TripSlot = "morning"): Promise<TripActionResult> {
    await repositoryDelay(40);
    return beginStartTripSession(slot);
  },

  async startTrip(slot: TripSlot = "morning"): Promise<TripActionResult> {
    await repositoryDelay(40);
    return this.confirmStartTrip(slot);
  },

  async confirmStartTrip(slot?: TripSlot): Promise<TripActionResult> {
    await repositoryDelay(40);
    try {
      const result = await confirmStartTripViaApi(slot);
      if (result.ok) {
        // Fresh trip_id: re-seed full assigned roster (pending), then hydrate marks.
        resetAttendanceStore();
        void hydrateAttendanceFromApi();
      }
      return result;
    } catch (err) {
      abortStartTripSession();
      return {
        ok: false,
        reason: startFailureMessage(slot, err),
        session: getTripSessionSnapshot(),
      };
    }
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
    try {
      const result = await endTripViaApi();
      if (result.ok) {
        if (result.session.endSyncPending) {
          // Offline: keep attendance + active phase until outbox confirms.
          return result;
        }
        finalizeAttendanceForActiveTrip();
        // endTripViaApi already awaited hydrateActiveTripFromApi for day flags.
      }
      return result;
    } catch (err) {
      return {
        ok: false,
        reason:
          err instanceof Error && /drop|pickup/i.test(err.message)
            ? err.message
            : "Couldn't complete trip. Please try again.",
        session: getTripSessionSnapshot(),
      };
    }
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
