/**
 * Transport → Connect (guardians) + Admin staff realtime notifications.
 * Complements approach.ts (ETA bands) with trip lifecycle / boarding / SOS.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { emitNotificationForInstituteSystem } from "../notifications/service.js";
import { listLinksForStudentIds } from "../parents/repository.js";
import { findStudentById } from "../students/repository.js";
import type { BoardingStatus, DroppingStatus } from "./ops-types.js";
import type { TransportTripRow } from "./ops-types.js";
import { listEnrollments } from "./repository.js";

async function guardianUserIdsForStudent(
  admin: SupabaseClient,
  instituteId: string,
  studentId: string,
): Promise<string[]> {
  const links = await listLinksForStudentIds(admin, [studentId], instituteId);
  const parentIds = [...new Set(links.map((l) => l.parent_id))];
  if (parentIds.length === 0) return [];
  const result = await admin
    .from("parent")
    .select("user_profile_id")
    .eq("institute_id", instituteId)
    .in("id", parentIds)
    .is("deleted_at", null);
  const rows = (result.data ?? []) as Array<{ user_profile_id: string | null }>;
  return [
    ...new Set(
      rows
        .map((r) => r.user_profile_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
}

async function guardianUserIdsForRoute(
  admin: SupabaseClient,
  instituteId: string,
  routeId: string,
): Promise<string[]> {
  const enrollments = (await listEnrollments(admin, instituteId)).filter(
    (e) => e.route_id === routeId && e.approval_status === "approved",
  );
  const studentIds = [...new Set(enrollments.map((e) => e.student_id))];
  if (studentIds.length === 0) return [];
  const links = await listLinksForStudentIds(admin, studentIds, instituteId);
  const parentIds = [...new Set(links.map((l) => l.parent_id))];
  if (parentIds.length === 0) return [];
  const result = await admin
    .from("parent")
    .select("user_profile_id")
    .eq("institute_id", instituteId)
    .in("id", parentIds)
    .is("deleted_at", null);
  const rows = (result.data ?? []) as Array<{ user_profile_id: string | null }>;
  return [
    ...new Set(
      rows
        .map((r) => r.user_profile_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
}

async function staffUserIdsForInstitute(
  admin: SupabaseClient,
  instituteId: string,
): Promise<string[]> {
  const membershipResult = await admin
    .from("membership")
    .select("id, user_id")
    .eq("institute_id", instituteId)
    .eq("status", "active")
    .is("deleted_at", null);
  const memberships = (membershipResult.data ?? []) as Array<{
    id: string;
    user_id: string;
  }>;
  if (memberships.length === 0) return [];

  const staffRoles = [
    "institute_admin",
    "principal",
    "vice_principal",
    "coordinator",
    "it_admin",
    "staff",
  ];
  const rolesResult = await admin
    .from("membership_role")
    .select("membership_id, role_code")
    .in(
      "membership_id",
      memberships.map((m) => m.id),
    )
    .in("role_code", staffRoles);
  const roleRows = (rolesResult.data ?? []) as Array<{
    membership_id: string;
    role_code: string;
  }>;
  const matched = new Set(roleRows.map((r) => r.membership_id));
  return [
    ...new Set(
      memberships.filter((m) => matched.has(m.id)).map((m) => m.user_id),
    ),
  ];
}

function safeEmit(
  promise: Promise<unknown>,
): void {
  void promise.catch(() => {
    /* Never fail the transport write path because of notification delivery. */
  });
}

export async function notifyTripStarted(
  admin: SupabaseClient,
  trip: TransportTripRow,
  createdByUserId: string,
): Promise<void> {
  const guardians = await guardianUserIdsForRoute(
    admin,
    trip.institute_id,
    trip.route_id,
  );
  const staff = await staffUserIdsForInstitute(admin, trip.institute_id);
  if (guardians.length > 0) {
    safeEmit(
      emitNotificationForInstituteSystem(admin, createdByUserId, {
        instituteId: trip.institute_id,
        category: "transport",
        priority: "important",
        title: "Trip started",
        body: "The school bus trip has started. You can follow live status in Connect.",
        deepLink: "/transport",
        dedupeKey: `transport:trip_started:${trip.id}`,
        recipientUserIds: guardians,
        payload: { tripId: trip.id, routeId: trip.route_id, kind: "trip_started" },
      }),
    );
  }
  if (staff.length > 0) {
    safeEmit(
      emitNotificationForInstituteSystem(admin, createdByUserId, {
        instituteId: trip.institute_id,
        category: "transport",
        priority: "normal",
        title: "Driver started a trip",
        body: "A transport trip is now active.",
        deepLink: "/transport",
        dedupeKey: `transport:trip_started_admin:${trip.id}`,
        recipientUserIds: staff,
        payload: { tripId: trip.id, routeId: trip.route_id, kind: "trip_started" },
      }),
    );
  }
}

export async function notifyTripEnded(
  admin: SupabaseClient,
  trip: TransportTripRow,
  createdByUserId: string,
): Promise<void> {
  const guardians = await guardianUserIdsForRoute(
    admin,
    trip.institute_id,
    trip.route_id,
  );
  if (guardians.length === 0) return;
  safeEmit(
    emitNotificationForInstituteSystem(admin, createdByUserId, {
      instituteId: trip.institute_id,
      category: "transport",
      priority: "normal",
      title: "Trip completed",
      body: "The school bus trip has ended.",
      deepLink: "/transport",
      dedupeKey: `transport:trip_ended:${trip.id}`,
      recipientUserIds: guardians,
      payload: { tripId: trip.id, routeId: trip.route_id, kind: "trip_ended" },
    }),
  );
}

export async function notifyBoardingMarked(
  admin: SupabaseClient,
  input: {
    trip: TransportTripRow;
    studentId: string;
    boardingStatus: BoardingStatus;
    createdByUserId: string;
  },
): Promise<void> {
  if (
    input.boardingStatus !== "boarded" &&
    input.boardingStatus !== "not_boarded"
  ) {
    return;
  }
  const student = await findStudentById(admin, input.studentId);
  const name =
    student?.display_name?.trim() ||
    [student?.first_name, student?.surname].filter(Boolean).join(" ") ||
    "Your child";
  const recipients = await guardianUserIdsForStudent(
    admin,
    input.trip.institute_id,
    input.studentId,
  );
  if (recipients.length === 0) return;

  const boarded = input.boardingStatus === "boarded";
  safeEmit(
    emitNotificationForInstituteSystem(admin, input.createdByUserId, {
      instituteId: input.trip.institute_id,
      category: "transport",
      priority: boarded ? "success" : "important",
      title: boarded ? `${name} boarded` : `${name} not boarded`,
      body: boarded
        ? `${name} has boarded the bus.`
        : `${name} was marked not boarded for this trip.`,
      deepLink: "/transport",
      dedupeKey: `transport:boarding:${input.trip.id}:${input.studentId}:${input.boardingStatus}`,
      recipientUserIds: recipients,
      payload: {
        tripId: input.trip.id,
        studentId: input.studentId,
        kind: boarded ? "boarded" : "not_boarded",
      },
    }),
  );
}

export async function notifyDroppingMarked(
  admin: SupabaseClient,
  input: {
    trip: TransportTripRow;
    studentId: string;
    droppingStatus: DroppingStatus;
    createdByUserId: string;
  },
): Promise<void> {
  if (input.droppingStatus !== "dropped") return;
  const student = await findStudentById(admin, input.studentId);
  const name =
    student?.display_name?.trim() ||
    [student?.first_name, student?.surname].filter(Boolean).join(" ") ||
    "Your child";
  const recipients = await guardianUserIdsForStudent(
    admin,
    input.trip.institute_id,
    input.studentId,
  );
  if (recipients.length === 0) return;
  safeEmit(
    emitNotificationForInstituteSystem(admin, input.createdByUserId, {
      instituteId: input.trip.institute_id,
      category: "transport",
      priority: "success",
      title: `${name} dropped off`,
      body: `${name} has been dropped at the stop.`,
      deepLink: "/transport",
      dedupeKey: `transport:dropped:${input.trip.id}:${input.studentId}`,
      recipientUserIds: recipients,
      payload: {
        tripId: input.trip.id,
        studentId: input.studentId,
        kind: "dropped",
      },
    }),
  );
}

export async function notifyEmergencyOpened(
  admin: SupabaseClient,
  input: {
    instituteId: string;
    emergencyId: string;
    vehicleId: string;
    note: string | null;
    createdByUserId: string;
  },
): Promise<void> {
  const staff = await staffUserIdsForInstitute(admin, input.instituteId);
  if (staff.length === 0) return;
  safeEmit(
    emitNotificationForInstituteSystem(admin, input.createdByUserId, {
      instituteId: input.instituteId,
      category: "transport",
      priority: "critical",
      title: "Transport SOS",
      body: input.note?.trim() || "A driver raised an emergency alert.",
      deepLink: "/transport",
      dedupeKey: `transport:sos:${input.emergencyId}`,
      recipientUserIds: staff,
      payload: {
        emergencyId: input.emergencyId,
        vehicleId: input.vehicleId,
        kind: "sos",
      },
    }),
  );
}
