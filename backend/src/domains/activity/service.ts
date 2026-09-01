import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "../../errors/app-error.js";
import type { Actor } from "../../auth/types.js";
import {
  actorHasInstituteRole,
  requireInstituteId,
} from "../../authorization/index.js";
import {
  findStudentById,
  listGuardianStudentIds,
} from "../students/repository.js";
import { listLinksForStudentIds } from "../parents/repository.js";
import { ensureDbOk } from "../../db/errors.js";
import {
  findAchievementById,
  findActiveMembership,
  findMembershipById,
  findPracticeSessionById,
  findSectionById,
  findTeamById,
  insertAchievement,
  insertMembership,
  insertPracticeSession,
  insertSection,
  insertTeam,
  listAchievements,
  listMemberships,
  listPracticeSessions,
  listSections,
  listTeams,
  softDeleteAchievement,
  softDeleteMembership,
  softDeletePracticeSession,
  softDeleteSection,
  softDeleteTeam,
  updateAchievementFields,
  updateMembershipFields,
  updatePracticeSessionFields,
  updateSectionFields,
  updateTeamFields,
} from "./repository.js";
import type {
  AchievementDto,
  AchievementRow,
  ActivityMembershipDto,
  ActivityMembershipRow,
  ActivitySectionDto,
  ActivitySectionRow,
  ActivityTeamDto,
  ActivityTeamRow,
  CreateAchievementInput,
  CreateMembershipInput,
  CreatePracticeSessionInput,
  CreateSectionInput,
  CreateTeamInput,
  PracticeSessionDto,
  PracticeSessionRow,
  SportsCategory,
  UpdateAchievementInput,
  UpdateMembershipInput,
  UpdatePracticeSessionInput,
  UpdateSectionInput,
  UpdateTeamInput,
} from "./types.js";

export const ACTIVITY_WRITE_ROLES = [
  "institute_admin",
  "principal",
  "vice_principal",
  "coordinator",
  "it_admin",
  "staff",
  "teacher",
] as const;

export const ACTIVITY_STAFF_READ_ROLES = [
  "institute_admin",
  "principal",
  "vice_principal",
  "coordinator",
  "it_admin",
  "staff",
  "teacher",
  "accountant",
  "admissions_officer",
] as const;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}(:\d{2})?$/;

export function toSectionDto(row: ActivitySectionRow): ActivitySectionDto {
  return {
    id: row.id,
    instituteId: row.institute_id,
    domain: row.domain,
    sportsCategory: row.sports_category,
    name: row.name,
    slug: row.slug,
    description: row.description,
    status: row.status,
    createdByUserId: row.created_by_user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toTeamDto(row: ActivityTeamRow): ActivityTeamDto {
  return {
    id: row.id,
    instituteId: row.institute_id,
    sectionId: row.section_id,
    kind: row.kind,
    name: row.name,
    status: row.status,
    createdByUserId: row.created_by_user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toMembershipDto(
  row: ActivityMembershipRow,
): ActivityMembershipDto {
  return {
    id: row.id,
    instituteId: row.institute_id,
    teamId: row.team_id,
    studentId: row.student_id,
    role: row.role,
    status: row.status,
    joinedAt: row.joined_at,
    createdByUserId: row.created_by_user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toAchievementDto(row: AchievementRow): AchievementDto {
  return {
    id: row.id,
    instituteId: row.institute_id,
    studentId: row.student_id,
    sectionId: row.section_id,
    teamId: row.team_id,
    title: row.title,
    kind: row.kind,
    awardedOn: row.awarded_on,
    notes: row.notes,
    createdByUserId: row.created_by_user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toPracticeSessionDto(
  row: PracticeSessionRow,
): PracticeSessionDto {
  return {
    id: row.id,
    instituteId: row.institute_id,
    teamId: row.team_id,
    title: row.title,
    scheduledOn: row.scheduled_on,
    startTime: row.start_time,
    endTime: row.end_time,
    location: row.location,
    notes: row.notes,
    status: row.status,
    createdByUserId: row.created_by_user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function isWriter(actor: Actor, instituteId: string): boolean {
  if (actor.isPlatformOperator) return true;
  return ACTIVITY_WRITE_ROLES.some((role) =>
    actorHasInstituteRole(actor, instituteId, role),
  );
}

function isStaffReader(actor: Actor, instituteId: string): boolean {
  if (actor.isPlatformOperator) return true;
  return ACTIVITY_STAFF_READ_ROLES.some((role) =>
    actorHasInstituteRole(actor, instituteId, role),
  );
}

function isMember(actor: Actor, instituteId: string): boolean {
  return (
    actor.isPlatformOperator ||
    actor.memberships.some(
      (m) => m.instituteId === instituteId && m.status === "active",
    )
  );
}

function canReadSection(actor: Actor, row: ActivitySectionRow): boolean {
  if (!isMember(actor, row.institute_id)) return false;
  if (isStaffReader(actor, row.institute_id)) return true;
  return row.status === "active" || row.status === "archived";
}

async function canReadTeam(
  admin: SupabaseClient,
  actor: Actor,
  row: ActivityTeamRow,
): Promise<boolean> {
  if (!isMember(actor, row.institute_id)) return false;
  if (isStaffReader(actor, row.institute_id)) return true;
  const section = await findSectionById(admin, row.section_id);
  if (!section || section.deleted_at) return false;
  return section.status === "active" || section.status === "archived";
}

async function canAccessStudentRecord(
  admin: SupabaseClient,
  actor: Actor,
  instituteId: string,
  studentId: string,
): Promise<boolean> {
  if (isStaffReader(actor, instituteId)) return true;

  const student = await findStudentById(admin, studentId);
  if (!student || student.institute_id !== instituteId) return false;
  if (student.user_profile_id === actor.userId) return true;

  for (const p of actor.parents) {
    if (p.instituteId !== instituteId) continue;
    const linked = await listGuardianStudentIds(admin, p.parentId, instituteId);
    if (linked.includes(studentId)) return true;
  }
  return false;
}

async function canReadMembership(
  admin: SupabaseClient,
  actor: Actor,
  row: ActivityMembershipRow,
): Promise<boolean> {
  if (!isMember(actor, row.institute_id)) return false;
  return canAccessStudentRecord(admin, actor, row.institute_id, row.student_id);
}

async function canReadAchievement(
  admin: SupabaseClient,
  actor: Actor,
  row: AchievementRow,
): Promise<boolean> {
  if (!isMember(actor, row.institute_id)) return false;
  return canAccessStudentRecord(admin, actor, row.institute_id, row.student_id);
}

async function canReadPractice(
  admin: SupabaseClient,
  actor: Actor,
  row: PracticeSessionRow,
): Promise<boolean> {
  if (!isMember(actor, row.institute_id)) return false;
  const team = await findTeamById(admin, row.team_id);
  if (!team) return false;
  return canReadTeam(admin, actor, team);
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function assertDate(value: string, field: string): void {
  if (!DATE_RE.test(value)) {
    throw AppError.validation("Referenced resource is invalid", {
      [field]: ["Must be YYYY-MM-DD"],
    });
  }
}

function assertOptionalTime(
  value: string | null | undefined,
  field: string,
): void {
  if (value == null) return;
  if (!TIME_RE.test(value)) {
    throw AppError.validation("Referenced resource is invalid", {
      [field]: ["Must be HH:MM or HH:MM:SS"],
    });
  }
}

function normalizeSportsCategory(
  domain: "sports" | "eca",
  sportsCategory: string | null | undefined,
): SportsCategory | null {
  if (domain === "eca") {
    if (sportsCategory != null) {
      throw AppError.validation("Referenced resource is invalid", {
        sports_category: ["Must be null for eca domain"],
      });
    }
    return null;
  }
  if (sportsCategory !== "indoor" && sportsCategory !== "outdoor") {
    throw AppError.validation("Referenced resource is invalid", {
      sports_category: ["Required indoor or outdoor for sports domain"],
    });
  }
  return sportsCategory;
}

// ── Sections ─────────────────────────────────────────────────────

export async function listSectionsForActor(
  admin: SupabaseClient,
  actor: Actor,
  instituteIdRaw: string,
): Promise<ActivitySectionDto[]> {
  const instituteId = requireInstituteId(actor, instituteIdRaw);
  const rows = await listSections(admin, instituteId);
  return rows.filter((r) => canReadSection(actor, r)).map(toSectionDto);
}

export async function getSectionForActor(
  admin: SupabaseClient,
  actor: Actor,
  id: string,
): Promise<ActivitySectionDto> {
  const row = await findSectionById(admin, id);
  if (!row || !canReadSection(actor, row)) {
    throw AppError.notFound("Activity section not found");
  }
  return toSectionDto(row);
}

export async function createSectionForActor(
  admin: SupabaseClient,
  actor: Actor,
  input: CreateSectionInput,
): Promise<ActivitySectionDto> {
  const instituteId = requireInstituteId(actor, input.instituteId);
  if (!isWriter(actor, instituteId)) {
    throw AppError.forbidden("Insufficient activity write access");
  }
  const name = input.name.trim();
  const slug = (input.slug?.trim() || slugify(name)).trim();
  if (!name || !slug) {
    throw AppError.validation("Referenced resource is invalid", {
      name: ["Required"],
    });
  }
  const sportsCategory = normalizeSportsCategory(
    input.domain,
    input.sportsCategory,
  );
  const row = await insertSection(admin, {
    ...input,
    instituteId,
    name,
    slug,
    sportsCategory,
    createdByUserId: actor.userId,
    status: input.status ?? "draft",
  });
  return toSectionDto(row);
}

export async function updateSectionForActor(
  admin: SupabaseClient,
  actor: Actor,
  id: string,
  input: UpdateSectionInput,
): Promise<ActivitySectionDto> {
  const existing = await findSectionById(admin, id);
  if (!existing || !canReadSection(actor, existing)) {
    throw AppError.notFound("Activity section not found");
  }
  if (!isWriter(actor, existing.institute_id)) {
    throw AppError.notFound("Activity section not found");
  }
  const patch: Record<string, unknown> = {};
  if (input.name !== undefined) patch.name = input.name.trim();
  if (input.slug !== undefined) patch.slug = input.slug.trim();
  if (input.description !== undefined) {
    patch.description = input.description?.trim() || null;
  }
  if (input.status !== undefined) patch.status = input.status;
  if (input.sportsCategory !== undefined) {
    patch.sports_category = normalizeSportsCategory(
      existing.domain,
      input.sportsCategory,
    );
  }
  if (Object.keys(patch).length === 0) return toSectionDto(existing);
  const updated = await updateSectionFields(admin, id, patch);
  if (!updated) throw AppError.notFound("Activity section not found");
  return toSectionDto(updated);
}

export async function deleteSectionForActor(
  admin: SupabaseClient,
  actor: Actor,
  id: string,
): Promise<void> {
  const existing = await findSectionById(admin, id);
  if (!existing || !canReadSection(actor, existing)) {
    throw AppError.notFound("Activity section not found");
  }
  if (!isWriter(actor, existing.institute_id)) {
    throw AppError.notFound("Activity section not found");
  }
  if (existing.status === "active") {
    throw AppError.conflict("Archive section before deleting");
  }
  const deleted = await softDeleteSection(admin, id);
  if (!deleted) throw AppError.notFound("Activity section not found");
}

// ── Teams ────────────────────────────────────────────────────────

export async function listTeamsForActor(
  admin: SupabaseClient,
  actor: Actor,
  instituteIdRaw: string,
  sectionId?: string,
): Promise<ActivityTeamDto[]> {
  const instituteId = requireInstituteId(actor, instituteIdRaw);
  const rows = await listTeams(admin, instituteId, sectionId);
  const out: ActivityTeamDto[] = [];
  for (const r of rows) {
    if (await canReadTeam(admin, actor, r)) out.push(toTeamDto(r));
  }
  return out;
}

export async function getTeamForActor(
  admin: SupabaseClient,
  actor: Actor,
  id: string,
): Promise<ActivityTeamDto> {
  const row = await findTeamById(admin, id);
  if (!row || !(await canReadTeam(admin, actor, row))) {
    throw AppError.notFound("Activity team not found");
  }
  return toTeamDto(row);
}

export async function createTeamForActor(
  admin: SupabaseClient,
  actor: Actor,
  input: CreateTeamInput,
): Promise<ActivityTeamDto> {
  const instituteId = requireInstituteId(actor, input.instituteId);
  if (!isWriter(actor, instituteId)) {
    throw AppError.forbidden("Insufficient activity write access");
  }
  const section = await findSectionById(admin, input.sectionId);
  if (
    !section ||
    section.institute_id !== instituteId ||
    !canReadSection(actor, section)
  ) {
    throw AppError.validation("Referenced resource is invalid", {
      section_id: ["Section not found in this institute"],
    });
  }
  const name = input.name.trim();
  if (!name) {
    throw AppError.validation("Referenced resource is invalid", {
      name: ["Required"],
    });
  }
  const row = await insertTeam(admin, {
    ...input,
    instituteId,
    name,
    createdByUserId: actor.userId,
    status: input.status ?? "active",
  });
  return toTeamDto(row);
}

export async function updateTeamForActor(
  admin: SupabaseClient,
  actor: Actor,
  id: string,
  input: UpdateTeamInput,
): Promise<ActivityTeamDto> {
  const existing = await findTeamById(admin, id);
  if (!existing || !(await canReadTeam(admin, actor, existing))) {
    throw AppError.notFound("Activity team not found");
  }
  if (!isWriter(actor, existing.institute_id)) {
    throw AppError.notFound("Activity team not found");
  }
  const patch: Record<string, unknown> = {};
  if (input.name !== undefined) patch.name = input.name.trim();
  if (input.kind !== undefined) patch.kind = input.kind;
  if (input.status !== undefined) patch.status = input.status;
  if (Object.keys(patch).length === 0) return toTeamDto(existing);
  const updated = await updateTeamFields(admin, id, patch);
  if (!updated) throw AppError.notFound("Activity team not found");
  return toTeamDto(updated);
}

export async function deleteTeamForActor(
  admin: SupabaseClient,
  actor: Actor,
  id: string,
): Promise<void> {
  const existing = await findTeamById(admin, id);
  if (!existing || !(await canReadTeam(admin, actor, existing))) {
    throw AppError.notFound("Activity team not found");
  }
  if (!isWriter(actor, existing.institute_id)) {
    throw AppError.notFound("Activity team not found");
  }
  const deleted = await softDeleteTeam(admin, id);
  if (!deleted) throw AppError.notFound("Activity team not found");
}

// ── Memberships ──────────────────────────────────────────────────

export async function listMembershipsForActor(
  admin: SupabaseClient,
  actor: Actor,
  instituteIdRaw: string,
  teamId?: string,
): Promise<ActivityMembershipDto[]> {
  const instituteId = requireInstituteId(actor, instituteIdRaw);
  const rows = await listMemberships(admin, instituteId, teamId);
  const out: ActivityMembershipDto[] = [];
  for (const r of rows) {
    if (await canReadMembership(admin, actor, r)) out.push(toMembershipDto(r));
  }
  return out;
}

export async function createMembershipForActor(
  admin: SupabaseClient,
  actor: Actor,
  input: CreateMembershipInput,
): Promise<ActivityMembershipDto> {
  const instituteId = requireInstituteId(actor, input.instituteId);
  if (!isWriter(actor, instituteId)) {
    throw AppError.forbidden("Insufficient activity write access");
  }

  const team = await findTeamById(admin, input.teamId);
  if (
    !team ||
    team.institute_id !== instituteId ||
    !(await canReadTeam(admin, actor, team))
  ) {
    throw AppError.validation("Referenced resource is invalid", {
      team_id: ["Team not found in this institute"],
    });
  }

  const student = await findStudentById(admin, input.studentId);
  if (!student || student.institute_id !== instituteId) {
    throw AppError.validation("Referenced resource is invalid", {
      student_id: ["Student not found in this institute"],
    });
  }

  const existing = await findActiveMembership(
    admin,
    input.teamId,
    input.studentId,
  );
  if (existing) {
    throw AppError.conflict("Student already an active member of this team");
  }

  const row = await insertMembership(admin, {
    instituteId,
    teamId: input.teamId,
    studentId: input.studentId,
    role: input.role ?? "member",
    status: "active",
    createdByUserId: actor.userId,
  });
  return toMembershipDto(row);
}

export async function updateMembershipForActor(
  admin: SupabaseClient,
  actor: Actor,
  id: string,
  input: UpdateMembershipInput,
): Promise<ActivityMembershipDto> {
  const existing = await findMembershipById(admin, id);
  if (!existing || !(await canReadMembership(admin, actor, existing))) {
    throw AppError.notFound("Activity membership not found");
  }
  if (!isWriter(actor, existing.institute_id)) {
    throw AppError.notFound("Activity membership not found");
  }
  const patch: Record<string, unknown> = {};
  if (input.role !== undefined) patch.role = input.role;
  if (input.status !== undefined) patch.status = input.status;
  if (Object.keys(patch).length === 0) return toMembershipDto(existing);
  const updated = await updateMembershipFields(admin, id, patch);
  if (!updated) throw AppError.notFound("Activity membership not found");
  return toMembershipDto(updated);
}

export async function deleteMembershipForActor(
  admin: SupabaseClient,
  actor: Actor,
  id: string,
): Promise<void> {
  const existing = await findMembershipById(admin, id);
  if (!existing || !(await canReadMembership(admin, actor, existing))) {
    throw AppError.notFound("Activity membership not found");
  }
  if (!isWriter(actor, existing.institute_id)) {
    throw AppError.notFound("Activity membership not found");
  }
  const deleted = await softDeleteMembership(admin, id);
  if (!deleted) throw AppError.notFound("Activity membership not found");
}

// ── Achievements ─────────────────────────────────────────────────

export async function listAchievementsForActor(
  admin: SupabaseClient,
  actor: Actor,
  instituteIdRaw: string,
  studentId?: string,
): Promise<AchievementDto[]> {
  const instituteId = requireInstituteId(actor, instituteIdRaw);
  const rows = await listAchievements(admin, instituteId, studentId);
  const out: AchievementDto[] = [];
  for (const r of rows) {
    if (await canReadAchievement(admin, actor, r)) {
      out.push(toAchievementDto(r));
    }
  }
  return out;
}

export async function createAchievementForActor(
  admin: SupabaseClient,
  actor: Actor,
  input: CreateAchievementInput,
): Promise<AchievementDto> {
  const instituteId = requireInstituteId(actor, input.instituteId);
  if (!isWriter(actor, instituteId)) {
    throw AppError.forbidden("Insufficient activity write access");
  }

  const student = await findStudentById(admin, input.studentId);
  if (!student || student.institute_id !== instituteId) {
    throw AppError.validation("Referenced resource is invalid", {
      student_id: ["Student not found in this institute"],
    });
  }

  if (input.sectionId) {
    const section = await findSectionById(admin, input.sectionId);
    if (
      !section ||
      section.institute_id !== instituteId ||
      !canReadSection(actor, section)
    ) {
      throw AppError.validation("Referenced resource is invalid", {
        section_id: ["Section not found in this institute"],
      });
    }
  }

  if (input.teamId) {
    const team = await findTeamById(admin, input.teamId);
    if (
      !team ||
      team.institute_id !== instituteId ||
      !(await canReadTeam(admin, actor, team))
    ) {
      throw AppError.validation("Referenced resource is invalid", {
        team_id: ["Team not found in this institute"],
      });
    }
  }

  const title = input.title.trim();
  if (!title) {
    throw AppError.validation("Referenced resource is invalid", {
      title: ["Required"],
    });
  }
  assertDate(input.awardedOn, "awarded_on");

  const row = await insertAchievement(admin, {
    ...input,
    instituteId,
    title,
    kind: input.kind ?? "award",
    createdByUserId: actor.userId,
  });
  return toAchievementDto(row);
}

export async function updateAchievementForActor(
  admin: SupabaseClient,
  actor: Actor,
  id: string,
  input: UpdateAchievementInput,
): Promise<AchievementDto> {
  const existing = await findAchievementById(admin, id);
  if (!existing || !(await canReadAchievement(admin, actor, existing))) {
    throw AppError.notFound("Achievement not found");
  }
  if (!isWriter(actor, existing.institute_id)) {
    throw AppError.notFound("Achievement not found");
  }

  if (input.sectionId) {
    const section = await findSectionById(admin, input.sectionId);
    if (
      !section ||
      section.institute_id !== existing.institute_id ||
      !canReadSection(actor, section)
    ) {
      throw AppError.validation("Referenced resource is invalid", {
        section_id: ["Section not found in this institute"],
      });
    }
  }
  if (input.teamId) {
    const team = await findTeamById(admin, input.teamId);
    if (
      !team ||
      team.institute_id !== existing.institute_id ||
      !(await canReadTeam(admin, actor, team))
    ) {
      throw AppError.validation("Referenced resource is invalid", {
        team_id: ["Team not found in this institute"],
      });
    }
  }

  const patch: Record<string, unknown> = {};
  if (input.title !== undefined) patch.title = input.title.trim();
  if (input.kind !== undefined) patch.kind = input.kind;
  if (input.awardedOn !== undefined) {
    assertDate(input.awardedOn, "awarded_on");
    patch.awarded_on = input.awardedOn;
  }
  if (input.notes !== undefined) patch.notes = input.notes?.trim() || null;
  if (input.sectionId !== undefined) patch.section_id = input.sectionId;
  if (input.teamId !== undefined) patch.team_id = input.teamId;
  if (Object.keys(patch).length === 0) return toAchievementDto(existing);
  const updated = await updateAchievementFields(admin, id, patch);
  if (!updated) throw AppError.notFound("Achievement not found");
  return toAchievementDto(updated);
}

export async function deleteAchievementForActor(
  admin: SupabaseClient,
  actor: Actor,
  id: string,
): Promise<void> {
  const existing = await findAchievementById(admin, id);
  if (!existing || !(await canReadAchievement(admin, actor, existing))) {
    throw AppError.notFound("Achievement not found");
  }
  if (!isWriter(actor, existing.institute_id)) {
    throw AppError.notFound("Achievement not found");
  }
  const deleted = await softDeleteAchievement(admin, id);
  if (!deleted) throw AppError.notFound("Achievement not found");
}

// ── Practice sessions ────────────────────────────────────────────

export async function listPracticeSessionsForActor(
  admin: SupabaseClient,
  actor: Actor,
  instituteIdRaw: string,
  teamId?: string,
): Promise<PracticeSessionDto[]> {
  const instituteId = requireInstituteId(actor, instituteIdRaw);
  const rows = await listPracticeSessions(admin, instituteId, teamId);
  const out: PracticeSessionDto[] = [];
  for (const r of rows) {
    if (await canReadPractice(admin, actor, r)) {
      out.push(toPracticeSessionDto(r));
    }
  }
  return out;
}

export async function getPracticeSessionForActor(
  admin: SupabaseClient,
  actor: Actor,
  id: string,
): Promise<PracticeSessionDto> {
  const row = await findPracticeSessionById(admin, id);
  if (!row || !(await canReadPractice(admin, actor, row))) {
    throw AppError.notFound("Practice session not found");
  }
  return toPracticeSessionDto(row);
}

export async function createPracticeSessionForActor(
  admin: SupabaseClient,
  actor: Actor,
  input: CreatePracticeSessionInput,
): Promise<PracticeSessionDto> {
  const instituteId = requireInstituteId(actor, input.instituteId);
  if (!isWriter(actor, instituteId)) {
    throw AppError.forbidden("Insufficient activity write access");
  }

  const team = await findTeamById(admin, input.teamId);
  if (
    !team ||
    team.institute_id !== instituteId ||
    !(await canReadTeam(admin, actor, team))
  ) {
    throw AppError.validation("Referenced resource is invalid", {
      team_id: ["Team not found in this institute"],
    });
  }

  const title = input.title.trim();
  if (!title) {
    throw AppError.validation("Referenced resource is invalid", {
      title: ["Required"],
    });
  }
  assertDate(input.scheduledOn, "scheduled_on");
  assertOptionalTime(input.startTime, "start_time");
  assertOptionalTime(input.endTime, "end_time");

  const row = await insertPracticeSession(admin, {
    ...input,
    instituteId,
    title,
    createdByUserId: actor.userId,
    status: input.status ?? "scheduled",
  });
  return toPracticeSessionDto(row);
}

export async function updatePracticeSessionForActor(
  admin: SupabaseClient,
  actor: Actor,
  id: string,
  input: UpdatePracticeSessionInput,
): Promise<PracticeSessionDto> {
  const existing = await findPracticeSessionById(admin, id);
  if (!existing || !(await canReadPractice(admin, actor, existing))) {
    throw AppError.notFound("Practice session not found");
  }
  if (!isWriter(actor, existing.institute_id)) {
    throw AppError.notFound("Practice session not found");
  }
  const patch: Record<string, unknown> = {};
  if (input.title !== undefined) patch.title = input.title.trim();
  if (input.scheduledOn !== undefined) {
    assertDate(input.scheduledOn, "scheduled_on");
    patch.scheduled_on = input.scheduledOn;
  }
  if (input.startTime !== undefined) {
    assertOptionalTime(input.startTime, "start_time");
    patch.start_time = input.startTime;
  }
  if (input.endTime !== undefined) {
    assertOptionalTime(input.endTime, "end_time");
    patch.end_time = input.endTime;
  }
  if (input.location !== undefined) {
    patch.location = input.location?.trim() || null;
  }
  if (input.notes !== undefined) patch.notes = input.notes?.trim() || null;
  if (input.status !== undefined) patch.status = input.status;
  if (Object.keys(patch).length === 0) return toPracticeSessionDto(existing);
  const updated = await updatePracticeSessionFields(admin, id, patch);
  if (!updated) throw AppError.notFound("Practice session not found");
  return toPracticeSessionDto(updated);
}

export async function deletePracticeSessionForActor(
  admin: SupabaseClient,
  actor: Actor,
  id: string,
): Promise<void> {
  const existing = await findPracticeSessionById(admin, id);
  if (!existing || !(await canReadPractice(admin, actor, existing))) {
    throw AppError.notFound("Practice session not found");
  }
  if (!isWriter(actor, existing.institute_id)) {
    throw AppError.notFound("Practice session not found");
  }
  const deleted = await softDeletePracticeSession(admin, id);
  if (!deleted) throw AppError.notFound("Practice session not found");
}

export async function resolveActivityTeamRecipientUserIds(
  admin: SupabaseClient,
  instituteId: string,
  activityTeamId: string,
): Promise<string[]> {
  const memberships = await listMemberships(admin, instituteId, activityTeamId);
  const studentIds = [
    ...new Set(
      memberships.filter((m) => m.status === "active").map((m) => m.student_id),
    ),
  ];
  if (studentIds.length === 0) return [];

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

export type ActivityTeamRecipientsDto = {
  teamId: string;
  recipientUserIds: string[];
};

export async function getTeamRecipientsForActor(
  admin: SupabaseClient,
  actor: Actor,
  teamId: string,
): Promise<ActivityTeamRecipientsDto> {
  const team = await findTeamById(admin, teamId);
  if (!team || !(await canReadTeam(admin, actor, team))) {
    throw AppError.notFound("Activity team not found");
  }
  if (!isWriter(actor, team.institute_id)) {
    throw AppError.forbidden("Insufficient activity write access");
  }
  const recipientUserIds = await resolveActivityTeamRecipientUserIds(
    admin,
    team.institute_id,
    teamId,
  );
  return { teamId, recipientUserIds };
}
