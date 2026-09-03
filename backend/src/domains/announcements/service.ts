import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "../../errors/app-error.js";
import { ensureDbOk } from "../../db/errors.js";
import type { Actor } from "../../auth/types.js";
import {
  assertInstituteAccess,
  assertInstituteRoles,
  actorHasInstituteRole,
  requireInstituteId,
} from "../../authorization/index.js";
import { listEnrollments, listEnrollmentsForStudents } from "../academics/repository.js";
import { listLinksForStudentIds } from "../parents/repository.js";
import { listGuardianStudentIds } from "../students/repository.js";
import { listMemberships } from "../activity/repository.js";
import { resolveActivityTeamRecipientUserIds } from "../activity/service.js";
import { emitNotificationForActor, emitNotificationForInstituteSystem } from "../notifications/service.js";
import type { NotificationAudience } from "../notifications/types.js";
import { createSystemWorkerActor } from "../jobs/system-actor.js";
import {
  findAnnouncementById,
  incrementAnnouncementViews,
  insertAnnouncement,
  listAnnouncements,
  listAllDueScheduledAnnouncements,
  listDueScheduledAnnouncements,
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

/** Teachers/coordinators may post activity-team scoped announcements. */
export const ACTIVITY_TEAM_ANNOUNCEMENT_WRITE_ROLES = [
  "institute_admin",
  "principal",
  "vice_principal",
  "coordinator",
  "it_admin",
  "staff",
  "teacher",
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
    activityTeamId: row.activity_team_id,
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
    case "activity_team": {
      if (!row.activity_team_id) return false;
      const linked = await resolveLinkedStudentIds(admin, actor, instituteId);
      if (linked.size === 0) return false;
      const memberships = await listMemberships(
        admin,
        instituteId,
        row.activity_team_id,
      );
      return memberships.some(
        (m) => m.status === "active" && linked.has(m.student_id),
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

function assertAudienceActivityTeam(
  scope: AnnouncementAudienceScope,
  activityTeamId: string | null | undefined,
): void {
  if (scope === "activity_team" && !activityTeamId) {
    throw AppError.validation("Referenced resource is invalid", {
      audience_scope: ["activity_team scope requires activity_team_id"],
    });
  }
}

function assertCanWriteAnnouncement(
  actor: Actor,
  instituteId: string,
  audienceScope: AnnouncementAudienceScope,
): void {
  const roles =
    audienceScope === "activity_team"
      ? ACTIVITY_TEAM_ANNOUNCEMENT_WRITE_ROLES
      : ANNOUNCEMENT_WRITE_ROLES;
  assertInstituteRoles(actor, instituteId, [...roles]);
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

function mapAnnouncementAudience(
  scope: AnnouncementAudienceScope,
): NotificationAudience {
  switch (scope) {
    case "students":
      return "students";
    case "parents":
      return "parents";
    case "teachers":
      return "teachers";
    case "all":
    case "classes":
    default:
      return "everyone";
  }
}

async function resolveClassAudienceUserIds(
  admin: SupabaseClient,
  instituteId: string,
  classId: string | null,
  sectionId: string | null,
): Promise<string[]> {
  const enrollments = await listEnrollments(admin, {
    instituteId,
    classId: classId ?? undefined,
    sectionId: sectionId ?? undefined,
    status: "active",
  });
  if (enrollments.length === 0) return [];

  const studentIds = [...new Set(enrollments.map((e) => e.student_id))];
  const studentResult = await admin
    .from("student")
    .select("id, user_profile_id")
    .eq("institute_id", instituteId)
    .in("id", studentIds)
    .is("deleted_at", null);
  if (studentResult.error) {
    ensureDbOk(studentResult);
  }
  const students = (studentResult.data ?? []) as Array<{
    id: string;
    user_profile_id: string | null;
  }>;

  const profileIds = new Set<string>();
  for (const s of students) {
    if (s.user_profile_id) profileIds.add(s.user_profile_id);
  }

  const links = await listLinksForStudentIds(admin, studentIds, instituteId);
  const parentIds = [...new Set(links.map((l) => l.parent_id))];
  if (parentIds.length > 0) {
    const parentResult = await admin
      .from("parent")
      .select("id, user_profile_id")
      .eq("institute_id", instituteId)
      .in("id", parentIds)
      .is("deleted_at", null);
    if (parentResult.error) {
      ensureDbOk(parentResult);
    }
    for (const p of (parentResult.data ?? []) as Array<{
      user_profile_id: string | null;
    }>) {
      if (p.user_profile_id) profileIds.add(p.user_profile_id);
    }
  }

  return [...profileIds];
}

async function fanOutAnnouncementNotification(
  admin: SupabaseClient,
  actor: Actor,
  row: AnnouncementRow,
  options?: { systemEmit?: boolean },
): Promise<void> {
  const body = (row.body ?? row.title).trim();
  if (!body) return;

  const deepLink = `/announcements/${row.id}`;
  const base = {
    instituteId: row.institute_id,
    category: "announcements" as const,
    priority: row.pinned ? ("important" as const) : ("normal" as const),
    title: row.title.trim(),
    body,
    deepLink,
    dedupeKey: `announcement:${row.id}`,
    payload: {
      announcementId: row.id,
      audienceScope: row.audience_scope,
      audienceLabel: row.audience_label,
    },
  };

  const emit = options?.systemEmit
    ? (input: Parameters<typeof emitNotificationForInstituteSystem>[2]) =>
        emitNotificationForInstituteSystem(admin, row.created_by_user_id, input)
    : (input: Parameters<typeof emitNotificationForActor>[2]) =>
        emitNotificationForActor(admin, actor, input);

  try {
    if (row.audience_scope === "classes") {
      const recipientUserIds = await resolveClassAudienceUserIds(
        admin,
        row.institute_id,
        row.class_id,
        row.section_id,
      );
      if (recipientUserIds.length === 0) return;
      await emit({
        ...base,
        recipientUserIds,
      });
      return;
    }

    if (row.audience_scope === "activity_team" && row.activity_team_id) {
      const recipientUserIds = await resolveActivityTeamRecipientUserIds(
        admin,
        row.institute_id,
        row.activity_team_id,
      );
      if (recipientUserIds.length === 0) return;
      await emit({
        ...base,
        recipientUserIds,
      });
      return;
    }

    await emit({
      ...base,
      audience: mapAnnouncementAudience(row.audience_scope),
    });
  } catch (err) {
    if (err instanceof AppError && err.status === 400) return;
    throw err;
  }
}

async function publishDueScheduledAnnouncements(
  admin: SupabaseClient,
  actor: Actor,
  instituteId: string,
): Promise<void> {
  const due = await listDueScheduledAnnouncements(
    admin,
    instituteId,
    new Date().toISOString(),
  );
  for (const row of due) {
    const updated = await updateAnnouncementFields(admin, row.id, {
      status: "published",
      published_at: new Date().toISOString(),
      scheduled_at: null,
      archived_at: null,
    });
    if (updated) {
      await fanOutAnnouncementNotification(admin, actor, updated, {
        systemEmit: true,
      });
    }
  }
}

/**
 * Background worker: publish all due scheduled announcements across institutes.
 * Does not require an interactive user session.
 */
export async function publishDueScheduledAnnouncementsSystem(
  admin: SupabaseClient,
  now: Date = new Date(),
): Promise<{ scanned: number; published: number }> {
  const due = await listAllDueScheduledAnnouncements(admin, now.toISOString());
  let published = 0;
  const systemActor = createSystemWorkerActor();

  for (const row of due) {
    const updated = await updateAnnouncementFields(admin, row.id, {
      status: "published",
      published_at: now.toISOString(),
      scheduled_at: null,
      archived_at: null,
    });
    if (!updated) continue;
    await fanOutAnnouncementNotification(admin, systemActor, updated, {
      systemEmit: true,
    });
    published += 1;
  }

  return { scanned: due.length, published };
}

export async function listAnnouncementsForActor(
  admin: SupabaseClient,
  actor: Actor,
  filter: ListAnnouncementsFilter,
): Promise<AnnouncementDto[]> {
  const instituteId = requireInstituteId(actor, filter.instituteId);
  await publishDueScheduledAnnouncements(admin, actor, instituteId);
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
  const audienceScope = input.audienceScope ?? "all";
  assertCanWriteAnnouncement(actor, instituteId, audienceScope);
  assertAudienceClasses(audienceScope, input.classId, input.sectionId);
  assertAudienceActivityTeam(audienceScope, input.activityTeamId);

  const title = assertTitle(input.title);
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
  if (status === "published") {
    await fanOutAnnouncementNotification(admin, actor, row);
  }
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
  const nextScope = input.audienceScope ?? existing.audience_scope;
  assertCanWriteAnnouncement(actor, existing.institute_id, nextScope);

  if (existing.status === "archived") {
    throw AppError.conflict("Archived announcements cannot be edited");
  }

  if (input.title !== undefined) assertTitle(input.title);

  const nextClass =
    input.classId !== undefined ? input.classId : existing.class_id;
  const nextSection =
    input.sectionId !== undefined ? input.sectionId : existing.section_id;
  const nextActivityTeam =
    input.activityTeamId !== undefined
      ? input.activityTeamId
      : existing.activity_team_id;
  assertAudienceClasses(nextScope, nextClass, nextSection);
  assertAudienceActivityTeam(nextScope, nextActivityTeam);

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
  await fanOutAnnouncementNotification(admin, actor, updated);
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

export async function recordAnnouncementViewForActor(
  admin: SupabaseClient,
  actor: Actor,
  id: string,
): Promise<AnnouncementDto> {
  const existing = await findAnnouncementById(admin, id);
  if (!existing) throw AppError.notFound("Announcement not found");
  await assertCanReadAnnouncement(admin, actor, existing);
  if (existing.status !== "published") {
    return toAnnouncementDto(existing);
  }
  const updated = await incrementAnnouncementViews(admin, id);
  if (!updated) throw AppError.notFound("Announcement not found");
  return toAnnouncementDto(updated);
}
