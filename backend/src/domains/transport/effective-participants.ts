import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "../../errors/app-error.js";
import type { Actor } from "../../auth/types.js";
import { requireInstituteId } from "../../authorization/index.js";
import { listStudents } from "../students/repository.js";
import { isDriverForInstitute, isOperationallyUsable, isTransportWriter } from "./approval.js";
import {
  listActiveDailyExceptionsForStudents,
  type TransportDailyExceptionRow,
} from "./daily-exception-repository.js";
import { findTripById } from "./ops-repository.js";
import { findDriverByUserProfileId, listEnrollmentsForRoute } from "./repository.js";

export type EffectiveTripParticipant = {
  studentId: string;
  studentName: string;
  enrollmentId: string;
  pickupStopId: string | null;
  dropStopId: string | null;
  notRidingToday: boolean;
  exceptionId: string | null;
  exceptionReason: string | null;
};

export type EffectiveTripParticipantsResult = {
  tripId: string;
  instituteId: string;
  routeId: string;
  serviceDate: string;
  expectedCount: number;
  notRidingCount: number;
  expectedOnboardCount: number;
  participants: EffectiveTripParticipant[];
  expectedOnboard: EffectiveTripParticipant[];
  notRiding: EffectiveTripParticipant[];
};

/**
 * Authoritative expected list for a trip:
 * permanent active enrollments on the trip route
 * minus date-scoped NOT_RIDING exceptions (and future exception types).
 */
export async function getEffectiveTripParticipants(
  admin: SupabaseClient,
  tripId: string,
): Promise<EffectiveTripParticipantsResult> {
  const trip = await findTripById(admin, tripId);
  if (!trip) throw AppError.notFound("Trip not found");

  const enrollments = (
    await listEnrollmentsForRoute(admin, trip.institute_id, trip.route_id)
  ).filter((e) => isOperationallyUsable(e.approval_status));

  const exceptions = await listActiveDailyExceptionsForStudents(
    admin,
    trip.institute_id,
    trip.trip_date,
    enrollments.map((e) => e.student_id),
    "NOT_RIDING",
  );
  const exceptionByStudent = new Map<string, TransportDailyExceptionRow>(
    exceptions.map((ex) => [ex.student_id, ex]),
  );

  const students = await listStudents(admin, { instituteId: trip.institute_id });
  const studentById = new Map(students.map((s) => [s.id, s]));

  const participants: EffectiveTripParticipant[] = enrollments.map((e) => {
    const student = studentById.get(e.student_id);
    const exception = exceptionByStudent.get(e.student_id);
    return {
      studentId: e.student_id,
      studentName:
        student?.display_name?.trim() ||
        `${student?.first_name ?? ""} ${student?.surname ?? ""}`.trim() ||
        "Student",
      enrollmentId: e.id,
      pickupStopId: e.pickup_stop_id,
      dropStopId: e.drop_stop_id,
      notRidingToday: Boolean(exception),
      exceptionId: exception?.id ?? null,
      exceptionReason: exception?.reason ?? null,
    };
  });

  const expectedOnboard = participants.filter((p) => !p.notRidingToday);
  const notRiding = participants.filter((p) => p.notRidingToday);

  return {
    tripId: trip.id,
    instituteId: trip.institute_id,
    routeId: trip.route_id,
    serviceDate: trip.trip_date,
    expectedCount: participants.length,
    notRidingCount: notRiding.length,
    expectedOnboardCount: expectedOnboard.length,
    participants,
    expectedOnboard,
    notRiding,
  };
}

export async function getEffectiveTripParticipantsForActor(
  admin: SupabaseClient,
  actor: Actor,
  tripId: string,
): Promise<EffectiveTripParticipantsResult> {
  const trip = await findTripById(admin, tripId);
  if (!trip) throw AppError.notFound("Trip not found");
  const instituteId = requireInstituteId(actor, trip.institute_id);

  if (isTransportWriter(actor, instituteId)) {
    return getEffectiveTripParticipants(admin, tripId);
  }

  if (isDriverForInstitute(actor, instituteId)) {
    const driver = await findDriverByUserProfileId(admin, actor.userId, instituteId);
    if (!driver || trip.driver_id !== driver.id) {
      throw AppError.forbidden("Insufficient permissions");
    }
    return getEffectiveTripParticipants(admin, tripId);
  }

  throw AppError.forbidden("Insufficient permissions");
}
