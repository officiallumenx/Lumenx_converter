/**
 * Finalize unset Pickup/Drop marks when a trip is server-confirmed complete.
 * Never overwrites explicit boarded / not_boarded / dropped / not_dropped.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { EffectiveTripParticipant } from "./effective-participants.js";
import type {
  TransportBoardingEventRow,
  TransportTripRow,
} from "./ops-types.js";
import {
  findBoardingByClientEventId,
  upsertBoardingEvent,
} from "./ops-repository.js";
import { listStopsForRoute } from "./repository.js";

export type FinalizeAttendancePlan = {
  notBoardedStudentIds: string[];
  notDroppedStudentIds: string[];
};

/** Pure planner — used by service + unit tests. */
export function planAttendanceFinalize(input: {
  tripSlot: string | null | undefined;
  tripPhase: string;
  expectedOnboard: EffectiveTripParticipant[];
  events: TransportBoardingEventRow[];
}): FinalizeAttendancePlan {
  const byStudent = new Map(input.events.map((e) => [e.student_id, e]));
  const isEvening = input.tripSlot === "evening";
  const isMorningSlot = !isEvening; // morning or legacy null → pickup finalize
  const finalizeDrop =
    isEvening || input.tripPhase === "dropping";

  const notBoardedStudentIds: string[] = [];
  const notDroppedStudentIds: string[] = [];

  if (isMorningSlot) {
    for (const p of input.expectedOnboard) {
      const ev = byStudent.get(p.studentId);
      const status = ev?.boarding_status ?? "pending";
      if (status === "boarded" || status === "not_boarded") continue;
      notBoardedStudentIds.push(p.studentId);
    }
  }

  if (finalizeDrop) {
    for (const p of input.expectedOnboard) {
      const ev = byStudent.get(p.studentId);
      const status = ev?.dropping_status ?? "pending";
      if (status === "dropped" || status === "not_dropped") continue;
      notDroppedStudentIds.push(p.studentId);
    }
  }

  return { notBoardedStudentIds, notDroppedStudentIds };
}

export function systemFinalizeClientEventId(
  tripId: string,
  studentId: string,
  kind: "not_boarded" | "not_dropped",
): string {
  return `sys:finalize:${tripId}:${studentId}:${kind}`;
}

async function resolveStopId(
  admin: SupabaseClient,
  trip: TransportTripRow,
  participant: EffectiveTripParticipant,
  kind: "boarding" | "dropping",
): Promise<string | null> {
  if (kind === "boarding" && participant.pickupStopId?.trim()) {
    return participant.pickupStopId.trim();
  }
  if (kind === "dropping" && participant.dropStopId?.trim()) {
    return participant.dropStopId.trim();
  }
  if (kind === "dropping" && participant.pickupStopId?.trim()) {
    return participant.pickupStopId.trim();
  }
  const stops = await listStopsForRoute(admin, trip.route_id);
  const stop = stops[0];
  return stop?.id ?? null;
}

/**
 * Persist pending → absent marks for the trip, then leave finalized flag to caller.
 * Idempotent via deterministic system client_event_id values.
 */
export async function applyAttendanceFinalizeForTripEnd(
  admin: SupabaseClient,
  trip: TransportTripRow,
  expectedOnboard: EffectiveTripParticipant[],
  events: TransportBoardingEventRow[],
): Promise<FinalizeAttendancePlan> {
  const plan = planAttendanceFinalize({
    tripSlot: trip.slot,
    tripPhase: trip.phase,
    expectedOnboard,
    events,
  });
  const byId = new Map(expectedOnboard.map((p) => [p.studentId, p]));

  for (const studentId of plan.notBoardedStudentIds) {
    const participant = byId.get(studentId);
    if (!participant) continue;
    const clientEventId = systemFinalizeClientEventId(
      trip.id,
      studentId,
      "not_boarded",
    );
    const prior = await findBoardingByClientEventId(
      admin,
      trip.institute_id,
      clientEventId,
      "boarding",
    );
    if (prior) continue;

    const stopId = await resolveStopId(admin, trip, participant, "boarding");
    if (!stopId) continue;

    await upsertBoardingEvent(admin, {
      instituteId: trip.institute_id,
      tripId: trip.id,
      studentId,
      stopId,
      boardingStatus: "not_boarded",
      boardedAt: null,
      boardingClientEventId: clientEventId,
    });
  }

  for (const studentId of plan.notDroppedStudentIds) {
    const participant = byId.get(studentId);
    if (!participant) continue;
    const clientEventId = systemFinalizeClientEventId(
      trip.id,
      studentId,
      "not_dropped",
    );
    const prior = await findBoardingByClientEventId(
      admin,
      trip.institute_id,
      clientEventId,
      "dropping",
    );
    if (prior) continue;

    const stopId = await resolveStopId(admin, trip, participant, "dropping");
    if (!stopId) continue;

    await upsertBoardingEvent(admin, {
      instituteId: trip.institute_id,
      tripId: trip.id,
      studentId,
      stopId,
      droppingStatus: "not_dropped",
      droppedAt: null,
      droppingClientEventId: clientEventId,
    });
  }

  return plan;
}
