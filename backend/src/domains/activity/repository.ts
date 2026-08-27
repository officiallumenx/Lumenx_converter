import type { SupabaseClient } from "@supabase/supabase-js";
import { ensureDbOk } from "../../db/errors.js";
import type {
  AchievementRow,
  ActivityMembershipRole,
  ActivityMembershipRow,
  ActivityMembershipStatus,
  ActivitySectionRow,
  ActivitySectionStatus,
  ActivityTeamRow,
  ActivityTeamStatus,
  CreateAchievementInput,
  CreateMembershipInput,
  CreatePracticeSessionInput,
  CreateSectionInput,
  CreateTeamInput,
  PracticeSessionRow,
  PracticeSessionStatus,
  SportsCategory,
} from "./types.js";

export const SECTION_COLS =
  "id, institute_id, domain, sports_category, name, slug, description, status, created_by_user_id, created_at, updated_at, deleted_at";
export const TEAM_COLS =
  "id, institute_id, section_id, kind, name, status, created_by_user_id, created_at, updated_at, deleted_at";
export const MEMBERSHIP_COLS =
  "id, institute_id, team_id, student_id, role, status, joined_at, created_by_user_id, created_at, updated_at, deleted_at";
export const ACHIEVEMENT_COLS =
  "id, institute_id, student_id, section_id, team_id, title, kind, awarded_on, notes, created_by_user_id, created_at, updated_at, deleted_at";
export const PRACTICE_COLS =
  "id, institute_id, team_id, title, scheduled_on, start_time, end_time, location, notes, status, created_by_user_id, created_at, updated_at, deleted_at";

// ── Sections ─────────────────────────────────────────────────────

export async function listSections(
  admin: SupabaseClient,
  instituteId: string,
): Promise<ActivitySectionRow[]> {
  const result = await admin
    .from("activity_section")
    .select(SECTION_COLS)
    .eq("institute_id", instituteId)
    .is("deleted_at", null);
  return ensureDbOk(result) as ActivitySectionRow[];
}

export async function findSectionById(
  admin: SupabaseClient,
  id: string,
): Promise<ActivitySectionRow | null> {
  const result = await admin
    .from("activity_section")
    .select(SECTION_COLS)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as ActivitySectionRow | null) ?? null;
}

export async function insertSection(
  admin: SupabaseClient,
  input: CreateSectionInput & {
    createdByUserId: string;
    status: ActivitySectionStatus;
    sportsCategory: SportsCategory | null;
  },
): Promise<ActivitySectionRow> {
  const result = await admin
    .from("activity_section")
    .insert({
      institute_id: input.instituteId,
      domain: input.domain,
      sports_category: input.sportsCategory,
      name: input.name.trim(),
      slug: input.slug!.trim(),
      description: input.description?.trim() || null,
      status: input.status,
      created_by_user_id: input.createdByUserId,
    })
    .select(SECTION_COLS)
    .single();
  return ensureDbOk(result) as ActivitySectionRow;
}

export async function updateSectionFields(
  admin: SupabaseClient,
  id: string,
  patch: Record<string, unknown>,
): Promise<ActivitySectionRow | null> {
  const result = await admin
    .from("activity_section")
    .update(patch)
    .eq("id", id)
    .is("deleted_at", null)
    .select(SECTION_COLS)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as ActivitySectionRow | null) ?? null;
}

export async function softDeleteSection(
  admin: SupabaseClient,
  id: string,
): Promise<ActivitySectionRow | null> {
  const result = await admin
    .from("activity_section")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .is("deleted_at", null)
    .select(SECTION_COLS)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as ActivitySectionRow | null) ?? null;
}

// ── Teams ────────────────────────────────────────────────────────

export async function listTeams(
  admin: SupabaseClient,
  instituteId: string,
  sectionId?: string,
): Promise<ActivityTeamRow[]> {
  let query = admin
    .from("activity_team")
    .select(TEAM_COLS)
    .eq("institute_id", instituteId)
    .is("deleted_at", null);
  if (sectionId) query = query.eq("section_id", sectionId);
  const result = await query;
  return ensureDbOk(result) as ActivityTeamRow[];
}

export async function findTeamById(
  admin: SupabaseClient,
  id: string,
): Promise<ActivityTeamRow | null> {
  const result = await admin
    .from("activity_team")
    .select(TEAM_COLS)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as ActivityTeamRow | null) ?? null;
}

export async function insertTeam(
  admin: SupabaseClient,
  input: CreateTeamInput & {
    createdByUserId: string;
    status: ActivityTeamStatus;
  },
): Promise<ActivityTeamRow> {
  const result = await admin
    .from("activity_team")
    .insert({
      institute_id: input.instituteId,
      section_id: input.sectionId,
      kind: input.kind,
      name: input.name.trim(),
      status: input.status,
      created_by_user_id: input.createdByUserId,
    })
    .select(TEAM_COLS)
    .single();
  return ensureDbOk(result) as ActivityTeamRow;
}

export async function updateTeamFields(
  admin: SupabaseClient,
  id: string,
  patch: Record<string, unknown>,
): Promise<ActivityTeamRow | null> {
  const result = await admin
    .from("activity_team")
    .update(patch)
    .eq("id", id)
    .is("deleted_at", null)
    .select(TEAM_COLS)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as ActivityTeamRow | null) ?? null;
}

export async function softDeleteTeam(
  admin: SupabaseClient,
  id: string,
): Promise<ActivityTeamRow | null> {
  const result = await admin
    .from("activity_team")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .is("deleted_at", null)
    .select(TEAM_COLS)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as ActivityTeamRow | null) ?? null;
}

// ── Memberships ──────────────────────────────────────────────────

export async function listMemberships(
  admin: SupabaseClient,
  instituteId: string,
  teamId?: string,
): Promise<ActivityMembershipRow[]> {
  let query = admin
    .from("activity_membership")
    .select(MEMBERSHIP_COLS)
    .eq("institute_id", instituteId)
    .is("deleted_at", null);
  if (teamId) query = query.eq("team_id", teamId);
  const result = await query;
  return ensureDbOk(result) as ActivityMembershipRow[];
}

export async function findMembershipById(
  admin: SupabaseClient,
  id: string,
): Promise<ActivityMembershipRow | null> {
  const result = await admin
    .from("activity_membership")
    .select(MEMBERSHIP_COLS)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as ActivityMembershipRow | null) ?? null;
}

export async function findActiveMembership(
  admin: SupabaseClient,
  teamId: string,
  studentId: string,
): Promise<ActivityMembershipRow | null> {
  const result = await admin
    .from("activity_membership")
    .select(MEMBERSHIP_COLS)
    .eq("team_id", teamId)
    .eq("student_id", studentId)
    .eq("status", "active")
    .is("deleted_at", null)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as ActivityMembershipRow | null) ?? null;
}

export async function insertMembership(
  admin: SupabaseClient,
  input: CreateMembershipInput & {
    createdByUserId: string;
    role: ActivityMembershipRole;
    status: ActivityMembershipStatus;
  },
): Promise<ActivityMembershipRow> {
  const result = await admin
    .from("activity_membership")
    .insert({
      institute_id: input.instituteId,
      team_id: input.teamId,
      student_id: input.studentId,
      role: input.role,
      status: input.status,
      created_by_user_id: input.createdByUserId,
    })
    .select(MEMBERSHIP_COLS)
    .single();
  return ensureDbOk(result) as ActivityMembershipRow;
}

export async function updateMembershipFields(
  admin: SupabaseClient,
  id: string,
  patch: Record<string, unknown>,
): Promise<ActivityMembershipRow | null> {
  const result = await admin
    .from("activity_membership")
    .update(patch)
    .eq("id", id)
    .is("deleted_at", null)
    .select(MEMBERSHIP_COLS)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as ActivityMembershipRow | null) ?? null;
}

export async function softDeleteMembership(
  admin: SupabaseClient,
  id: string,
): Promise<ActivityMembershipRow | null> {
  const result = await admin
    .from("activity_membership")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .is("deleted_at", null)
    .select(MEMBERSHIP_COLS)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as ActivityMembershipRow | null) ?? null;
}

// ── Achievements ─────────────────────────────────────────────────

export async function listAchievements(
  admin: SupabaseClient,
  instituteId: string,
  studentId?: string,
): Promise<AchievementRow[]> {
  let query = admin
    .from("achievement")
    .select(ACHIEVEMENT_COLS)
    .eq("institute_id", instituteId)
    .is("deleted_at", null);
  if (studentId) query = query.eq("student_id", studentId);
  const result = await query;
  return ensureDbOk(result) as AchievementRow[];
}

export async function findAchievementById(
  admin: SupabaseClient,
  id: string,
): Promise<AchievementRow | null> {
  const result = await admin
    .from("achievement")
    .select(ACHIEVEMENT_COLS)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as AchievementRow | null) ?? null;
}

export async function insertAchievement(
  admin: SupabaseClient,
  input: CreateAchievementInput & {
    createdByUserId: string;
    kind: string;
  },
): Promise<AchievementRow> {
  const result = await admin
    .from("achievement")
    .insert({
      institute_id: input.instituteId,
      student_id: input.studentId,
      section_id: input.sectionId ?? null,
      team_id: input.teamId ?? null,
      title: input.title.trim(),
      kind: input.kind,
      awarded_on: input.awardedOn,
      notes: input.notes?.trim() || null,
      created_by_user_id: input.createdByUserId,
    })
    .select(ACHIEVEMENT_COLS)
    .single();
  return ensureDbOk(result) as AchievementRow;
}

export async function updateAchievementFields(
  admin: SupabaseClient,
  id: string,
  patch: Record<string, unknown>,
): Promise<AchievementRow | null> {
  const result = await admin
    .from("achievement")
    .update(patch)
    .eq("id", id)
    .is("deleted_at", null)
    .select(ACHIEVEMENT_COLS)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as AchievementRow | null) ?? null;
}

export async function softDeleteAchievement(
  admin: SupabaseClient,
  id: string,
): Promise<AchievementRow | null> {
  const result = await admin
    .from("achievement")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .is("deleted_at", null)
    .select(ACHIEVEMENT_COLS)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as AchievementRow | null) ?? null;
}

// ── Practice sessions ────────────────────────────────────────────

export async function listPracticeSessions(
  admin: SupabaseClient,
  instituteId: string,
  teamId?: string,
): Promise<PracticeSessionRow[]> {
  let query = admin
    .from("practice_session")
    .select(PRACTICE_COLS)
    .eq("institute_id", instituteId)
    .is("deleted_at", null);
  if (teamId) query = query.eq("team_id", teamId);
  const result = await query;
  return ensureDbOk(result) as PracticeSessionRow[];
}

export async function findPracticeSessionById(
  admin: SupabaseClient,
  id: string,
): Promise<PracticeSessionRow | null> {
  const result = await admin
    .from("practice_session")
    .select(PRACTICE_COLS)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as PracticeSessionRow | null) ?? null;
}

export async function insertPracticeSession(
  admin: SupabaseClient,
  input: CreatePracticeSessionInput & {
    createdByUserId: string;
    status: PracticeSessionStatus;
  },
): Promise<PracticeSessionRow> {
  const result = await admin
    .from("practice_session")
    .insert({
      institute_id: input.instituteId,
      team_id: input.teamId,
      title: input.title.trim(),
      scheduled_on: input.scheduledOn,
      start_time: input.startTime ?? null,
      end_time: input.endTime ?? null,
      location: input.location?.trim() || null,
      notes: input.notes?.trim() || null,
      status: input.status,
      created_by_user_id: input.createdByUserId,
    })
    .select(PRACTICE_COLS)
    .single();
  return ensureDbOk(result) as PracticeSessionRow;
}

export async function updatePracticeSessionFields(
  admin: SupabaseClient,
  id: string,
  patch: Record<string, unknown>,
): Promise<PracticeSessionRow | null> {
  const result = await admin
    .from("practice_session")
    .update(patch)
    .eq("id", id)
    .is("deleted_at", null)
    .select(PRACTICE_COLS)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as PracticeSessionRow | null) ?? null;
}

export async function softDeletePracticeSession(
  admin: SupabaseClient,
  id: string,
): Promise<PracticeSessionRow | null> {
  const result = await admin
    .from("practice_session")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .is("deleted_at", null)
    .select(PRACTICE_COLS)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as PracticeSessionRow | null) ?? null;
}
