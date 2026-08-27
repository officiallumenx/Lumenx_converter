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
  findAnnouncementById,
  insertAnnouncement,
  listAnnouncements,
  softDeleteAnnouncement,
  toAnnouncementUpdatePatch,
  updateAnnouncementFields,
} from "./repository.js";
import type {
  AnnouncementAudienceScope,
  AnnouncementDto,
  AnnouncementRow,
  AnnouncementStatus,
  CreateAnnouncementInput,
  ListAnnouncementsFilter,
  UpdateAnnouncementInput,
} from "./types.js";

export const ANNOUNCEMENT_WRITE_ROLES = [
  "institute_admin",
  "principal",
  "vice_principal",
  "coordinator",
  "it_admin",
] as const;

export const ANNOUNCEMENT_STAFF_READ_ROLES = [
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

export function toAnnouncementDto(row: AnnouncementRow): AnnouncementDto {
  return {
    id: row.id,
    instituteId: row.institute_id,
    title: row.title,
    body: row.body,
    audienceScope: row.audience_scope,
    audienceLabel: row.audience_label,
    classId: row.class_id,
    sectionId: row.section_id,
    status: row.status,
    scheduledAt: row.scheduled_at,
    publishedAt: row.published_at,
    archivedAt: row.archived_at,
    pinned: row.pinned,
    pinUntil: row.pin_until,
    views: row.views,
    createdByUserId: row.created_by_user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function isStaffReader(actor: Actor, instituteId: string): boolean {
  if (actor.isPlatformOperator) return true;
  return ANNOUNCEMENT_STAFF_READ_ROLES.some((role) =>
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
  row: AnnouncementRow,
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

async function assertCanReadAnnouncement(
  admin: SupabaseClient,
  actor: Actor,
  row: AnnouncementRow,
): Promise<void> {
  assertInstituteAccess(actor, row.institute_id);
  if (isStaffReader(actor, row.institute_id)) return;
  if (row.status !== "published") {
    throw AppError.forbidden("Insufficient announcement access");
  }
  if (!(await actorMatchesAudience(admin, actor, row))) {
    throw AppError.forbidden("Insufficient announcement access");
  }
}

async function filterLearnerVisible(
  admin: SupabaseClient,
  rows: AnnouncementRow[],
  actor: Actor,
  instituteId: string,
): Promise<AnnouncementRow[]> {
  if (isStaffReader(actor, instituteId)) return rows;
  const out: AnnouncementRow[] = [];
  for (const row of rows) {
    if (row.status !== "published") continue;
    if (await actorMatchesAudience(admin, actor, row)) out.push(row);
  }
  return out;
}

function assertAudienceClasses(
  scope: AnnouncementAudienceScope,
  classId: string | null | undefined,
  sectionId: string | null | undefined,
): void {
  if (scope === "classes" && !classId && !sectionId) {
    throw AppError.validation("Referenced resource is invalid", {
      audience_scope: ["classes scope requires class_id or section_id"],
    });
  }
}

function assertTitle(title: string): string {
  const trimmed = title.trim();
  if (!trimmed) {
    throw AppError.validation("Referenced resource is invalid", {
      title: ["Title is required"],
    });
  }
  return trimmed;
}

export async function listAnnouncementsForActor(
  admin: SupabaseClient,
  actor: Actor,
  filter: ListAnnouncementsFilter,
): Promise<AnnouncementDto[]> {
  const instituteId = requireInstituteId(actor, filter.instituteId);
  const rows = await listAnnouncements(admin, {
    ...filter,
    instituteId,
    status: isStaffReader(actor, instituteId) ? filter.status : "published",
  });
  const visible = await filterLearnerVisible(admin, rows, actor, instituteId);
  return visible.map(toAnnouncementDto);
}

export async function getAnnouncementForActor(
  admin: SupabaseClient,
  actor: Actor,
  id: string,
): Promise<AnnouncementDto> {
  const row = await findAnnouncementById(admin, id);
  if (!row) throw AppError.notFound("Announcement not found");
  await assertCanReadAnnouncement(admin, actor, row);
  return toAnnouncementDto(row);
}

export async function createAnnouncementForActor(
  admin: SupabaseClient,
  actor: Actor,
  input: CreateAnnouncementInput,
): Promise<AnnouncementDto> {
  const instituteId = requireInstituteId(actor, input.instituteId);
  assertInstituteRoles(actor, instituteId, [...ANNOUNCEMENT_WRITE_ROLES]);

  const title = assertTitle(input.title);
  const audienceScope = input.audienceScope ?? "all";
  assertAudienceClasses(audienceScope, input.classId, input.sectionId);

  let status: AnnouncementStatus = "draft";
  let scheduledAt: string | null = null;
  let publishedAt: string | null = null;

  if (input.publishNow) {
    status = "published";
    publishedAt = new Date().toISOString();
  } else if (input.scheduledAt) {
    status = "scheduled";
    scheduledAt = input.scheduledAt;
  }

  const row = await insertAnnouncement(admin, {
    ...input,
    instituteId,
    title,
    audienceScope,
    createdByUserId: actor.userId,
    status,
    scheduledAt,
    publishedAt,
  });
  return toAnnouncementDto(row);
}

export async function updateAnnouncementForActor(
  admin: SupabaseClient,
  actor: Actor,
  id: string,
  input: UpdateAnnouncementInput,
): Promise<AnnouncementDto> {
  const existing = await findAnnouncementById(admin, id);
  if (!existing) throw AppError.notFound("Announcement not found");
  assertInstituteAccess(actor, existing.institute_id);
  assertInstituteRoles(actor, existing.institute_id, [...ANNOUNCEMENT_WRITE_ROLES]);

  if (existing.status === "archived") {
    throw AppError.conflict("Archived announcements cannot be edited");
  }

  if (input.title !== undefined) assertTitle(input.title);

  const nextScope = input.audienceScope ?? existing.audience_scope;
  const nextClass =
    input.classId !== undefined ? input.classId : existing.class_id;
  const nextSection =
    input.sectionId !== undefined ? input.sectionId : existing.section_id;
  assertAudienceClasses(nextScope, nextClass, nextSection);

  const patch = toAnnouncementUpdatePatch(input);

  // Re-scheduling a draft/scheduled row
  if (input.scheduledAt !== undefined && existing.status !== "published") {
    if (input.scheduledAt) {
      patch.status = "scheduled";
      patch.published_at = null;
      patch.archived_at = null;
    } else if (existing.status === "scheduled") {
      patch.status = "draft";
      patch.scheduled_at = null;
    }
  }

  if (Object.keys(patch).length === 0) {
    return toAnnouncementDto(existing);
  }

  const updated = await updateAnnouncementFields(admin, id, patch);
  if (!updated) throw AppError.notFound("Announcement not found");
  return toAnnouncementDto(updated);
}

export async function publishAnnouncementForActor(
  admin: SupabaseClient,
  actor: Actor,
  id: string,
): Promise<AnnouncementDto> {
  const existing = await findAnnouncementById(admin, id);
  if (!existing) throw AppError.notFound("Announcement not found");
  assertInstituteAccess(actor, existing.institute_id);
  assertInstituteRoles(actor, existing.institute_id, [...ANNOUNCEMENT_WRITE_ROLES]);

  if (existing.status === "archived") {
    throw AppError.conflict("Archived announcements cannot be published");
  }
  if (existing.status === "published") {
    return toAnnouncementDto(existing);
  }

  const updated = await updateAnnouncementFields(admin, id, {
    status: "published",
    published_at: new Date().toISOString(),
    scheduled_at: null,
    archived_at: null,
  });
  if (!updated) throw AppError.notFound("Announcement not found");
  return toAnnouncementDto(updated);
}

export async function archiveAnnouncementForActor(
  admin: SupabaseClient,
  actor: Actor,
  id: string,
): Promise<AnnouncementDto> {
  const existing = await findAnnouncementById(admin, id);
  if (!existing) throw AppError.notFound("Announcement not found");
  assertInstituteAccess(actor, existing.institute_id);
  assertInstituteRoles(actor, existing.institute_id, [...ANNOUNCEMENT_WRITE_ROLES]);

  if (existing.status === "archived") {
    return toAnnouncementDto(existing);
  }

  const updated = await updateAnnouncementFields(admin, id, {
    status: "archived",
    archived_at: new Date().toISOString(),
    pinned: false,
  });
  if (!updated) throw AppError.notFound("Announcement not found");
  return toAnnouncementDto(updated);
}

export async function deleteAnnouncementForActor(
  admin: SupabaseClient,
  actor: Actor,
  id: string,
): Promise<void> {
  const existing = await findAnnouncementById(admin, id);
  if (!existing) throw AppError.notFound("Announcement not found");
  assertInstituteAccess(actor, existing.institute_id);
  assertInstituteRoles(actor, existing.institute_id, [...ANNOUNCEMENT_WRITE_ROLES]);

  if (existing.status === "published") {
    throw AppError.conflict(
      "Published announcements must be archived before delete",
    );
  }

  const deleted = await softDeleteAnnouncement(admin, id);
  if (!deleted) throw AppError.notFound("Announcement not found");
}
