import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "../../errors/app-error.js";
import type { Actor } from "../../auth/types.js";
import { requireInstituteId, assertInstituteAccess } from "../../authorization/index.js";
import { findStudentById, listGuardianStudentIds, listStudents } from "../students/repository.js";
import {
  assertCanDeleteRejected,
  assertCanReview,
  assertPendingForReview,
  isDriverForInstitute,
  isTransportWriter,
  type TransportApprovalStatus,
} from "./approval.js";
import {
  findDriverById,
  findDriverByUserProfileId,
  findEnrollmentById,
  findRouteById,
  findStopById,
  findVehicleById,
  listEnrollments,
  listRoutes,
  listStopsForRoute,
  softDeleteEnrollment,
  softDeleteRoute,
  softDeleteStop,
  updateEnrollmentFields,
  updateRouteFields,
  updateStopFields,
} from "./repository.js";
import type {
  RouteDto,
  StopDto,
  TransportEnrollmentDto,
} from "./types.js";
import {
  toEnrollmentDto,
  toRouteDto,
  toStopDto,
} from "./service.js";

export type TransportReviewQueueItem =
  | { kind: "route"; item: RouteDto }
  | { kind: "stop"; item: StopDto }
  | { kind: "enrollment"; item: TransportEnrollmentDto };

export type LearnerTransportStop = {
  id: string;
  name: string;
  locationLabel: string;
  routeOrder: number;
};

export type LearnerTransportSummary = {
  studentId: string;
  studentName: string;
  enrollmentId: string | null;
  enrollmentStatus: string | null;
  approvalStatus: TransportApprovalStatus | null;
  routeId: string | null;
  routeName: string | null;
  busNumber: string | null;
  vehicleRegistration: string | null;
  driverName: string | null;
  driverPhone: string | null;
  pickupStop: LearnerTransportStop | null;
  dropStop: LearnerTransportStop | null;
  stops: LearnerTransportStop[];
};

export type TeacherClassTransportRow = {
  studentId: string;
  studentName: string;
  rollNo: string;
  classLabel: string;
  sectionLabel: string;
  busNumber: string | null;
  routeName: string | null;
  routeId: string | null;
  enrollmentId: string | null;
  approvalStatus: TransportApprovalStatus | null;
  enrollmentStatus: string | null;
};

function reviewPatch(
  actor: Actor,
  approved: boolean,
  reason?: string,
): Record<string, unknown> {
  return {
    approval_status: approved ? "approved" : "rejected",
    reviewed_by_user_id: actor.userId,
    reviewed_at: new Date().toISOString(),
    rejection_reason: approved ? null : reason?.trim() || "Declined by admin",
  };
}

export async function listTransportReviewQueueForActor(
  admin: SupabaseClient,
  actor: Actor,
  instituteId: string,
): Promise<TransportReviewQueueItem[]> {
  const id = requireInstituteId(actor, instituteId);
  assertCanReview(actor, id);

  const [routes, enrollments] = await Promise.all([
    listRoutes(admin, id),
    listEnrollments(admin, id),
  ]);

  const items: TransportReviewQueueItem[] = [];
  for (const route of routes) {
    if (route.approval_status === "pending") {
      items.push({ kind: "route", item: toRouteDto(route) });
    }
    const stops = await listStopsForRoute(admin, route.id);
    for (const stop of stops) {
      if (stop.approval_status === "pending") {
        items.push({ kind: "stop", item: toStopDto(stop) });
      }
    }
  }
  for (const row of enrollments) {
    if (row.approval_status === "pending") {
      items.push({ kind: "enrollment", item: toEnrollmentDto(row) });
    }
  }
  return items;
}

export async function approveTransportRouteForActor(
  admin: SupabaseClient,
  actor: Actor,
  routeId: string,
): Promise<RouteDto> {
  const existing = await findRouteById(admin, routeId);
  if (!existing) throw AppError.notFound("Route not found");
  assertCanReview(actor, existing.institute_id);
  assertPendingForReview(existing.approval_status);
  const updated = await updateRouteFields(
    admin,
    routeId,
    reviewPatch(actor, true),
  );
  if (!updated) throw AppError.notFound("Route not found");
  return toRouteDto(updated);
}

export async function rejectTransportRouteForActor(
  admin: SupabaseClient,
  actor: Actor,
  routeId: string,
  reason: string,
): Promise<RouteDto> {
  const trimmed = reason.trim();
  if (!trimmed) {
    throw AppError.validation("rejection reason is required", { reason: ["Required"] });
  }
  const existing = await findRouteById(admin, routeId);
  if (!existing) throw AppError.notFound("Route not found");
  assertCanReview(actor, existing.institute_id);
  assertPendingForReview(existing.approval_status);
  const updated = await updateRouteFields(
    admin,
    routeId,
    reviewPatch(actor, false, trimmed),
  );
  if (!updated) throw AppError.notFound("Route not found");
  return toRouteDto(updated);
}

export async function approveTransportStopForActor(
  admin: SupabaseClient,
  actor: Actor,
  stopId: string,
): Promise<StopDto> {
  const existing = await findStopById(admin, stopId);
  if (!existing) throw AppError.notFound("Stop not found");
  assertCanReview(actor, existing.institute_id);
  assertPendingForReview(existing.approval_status);
  const updated = await updateStopFields(admin, stopId, reviewPatch(actor, true));
  if (!updated) throw AppError.notFound("Stop not found");
  return toStopDto(updated);
}

export async function rejectTransportStopForActor(
  admin: SupabaseClient,
  actor: Actor,
  stopId: string,
  reason: string,
): Promise<StopDto> {
  const trimmed = reason.trim();
  if (!trimmed) {
    throw AppError.validation("rejection reason is required", { reason: ["Required"] });
  }
  const existing = await findStopById(admin, stopId);
  if (!existing) throw AppError.notFound("Stop not found");
  assertCanReview(actor, existing.institute_id);
  assertPendingForReview(existing.approval_status);
  const updated = await updateStopFields(
    admin,
    stopId,
    reviewPatch(actor, false, trimmed),
  );
  if (!updated) throw AppError.notFound("Stop not found");
  return toStopDto(updated);
}

export async function approveTransportEnrollmentForActor(
  admin: SupabaseClient,
  actor: Actor,
  enrollmentId: string,
): Promise<TransportEnrollmentDto> {
  const existing = await findEnrollmentById(admin, enrollmentId);
  if (!existing) throw AppError.notFound("Enrollment not found");
  assertCanReview(actor, existing.institute_id);
  assertPendingForReview(existing.approval_status);
  const updated = await updateEnrollmentFields(
    admin,
    enrollmentId,
    reviewPatch(actor, true),
  );
  if (!updated) throw AppError.notFound("Enrollment not found");
  return toEnrollmentDto(updated);
}

export async function rejectTransportEnrollmentForActor(
  admin: SupabaseClient,
  actor: Actor,
  enrollmentId: string,
  reason: string,
): Promise<TransportEnrollmentDto> {
  const trimmed = reason.trim();
  if (!trimmed) {
    throw AppError.validation("rejection reason is required", { reason: ["Required"] });
  }
  const existing = await findEnrollmentById(admin, enrollmentId);
  if (!existing) throw AppError.notFound("Enrollment not found");
  assertCanReview(actor, existing.institute_id);
  assertPendingForReview(existing.approval_status);
  const updated = await updateEnrollmentFields(
    admin,
    enrollmentId,
    reviewPatch(actor, false, trimmed),
  );
  if (!updated) throw AppError.notFound("Enrollment not found");
  return toEnrollmentDto(updated);
}

export async function deleteRejectedTransportRouteForActor(
  admin: SupabaseClient,
  actor: Actor,
  routeId: string,
): Promise<void> {
  const existing = await findRouteById(admin, routeId);
  if (!existing) throw AppError.notFound("Route not found");
  assertCanDeleteRejected(
    actor,
    existing.institute_id,
    existing.submitted_by_user_id,
    existing.approval_status,
  );
  const deleted = await softDeleteRoute(admin, routeId);
  if (!deleted) throw AppError.conflict("Route was already deleted");
}

export async function deleteRejectedTransportStopForActor(
  admin: SupabaseClient,
  actor: Actor,
  stopId: string,
): Promise<void> {
  const existing = await findStopById(admin, stopId);
  if (!existing) throw AppError.notFound("Stop not found");
  assertCanDeleteRejected(
    actor,
    existing.institute_id,
    existing.submitted_by_user_id,
    existing.approval_status,
  );
  const deleted = await softDeleteStop(admin, stopId);
  if (!deleted) throw AppError.conflict("Stop was already deleted");
}

export async function deleteRejectedTransportEnrollmentForActor(
  admin: SupabaseClient,
  actor: Actor,
  enrollmentId: string,
): Promise<void> {
  const existing = await findEnrollmentById(admin, enrollmentId);
  if (!existing) throw AppError.notFound("Enrollment not found");
  assertCanDeleteRejected(
    actor,
    existing.institute_id,
    existing.submitted_by_user_id,
    existing.approval_status,
  );
  const deleted = await softDeleteEnrollment(admin, enrollmentId);
  if (!deleted) throw AppError.conflict("Enrollment was already deleted");
}

export async function getDriverMeForActor(
  admin: SupabaseClient,
  actor: Actor,
  instituteId: string,
) {
  const id = requireInstituteId(actor, instituteId);
  if (!isDriverForInstitute(actor, id) && !isTransportWriter(actor, id)) {
    throw AppError.forbidden("Insufficient permissions");
  }
  const driver = await findDriverByUserProfileId(admin, actor.userId, id);
  if (!driver) throw AppError.notFound("Driver profile not linked");
  return {
    driverId: driver.id,
    instituteId: driver.institute_id,
    displayName: driver.display_name,
    phone: driver.phone,
  };
}

export async function listTeacherClassTransportForActor(
  admin: SupabaseClient,
  actor: Actor,
  input: {
    instituteId: string;
    classLabel?: string;
    sectionLabel?: string;
  },
): Promise<TeacherClassTransportRow[]> {
  const instituteId = requireInstituteId(actor, input.instituteId);
  if (!isTransportWriter(actor, instituteId)) {
    const membership = actor.memberships.find((m) => m.instituteId === instituteId);
    if (!membership?.roles.includes("teacher")) {
      throw AppError.forbidden("Insufficient permissions");
    }
  }

  const students = await listStudents(admin, {
    instituteId,
    classLabel: input.classLabel,
    sectionLabel: input.sectionLabel,
  });

  const [routes, enrollments, vehicles] = await Promise.all([
    listRoutes(admin, instituteId),
    listEnrollments(admin, instituteId),
    admin
      .from("vehicle")
      .select("id, vehicle_number")
      .eq("institute_id", instituteId)
      .is("deleted_at", null)
      .then((r) => (r.error ? [] : (r.data as { id: string; vehicle_number: string }[]))),
  ]);

  const routeById = new Map(routes.map((r) => [r.id, r]));
  const vehicleById = new Map(vehicles.map((v) => [v.id, v.vehicle_number]));
  const enrollmentByStudent = new Map(
    enrollments
      .filter((e) => e.approval_status === "approved" && e.status === "active")
      .map((e) => [e.student_id, e]),
  );

  return students.map((student) => {
    const enrollment = enrollmentByStudent.get(student.id);
    const route = enrollment ? routeById.get(enrollment.route_id) : undefined;
    const busNumber = route?.vehicle_id
      ? (vehicleById.get(route.vehicle_id) ?? null)
      : null;
    return {
      studentId: student.id,
      studentName:
        student.display_name?.trim() ||
        `${student.first_name ?? ""} ${student.surname ?? ""}`.trim() ||
        "Student",
      rollNo: student.roll_no?.trim() || "—",
      classLabel: student.class_label?.trim() || "—",
      sectionLabel: student.section_label?.trim() || "—",
      busNumber,
      routeName: route?.name ?? null,
      routeId: route?.id ?? null,
      enrollmentId: enrollment?.id ?? null,
      approvalStatus: enrollment?.approval_status ?? null,
      enrollmentStatus: enrollment?.status ?? null,
    };
  });
}

async function assertCanAccessStudent(
  admin: SupabaseClient,
  actor: Actor,
  instituteId: string,
  studentId: string,
): Promise<void> {
  assertInstituteAccess(actor, instituteId);
  if (isTransportWriter(actor, instituteId)) return;

  const linkedStudent = actor.students.find(
    (s) => s.instituteId === instituteId && s.studentId === studentId,
  );
  if (linkedStudent) return;

  for (const p of actor.parents.filter((x) => x.instituteId === instituteId)) {
    const linked = await listGuardianStudentIds(admin, p.parentId, instituteId);
    if (linked.includes(studentId)) return;
  }

  const membership = actor.memberships.find((m) => m.instituteId === instituteId);
  if (membership?.roles.includes("teacher")) return;

  throw AppError.forbidden("Insufficient permissions");
}

function stopSummary(row: {
  id: string;
  name: string;
  location_label: string;
  route_order: number;
}): LearnerTransportStop {
  return {
    id: row.id,
    name: row.name,
    locationLabel: row.location_label,
    routeOrder: row.route_order,
  };
}

export async function getLearnerTransportForActor(
  admin: SupabaseClient,
  actor: Actor,
  input: { instituteId: string; studentId: string },
): Promise<LearnerTransportSummary> {
  const instituteId = requireInstituteId(actor, input.instituteId);
  await assertCanAccessStudent(admin, actor, instituteId, input.studentId);

  const student = await findStudentById(admin, input.studentId);
  if (!student || student.institute_id !== instituteId) {
    throw AppError.notFound("Student not found");
  }

  const studentName =
    student.display_name?.trim() ||
    `${student.first_name ?? ""} ${student.surname ?? ""}`.trim() ||
    "Student";

  const enrollments = await listEnrollments(admin, instituteId, [input.studentId]);
  const enrollment =
    enrollments.find((e) => e.status === "active") ??
    enrollments[0] ??
    null;

  if (!enrollment) {
    return {
      studentId: student.id,
      studentName,
      enrollmentId: null,
      enrollmentStatus: null,
      approvalStatus: null,
      routeId: null,
      routeName: null,
      busNumber: null,
      vehicleRegistration: null,
      driverName: null,
      driverPhone: null,
      pickupStop: null,
      dropStop: null,
      stops: [],
    };
  }

  if (enrollment.approval_status !== "approved") {
    return {
      studentId: student.id,
      studentName,
      enrollmentId: enrollment.id,
      enrollmentStatus: enrollment.status,
      approvalStatus: enrollment.approval_status,
      routeId: enrollment.route_id,
      routeName: null,
      busNumber: null,
      vehicleRegistration: null,
      driverName: null,
      driverPhone: null,
      pickupStop: null,
      dropStop: null,
      stops: [],
    };
  }

  const route = await findRouteById(admin, enrollment.route_id);
  if (!route || route.approval_status !== "approved") {
    return {
      studentId: student.id,
      studentName,
      enrollmentId: enrollment.id,
      enrollmentStatus: enrollment.status,
      approvalStatus: enrollment.approval_status,
      routeId: enrollment.route_id,
      routeName: route?.name ?? null,
      busNumber: null,
      vehicleRegistration: null,
      driverName: null,
      driverPhone: null,
      pickupStop: null,
      dropStop: null,
      stops: [],
    };
  }

  const [stops, vehicle, driver] = await Promise.all([
    listStopsForRoute(admin, route.id),
    route.vehicle_id ? findVehicleById(admin, route.vehicle_id) : Promise.resolve(null),
    route.driver_id ? findDriverById(admin, route.driver_id) : Promise.resolve(null),
  ]);

  const approvedStops = stops
    .filter((s) => s.approval_status === "approved")
    .sort((a, b) => a.route_order - b.route_order);

  const pickup = approvedStops.find((s) => s.id === enrollment.pickup_stop_id) ?? null;
  const drop = approvedStops.find((s) => s.id === enrollment.drop_stop_id) ?? null;

  return {
    studentId: student.id,
    studentName,
    enrollmentId: enrollment.id,
    enrollmentStatus: enrollment.status,
    approvalStatus: enrollment.approval_status,
    routeId: route.id,
    routeName: route.name,
    busNumber: vehicle?.vehicle_number ?? null,
    vehicleRegistration: vehicle?.registration_number ?? null,
    driverName: driver?.display_name ?? null,
    driverPhone: driver?.phone ?? null,
    pickupStop: pickup ? stopSummary(pickup) : null,
    dropStop: drop ? stopSummary(drop) : null,
    stops: approvedStops.map(stopSummary),
  };
}
