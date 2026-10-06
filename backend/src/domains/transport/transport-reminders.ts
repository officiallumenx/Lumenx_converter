/**
 * Server-side transport reminders — institute timezone, idempotent, preference-aware.
 * Runs from background-jobs (never from frontend timers).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { listActiveInstitutesForLogin } from "../identity/repository.js";
import { findInstituteSettings } from "../identity/repository.js";
import { isOperationallyUsable } from "./approval.js";
import { listNotRidingStudentIds } from "./daily-exception-repository.js";
import {
  wallClockToUtc,
  resolveInstituteServiceDate,
} from "./daily-exception-service.js";
import {
  findActiveTripForVehicle,
  findLatestLocationForTrip,
  listTrips,
} from "./ops-repository.js";
import {
  findTransportSettings,
  listEnrollments,
  listRoutes,
} from "./repository.js";
import {
  guardianUserIdsForRoute,
  guardianUserIdsForStudents,
  staffUserIdsForInstitute,
} from "./ops-notifications.js";
import { emitTransportNotification } from "./transport-notification-emit.js";
import { transportDedupe } from "./transport-notification-severity.js";
import { TRANSPORT_EVENT } from "./transport-events.js";

export type TransportRemindersResult = {
  institutes: number;
  emitted: number;
};

function minutesBetween(a: Date, b: Date): number {
  return Math.round((a.getTime() - b.getTime()) / 60_000);
}

function formatPickupClock(hhmm: string): string {
  const [hRaw, mRaw] = hhmm.split(":").map(Number);
  const h = hRaw ?? 8;
  const m = mRaw ?? 0;
  const d = new Date(2000, 0, 1, h, m);
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

async function processInstituteReminders(
  admin: SupabaseClient,
  instituteId: string,
  now: Date,
): Promise<number> {
  const transport = await findTransportSettings(admin, instituteId);
  if (!transport || transport.notifications_enabled === false) return 0;
  if (!transport.remember_enabled) {
    // Still run operational alerts (not started / GPS stale) below.
  }

  const identity = await findInstituteSettings(admin, instituteId);
  const timezone = identity?.timezone?.trim() || "Asia/Kolkata";
  const serviceDate = await resolveInstituteServiceDate(admin, instituteId, now);
  const membershipResult = await admin
    .from("membership")
    .select("user_id")
    .eq("institute_id", instituteId)
    .eq("status", "active")
    .is("deleted_at", null)
    .limit(1);
  const systemUserId = (
    (membershipResult.data ?? []) as Array<{ user_id: string }>
  )[0]?.user_id;
  if (!systemUserId) return 0;

  let emitted = 0;
  const enrollments = (await listEnrollments(admin, instituteId)).filter(
    (e) => e.status === "active" && isOperationallyUsable(e.approval_status),
  );
  if (enrollments.length === 0) return 0;

  const notRiding = await listNotRidingStudentIds(
    admin,
    instituteId,
    serviceDate,
    enrollments.map((e) => e.student_id),
  );

  const riding = enrollments.filter((e) => !notRiding.has(e.student_id));
  const ridingIds = riding.map((e) => e.student_id);
  const guardiansByStudent = await guardianUserIdsForStudents(
    admin,
    instituteId,
    ridingIds,
  );

  const pickupRaw = transport.default_pickup_time
    ? String(transport.default_pickup_time).slice(0, 5)
    : null;
  const bufferMins = Math.max(0, transport.default_pickup_buffer_mins ?? 5);
  const pickupUtc = pickupRaw
    ? wallClockToUtc(serviceDate, `${pickupRaw}:00`, timezone)
    : null;

  // Morning + pre-pickup (remember_enabled). Operational alerts below still run.
  if (transport.remember_enabled && pickupRaw && pickupUtc) {
    const morningWindowStart = wallClockToUtc(
      serviceDate,
      "05:30:00",
      timezone,
    );
    const morningWindowEnd = wallClockToUtc(serviceDate, "07:00:00", timezone);
    const prePickupAt = new Date(pickupUtc.getTime() - bufferMins * 60_000);

    const inMorning = now >= morningWindowStart && now <= morningWindowEnd;
    const inPrePickup =
      now >= prePickupAt &&
      now <= new Date(prePickupAt.getTime() + 10 * 60_000);

    if (inMorning || inPrePickup) {
      for (const enrollment of riding) {
        const guardians = guardiansByStudent.get(enrollment.student_id) ?? [];
        if (guardians.length === 0) continue;

        if (inMorning) {
          const ok = await emitTransportNotification(admin, {
            instituteId,
            createdByUserId: systemUserId,
            kind: "SERVICE_REMINDER",
            severity: "info",
            title: "Bus service today",
            body: "Your child's bus service is scheduled today.",
            deepLink: "/transport",
            dedupeKey: transportDedupe.reminder(
              enrollment.route_id,
              enrollment.student_id,
              "morning_service",
              serviceDate,
            ),
            recipientUserIds: guardians,
            payload: {
              studentId: enrollment.student_id,
              serviceDate,
              reminderType: "morning_service",
            },
          });
          if (ok) emitted += 1;
        }

        if (inPrePickup) {
          const ok = await emitTransportNotification(admin, {
            instituteId,
            createdByUserId: systemUserId,
            kind: "PICKUP_REMINDER",
            severity: "attention",
            title: "Pickup expected soon",
            body: `Your child's bus is expected around ${formatPickupClock(pickupRaw)}.`,
            deepLink: "/transport/live",
            dedupeKey: transportDedupe.reminder(
              enrollment.route_id,
              enrollment.student_id,
              "pre_pickup",
              serviceDate,
            ),
            recipientUserIds: guardians,
            payload: {
              studentId: enrollment.student_id,
              serviceDate,
              reminderType: "pre_pickup",
              expectedPickup: pickupRaw,
            },
          });
          if (ok) emitted += 1;
        }
      }
    }
  }

  // Trip not started near expected pickup — independent of remember_enabled.
  if (
    pickupUtc &&
    now >= pickupUtc &&
    now <= new Date(pickupUtc.getTime() + 20 * 60_000)
  ) {
    const routes = (await listRoutes(admin, instituteId)).filter(
      (r) => r.status === "active",
    );
    const tripsTodayForStart = await listTrips(admin, instituteId, serviceDate);
    const activeRouteIds = new Set(
      tripsTodayForStart
        .filter((t) => !t.finalized && t.phase !== "completed")
        .map((t) => t.route_id),
    );
    const staffForStart = await staffUserIdsForInstitute(admin, instituteId);

    for (const route of routes) {
      if (activeRouteIds.has(route.id)) continue;
      if (!route.vehicle_id) continue;
      const active = await findActiveTripForVehicle(admin, route.vehicle_id);
      if (active) continue;

      const routeEnrollments = riding.filter((e) => e.route_id === route.id);
      if (routeEnrollments.length === 0) continue;

      const parentIds: string[] = [];
      for (const e of routeEnrollments) {
        parentIds.push(...(guardiansByStudent.get(e.student_id) ?? []));
      }
      const recipients = [...new Set([...parentIds, ...staffForStart])];
      if (recipients.length === 0) continue;

      const ok = await emitTransportNotification(admin, {
        instituteId,
        createdByUserId: systemUserId,
        kind: "TRIP_NOT_STARTED",
        severity: "attention",
        title: "Transport has not started yet",
        body: `${route.name} has not started near the expected pickup time.`,
        deepLink: "/transport",
        dedupeKey: transportDedupe.tripNotStarted(route.id, serviceDate),
        recipientUserIds: recipients,
        payload: {
          routeId: route.id,
          serviceDate,
          reminderType: "trip_not_started",
        },
      });
      if (ok) emitted += 1;
    }
  }

  // GPS stale on active trips (operational — ATTENTION, not critical).
  const tripsToday = await listTrips(admin, instituteId, serviceDate);
  const activeTrips = tripsToday.filter(
    (t) => !t.finalized && t.phase !== "completed" && t.phase !== "ready",
  );
  const staff = await staffUserIdsForInstitute(admin, instituteId);
  for (const trip of activeTrips) {
    // Parked at school during drop is a valid idle GPS state.
    if (trip.school_arrived_at && trip.phase === "dropping") continue;
    const loc = await findLatestLocationForTrip(admin, trip.id);
    if (!loc?.captured_at) continue;
    const ageMin = minutesBetween(now, new Date(loc.captured_at));
    if (ageMin < 5) continue;

    const recipients = [...staff];
    const guardians = await guardianUserIdsForRoute(
      admin,
      instituteId,
      trip.route_id,
    );
    // Parents get stale only after 10 min; staff after 5.
    const parentRecipients = ageMin >= 10 ? guardians : [];
    const all = [...new Set([...recipients, ...parentRecipients])];
    if (all.length === 0) continue;

    const ok = await emitTransportNotification(admin, {
      instituteId,
      createdByUserId: systemUserId,
      kind: "GPS_STALE",
      severity: ageMin >= 20 ? "urgent" : "attention",
      title: ageMin >= 20 ? "Bus GPS offline" : "Bus GPS stale",
      body:
        ageMin >= 20
          ? "Live location has not updated for over 20 minutes."
          : `Live location last updated ${ageMin} minutes ago.`,
      deepLink: "/transport",
      dedupeKey: `${transportDedupe.gpsStale(trip.id)}:${Math.floor(ageMin / 10)}`,
      recipientUserIds: all,
      payload: {
        tripId: trip.id,
        ageMin,
        kind: TRANSPORT_EVENT.TRIP_DELAYED,
        reminderType: "gps_stale",
      },
    });
    if (ok) emitted += 1;
  }

  return emitted;
}

export async function processTransportRemindersSystem(
  admin: SupabaseClient,
  now: Date = new Date(),
): Promise<TransportRemindersResult> {
  const institutes = await listActiveInstitutesForLogin(admin);
  let emitted = 0;
  for (const inst of institutes) {
    try {
      emitted += await processInstituteReminders(admin, inst.id, now);
    } catch {
      // Isolate per institute — continue others.
    }
  }
  return { institutes: institutes.length, emitted };
}
