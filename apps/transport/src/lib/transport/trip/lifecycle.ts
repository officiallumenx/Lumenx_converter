import type { AttendanceStudentState } from "../types";

export type TripPhase =
  | "ready"
  | "starting"
  | "running"
  | "boarding"
  | "dropping"
  | "completed";

/** Phases where GPS tracking and attendance marking apply. */
export function isTripActive(phase: TripPhase): boolean {
  return (
    phase === "starting" ||
    phase === "running" ||
    phase === "boarding" ||
    phase === "dropping"
  );
}

export function tripPhaseLabel(phase: TripPhase): string {
  switch (phase) {
    case "ready":
      return "Ready";
    case "starting":
      return "Starting";
    case "running":
      return "Running";
    case "boarding":
      return "Boarding";
    case "dropping":
      return "Dropping";
    case "completed":
      return "Completed";
    default:
      return "Ready";
  }
}

export type TripEndSummary = {
  studentsBoarded: number;
  studentsDropped: number;
  studentsRemaining: number;
  stopsCompleted: number;
  stopsTotal: number;
};

export function buildTripEndSummary(
  students: AttendanceStudentState[],
  stopsCompleted: number,
  stopsTotal: number,
): TripEndSummary {
  const boarded = students.filter((s) => s.boarding === "boarded").length;
  const dropped = students.filter((s) => s.dropping === "dropped").length;
  const remaining = students.filter(
    (s) => s.boarding === "boarded" && s.dropping === "pending",
  ).length;

  return {
    studentsBoarded: boarded,
    studentsDropped: dropped,
    studentsRemaining: remaining,
    stopsCompleted: Math.min(Math.max(0, stopsCompleted), Math.max(0, stopsTotal)),
    stopsTotal: Math.max(0, stopsTotal),
  };
}
