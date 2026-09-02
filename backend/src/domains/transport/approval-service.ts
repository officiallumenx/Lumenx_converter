import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "../../errors/app-error.js";
import type { Actor } from "../../auth/types.js";
import { requireInstituteId } from "../../authorization/index.js";
import { listStudents } from "../students/repository.js";
import {
  assertCanDeleteRejected,
  assertCanReview,
  assertPendingForReview,
  isDriverForInstitute,
  isTransportWriter,
  type TransportApprovalStatus,
} from "./approval.js";
import {
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
