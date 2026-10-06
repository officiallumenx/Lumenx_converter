import type { SupabaseClient } from "@supabase/supabase-js";
import type { Actor } from "../../auth/types.js";
import { AppError } from "../../errors/app-error.js";
import {
  assertInstituteAccess,
  requireInstituteId,
} from "../../authorization/index.js";
import { findInstituteSettings } from "../identity/repository.js";
import { findStudentById, listGuardianStudentIds } from "../students/repository.js";
import { toIsoDate } from "../teacher-performance/score.js";
import { isDriverForInstitute, isTransportWriter } from "./approval.js";
import {
  isDriverOnlyActor,
  listDriverOwnedRouteIds,
  resolveAuthenticatedDriver,
} from "./access.js";
import { listEnrollments } from "./repository.js";
import {
  cancelDailyException,
  findActiveDailyException,
  findDailyExceptionById,
  findLatestDailyExceptionAny,
  insertDailyException,
  listActiveDailyExceptionsForDate,
  reactivateDailyException,
  type TransportDailyExceptionReason,
  type TransportDailyExceptionRow,
  type TransportDailyExceptionType,
} from "./daily-exception-repository.js";
import { findTransportSettings } from "./repository.js";

export type TransportDailyExceptionDto = {
  id: string;
  instituteId: string;
  studentId: string;
  serviceDate: string;
  exceptionType: TransportDailyExceptionType;
  reason: TransportDailyExceptionReason;
  notes: string | null;
  createdByUserId: string | null;
  createdAt: string;
  updatedAt: string;
  cancelledAt: string | null;
  /** Parent undo allowed until this instant (ISO). */
  undoCutoffAt: string | null;
  canUndo: boolean;
};

export function toDailyExceptionDto(
  row: TransportDailyExceptionRow,
  extras?: { undoCutoffAt?: string | null; canUndo?: boolean },
): TransportDailyExceptionDto {
  return {
    id: row.id,
    instituteId: row.institute_id,
    studentId: row.student_id,
    serviceDate: row.service_date,
    exceptionType: row.exception_type,
    reason: row.reason,
    notes: row.notes,
    createdByUserId: row.created_by_user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    cancelledAt: row.cancelled_at,
    undoCutoffAt: extras?.undoCutoffAt ?? null,
    canUndo: extras?.canUndo ?? false,
  };
}

export async function resolveInstituteServiceDate(
  admin: SupabaseClient,
  instituteId: string,
  now: Date = new Date(),
): Promise<string> {
  const settings = await findInstituteSettings(admin, instituteId);
  const timezone = settings?.timezone?.trim() || "Asia/Kolkata";
  return toIsoDate(now, timezone);
}

/** Convert a wall-clock local date+time in `timeZone` to a UTC Date. */
export function wallClockToUtc(
  serviceDate: string,
  hhmmss: string,
  timeZone: string,
): Date {
  const [y, mo, d] = serviceDate.split("-").map(Number);
  const [h, mi, s] = hhmmss.split(":").map(Number);
  const desiredAsUtc = Date.UTC(y!, mo! - 1, d!, h ?? 0, mi ?? 0, s ?? 0);
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const partsOf = (ms: number) => {
    const parts = Object.fromEntries(
      formatter.formatToParts(new Date(ms)).map((p) => [p.type, p.value]),
    );
    return Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour === "24" ? "0" : parts.hour),
      Number(parts.minute),
      Number(parts.second),
    );
  };
  // One correction pass is enough for fixed-offset zones; two for DST edges.
  let utc = desiredAsUtc;
  utc -= partsOf(utc) - desiredAsUtc;
  utc -= partsOf(utc) - desiredAsUtc;
  return new Date(utc);
}

/**
 * Undo cutoff from existing transport settings:
 * - If default_pickup_time is set: cutoff = pickup_time − default_pickup_buffer_mins
 *   in the institute timezone on the service date.
 * - If pickup time is unset: undo allowed until end of service day (23:59:59 local).
 * Admin cancel is never subject to this cutoff.
 */
export async function resolveNotRidingUndoCutoff(
  admin: SupabaseClient,
  instituteId: string,
  serviceDate: string,
): Promise<{ timezone: string; undoCutoffAt: Date }> {
  const [identity, transport] = await Promise.all([
    findInstituteSettings(admin, instituteId),
    findTransportSettings(admin, instituteId),
  ]);
  const timezone = identity?.timezone?.trim() || "Asia/Kolkata";
  const bufferMins = Math.max(0, transport?.default_pickup_buffer_mins ?? 5);
  const pickupRaw = transport?.default_pickup_time
    ? String(transport.default_pickup_time).slice(0, 5)
    : null;

  if (pickupRaw && /^\d{2}:\d{2}$/.test(pickupRaw)) {
    const pickupUtc = wallClockToUtc(serviceDate, `${pickupRaw}:00`, timezone);
    return {
      timezone,
      undoCutoffAt: new Date(pickupUtc.getTime() - bufferMins * 60_000),
    };
  }

  return {
    timezone,
    undoCutoffAt: wallClockToUtc(serviceDate, "23:59:59", timezone),
  };
}

async function assertCanAccessStudentForDailyException(
  admin: SupabaseClient,
  actor: Actor,
  instituteId: string,
  studentId: string,
): Promise<"admin" | "parent"> {
  assertInstituteAccess(actor, instituteId);
  if (isTransportWriter(actor, instituteId)) return "admin";

  for (const p of actor.parents.filter((x) => x.instituteId === instituteId)) {
    const linked = await listGuardianStudentIds(admin, p.parentId, instituteId);
    if (linked.includes(studentId)) return "parent";
  }

  throw AppError.forbidden("Insufficient permissions");
}

async function enrichException(
  admin: SupabaseClient,
  row: TransportDailyExceptionRow,
  access: "admin" | "parent" | "driver" | "reader",
  now: Date = new Date(),
): Promise<TransportDailyExceptionDto> {
  const { undoCutoffAt } = await resolveNotRidingUndoCutoff(
    admin,
    row.institute_id,
    row.service_date,
  );
  const active = row.cancelled_at == null && row.exception_type === "NOT_RIDING";
  const beforeCutoff = now.getTime() <= undoCutoffAt.getTime();
  const canUndo =
    active &&
    (access === "admin" ||
      (access === "parent" && row.reason === "parent" && beforeCutoff));
  return toDailyExceptionDto(row, {
    undoCutoffAt: undoCutoffAt.toISOString(),
    canUndo,
  });
}

export async function listDailyExceptionsForActor(
  admin: SupabaseClient,
  actor: Actor,
  input: { instituteId: string; serviceDate?: string; studentId?: string },
): Promise<TransportDailyExceptionDto[]> {
  const instituteId = requireInstituteId(actor, input.instituteId);
  assertInstituteAccess(actor, instituteId);

  const isAdmin = isTransportWriter(actor, instituteId);
  const isDriver = isDriverForInstitute(actor, instituteId);
  if (!isAdmin && !isDriver) {
    if (!input.studentId) {
      throw AppError.forbidden("student_id is required");
    }
    await assertCanAccessStudentForDailyException(
      admin,
      actor,
      instituteId,
      input.studentId,
    );
  }

  const serviceDate =
    input.serviceDate ?? (await resolveInstituteServiceDate(admin, instituteId));
  let rows = await listActiveDailyExceptionsForDate(
    admin,
    instituteId,
    serviceDate,
    "NOT_RIDING",
  );
  if (input.studentId) {
    rows = rows.filter((r) => r.student_id === input.studentId);
  }

  if (isDriverOnlyActor(actor, instituteId)) {
    const self = await resolveAuthenticatedDriver(admin, actor, instituteId);
    const ownedRoutes = await listDriverOwnedRouteIds(admin, self);
    const enrollments = await listEnrollments(admin, instituteId);
    const rosterStudents = new Set(
      enrollments
        .filter((e) => ownedRoutes.has(e.route_id) && e.status === "active")
        .map((e) => e.student_id),
    );
    rows = rows.filter((r) => rosterStudents.has(r.student_id));
  }

  const access = isAdmin ? "admin" : isDriver ? "driver" : "parent";
  return Promise.all(rows.map((r) => enrichException(admin, r, access)));
}

export async function getStudentTodayParticipationForActor(
  admin: SupabaseClient,
  actor: Actor,
  input: { instituteId: string; studentId: string; serviceDate?: string },
): Promise<{
  studentId: string;
  serviceDate: string;
  ridingToday: boolean;
  exception: TransportDailyExceptionDto | null;
}> {
  const instituteId = requireInstituteId(actor, input.instituteId);
  const access = await assertCanAccessStudentForDailyException(
    admin,
    actor,
    instituteId,
    input.studentId,
  );
  const serviceDate =
    input.serviceDate ?? (await resolveInstituteServiceDate(admin, instituteId));
  const row = await findActiveDailyException(
    admin,
    instituteId,
    input.studentId,
    serviceDate,
    "NOT_RIDING",
  );
  return {
    studentId: input.studentId,
    serviceDate,
    ridingToday: !row,
    exception: row ? await enrichException(admin, row, access) : null,
  };
}

export async function createDailyExceptionForActor(
  admin: SupabaseClient,
  actor: Actor,
  input: {
    instituteId: string;
    studentId: string;
    serviceDate?: string;
    exceptionType?: TransportDailyExceptionType;
    notes?: string | null;
  },
): Promise<TransportDailyExceptionDto> {
  const instituteId = requireInstituteId(actor, input.instituteId);
  const access = await assertCanAccessStudentForDailyException(
    admin,
    actor,
    instituteId,
    input.studentId,
  );

  if (isDriverForInstitute(actor, instituteId) && access !== "admin") {
    throw AppError.forbidden("Drivers cannot create Not Riding exceptions");
  }

  const student = await findStudentById(admin, input.studentId);
  if (!student || student.institute_id !== instituteId) {
    throw AppError.notFound("Student not found");
  }

  const exceptionType = input.exceptionType ?? "NOT_RIDING";
  const serviceDate =
    input.serviceDate ?? (await resolveInstituteServiceDate(admin, instituteId));
  const reason: TransportDailyExceptionReason =
    access === "admin" ? "admin" : "parent";

  const existing = await findActiveDailyException(
    admin,
    instituteId,
    input.studentId,
    serviceDate,
    exceptionType,
  );
  if (existing) {
    return enrichException(admin, existing, access);
  }

  const latest = await findLatestDailyExceptionAny(
    admin,
    instituteId,
    input.studentId,
    serviceDate,
    exceptionType,
  );
  if (latest?.cancelled_at) {
    const reactivated = await reactivateDailyException(admin, latest.id, {
      reason,
      notes: input.notes ?? null,
      createdByUserId: actor.userId,
    });
    if (!reactivated) throw AppError.internal("Failed to reactivate exception");
    if (exceptionType === "NOT_RIDING") {
      const { notifyNotRidingCreated } = await import("./ops-notifications.js");
      void notifyNotRidingCreated(admin, {
        instituteId,
        studentId: input.studentId,
        serviceDate,
        createdByUserId: actor.userId,
      });
    }
    return enrichException(admin, reactivated, access);
  }

  const row = await insertDailyException(admin, {
    instituteId,
    studentId: input.studentId,
    serviceDate,
    exceptionType,
    reason,
    notes: input.notes ?? null,
    createdByUserId: actor.userId,
  });
  if (exceptionType === "NOT_RIDING") {
    const { notifyNotRidingCreated } = await import("./ops-notifications.js");
    void notifyNotRidingCreated(admin, {
      instituteId,
      studentId: input.studentId,
      serviceDate,
      createdByUserId: actor.userId,
    });
  }
  return enrichException(admin, row, access);
}

export async function cancelDailyExceptionForActor(
  admin: SupabaseClient,
  actor: Actor,
  exceptionId: string,
): Promise<TransportDailyExceptionDto> {
  const row = await findDailyExceptionById(admin, exceptionId);
  if (!row || row.cancelled_at) {
    throw AppError.notFound("Daily exception not found");
  }

  const access = await assertCanAccessStudentForDailyException(
    admin,
    actor,
    row.institute_id,
    row.student_id,
  );

  if (access === "parent") {
    if (row.reason !== "parent") {
      throw AppError.forbidden("Only parent-declared exclusions can be undone here");
    }
    const enriched = await enrichException(admin, row, access);
    if (!enriched.canUndo) {
      throw AppError.conflict(
        "Undo cutoff has passed. Contact the school transport office.",
      );
    }
  }

  const cancelled = await cancelDailyException(admin, exceptionId);
  if (!cancelled) throw AppError.notFound("Daily exception not found");
  if (cancelled.exception_type === "NOT_RIDING") {
    const { notifyNotRidingCancelled } = await import("./ops-notifications.js");
    void notifyNotRidingCancelled(admin, {
      instituteId: cancelled.institute_id,
      studentId: cancelled.student_id,
      serviceDate: cancelled.service_date,
      createdByUserId: actor.userId,
    });
  }
  return enrichException(admin, cancelled, access);
}
