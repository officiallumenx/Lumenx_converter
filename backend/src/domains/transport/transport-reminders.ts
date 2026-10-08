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
  appendTripTimeline,
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
import {
  deepLinkForTransportEvent,
  transportDedupe,
} from "./transport-notification-severity.js";
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
            targetAudience: "parent",
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
          if (ok.ok) emitted += 1;
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
            targetAudience: "parent",
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
          if (ok.ok) emitted += 1;
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
        targetAudience: "parent",
        targetApps: ["connect", "admin"],
        dedupeKey: transportDedupe.tripNotStarted(route.id, serviceDate),
        recipientUserIds: recipients,
        payload: {
          routeId: route.id,
          serviceDate,
          reminderType: "trip_not_started",
        },
      });
      if (ok.ok) emitted += 1;
    }
  }

  // GPS health state machine on active trips (operational — ATTENTION / URGENT).
  // HEALTHY → STALE (once) → OFFLINE (once). Stay in state: no repeats.
  // Recovery (fresh fix) → GPS_RECOVERED so a later stale episode can alert again.
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
    const timeline = trip.timeline ?? [];
    const lastGpsHealth = [...timeline]
      .reverse()
      .find(
        (e) =>
          e.kind === TRANSPORT_EVENT.GPS_STALE ||
          e.kind === TRANSPORT_EVENT.GPS_OFFLINE ||
          e.kind === TRANSPORT_EVENT.GPS_RECOVERED,
      );
    // New dedupe episode after each recovery so a later stale window can alert again.
    const gpsEpisode = timeline.filter(
      (e) => e.kind === TRANSPORT_EVENT.GPS_RECOVERED,
    ).length;

    if (ageMin < 5) {
      if (
        lastGpsHealth &&
        (lastGpsHealth.kind === TRANSPORT_EVENT.GPS_STALE ||
          lastGpsHealth.kind === TRANSPORT_EVENT.GPS_OFFLINE)
      ) {
        await appendTripTimeline(admin, trip.id, {
          id: `evt-gps-recovered-${trip.id}-${Date.now()}`,
          at: now.toISOString(),
          kind: TRANSPORT_EVENT.GPS_RECOVERED,
          label: "Bus GPS recovered",
        });
      }
      continue;
    }

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

    const offline = ageMin >= 20;
    if (offline) {
      if (lastGpsHealth?.kind === TRANSPORT_EVENT.GPS_OFFLINE) continue;
      const ok = await emitTransportNotification(admin, {
        instituteId,
        createdByUserId: systemUserId,
        kind: TRANSPORT_EVENT.GPS_OFFLINE,
        severity: "urgent",
        title: "Bus GPS offline",
        body: "Live location has not updated for over 20 minutes.",
        deepLink: "/transport",
        targetAudience: "parent",
        targetApps: ["connect", "admin"],
        dedupeKey: `${transportDedupe.gpsOffline(trip.id)}:ep${gpsEpisode}`,
        recipientUserIds: all,
        payload: {
          tripId: trip.id,
          ageMin,
          kind: TRANSPORT_EVENT.GPS_OFFLINE,
          reminderType: "gps_offline",
        },
      });
      if (ok.ok || ok.reason === "dedupe") {
        await appendTripTimeline(admin, trip.id, {
          id: `evt-gps-offline-${trip.id}-ep${gpsEpisode}`,
          at: now.toISOString(),
          kind: TRANSPORT_EVENT.GPS_OFFLINE,
          label: "Bus GPS offline",
        });
      }
      if (ok.ok) emitted += 1;
      continue;
    }

    if (
      lastGpsHealth?.kind === TRANSPORT_EVENT.GPS_STALE ||
      lastGpsHealth?.kind === TRANSPORT_EVENT.GPS_OFFLINE
    ) {
      continue;
    }

    const ok = await emitTransportNotification(admin, {
      instituteId,
      createdByUserId: systemUserId,
      kind: TRANSPORT_EVENT.GPS_STALE,
      severity: "attention",
      title: "Bus GPS stale",
      body: `Live location last updated ${ageMin} minutes ago.`,
      deepLink: "/transport",
      targetAudience: "parent",
      targetApps: ["connect", "admin"],
      dedupeKey: `${transportDedupe.gpsStale(trip.id)}:ep${gpsEpisode}`,
      recipientUserIds: all,
      payload: {
        tripId: trip.id,
        ageMin,
        kind: TRANSPORT_EVENT.GPS_STALE,
        reminderType: "gps_stale",
      },
    });
    if (ok.ok || ok.reason === "dedupe") {
      await appendTripTimeline(admin, trip.id, {
        id: `evt-gps-stale-${trip.id}-ep${gpsEpisode}`,
        at: now.toISOString(),
        kind: TRANSPORT_EVENT.GPS_STALE,
        label: "Bus GPS stale",
      });
    }
    if (ok.ok) emitted += 1;
  }

  // TRIP_DELAYED: active trip, fresh GPS, past pickup+buffer+15m, not already marked delayed.
  if (pickupUtc) {
    const delayThreshold = new Date(
      pickupUtc.getTime() + (bufferMins + 15) * 60_000,
    );
    if (now >= delayThreshold) {
      for (const trip of activeTrips) {
        if ((trip.timeline ?? []).some((e) => e.kind === TRANSPORT_EVENT.TRIP_DELAYED)) {
          continue;
        }
        const loc = await findLatestLocationForTrip(admin, trip.id);
        if (!loc?.captured_at) continue;
        const ageMin = minutesBetween(now, new Date(loc.captured_at));
        if (ageMin >= 5) continue; // stale GPS handled above — delay requires fresh fix

        await appendTripTimeline(admin, trip.id, {
          id: `evt-delayed-${trip.id}`,
          at: now.toISOString(),
          kind: TRANSPORT_EVENT.TRIP_DELAYED,
          label: "Trip delayed",
          note: `Past expected pickup window (+${bufferMins + 15} min)`,
        });

        const guardians = await guardianUserIdsForRoute(
          admin,
          instituteId,
          trip.route_id,
        );
        if (guardians.length > 0) {
          const parentOk = await emitTransportNotification(admin, {
            instituteId,
            createdByUserId: systemUserId,
            kind: TRANSPORT_EVENT.TRIP_DELAYED,
            severity: "attention",
            title: "Trip delayed",
            body: "Your child's bus trip is running behind the expected schedule.",
            deepLink: deepLinkForTransportEvent(
              TRANSPORT_EVENT.TRIP_DELAYED,
              "parent",
            ),
            targetAudience: "parent",
            dedupeKey: transportDedupe.tripDelayed(trip.id),
            recipientUserIds: guardians,
            payload: { tripId: trip.id, routeId: trip.route_id },
          });
          if (parentOk.ok) emitted += 1;
        }
        if (staff.length > 0) {
          const staffOk = await emitTransportNotification(admin, {
            instituteId,
            createdByUserId: systemUserId,
            kind: TRANSPORT_EVENT.TRIP_DELAYED,
            severity: "attention",
            title: "Trip delayed",
            body: "An active transport trip is running behind the expected schedule.",
            deepLink: deepLinkForTransportEvent(
              TRANSPORT_EVENT.TRIP_DELAYED,
              "admin",
            ),
            targetAudience: "admin",
            dedupeKey: `${transportDedupe.tripDelayed(trip.id)}:admin`,
            recipientUserIds: staff,
            payload: { tripId: trip.id, routeId: trip.route_id },
          });
          if (staffOk.ok) emitted += 1;
        }
      }
    }
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
