import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "../../errors/app-error.js";
import type { Actor } from "../../auth/types.js";
import {
  assertInstituteAccess,
  assertInstituteRoles,
  actorHasInstituteRole,
  requireInstituteId,
} from "../../authorization/index.js";
import { listEnrollmentsForStudents } from "../academics/repository.js";
import { listGuardianStudentIds } from "../students/repository.js";
import {
  findEventById,
  insertEvent,
  listCalendarEvents,
  listEvents,
  softDeleteEvent,
  toEventUpdatePatch,
  updateEventFields,
} from "./repository.js";
import type {
  CancelEventInput,
  CreateEventInput,
  EventDto,
  EventRow,
  ListEventsFilter,
  UpdateEventInput,
} from "./types.js";
import {
  emitEventCancelledNotifications,
  emitEventPublishedNotifications,
  emitEventUpdatedNotifications,
} from "./notifications.js";

export const EVENT_WRITE_ROLES = [
  "institute_admin",
  "principal",
  "vice_principal",
  "coordinator",
  "it_admin",
] as const;

export const EVENT_STAFF_READ_ROLES = [
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

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}(:\d{2})?$/;

export function toEventDto(row: EventRow): EventDto {
  return {
    id: row.id,
    instituteId: row.institute_id,
    title: row.title,
    kind: row.kind,
    customKindLabel: row.custom_kind_label,
    source: row.source,
    startsOn: row.starts_on,
    endsOn: row.ends_on,
    startTime: row.start_time,
    endTime: row.end_time,
    audienceScope: row.audience_scope,
    audienceLabel: row.audience_label,
    classId: row.class_id,
    sectionId: row.section_id,
    location: row.location,
    description: row.description,
    reminder: row.reminder,
    bannerAssetPath: row.banner_asset_path,
    registrationRequired: row.registration_required,
    recurrence: row.recurrence,
    rsvpCount: row.rsvp_count,
    published: row.published,
    publishedAt: row.published_at,
    cancelled: row.cancelled,
    cancellationReason: row.cancellation_reason,
    cancelledAt: row.cancelled_at,
    createdByUserId: row.created_by_user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function isStaffReader(actor: Actor, instituteId: string): boolean {
  if (actor.isPlatformOperator) return true;
  return EVENT_STAFF_READ_ROLES.some((role) =>
    actorHasInstituteRole(actor, instituteId, role),
  );
}

async function resolveLinkedStudentIds(
  admin: SupabaseClient,
  actor: Actor,
  instituteId: string,
): Promise<Set<string>> {
  const ids = new Set<string>();
  for (const s of actor.students) {
    if (s.instituteId === instituteId) ids.add(s.studentId);
  }
  for (const p of actor.parents) {
    if (p.instituteId !== instituteId) continue;
    const linked = await listGuardianStudentIds(admin, p.parentId, instituteId);
    for (const sid of linked) ids.add(sid);
  }
  return ids;
}

async function actorMatchesAudience(
  admin: SupabaseClient,
  actor: Actor,
  row: EventRow,
): Promise<boolean> {
  const instituteId = row.institute_id;

  switch (row.audience_scope) {
    case "all":
      return true;
    case "students": {
      const linked = await resolveLinkedStudentIds(admin, actor, instituteId);
      return linked.size > 0;
    }
    case "parents":
      return actor.parents.some((p) => p.instituteId === instituteId);
    case "teachers":
      return (
        actorHasInstituteRole(actor, instituteId, "teacher") ||
        actor.teachers.some((t) => t.instituteId === instituteId)
      );
    case "classes": {
      if (!row.class_id && !row.section_id) return false;
      const linked = await resolveLinkedStudentIds(admin, actor, instituteId);
      if (linked.size === 0) return false;
      const enrollments = await listEnrollmentsForStudents(admin, instituteId, [
        ...linked,
      ]);
      return enrollments.some(
        (e) =>
          (row.class_id == null || e.class_id === row.class_id) &&
          (row.section_id == null || e.section_id === row.section_id),
      );
    }
    default:
      return false;
  }
}

async function assertCanReadEvent(
  admin: SupabaseClient,
  actor: Actor,
  row: EventRow,
): Promise<void> {
  assertInstituteAccess(actor, row.institute_id);
  if (isStaffReader(actor, row.institute_id)) return;
  if (!row.published || row.cancelled) {
    throw AppError.forbidden("Insufficient event access");
  }
  if (!(await actorMatchesAudience(admin, actor, row))) {
    throw AppError.forbidden("Insufficient event access");
  }
}

function isInstituteDriver(actor: Actor, instituteId: string): boolean {
  return actorHasInstituteRole(actor, instituteId, "driver");
}

async function filterLearnerVisible(
  admin: SupabaseClient,
  rows: EventRow[],
  actor: Actor,
  instituteId: string,
): Promise<EventRow[]> {
  if (isStaffReader(actor, instituteId)) return rows;
  if (isInstituteDriver(actor, instituteId)) {
    return rows.filter((row) => row.published && !row.cancelled);
  }
  const out: EventRow[] = [];
  for (const row of rows) {
    if (!row.published || row.cancelled) continue;
    if (await actorMatchesAudience(admin, actor, row)) out.push(row);
  }
  return out;
}

function assertDate(value: string, field: string): void {
  if (!DATE_RE.test(value)) {
    throw AppError.validation("Referenced resource is invalid", {
      [field]: ["Must be YYYY-MM-DD"],
    });
  }
}

function assertOptionalTime(value: string | null | undefined, field: string): void {
  if (value == null) return;
  if (!TIME_RE.test(value)) {
    throw AppError.validation("Referenced resource is invalid", {
      [field]: ["Must be HH:MM or HH:MM:SS"],
    });
  }
}

function assertDateRange(
  startsOn: string,
  endsOn: string | null | undefined,
): void {
  assertDate(startsOn, "starts_on");
  if (endsOn != null) {
    assertDate(endsOn, "ends_on");
    if (endsOn < startsOn) {
      throw AppError.validation("Referenced resource is invalid", {
        ends_on: ["Must be on or after starts_on"],
      });
    }
  }
}

function normalizeCreateInput(input: CreateEventInput): CreateEventInput {
  const title = input.title.trim();
  if (!title) {
    throw AppError.validation("Referenced resource is invalid", {
      title: ["Title is required"],
    });
  }

  assertDateRange(input.startsOn, input.endsOn);
  assertOptionalTime(input.startTime, "start_time");
  assertOptionalTime(input.endTime, "end_time");

  if (input.kind === "custom") {
    const label = input.customKindLabel?.trim();
    if (!label) {
      throw AppError.validation("Referenced resource is invalid", {
        custom_kind_label: ["Required when kind is custom"],
      });
    }
    return { ...input, title, customKindLabel: label };
  }

  return { ...input, title, customKindLabel: null };
}

export async function listEventsForActor(
  admin: SupabaseClient,
  actor: Actor,
  filter: ListEventsFilter,
): Promise<EventDto[]> {
  const instituteId = requireInstituteId(actor, filter.instituteId);
  const rows = await listEvents(admin, {
    ...filter,
    instituteId,
    includeCancelled: isStaffReader(actor, instituteId)
      ? filter.includeCancelled
      : false,
  });
  const visible = await filterLearnerVisible(admin, rows, actor, instituteId);
  return visible.map(toEventDto);
}

export async function listCalendarEventsForActor(
  admin: SupabaseClient,
  actor: Actor,
  filter: Omit<ListEventsFilter, "source" | "includeCancelled">,
): Promise<EventDto[]> {
  const instituteId = requireInstituteId(actor, filter.instituteId);
  const rows = await listCalendarEvents(admin, { ...filter, instituteId });
  const visible = await filterLearnerVisible(admin, rows, actor, instituteId);
  return visible.map(toEventDto);
}

export async function getEventForActor(
  admin: SupabaseClient,
  actor: Actor,
  id: string,
): Promise<EventDto> {
  const row = await findEventById(admin, id);
  if (!row) throw AppError.notFound("Event not found");
  await assertCanReadEvent(admin, actor, row);
  return toEventDto(row);
}

export async function createEventForActor(
  admin: SupabaseClient,
  actor: Actor,
  input: CreateEventInput,
): Promise<EventDto> {
  const instituteId = requireInstituteId(actor, input.instituteId);
  assertInstituteRoles(actor, instituteId, [...EVENT_WRITE_ROLES]);
  const normalized = normalizeCreateInput(input);

  const row = await insertEvent(admin, {
    ...normalized,
    instituteId,
    createdByUserId: actor.userId,
  });
  return toEventDto(row);
}

export async function updateEventForActor(
  admin: SupabaseClient,
  actor: Actor,
  id: string,
  input: UpdateEventInput,
): Promise<EventDto> {
  const existing = await findEventById(admin, id);
  if (!existing) throw AppError.notFound("Event not found");
  assertInstituteAccess(actor, existing.institute_id);
  assertInstituteRoles(actor, existing.institute_id, [...EVENT_WRITE_ROLES]);

  if (existing.cancelled) {
    throw AppError.conflict("Cancelled events cannot be edited");
  }

  const nextKind = input.kind ?? existing.kind;
  const nextCustom =
    input.customKindLabel !== undefined
      ? input.customKindLabel
      : existing.custom_kind_label;
  const nextStarts = input.startsOn ?? existing.starts_on;
  const nextEnds =
    input.endsOn !== undefined ? input.endsOn : existing.ends_on;

  assertDateRange(nextStarts, nextEnds);
  assertOptionalTime(
    input.startTime !== undefined ? input.startTime : existing.start_time,
    "start_time",
  );
  assertOptionalTime(
    input.endTime !== undefined ? input.endTime : existing.end_time,
    "end_time",
  );

  if (input.title !== undefined && !input.title.trim()) {
    throw AppError.validation("Referenced resource is invalid", {
      title: ["Title is required"],
    });
  }

  if (nextKind === "custom") {
    const label = nextCustom?.trim();
    if (!label) {
      throw AppError.validation("Referenced resource is invalid", {
        custom_kind_label: ["Required when kind is custom"],
      });
    }
  }

  const patch = toEventUpdatePatch({
    ...input,
    customKindLabel:
      nextKind === "custom"
        ? (nextCustom?.trim() ?? null)
        : null,
  });

  if (Object.keys(patch).length === 0) {
    return toEventDto(existing);
  }

  const updated = await updateEventFields(admin, id, patch);
  if (!updated) throw AppError.notFound("Event not found");
  if (existing.published && !existing.cancelled) {
    const changes: string[] = [];
    if (input.startsOn !== undefined && input.startsOn !== existing.starts_on) {
      changes.push("date/time");
    }
    if (input.title !== undefined && input.title.trim() !== existing.title) {
      changes.push("title");
    }
    if (input.location !== undefined && input.location !== existing.location) {
      changes.push("venue");
    }
    if (changes.length > 0) {
      await emitEventUpdatedNotifications(
        admin,
        actor.userId,
        updated,
        changes.join(", "),
      );
    }
  }
  return toEventDto(updated);
}

export async function publishEventForActor(
  admin: SupabaseClient,
  actor: Actor,
  id: string,
): Promise<EventDto> {
  const existing = await findEventById(admin, id);
  if (!existing) throw AppError.notFound("Event not found");
  assertInstituteAccess(actor, existing.institute_id);
  assertInstituteRoles(actor, existing.institute_id, [...EVENT_WRITE_ROLES]);

  if (existing.cancelled) {
    throw AppError.conflict("Cancelled events cannot be published");
  }
  if (existing.published) {
    return toEventDto(existing);
  }

  const updated = await updateEventFields(admin, id, {
    published: true,
    published_at: new Date().toISOString(),
  });
  if (!updated) throw AppError.notFound("Event not found");
  await emitEventPublishedNotifications(admin, actor.userId, updated);
  return toEventDto(updated);
}

export async function cancelEventForActor(
  admin: SupabaseClient,
  actor: Actor,
  id: string,
  input: CancelEventInput,
): Promise<EventDto> {
  const existing = await findEventById(admin, id);
  if (!existing) throw AppError.notFound("Event not found");
  assertInstituteAccess(actor, existing.institute_id);
  assertInstituteRoles(actor, existing.institute_id, [...EVENT_WRITE_ROLES]);

  if (existing.cancelled) {
    return toEventDto(existing);
  }

  const reason = input.cancellationReason?.trim() || null;
  const updated = await updateEventFields(admin, id, {
    cancelled: true,
    cancellation_reason: reason,
    cancelled_at: new Date().toISOString(),
    published: false,
  });
  if (!updated) throw AppError.notFound("Event not found");
  await emitEventCancelledNotifications(admin, actor.userId, updated);
  return toEventDto(updated);
}

export async function deleteEventForActor(
  admin: SupabaseClient,
  actor: Actor,
  id: string,
): Promise<void> {
  const existing = await findEventById(admin, id);
  if (!existing) throw AppError.notFound("Event not found");
  assertInstituteAccess(actor, existing.institute_id);
  assertInstituteRoles(actor, existing.institute_id, [...EVENT_WRITE_ROLES]);

  if (existing.published && !existing.cancelled) {
    throw AppError.conflict("Published events must be cancelled before delete");
  }

  const deleted = await softDeleteEvent(admin, id);
  if (!deleted) throw AppError.notFound("Event not found");

  const { recordEntitySoftDeleteInRecycleBin } = await import(
    "../recycle/on-soft-delete.js"
  );
  await recordEntitySoftDeleteInRecycleBin(admin, actor, {
    instituteId: existing.institute_id,
    entityKind: "event",
    entityId: id,
    module: "Events",
    title: existing.title?.trim() || "Event",
    subtitle: existing.starts_on,
  });
}
