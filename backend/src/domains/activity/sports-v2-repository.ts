import type { SupabaseClient } from "@supabase/supabase-js";
import { ensureDbOk } from "../../db/errors.js";
import type {
  VenueRow,
  EquipmentRow,
  TournamentRow,
  MatchResultRow,
  CoachNoteRow,
  SportsAttendanceRow,
  TeamSelectionRow,
  TeamSelectionMemberRow,
  MedicalFitnessRow,
  CalendarEventRow,
  CreateVenueInput,
  CreateEquipmentInput,
  CreateTournamentInput,
  CreateMatchResultInput,
  CreateCoachNoteInput,
  CreateSportsAttendanceInput,
  CreateTeamSelectionInput,
  CreateMedicalFitnessInput,
  CreateCalendarEventInput,
  VenueStatus,
  EquipmentStatus,
  EquipmentCondition,
  TournamentStatus,
  MatchResultStatus,
  CoachNoteVisibility,
  SportsAttendanceStatus,
  TeamSelectionStatus,
  MedicalClearance,
  CalendarEventKind,
} from "./sports-v2-types.js";

// ── Column lists ─────────────────────────────────────────────────

export const VENUE_COLS =
  "id, institute_id, name, venue_type, location_notes, capacity, status, created_by_user_id, created_at, updated_at, deleted_at";

export const EQUIPMENT_COLS =
  "id, institute_id, name, category, quantity, condition, status, notes, created_by_user_id, created_at, updated_at, deleted_at";

export const TOURNAMENT_COLS =
  "id, institute_id, section_id, venue_id, name, sport_label, tournament_type, starts_on, ends_on, status, description, created_by_user_id, created_at, updated_at, deleted_at";

export const MATCH_RESULT_COLS =
  "id, institute_id, tournament_id, match_label, played_on, venue_text, home_score, away_score, result_status, notes, created_by_user_id, created_at, updated_at, deleted_at";

export const COACH_NOTE_COLS =
  "id, institute_id, team_id, student_id, note_date, body, visibility, created_by_user_id, created_at, updated_at, deleted_at";

export const SPORTS_ATTENDANCE_COLS =
  "id, institute_id, team_id, session_on, student_id, status, notes, created_by_user_id, created_at, updated_at, deleted_at";

export const TEAM_SELECTION_COLS =
  "id, institute_id, team_id, title, event_on, venue_text, status, notes, created_by_user_id, created_at, updated_at, deleted_at";

export const TEAM_SELECTION_MEMBER_COLS =
  "id, institute_id, selection_id, student_id, created_at";

export const MEDICAL_FITNESS_COLS =
  "id, institute_id, student_id, clearance_status, valid_until, notes, assessed_on, created_by_user_id, created_at, updated_at, deleted_at";

export const CALENDAR_EVENT_COLS =
  "id, institute_id, section_id, team_id, title, event_on, start_time, end_time, venue_text, event_kind, source_ref, created_by_user_id, created_at, updated_at, deleted_at";

// ── Venue ────────────────────────────────────────────────────────

export async function listVenues(
  admin: SupabaseClient,
  instituteId: string,
): Promise<VenueRow[]> {
  const result = await admin
    .from("venue")
    .select(VENUE_COLS)
    .eq("institute_id", instituteId)
    .is("deleted_at", null);
  return ensureDbOk(result) as VenueRow[];
}

export async function findVenueById(
  admin: SupabaseClient,
  id: string,
): Promise<VenueRow | null> {
  const result = await admin
    .from("venue")
    .select(VENUE_COLS)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as VenueRow | null) ?? null;
}

export async function insertVenue(
  admin: SupabaseClient,
  input: CreateVenueInput & { createdByUserId: string; status: VenueStatus },
): Promise<VenueRow> {
  const result = await admin
    .from("venue")
    .insert({
      institute_id: input.instituteId,
      name: input.name.trim(),
      venue_type: input.venueType?.trim() || null,
      location_notes: input.locationNotes?.trim() || null,
      capacity: input.capacity ?? null,
      status: input.status,
      created_by_user_id: input.createdByUserId,
    })
    .select(VENUE_COLS)
    .single();
  return ensureDbOk(result) as VenueRow;
}

export async function updateVenueFields(
  admin: SupabaseClient,
  id: string,
  patch: Record<string, unknown>,
): Promise<VenueRow | null> {
  const result = await admin
    .from("venue")
    .update(patch)
    .eq("id", id)
    .is("deleted_at", null)
    .select(VENUE_COLS)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as VenueRow | null) ?? null;
}

export async function softDeleteVenue(
  admin: SupabaseClient,
  id: string,
): Promise<VenueRow | null> {
  const result = await admin
    .from("venue")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .is("deleted_at", null)
    .select(VENUE_COLS)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as VenueRow | null) ?? null;
}

// ── Equipment ────────────────────────────────────────────────────

export async function listEquipment(
  admin: SupabaseClient,
  instituteId: string,
): Promise<EquipmentRow[]> {
  const result = await admin
    .from("equipment")
    .select(EQUIPMENT_COLS)
    .eq("institute_id", instituteId)
    .is("deleted_at", null);
  return ensureDbOk(result) as EquipmentRow[];
}

export async function findEquipmentById(
  admin: SupabaseClient,
  id: string,
): Promise<EquipmentRow | null> {
  const result = await admin
    .from("equipment")
    .select(EQUIPMENT_COLS)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as EquipmentRow | null) ?? null;
}

export async function insertEquipment(
  admin: SupabaseClient,
  input: CreateEquipmentInput & {
    createdByUserId: string;
    status: EquipmentStatus;
    condition: EquipmentCondition;
  },
): Promise<EquipmentRow> {
  const result = await admin
    .from("equipment")
    .insert({
      institute_id: input.instituteId,
      name: input.name.trim(),
      category: input.category?.trim() || null,
      quantity: input.quantity ?? 1,
      condition: input.condition,
      status: input.status,
      notes: input.notes?.trim() || null,
      created_by_user_id: input.createdByUserId,
    })
    .select(EQUIPMENT_COLS)
    .single();
  return ensureDbOk(result) as EquipmentRow;
}

export async function updateEquipmentFields(
  admin: SupabaseClient,
  id: string,
  patch: Record<string, unknown>,
): Promise<EquipmentRow | null> {
  const result = await admin
    .from("equipment")
    .update(patch)
    .eq("id", id)
    .is("deleted_at", null)
    .select(EQUIPMENT_COLS)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as EquipmentRow | null) ?? null;
}

export async function softDeleteEquipment(
  admin: SupabaseClient,
  id: string,
): Promise<EquipmentRow | null> {
  const result = await admin
    .from("equipment")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .is("deleted_at", null)
    .select(EQUIPMENT_COLS)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as EquipmentRow | null) ?? null;
}

// ── Tournament ───────────────────────────────────────────────────

export async function listTournaments(
  admin: SupabaseClient,
  instituteId: string,
): Promise<TournamentRow[]> {
  const result = await admin
    .from("tournament")
    .select(TOURNAMENT_COLS)
    .eq("institute_id", instituteId)
    .is("deleted_at", null);
  return ensureDbOk(result) as TournamentRow[];
}

export async function findTournamentById(
  admin: SupabaseClient,
  id: string,
): Promise<TournamentRow | null> {
  const result = await admin
    .from("tournament")
    .select(TOURNAMENT_COLS)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as TournamentRow | null) ?? null;
}

export async function insertTournament(
  admin: SupabaseClient,
  input: CreateTournamentInput & {
    createdByUserId: string;
    status: TournamentStatus;
  },
): Promise<TournamentRow> {
  const result = await admin
    .from("tournament")
    .insert({
      institute_id: input.instituteId,
      section_id: input.sectionId ?? null,
      venue_id: input.venueId ?? null,
      name: input.name.trim(),
      sport_label: input.sportLabel?.trim() || null,
      tournament_type: input.tournamentType?.trim() || null,
      starts_on: input.startsOn ?? null,
      ends_on: input.endsOn ?? null,
      status: input.status,
      description: input.description?.trim() || null,
      created_by_user_id: input.createdByUserId,
    })
    .select(TOURNAMENT_COLS)
    .single();
  return ensureDbOk(result) as TournamentRow;
}

export async function updateTournamentFields(
  admin: SupabaseClient,
  id: string,
  patch: Record<string, unknown>,
): Promise<TournamentRow | null> {
  const result = await admin
    .from("tournament")
    .update(patch)
    .eq("id", id)
    .is("deleted_at", null)
    .select(TOURNAMENT_COLS)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as TournamentRow | null) ?? null;
}

export async function softDeleteTournament(
  admin: SupabaseClient,
  id: string,
): Promise<TournamentRow | null> {
  const result = await admin
    .from("tournament")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .is("deleted_at", null)
    .select(TOURNAMENT_COLS)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as TournamentRow | null) ?? null;
}

// ── Match Result ─────────────────────────────────────────────────

export async function listMatchResults(
  admin: SupabaseClient,
  instituteId: string,
  tournamentId?: string,
): Promise<MatchResultRow[]> {
  let query = admin
    .from("match_result")
    .select(MATCH_RESULT_COLS)
    .eq("institute_id", instituteId)
    .is("deleted_at", null);
  if (tournamentId) query = query.eq("tournament_id", tournamentId);
  const result = await query;
  return ensureDbOk(result) as MatchResultRow[];
}

export async function findMatchResultById(
  admin: SupabaseClient,
  id: string,
): Promise<MatchResultRow | null> {
  const result = await admin
    .from("match_result")
    .select(MATCH_RESULT_COLS)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as MatchResultRow | null) ?? null;
}

export async function insertMatchResult(
  admin: SupabaseClient,
  input: CreateMatchResultInput & {
    createdByUserId: string;
    resultStatus: MatchResultStatus;
  },
): Promise<MatchResultRow> {
  const result = await admin
    .from("match_result")
    .insert({
      institute_id: input.instituteId,
      tournament_id: input.tournamentId,
      match_label: input.matchLabel.trim(),
      played_on: input.playedOn ?? null,
      venue_text: input.venueText?.trim() || null,
      home_score: input.homeScore ?? null,
      away_score: input.awayScore ?? null,
      result_status: input.resultStatus,
      notes: input.notes?.trim() || null,
      created_by_user_id: input.createdByUserId,
    })
    .select(MATCH_RESULT_COLS)
    .single();
  return ensureDbOk(result) as MatchResultRow;
}

export async function updateMatchResultFields(
  admin: SupabaseClient,
  id: string,
  patch: Record<string, unknown>,
): Promise<MatchResultRow | null> {
  const result = await admin
    .from("match_result")
    .update(patch)
    .eq("id", id)
    .is("deleted_at", null)
    .select(MATCH_RESULT_COLS)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as MatchResultRow | null) ?? null;
}

export async function softDeleteMatchResult(
  admin: SupabaseClient,
  id: string,
): Promise<MatchResultRow | null> {
  const result = await admin
    .from("match_result")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .is("deleted_at", null)
    .select(MATCH_RESULT_COLS)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as MatchResultRow | null) ?? null;
}

// ── Coach Note ───────────────────────────────────────────────────

export async function listCoachNotes(
  admin: SupabaseClient,
  instituteId: string,
  teamId?: string,
): Promise<CoachNoteRow[]> {
  let query = admin
    .from("coach_note")
    .select(COACH_NOTE_COLS)
    .eq("institute_id", instituteId)
    .is("deleted_at", null);
  if (teamId) query = query.eq("team_id", teamId);
  const result = await query;
  return ensureDbOk(result) as CoachNoteRow[];
}

export async function findCoachNoteById(
  admin: SupabaseClient,
  id: string,
): Promise<CoachNoteRow | null> {
  const result = await admin
    .from("coach_note")
    .select(COACH_NOTE_COLS)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as CoachNoteRow | null) ?? null;
}

export async function insertCoachNote(
  admin: SupabaseClient,
  input: CreateCoachNoteInput & {
    createdByUserId: string;
    visibility: CoachNoteVisibility;
  },
): Promise<CoachNoteRow> {
  const result = await admin
    .from("coach_note")
    .insert({
      institute_id: input.instituteId,
      team_id: input.teamId,
      student_id: input.studentId ?? null,
      note_date: input.noteDate,
      body: input.body.trim(),
      visibility: input.visibility,
      created_by_user_id: input.createdByUserId,
    })
    .select(COACH_NOTE_COLS)
    .single();
  return ensureDbOk(result) as CoachNoteRow;
}

export async function updateCoachNoteFields(
  admin: SupabaseClient,
  id: string,
  patch: Record<string, unknown>,
): Promise<CoachNoteRow | null> {
  const result = await admin
    .from("coach_note")
    .update(patch)
    .eq("id", id)
    .is("deleted_at", null)
    .select(COACH_NOTE_COLS)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as CoachNoteRow | null) ?? null;
}

export async function softDeleteCoachNote(
  admin: SupabaseClient,
  id: string,
): Promise<CoachNoteRow | null> {
  const result = await admin
    .from("coach_note")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .is("deleted_at", null)
    .select(COACH_NOTE_COLS)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as CoachNoteRow | null) ?? null;
}

// ── Sports Attendance ────────────────────────────────────────────

export async function listSportsAttendance(
  admin: SupabaseClient,
  instituteId: string,
  teamId?: string,
): Promise<SportsAttendanceRow[]> {
  let query = admin
    .from("sports_attendance")
    .select(SPORTS_ATTENDANCE_COLS)
    .eq("institute_id", instituteId)
    .is("deleted_at", null);
  if (teamId) query = query.eq("team_id", teamId);
  const result = await query;
  return ensureDbOk(result) as SportsAttendanceRow[];
}

export async function findSportsAttendanceById(
  admin: SupabaseClient,
  id: string,
): Promise<SportsAttendanceRow | null> {
  const result = await admin
    .from("sports_attendance")
    .select(SPORTS_ATTENDANCE_COLS)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as SportsAttendanceRow | null) ?? null;
}

export async function insertSportsAttendance(
  admin: SupabaseClient,
  input: CreateSportsAttendanceInput & {
    createdByUserId: string;
    status: SportsAttendanceStatus;
  },
): Promise<SportsAttendanceRow> {
  const result = await admin
    .from("sports_attendance")
    .insert({
      institute_id: input.instituteId,
      team_id: input.teamId,
      session_on: input.sessionOn,
      student_id: input.studentId,
      status: input.status,
      notes: input.notes?.trim() || null,
      created_by_user_id: input.createdByUserId,
    })
    .select(SPORTS_ATTENDANCE_COLS)
    .single();
  return ensureDbOk(result) as SportsAttendanceRow;
}

export async function updateSportsAttendanceFields(
  admin: SupabaseClient,
  id: string,
  patch: Record<string, unknown>,
): Promise<SportsAttendanceRow | null> {
  const result = await admin
    .from("sports_attendance")
    .update(patch)
    .eq("id", id)
    .is("deleted_at", null)
    .select(SPORTS_ATTENDANCE_COLS)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as SportsAttendanceRow | null) ?? null;
}

export async function softDeleteSportsAttendance(
  admin: SupabaseClient,
  id: string,
): Promise<SportsAttendanceRow | null> {
  const result = await admin
    .from("sports_attendance")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .is("deleted_at", null)
    .select(SPORTS_ATTENDANCE_COLS)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as SportsAttendanceRow | null) ?? null;
}

// ── Team Selection ───────────────────────────────────────────────

export async function listTeamSelections(
  admin: SupabaseClient,
  instituteId: string,
  teamId?: string,
): Promise<TeamSelectionRow[]> {
  let query = admin
    .from("team_selection")
    .select(TEAM_SELECTION_COLS)
    .eq("institute_id", instituteId)
    .is("deleted_at", null);
  if (teamId) query = query.eq("team_id", teamId);
  const result = await query;
  return ensureDbOk(result) as TeamSelectionRow[];
}

export async function findTeamSelectionById(
  admin: SupabaseClient,
  id: string,
): Promise<TeamSelectionRow | null> {
  const result = await admin
    .from("team_selection")
    .select(TEAM_SELECTION_COLS)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as TeamSelectionRow | null) ?? null;
}

export async function insertTeamSelection(
  admin: SupabaseClient,
  input: CreateTeamSelectionInput & {
    createdByUserId: string;
    status: TeamSelectionStatus;
  },
): Promise<TeamSelectionRow> {
  const result = await admin
    .from("team_selection")
    .insert({
      institute_id: input.instituteId,
      team_id: input.teamId,
      title: input.title.trim(),
      event_on: input.eventOn ?? null,
      venue_text: input.venueText?.trim() || null,
      status: input.status,
      notes: input.notes?.trim() || null,
      created_by_user_id: input.createdByUserId,
    })
    .select(TEAM_SELECTION_COLS)
    .single();
  return ensureDbOk(result) as TeamSelectionRow;
}

export async function updateTeamSelectionFields(
  admin: SupabaseClient,
  id: string,
  patch: Record<string, unknown>,
): Promise<TeamSelectionRow | null> {
  const result = await admin
    .from("team_selection")
    .update(patch)
    .eq("id", id)
    .is("deleted_at", null)
    .select(TEAM_SELECTION_COLS)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as TeamSelectionRow | null) ?? null;
}

export async function softDeleteTeamSelection(
  admin: SupabaseClient,
  id: string,
): Promise<TeamSelectionRow | null> {
  const result = await admin
    .from("team_selection")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .is("deleted_at", null)
    .select(TEAM_SELECTION_COLS)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as TeamSelectionRow | null) ?? null;
}

export async function listTeamSelectionMembers(
  admin: SupabaseClient,
  selectionId: string,
): Promise<TeamSelectionMemberRow[]> {
  const result = await admin
    .from("team_selection_member")
    .select(TEAM_SELECTION_MEMBER_COLS)
    .eq("selection_id", selectionId);
  return ensureDbOk(result) as TeamSelectionMemberRow[];
}

export async function insertTeamSelectionMembers(
  admin: SupabaseClient,
  instituteId: string,
  selectionId: string,
  studentIds: string[],
): Promise<TeamSelectionMemberRow[]> {
  if (studentIds.length === 0) return [];
  const rows = studentIds.map((studentId) => ({
    institute_id: instituteId,
    selection_id: selectionId,
    student_id: studentId,
  }));
  const result = await admin
    .from("team_selection_member")
    .insert(rows)
    .select(TEAM_SELECTION_MEMBER_COLS);
  return ensureDbOk(result) as TeamSelectionMemberRow[];
}

export async function deleteTeamSelectionMembers(
  admin: SupabaseClient,
  selectionId: string,
): Promise<void> {
  await admin
    .from("team_selection_member")
    .delete()
    .eq("selection_id", selectionId);
}

// ── Medical Fitness ──────────────────────────────────────────────

export async function listMedicalFitness(
  admin: SupabaseClient,
  instituteId: string,
  studentId?: string,
): Promise<MedicalFitnessRow[]> {
  let query = admin
    .from("medical_fitness")
    .select(MEDICAL_FITNESS_COLS)
    .eq("institute_id", instituteId)
    .is("deleted_at", null);
  if (studentId) query = query.eq("student_id", studentId);
  const result = await query;
  return ensureDbOk(result) as MedicalFitnessRow[];
}

export async function findMedicalFitnessById(
  admin: SupabaseClient,
  id: string,
): Promise<MedicalFitnessRow | null> {
  const result = await admin
    .from("medical_fitness")
    .select(MEDICAL_FITNESS_COLS)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as MedicalFitnessRow | null) ?? null;
}

export async function insertMedicalFitness(
  admin: SupabaseClient,
  input: CreateMedicalFitnessInput & {
    createdByUserId: string;
    clearanceStatus: MedicalClearance;
  },
): Promise<MedicalFitnessRow> {
  const result = await admin
    .from("medical_fitness")
    .insert({
      institute_id: input.instituteId,
      student_id: input.studentId,
      clearance_status: input.clearanceStatus,
      valid_until: input.validUntil ?? null,
      notes: input.notes?.trim() || null,
      assessed_on: input.assessedOn,
      created_by_user_id: input.createdByUserId,
    })
    .select(MEDICAL_FITNESS_COLS)
    .single();
  return ensureDbOk(result) as MedicalFitnessRow;
}

export async function updateMedicalFitnessFields(
  admin: SupabaseClient,
  id: string,
  patch: Record<string, unknown>,
): Promise<MedicalFitnessRow | null> {
  const result = await admin
    .from("medical_fitness")
    .update(patch)
    .eq("id", id)
    .is("deleted_at", null)
    .select(MEDICAL_FITNESS_COLS)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as MedicalFitnessRow | null) ?? null;
}

export async function softDeleteMedicalFitness(
  admin: SupabaseClient,
  id: string,
): Promise<MedicalFitnessRow | null> {
  const result = await admin
    .from("medical_fitness")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .is("deleted_at", null)
    .select(MEDICAL_FITNESS_COLS)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as MedicalFitnessRow | null) ?? null;
}

// ── Calendar Event ───────────────────────────────────────────────

export async function listCalendarEvents(
  admin: SupabaseClient,
  instituteId: string,
  teamId?: string,
): Promise<CalendarEventRow[]> {
  let query = admin
    .from("activity_calendar_event")
    .select(CALENDAR_EVENT_COLS)
    .eq("institute_id", instituteId)
    .is("deleted_at", null);
  if (teamId) query = query.eq("team_id", teamId);
  const result = await query;
  return ensureDbOk(result) as CalendarEventRow[];
}

export async function findCalendarEventById(
  admin: SupabaseClient,
  id: string,
): Promise<CalendarEventRow | null> {
  const result = await admin
    .from("activity_calendar_event")
    .select(CALENDAR_EVENT_COLS)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as CalendarEventRow | null) ?? null;
}

export async function insertCalendarEvent(
  admin: SupabaseClient,
  input: CreateCalendarEventInput & {
    createdByUserId: string;
    eventKind: CalendarEventKind;
  },
): Promise<CalendarEventRow> {
  const result = await admin
    .from("activity_calendar_event")
    .insert({
      institute_id: input.instituteId,
      section_id: input.sectionId ?? null,
      team_id: input.teamId ?? null,
      title: input.title.trim(),
      event_on: input.eventOn,
      start_time: input.startTime ?? null,
      end_time: input.endTime ?? null,
      venue_text: input.venueText?.trim() || null,
      event_kind: input.eventKind,
      source_ref: input.sourceRef?.trim() || null,
      created_by_user_id: input.createdByUserId,
    })
    .select(CALENDAR_EVENT_COLS)
    .single();
  return ensureDbOk(result) as CalendarEventRow;
}

export async function updateCalendarEventFields(
  admin: SupabaseClient,
  id: string,
  patch: Record<string, unknown>,
): Promise<CalendarEventRow | null> {
  const result = await admin
    .from("activity_calendar_event")
    .update(patch)
    .eq("id", id)
    .is("deleted_at", null)
    .select(CALENDAR_EVENT_COLS)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as CalendarEventRow | null) ?? null;
}

export async function softDeleteCalendarEvent(
  admin: SupabaseClient,
  id: string,
): Promise<CalendarEventRow | null> {
  const result = await admin
    .from("activity_calendar_event")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .is("deleted_at", null)
    .select(CALENDAR_EVENT_COLS)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as CalendarEventRow | null) ?? null;
}
