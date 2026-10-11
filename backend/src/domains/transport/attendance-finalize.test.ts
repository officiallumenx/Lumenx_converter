import { describe, expect, it } from "vitest";
import {
  planAttendanceFinalize,
  systemFinalizeClientEventId,
} from "./attendance-finalize.js";
import type { EffectiveTripParticipant } from "./effective-participants.js";
import type { TransportBoardingEventRow } from "./ops-types.js";

function participant(id: string): EffectiveTripParticipant {
  return {
    studentId: id,
    studentName: id,
    enrollmentId: `en-${id}`,
    pickupStopId: "stop-pickup",
    dropStopId: "stop-drop",
    notRidingToday: false,
    exceptionId: null,
    exceptionReason: null,
  };
}

function event(
  studentId: string,
  boarding: string,
  dropping: string,
): TransportBoardingEventRow {
  return {
    id: `ev-${studentId}`,
    institute_id: "inst",
    trip_id: "trip",
    student_id: studentId,
    stop_id: "stop",
    boarding_status: boarding as TransportBoardingEventRow["boarding_status"],
    dropping_status: dropping as TransportBoardingEventRow["dropping_status"],
    boarded_at: null,
    dropped_at: null,
    finalized: false,
    boarding_client_event_id: null,
    dropping_client_event_id: null,
    created_at: "",
    updated_at: "",
  };
}

describe("planAttendanceFinalize", () => {
  const roster = [participant("A"), participant("B"), participant("C")];

  it("marks pending pickup students absent on morning trip end", () => {
    const plan = planAttendanceFinalize({
      tripSlot: "morning",
      tripPhase: "boarding",
      expectedOnboard: roster,
      events: [event("A", "boarded", "pending")],
    });
    expect(plan.notBoardedStudentIds).toEqual(["B", "C"]);
    expect(plan.notDroppedStudentIds).toEqual([]);
  });

  it("never overwrites boarded with not_boarded", () => {
    const plan = planAttendanceFinalize({
      tripSlot: "morning",
      tripPhase: "running",
      expectedOnboard: roster,
      events: [
        event("A", "boarded", "pending"),
        event("B", "not_boarded", "pending"),
      ],
    });
    expect(plan.notBoardedStudentIds).toEqual(["C"]);
  });

  it("marks pending drop students absent on evening trip end (separate trip_id)", () => {
    const plan = planAttendanceFinalize({
      tripSlot: "evening",
      tripPhase: "dropping",
      expectedOnboard: roster,
      events: [event("A", "pending", "dropped")],
    });
    expect(plan.notBoardedStudentIds).toEqual([]);
    expect(plan.notDroppedStudentIds).toEqual(["B", "C"]);
  });

  it("never overwrites dropped with not_dropped", () => {
    const plan = planAttendanceFinalize({
      tripSlot: "evening",
      tripPhase: "dropping",
      expectedOnboard: roster,
      events: [
        event("A", "pending", "dropped"),
        event("B", "pending", "not_dropped"),
      ],
    });
    expect(plan.notDroppedStudentIds).toEqual(["C"]);
  });

  it("finalizes both legs when morning trip ends in dropping phase", () => {
    const plan = planAttendanceFinalize({
      tripSlot: "morning",
      tripPhase: "dropping",
      expectedOnboard: roster,
      events: [event("A", "boarded", "dropped")],
    });
    expect(plan.notBoardedStudentIds).toEqual(["B", "C"]);
    expect(plan.notDroppedStudentIds).toEqual(["B", "C"]);
  });

  it("builds stable system client event ids for idempotent retries", () => {
    expect(systemFinalizeClientEventId("t1", "s1", "not_boarded")).toBe(
      "sys:finalize:t1:s1:not_boarded",
    );
    expect(systemFinalizeClientEventId("t1", "s1", "not_dropped")).toBe(
      "sys:finalize:t1:s1:not_dropped",
    );
  });
});
