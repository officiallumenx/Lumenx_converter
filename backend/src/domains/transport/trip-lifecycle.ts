import { AppError } from "../../errors/app-error.js";
import type { TripPhase } from "./ops-types.js";

/**
 * Authoritative trip phase transitions.
 * ready → starting happens on trip insert (startTrip).
 */
const ALLOWED: Record<TripPhase, readonly TripPhase[]> = {
  ready: ["starting"],
  starting: ["running", "completed"],
  running: ["boarding", "dropping", "completed"],
  boarding: ["running", "boarding", "dropping", "completed"],
  dropping: ["dropping", "boarding", "completed"],
  completed: [],
};

export function assertValidTripPhaseTransition(
  from: TripPhase,
  to: TripPhase,
): void {
  if (from === to) return;
  const allowed = ALLOWED[from] ?? [];
  if (!allowed.includes(to)) {
    throw AppError.conflict(
      `Invalid trip phase transition: ${from} → ${to}`,
    );
  }
}

export function isPickupPhase(phase: TripPhase): boolean {
  return phase === "starting" || phase === "running" || phase === "boarding";
}

export function isDropPhase(phase: TripPhase): boolean {
  return phase === "dropping";
}

/**
 * Whether admin should get a "Trip phase updated" push for this transition.
 * starting→running is covered by TRIP_STARTED on POST /trips — skip the duplicate.
 */
export function shouldNotifyTripPhaseChange(
  from: TripPhase | string,
  to: TripPhase | string,
): boolean {
  if (from === to) return false;
  if (from === "starting" && to === "running") return false;
  return true;
}
