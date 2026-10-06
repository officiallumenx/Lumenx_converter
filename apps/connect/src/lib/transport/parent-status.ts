/**
 * Parent-facing transport status — derived only from API facts.
 * Never invent live GPS or trip progress.
 */
export type ParentTransportStatus =
  | "not_riding"
  | "scheduled"
  | "driver_not_started"
  | "trip_started"
  | "approaching"
  | "arrived"
  | "boarding"
  | "at_school"
  | "dropping"
  | "completed"
  | "delayed"
  | "location_unavailable"
  | "trip_ended"
  | "emergency";

export const PARENT_TRANSPORT_STATUS_LABEL: Record<ParentTransportStatus, string> = {
  not_riding: "Not riding today",
  scheduled: "Scheduled",
  driver_not_started: "Driver not started",
  trip_started: "Trip started",
  approaching: "Approaching",
  arrived: "Arrived",
  boarding: "Boarding",
  at_school: "At school",
  dropping: "Dropping",
  completed: "Completed",
  delayed: "Delayed",
  location_unavailable: "Location unavailable",
  trip_ended: "Trip ended",
  emergency: "Emergency",
};

export type DeriveParentStatusInput = {
  notRidingToday: boolean;
  tripPhase: string | null | undefined;
  tripFinalized: boolean;
  schoolArrivedAt: string | null | undefined;
  boardingStatus: "pending" | "boarded" | "not_boarded" | null | undefined;
  droppingStatus: "pending" | "dropped" | "not_dropped" | null | undefined;
  approachBand: 30 | 15 | 5 | null | undefined;
  withinRadius: boolean;
  hasLiveGps: boolean;
  gpsFreshness: "live" | "recent" | "stale" | "offline" | null | undefined;
  emergencyActive: boolean;
  delayMinutes?: number;
};

export function deriveParentTransportStatus(
  input: DeriveParentStatusInput,
): ParentTransportStatus {
  if (input.notRidingToday) return "not_riding";
  if (input.emergencyActive) return "emergency";

  const phase = input.tripPhase ?? null;
  const active =
    Boolean(phase) &&
    !input.tripFinalized &&
    phase !== "completed" &&
    phase !== "ready";

  if (!active) {
    if (input.droppingStatus === "dropped" || input.boardingStatus === "boarded") {
      return "trip_ended";
    }
    if (phase === "completed" || input.tripFinalized) return "completed";
    if (phase === "ready") return "scheduled";
    return "driver_not_started";
  }

  if ((input.delayMinutes ?? 0) > 0) return "delayed";

  if (input.droppingStatus === "dropped") return "completed";
  if (phase === "dropping") return "dropping";
  if (input.schoolArrivedAt || phase === "dropping") return "at_school";
  if (input.boardingStatus === "boarded") {
    if (input.schoolArrivedAt) return "at_school";
    return "boarding";
  }
  if (phase === "boarding") return "boarding";
  if (input.withinRadius) return "arrived";
  if (input.approachBand === 5 || input.approachBand === 15 || input.approachBand === 30) {
    return "approaching";
  }

  if (
    active &&
    (!input.hasLiveGps ||
      input.gpsFreshness === "stale" ||
      input.gpsFreshness === "offline")
  ) {
    return "location_unavailable";
  }

  if (phase === "starting" || phase === "running") return "trip_started";
  return "scheduled";
}
