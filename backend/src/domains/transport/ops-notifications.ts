/**
 * Transport → Connect (guardians) + Admin staff + Driver notifications.
 * Complements approach.ts (ETA bands / arrival) with trip lifecycle / boarding / SOS.
 * Backend emit is SoT — no frontend-generated business notifications.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { listLinksForStudentIds } from "../parents/repository.js";
import { findStudentById } from "../students/repository.js";
import type { BoardingStatus, DroppingStatus } from "./ops-types.js";
import type { TransportTripRow } from "./ops-types.js";
import { isOperationallyUsable } from "./approval.js";
import { findDriverById, findStopById, listEnrollmentsForRoute } from "./repository.js";
import { TRANSPORT_EVENT } from "./transport-events.js";
import { emitTransportNotification, emitTransportNotificationSafe } from "./transport-notification-emit.js";
import {
  deepLinkForTransportEvent,
  transportDedupe,
} from "./transport-notification-severity.js";

export { TRANSPORT_EVENT };

export async function guardianUserIdsForStudent(
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

/** Batch guardian lookup — one link query + one parent query for many students. */
export async function guardianUserIdsForStudents(
  admin: SupabaseClient,
  instituteId: string,
  studentIds: string[],
): Promise<Map<string, string[]>> {
  const unique = [...new Set(studentIds.filter(Boolean))];
  const out = new Map<string, string[]>();
  for (const id of unique) out.set(id, []);
  if (unique.length === 0) return out;
  if (unique.length === 1) {
    const only = unique[0]!;
    out.set(only, await guardianUserIdsForStudent(admin, instituteId, only));
    return out;
  }

  const links = await listLinksForStudentIds(admin, unique, instituteId);
  if (links.length === 0) return out;

  const parentIds = [...new Set(links.map((l) => l.parent_id))];
  const result = await admin
    .from("parent")
    .select("id, user_profile_id")
    .eq("institute_id", instituteId)
    .in("id", parentIds)
    .is("deleted_at", null);
  const parents = (result.data ?? []) as Array<{
    id: string;
    user_profile_id: string | null;
  }>;
  const parentUser = new Map(
    parents
      .filter((p) => p.user_profile_id)
      .map((p) => [p.id, p.user_profile_id as string]),
  );

  for (const link of links) {
    const userId = parentUser.get(link.parent_id);
    if (!userId) continue;
    const list = out.get(link.student_id) ?? [];
    if (!list.includes(userId)) list.push(userId);
    out.set(link.student_id, list);
  }
  return out;
}

export async function guardianUserIdsForRoute(
  admin: SupabaseClient,
  instituteId: string,
  routeId: string,
): Promise<string[]> {
  const enrollments = (await listEnrollmentsForRoute(admin, instituteId, routeId)).filter(
    (e) => isOperationallyUsable(e.approval_status),
  );
  const studentIds = [...new Set(enrollments.map((e) => e.student_id))];
  const byStudent = await guardianUserIdsForStudents(admin, instituteId, studentIds);
  const all = new Set<string>();
  for (const ids of byStudent.values()) {
    for (const id of ids) all.add(id);
  }
  return [...all];
}

export async function staffUserIdsForInstitute(
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

async function driverUserIdForTrip(
  admin: SupabaseClient,
  trip: TransportTripRow,
): Promise<string | null> {
  const driver = await findDriverById(admin, trip.driver_id);
  return driver?.user_profile_id ?? null;
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
  const driverUserId = await driverUserIdForTrip(admin, trip);

  if (guardians.length > 0) {
    emitTransportNotificationSafe(admin, {
      instituteId: trip.institute_id,
      createdByUserId,
      kind: TRANSPORT_EVENT.TRIP_STARTED,
      title: "Trip started",
      body: "The school bus trip has started. You can follow live status in Connect.",
      deepLink: deepLinkForTransportEvent(TRANSPORT_EVENT.TRIP_STARTED, "parent"),
      dedupeKey: transportDedupe.tripStarted(trip.id, "parent"),
      recipientUserIds: guardians,
      payload: { tripId: trip.id, routeId: trip.route_id },
    });
  }
  if (staff.length > 0) {
    emitTransportNotificationSafe(admin, {
      instituteId: trip.institute_id,
      createdByUserId,
      kind: TRANSPORT_EVENT.TRIP_STARTED,
      title: "Driver started a trip",
      body: "A transport trip is now active.",
      deepLink: deepLinkForTransportEvent(TRANSPORT_EVENT.TRIP_STARTED, "admin"),
      dedupeKey: transportDedupe.tripStarted(trip.id, "admin"),
      recipientUserIds: staff,
      payload: { tripId: trip.id, routeId: trip.route_id },
    });
  }
  if (driverUserId) {
    emitTransportNotificationSafe(admin, {
      instituteId: trip.institute_id,
      createdByUserId,
      kind: TRANSPORT_EVENT.TRIP_STARTED,
      title: "Trip started",
      body: "Your trip is running. GPS tracking is active.",
      deepLink: deepLinkForTransportEvent(TRANSPORT_EVENT.TRIP_STARTED, "driver"),
      dedupeKey: transportDedupe.tripStarted(trip.id, "driver"),
      recipientUserIds: [driverUserId],
      payload: { tripId: trip.id, routeId: trip.route_id },
    });
  }
}

export async function notifyTripPhaseChanged(
  admin: SupabaseClient,
  trip: TransportTripRow,
  createdByUserId: string,
  previousPhase: string,
): Promise<void> {
  const staff = await staffUserIdsForInstitute(admin, trip.institute_id);
  if (staff.length === 0) return;
  emitTransportNotificationSafe(admin, {
    instituteId: trip.institute_id,
    createdByUserId,
    kind: TRANSPORT_EVENT.TRIP_PHASE_CHANGED,
    title: "Trip phase updated",
    body: `Trip moved from ${previousPhase} to ${trip.phase}.`,
    deepLink: deepLinkForTransportEvent(
      TRANSPORT_EVENT.TRIP_PHASE_CHANGED,
      "admin",
    ),
    dedupeKey: `transport:${trip.id}:phase:${trip.phase}`,
    recipientUserIds: staff,
    payload: {
      tripId: trip.id,
      routeId: trip.route_id,
      phase: trip.phase,
      previousPhase,
    },
  });
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
  const staff = await staffUserIdsForInstitute(admin, trip.institute_id);
  if (guardians.length > 0) {
    emitTransportNotificationSafe(admin, {
      instituteId: trip.institute_id,
      createdByUserId,
      kind: TRANSPORT_EVENT.TRIP_COMPLETED,
      title: "Trip completed",
      body: "The school bus trip has ended.",
      deepLink: deepLinkForTransportEvent(
        TRANSPORT_EVENT.TRIP_COMPLETED,
        "parent",
      ),
      dedupeKey: transportDedupe.tripCompleted(trip.id),
      recipientUserIds: guardians,
      payload: { tripId: trip.id, routeId: trip.route_id },
    });
  }
  if (staff.length > 0) {
    emitTransportNotificationSafe(admin, {
      instituteId: trip.institute_id,
      createdByUserId,
      kind: TRANSPORT_EVENT.TRIP_COMPLETED,
      title: "Trip completed",
      body: "A transport trip was marked completed.",
      deepLink: deepLinkForTransportEvent(
        TRANSPORT_EVENT.TRIP_COMPLETED,
        "admin",
      ),
      dedupeKey: `transport:${trip.id}:completed:admin`,
      recipientUserIds: staff,
      payload: { tripId: trip.id, routeId: trip.route_id },
    });
  }
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
  await emitTransportNotification(admin, {
    instituteId: input.trip.institute_id,
    createdByUserId: input.createdByUserId,
    kind: boarded
      ? TRANSPORT_EVENT.STUDENT_BOARDED
      : TRANSPORT_EVENT.STUDENT_NOT_BOARDED,
    title: boarded ? `${name} boarded` : `${name} not boarded`,
    body: boarded
      ? `${name} has boarded the bus.`
      : `${name} was marked not boarded for this trip.`,
    deepLink: deepLinkForTransportEvent(
      boarded
        ? TRANSPORT_EVENT.STUDENT_BOARDED
        : TRANSPORT_EVENT.STUDENT_NOT_BOARDED,
      "parent",
    ),
    dedupeKey: boarded
      ? transportDedupe.boarded(input.trip.id, input.studentId)
      : transportDedupe.notBoarded(input.trip.id, input.studentId),
    recipientUserIds: recipients,
    positiveOutcome: boarded,
    payload: {
      tripId: input.trip.id,
      studentId: input.studentId,
    },
  });
}

export async function notifyDroppingMarked(
  admin: SupabaseClient,
  input: {
    trip: TransportTripRow;
    studentId: string;
    stopId?: string | null;
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

  let stopName = "the stop";
  if (input.stopId) {
    const stop = await findStopById(admin, input.stopId);
    if (stop?.name?.trim()) stopName = stop.name.trim();
  }

  await emitTransportNotification(admin, {
    instituteId: input.trip.institute_id,
    createdByUserId: input.createdByUserId,
    kind: TRANSPORT_EVENT.STUDENT_DROPPED,
    title: `${name} dropped off`,
    body: `${name} has been dropped at ${stopName}.`,
    deepLink: deepLinkForTransportEvent(
      TRANSPORT_EVENT.STUDENT_DROPPED,
      "parent",
    ),
    dedupeKey: transportDedupe.dropped(input.trip.id, input.studentId),
    recipientUserIds: recipients,
    positiveOutcome: true,
    payload: {
      tripId: input.trip.id,
      studentId: input.studentId,
      stopId: input.stopId ?? null,
    },
  });
}

export async function notifyEmergencyOpened(
  admin: SupabaseClient,
  input: {
    instituteId: string;
    emergencyId: string;
    vehicleId: string;
    note: string | null;
    createdByUserId: string;
    tripId?: string | null;
    routeId?: string | null;
  },
): Promise<void> {
  const staff = await staffUserIdsForInstitute(admin, input.instituteId);
  if (staff.length > 0) {
    await emitTransportNotification(admin, {
      instituteId: input.instituteId,
      createdByUserId: input.createdByUserId,
      kind: TRANSPORT_EVENT.EMERGENCY_CREATED,
      severity: "critical",
      title: "Transport SOS",
      body: input.note?.trim() || "A driver raised an emergency alert.",
      deepLink: deepLinkForTransportEvent(
        TRANSPORT_EVENT.EMERGENCY_CREATED,
        "admin",
      ),
      dedupeKey: transportDedupe.emergency(input.emergencyId, "admin"),
      recipientUserIds: staff,
      payload: {
        emergencyId: input.emergencyId,
        vehicleId: input.vehicleId,
        tripId: input.tripId ?? null,
      },
    });
  }

  // Relevant parents only: guardians on this vehicle's active route — never
  // institute-wide parent fanout (Scenario 12 / Phase 9 recipient isolation).
  let routeId = input.routeId ?? null;
  if (!routeId && input.tripId) {
    const { findTripById } = await import("./ops-repository.js");
    const trip = await findTripById(admin, input.tripId);
    routeId = trip?.route_id ?? null;
  }
  if (!routeId) {
    const { findRouteByVehicleId } = await import("./repository.js");
    const route = await findRouteByVehicleId(
      admin,
      input.instituteId,
      input.vehicleId,
    );
    routeId = route?.id ?? null;
  }
  if (!routeId) return;

  const guardians = await guardianUserIdsForRoute(
    admin,
    input.instituteId,
    routeId,
  );
  if (guardians.length === 0) return;
  await emitTransportNotification(admin, {
    instituteId: input.instituteId,
    createdByUserId: input.createdByUserId,
    kind: TRANSPORT_EVENT.EMERGENCY_CREATED,
    severity: "critical",
    title: "Transport SOS",
    body:
      input.note?.trim() ||
      "Your child's bus driver raised an emergency alert. Open live transport for status.",
    deepLink: deepLinkForTransportEvent(
      TRANSPORT_EVENT.EMERGENCY_CREATED,
      "parent",
    ),
    dedupeKey: transportDedupe.emergency(input.emergencyId, "parent"),
    recipientUserIds: guardians,
    payload: {
      emergencyId: input.emergencyId,
      vehicleId: input.vehicleId,
      tripId: input.tripId ?? null,
      routeId,
    },
  });
}

export async function notifyEmergencyResolved(
  admin: SupabaseClient,
  input: {
    instituteId: string;
    emergencyId: string;
    vehicleId: string;
    createdByUserId: string;
    tripId?: string | null;
    routeId?: string | null;
  },
): Promise<void> {
  const staff = await staffUserIdsForInstitute(admin, input.instituteId);
  if (staff.length > 0) {
    await emitTransportNotification(admin, {
      instituteId: input.instituteId,
      createdByUserId: input.createdByUserId,
      kind: TRANSPORT_EVENT.EMERGENCY_RESOLVED,
      title: "Transport SOS resolved",
      body: "An emergency alert was marked resolved.",
      deepLink: deepLinkForTransportEvent(
        TRANSPORT_EVENT.EMERGENCY_RESOLVED,
        "admin",
      ),
      dedupeKey: transportDedupe.emergencyResolved(input.emergencyId, "admin"),
      recipientUserIds: staff,
      payload: {
        emergencyId: input.emergencyId,
        vehicleId: input.vehicleId,
      },
    });
  }

  let routeId = input.routeId ?? null;
  if (!routeId && input.tripId) {
    const { findTripById } = await import("./ops-repository.js");
    const trip = await findTripById(admin, input.tripId);
    routeId = trip?.route_id ?? null;
  }
  if (!routeId) {
    const { findRouteByVehicleId } = await import("./repository.js");
    const route = await findRouteByVehicleId(
      admin,
      input.instituteId,
      input.vehicleId,
    );
    routeId = route?.id ?? null;
  }
  if (!routeId) return;

  const guardians = await guardianUserIdsForRoute(
    admin,
    input.instituteId,
    routeId,
  );
  if (guardians.length === 0) return;
  await emitTransportNotification(admin, {
    instituteId: input.instituteId,
    createdByUserId: input.createdByUserId,
    kind: TRANSPORT_EVENT.EMERGENCY_RESOLVED,
    title: "Transport SOS resolved",
    body: "The emergency alert on your child's bus was marked resolved.",
    deepLink: deepLinkForTransportEvent(
      TRANSPORT_EVENT.EMERGENCY_RESOLVED,
      "parent",
    ),
    dedupeKey: transportDedupe.emergencyResolved(input.emergencyId, "parent"),
    recipientUserIds: guardians,
    payload: {
      emergencyId: input.emergencyId,
      vehicleId: input.vehicleId,
      routeId,
    },
  });
}

export async function notifyNotRidingCreated(
  admin: SupabaseClient,
  input: {
    instituteId: string;
    studentId: string;
    serviceDate: string;
    createdByUserId: string;
  },
): Promise<void> {
  const student = await findStudentById(admin, input.studentId);
  const name =
    student?.display_name?.trim() ||
    [student?.first_name, student?.surname].filter(Boolean).join(" ") ||
    "Student";
  const guardians = await guardianUserIdsForStudent(
    admin,
    input.instituteId,
    input.studentId,
  );
  const staff = await staffUserIdsForInstitute(admin, input.instituteId);
  const recipients = [...new Set([...guardians, ...staff])];
  if (recipients.length === 0) return;
  emitTransportNotificationSafe(admin, {
    instituteId: input.instituteId,
    createdByUserId: input.createdByUserId,
    kind: TRANSPORT_EVENT.NOT_RIDING_CREATED,
    title: "Not Riding Today",
    body: `${name} is marked not riding on ${input.serviceDate}.`,
    deepLink: "/transport",
    dedupeKey: transportDedupe.notRiding(input.studentId, input.serviceDate),
    recipientUserIds: recipients,
    payload: {
      studentId: input.studentId,
      serviceDate: input.serviceDate,
    },
  });
}

export async function notifyNotRidingCancelled(
  admin: SupabaseClient,
  input: {
    instituteId: string;
    studentId: string;
    serviceDate: string;
    createdByUserId: string;
  },
): Promise<void> {
  const student = await findStudentById(admin, input.studentId);
  const name =
    student?.display_name?.trim() ||
    [student?.first_name, student?.surname].filter(Boolean).join(" ") ||
    "Student";
  const guardians = await guardianUserIdsForStudent(
    admin,
    input.instituteId,
    input.studentId,
  );
  const staff = await staffUserIdsForInstitute(admin, input.instituteId);
  const recipients = [...new Set([...guardians, ...staff])];
  if (recipients.length === 0) return;
  emitTransportNotificationSafe(admin, {
    instituteId: input.instituteId,
    createdByUserId: input.createdByUserId,
    kind: TRANSPORT_EVENT.NOT_RIDING_CANCELLED,
    title: "Not Riding cancelled",
    body: `${name} will ride again on ${input.serviceDate}.`,
    deepLink: "/transport",
    dedupeKey: transportDedupe.notRidingCancelled(
      input.studentId,
      input.serviceDate,
    ),
    recipientUserIds: recipients,
    payload: {
      studentId: input.studentId,
      serviceDate: input.serviceDate,
    },
  });
}
