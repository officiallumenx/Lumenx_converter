/**
 * Transport authorization helpers — never trust client-supplied
 * institute_id / role / student_id / driver_id without verifying against
 * authenticated identity and server-side relationships.
 *
 * Trust boundary: Hono uses the Supabase service_role client for writes so
 * RLS does not apply to backend mutations. Authorization is enforced in this
 * module and HTTP handlers (JWT actor + membership + driver/parent bindings).
 * Browser clients use the anon key + user JWT; RLS still scopes SELECT on
 * transport tables. Do not weaken RLS to compensate for service_role writes.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "../../errors/app-error.js";
import type { Actor } from "../../auth/types.js";
import { isDriverForInstitute, isTransportWriter } from "./approval.js";
import { getEffectiveTripParticipants } from "./effective-participants.js";
import {
  findDriverByUserProfileId,
  findRouteById,
  findStopById,
  listRoutes,
} from "./repository.js";
import type { DriverRow, RouteRow } from "./types.js";
import type { TransportTripRow } from "./ops-types.js";

/** Staff/admin readers who may see institute-wide transport (excludes pure drivers). */
export const TRANSPORT_ELEVATED_READ_ROLES = [
  "institute_admin",
  "principal",
  "vice_principal",
  "coordinator",
  "it_admin",
  "teacher",
  "accountant",
  "admissions_officer",
  "staff",
] as const;

export function isElevatedTransportReader(
  actor: Actor,
  instituteId: string,
): boolean {
  if (actor.isPlatformOperator) return true;
  if (isTransportWriter(actor, instituteId)) return true;
  const membership = actor.memberships.find((m) => m.instituteId === instituteId);
  if (!membership) return false;
  return TRANSPORT_ELEVATED_READ_ROLES.some((role) =>
    membership.roles.includes(role),
  );
}

/** True when actor is a driver for the institute and not an elevated staff reader. */
export function isDriverOnlyActor(actor: Actor, instituteId: string): boolean {
  return (
    isDriverForInstitute(actor, instituteId) &&
    !isElevatedTransportReader(actor, instituteId)
  );
}

export async function resolveAuthenticatedDriver(
  admin: SupabaseClient,
  actor: Actor,
  instituteId: string,
): Promise<DriverRow> {
  const driver = await findDriverByUserProfileId(admin, actor.userId, instituteId);
  if (!driver || driver.deleted_at) {
    throw AppError.forbidden("Insufficient permissions");
  }
  return driver;
}

/**
 * Verifies client-supplied driverId matches the authenticated driver's profile.
 * Writers skip (admin ops).
 */
export async function assertAuthenticatedDriverId(
  admin: SupabaseClient,
  actor: Actor,
  instituteId: string,
  clientDriverId: string,
): Promise<DriverRow | null> {
  if (isTransportWriter(actor, instituteId)) return null;
  if (!isDriverForInstitute(actor, instituteId)) {
    throw AppError.forbidden("Insufficient permissions");
  }
  const driver = await resolveAuthenticatedDriver(admin, actor, instituteId);
  if (driver.id !== clientDriverId) {
    throw AppError.forbidden("Insufficient permissions");
  }
  return driver;
}

export function assertDriverOwnsVehicle(
  driver: DriverRow,
  vehicleId: string,
): void {
  if (driver.assigned_vehicle_id && driver.assigned_vehicle_id !== vehicleId) {
    throw AppError.forbidden("Vehicle is not assigned to this driver");
  }
}

export function assertDriverOwnsRoute(driver: DriverRow, route: RouteRow): void {
  if (route.deleted_at) {
    throw AppError.notFound("Route not found");
  }
  if (route.driver_id === driver.id) return;
  if (
    route.submitted_by_user_id === driver.user_profile_id &&
    route.approval_status === "pending"
  ) {
    return;
  }
  throw AppError.forbidden("Route is not assigned to this driver");
}

export function assertDriverOwnsTrip(
  driver: DriverRow,
  trip: TransportTripRow,
): void {
  if (trip.driver_id !== driver.id) {
    throw AppError.forbidden("Insufficient permissions");
  }
}

/**
 * Bind trip start inputs to server relationships — never trust client IDs alone.
 */
export async function assertDriverCanStartTrip(
  admin: SupabaseClient,
  actor: Actor,
  input: {
    instituteId: string;
    driverId: string;
    routeId: string;
    vehicleId: string;
  },
): Promise<{ driver: DriverRow | null; route: RouteRow }> {
  const route = await findRouteById(admin, input.routeId);
  if (!route || route.institute_id !== input.instituteId || route.deleted_at) {
    throw AppError.notFound("Route not found");
  }

  if (isTransportWriter(actor, input.instituteId)) {
    if (route.vehicle_id && input.vehicleId !== route.vehicle_id) {
      throw AppError.validation("vehicle_id must match the route vehicle");
    }
    return { driver: null, route };
  }

  const driver = await assertAuthenticatedDriverId(
    admin,
    actor,
    input.instituteId,
    input.driverId,
  );
  if (!driver) throw AppError.forbidden("Insufficient permissions");

  assertDriverOwnsRoute(driver, route);
  assertDriverOwnsVehicle(driver, input.vehicleId);

  if (route.vehicle_id && input.vehicleId !== route.vehicle_id) {
    throw AppError.forbidden("Vehicle is not linked to this route");
  }
  if (!driver.assigned_vehicle_id) {
    throw AppError.forbidden("Driver has no assigned vehicle");
  }

  return { driver, route };
}

export async function assertDriverCanAccessVehicle(
  admin: SupabaseClient,
  actor: Actor,
  instituteId: string,
  vehicleId: string,
): Promise<void> {
  if (isElevatedTransportReader(actor, instituteId)) return;
  if (!isDriverForInstitute(actor, instituteId)) {
    throw AppError.forbidden("Insufficient permissions");
  }
  const driver = await resolveAuthenticatedDriver(admin, actor, instituteId);
  assertDriverOwnsVehicle(driver, vehicleId);
  if (!driver.assigned_vehicle_id) {
    throw AppError.forbidden("Driver has no assigned vehicle");
  }
}

export async function assertDriverCanAccessRoute(
  admin: SupabaseClient,
  actor: Actor,
  route: RouteRow,
): Promise<void> {
  if (isElevatedTransportReader(actor, route.institute_id)) return;
  if (!isDriverForInstitute(actor, route.institute_id)) {
    throw AppError.forbidden("Insufficient permissions");
  }
  const driver = await resolveAuthenticatedDriver(
    admin,
    actor,
    route.institute_id,
  );
  assertDriverOwnsRoute(driver, route);
}

export async function assertDriverCanAccessTripRow(
  admin: SupabaseClient,
  actor: Actor,
  trip: TransportTripRow,
): Promise<void> {
  if (isElevatedTransportReader(actor, trip.institute_id)) return;
  if (!isDriverForInstitute(actor, trip.institute_id)) {
    throw AppError.forbidden("Insufficient permissions");
  }
  const driver = await resolveAuthenticatedDriver(
    admin,
    actor,
    trip.institute_id,
  );
  assertDriverOwnsTrip(driver, trip);
}

/**
 * Boarding/dropping targets must be effective participants on the trip route
 * and the stop must belong to that route.
 */
export async function assertBoardingTargetAllowed(
  admin: SupabaseClient,
  trip: TransportTripRow,
  input: { studentId: string; stopId: string; kind: "boarding" | "dropping" },
): Promise<void> {
  const stop = await findStopById(admin, input.stopId);
  if (
    !stop ||
    stop.deleted_at ||
    stop.institute_id !== trip.institute_id ||
    stop.route_id !== trip.route_id
  ) {
    throw AppError.validation("Stop is not on this trip route");
  }

  const effective = await getEffectiveTripParticipants(admin, trip.id);
  const participant = effective.participants.find(
    (p) => p.studentId === input.studentId,
  );
  if (!participant) {
    throw AppError.forbidden("Student is not enrolled on this trip route");
  }
  if (participant.notRidingToday && input.kind === "boarding") {
    throw AppError.conflict("Student is marked not riding today");
  }
}

export async function listDriverOwnedRouteIds(
  admin: SupabaseClient,
  driver: DriverRow,
): Promise<Set<string>> {
  const routes = await listRoutes(admin, driver.institute_id);
  const ids = new Set<string>();
  for (const route of routes) {
    if (route.deleted_at) continue;
    if (route.driver_id === driver.id) {
      ids.add(route.id);
      continue;
    }
    if (
      route.submitted_by_user_id === driver.user_profile_id &&
      route.approval_status === "pending"
    ) {
      ids.add(route.id);
    }
  }
  return ids;
}
