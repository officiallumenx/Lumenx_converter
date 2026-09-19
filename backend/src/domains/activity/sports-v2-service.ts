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
import { findSectionById, findTeamById } from "./repository.js";
import {
  findVenueById,
  findEquipmentById,
  findTournamentById,
  findMatchResultById,
  findCoachNoteById,
  findSportsAttendanceById,
  findTeamSelectionById,
  findMedicalFitnessById,
  findCalendarEventById,
  insertVenue,
  insertEquipment,
  insertTournament,
  insertMatchResult,
  insertCoachNote,
  insertSportsAttendance,
  insertTeamSelection,
  insertTeamSelectionMembers,
  insertMedicalFitness,
  insertCalendarEvent,
  listVenues,
  listEquipment,
  listTournaments,
  listMatchResults,
  listCoachNotes,
  listSportsAttendance,
  listTeamSelections,
  listMedicalFitness,
  listCalendarEvents,
  updateVenueFields,
  updateEquipmentFields,
  updateTournamentFields,
  updateMatchResultFields,
  updateCoachNoteFields,
  updateSportsAttendanceFields,
  updateTeamSelectionFields,
  updateMedicalFitnessFields,
  updateCalendarEventFields,
  softDeleteVenue,
  softDeleteEquipment,
  softDeleteTournament,
  softDeleteMatchResult,
  softDeleteCoachNote,
  softDeleteSportsAttendance,
  softDeleteTeamSelection,
  softDeleteMedicalFitness,
  softDeleteCalendarEvent,
} from "./sports-v2-repository.js";
import type {
  VenueDto,
  VenueRow,
  EquipmentDto,
  EquipmentRow,
  TournamentDto,
  TournamentRow,
  MatchResultDto,
  MatchResultRow,
  CoachNoteDto,
  CoachNoteRow,
  SportsAttendanceDto,
  SportsAttendanceRow,
  TeamSelectionDto,
  TeamSelectionRow,
  MedicalFitnessDto,
  MedicalFitnessRow,
  CalendarEventDto,
  CalendarEventRow,
  CreateVenueInput,
  UpdateVenueInput,
  CreateEquipmentInput,
  UpdateEquipmentInput,
  CreateTournamentInput,
  UpdateTournamentInput,
  CreateMatchResultInput,
  UpdateMatchResultInput,
  CreateCoachNoteInput,
  UpdateCoachNoteInput,
  CreateSportsAttendanceInput,
  UpdateSportsAttendanceInput,
  CreateTeamSelectionInput,
  UpdateTeamSelectionInput,
  CreateMedicalFitnessInput,
  UpdateMedicalFitnessInput,
  CreateCalendarEventInput,
  UpdateCalendarEventInput,
} from "./sports-v2-types.js";

// ── Reuse auth helpers from core activity service ────────────────

import {
  ACTIVITY_WRITE_ROLES,
  ACTIVITY_STAFF_READ_ROLES,
} from "./service.js";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}(:\d{2})?$/;

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

function assertDate(value: string, field: string): void {
  if (!DATE_RE.test(value)) {
    throw AppError.validation("Referenced resource is invalid", {
      [field]: ["Must be YYYY-MM-DD"],
    });
  }
}

function assertOptionalDate(
  value: string | null | undefined,
  field: string,
): void {
  if (value == null) return;
  assertDate(value, field);
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

// ── DTO mappers ──────────────────────────────────────────────────

export function toVenueDto(row: VenueRow): VenueDto {
  return {
    id: row.id,
    instituteId: row.institute_id,
    name: row.name,
    venueType: row.venue_type,
    locationNotes: row.location_notes,
    capacity: row.capacity,
    status: row.status,
    createdByUserId: row.created_by_user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toEquipmentDto(row: EquipmentRow): EquipmentDto {
  return {
    id: row.id,
    instituteId: row.institute_id,
    name: row.name,
    category: row.category,
    quantity: row.quantity,
    condition: row.condition,
    status: row.status,
    notes: row.notes,
    createdByUserId: row.created_by_user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toTournamentDto(row: TournamentRow): TournamentDto {
  return {
    id: row.id,
    instituteId: row.institute_id,
    sectionId: row.section_id,
    venueId: row.venue_id,
    name: row.name,
    sportLabel: row.sport_label,
    tournamentType: row.tournament_type,
    startsOn: row.starts_on,
    endsOn: row.ends_on,
    status: row.status,
    description: row.description,
    createdByUserId: row.created_by_user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toMatchResultDto(row: MatchResultRow): MatchResultDto {
  return {
    id: row.id,
    instituteId: row.institute_id,
    tournamentId: row.tournament_id,
    matchLabel: row.match_label,
    playedOn: row.played_on,
    venueText: row.venue_text,
    homeScore: row.home_score,
    awayScore: row.away_score,
    resultStatus: row.result_status,
    notes: row.notes,
    createdByUserId: row.created_by_user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toCoachNoteDto(row: CoachNoteRow): CoachNoteDto {
  return {
    id: row.id,
    instituteId: row.institute_id,
    teamId: row.team_id,
    studentId: row.student_id,
    noteDate: row.note_date,
    body: row.body,
    visibility: row.visibility,
    createdByUserId: row.created_by_user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toSportsAttendanceDto(
  row: SportsAttendanceRow,
): SportsAttendanceDto {
  return {
    id: row.id,
    instituteId: row.institute_id,
    teamId: row.team_id,
    sessionOn: row.session_on,
    studentId: row.student_id,
    status: row.status,
    notes: row.notes,
    createdByUserId: row.created_by_user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toTeamSelectionDto(row: TeamSelectionRow): TeamSelectionDto {
  return {
    id: row.id,
    instituteId: row.institute_id,
    teamId: row.team_id,
    title: row.title,
    eventOn: row.event_on,
    venueText: row.venue_text,
    status: row.status,
    notes: row.notes,
    createdByUserId: row.created_by_user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toMedicalFitnessDto(row: MedicalFitnessRow): MedicalFitnessDto {
  return {
    id: row.id,
    instituteId: row.institute_id,
    studentId: row.student_id,
    clearanceStatus: row.clearance_status,
    validUntil: row.valid_until,
    notes: row.notes,
    assessedOn: row.assessed_on,
    createdByUserId: row.created_by_user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toCalendarEventDto(row: CalendarEventRow): CalendarEventDto {
  return {
    id: row.id,
    instituteId: row.institute_id,
    sectionId: row.section_id,
    teamId: row.team_id,
    title: row.title,
    eventOn: row.event_on,
    startTime: row.start_time,
    endTime: row.end_time,
    venueText: row.venue_text,
    eventKind: row.event_kind,
    sourceRef: row.source_ref,
    createdByUserId: row.created_by_user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ── Venue service ────────────────────────────────────────────────

export async function listVenuesForActor(
  admin: SupabaseClient,
  actor: Actor,
  instituteIdRaw: string,
): Promise<VenueDto[]> {
  const instituteId = requireInstituteId(actor, instituteIdRaw);
  const rows = await listVenues(admin, instituteId);
  return rows
    .filter((r) => {
      if (isStaffReader(actor, r.institute_id)) return true;
      return r.status === "active" && isMember(actor, r.institute_id);
    })
    .map(toVenueDto);
}

export async function createVenueForActor(
  admin: SupabaseClient,
  actor: Actor,
  input: CreateVenueInput,
): Promise<VenueDto> {
  const instituteId = requireInstituteId(actor, input.instituteId);
  if (!isWriter(actor, instituteId)) {
    throw AppError.forbidden("Insufficient activity write access");
  }
  const name = input.name.trim();
  if (!name) {
    throw AppError.validation("Referenced resource is invalid", {
      name: ["Required"],
    });
  }
  const row = await insertVenue(admin, {
    ...input,
    instituteId,
    name,
    createdByUserId: actor.userId,
    status: input.status ?? "active",
  });
  return toVenueDto(row);
}

export async function updateVenueForActor(
  admin: SupabaseClient,
  actor: Actor,
  id: string,
  input: UpdateVenueInput,
): Promise<VenueDto> {
  const existing = await findVenueById(admin, id);
  if (!existing) throw AppError.notFound("Venue not found");
  if (!isWriter(actor, existing.institute_id)) {
    throw AppError.notFound("Venue not found");
  }
  const patch: Record<string, unknown> = {};
  if (input.name !== undefined) patch.name = input.name.trim();
  if (input.venueType !== undefined) patch.venue_type = input.venueType?.trim() || null;
  if (input.locationNotes !== undefined) patch.location_notes = input.locationNotes?.trim() || null;
  if (input.capacity !== undefined) patch.capacity = input.capacity;
  if (input.status !== undefined) patch.status = input.status;
  if (Object.keys(patch).length === 0) return toVenueDto(existing);
  const updated = await updateVenueFields(admin, id, patch);
  if (!updated) throw AppError.notFound("Venue not found");
  return toVenueDto(updated);
}

export async function deleteVenueForActor(
  admin: SupabaseClient,
  actor: Actor,
  id: string,
): Promise<void> {
  const existing = await findVenueById(admin, id);
  if (!existing) throw AppError.notFound("Venue not found");
  if (!isWriter(actor, existing.institute_id)) {
    throw AppError.notFound("Venue not found");
  }
  const deleted = await softDeleteVenue(admin, id);
  if (!deleted) throw AppError.notFound("Venue not found");
}

// ── Equipment service ────────────────────────────────────────────

export async function listEquipmentForActor(
  admin: SupabaseClient,
  actor: Actor,
  instituteIdRaw: string,
): Promise<EquipmentDto[]> {
  const instituteId = requireInstituteId(actor, instituteIdRaw);
  const rows = await listEquipment(admin, instituteId);
  return rows
    .filter((r) => {
      if (isStaffReader(actor, r.institute_id)) return true;
      return r.status === "active" && isMember(actor, r.institute_id);
    })
    .map(toEquipmentDto);
}

export async function createEquipmentForActor(
  admin: SupabaseClient,
  actor: Actor,
  input: CreateEquipmentInput,
): Promise<EquipmentDto> {
  const instituteId = requireInstituteId(actor, input.instituteId);
  if (!isWriter(actor, instituteId)) {
    throw AppError.forbidden("Insufficient activity write access");
  }
  const name = input.name.trim();
  if (!name) {
    throw AppError.validation("Referenced resource is invalid", {
      name: ["Required"],
    });
  }
  const row = await insertEquipment(admin, {
    ...input,
    instituteId,
    name,
    createdByUserId: actor.userId,
    condition: input.condition ?? "good",
    status: input.status ?? "active",
  });
  return toEquipmentDto(row);
}

export async function updateEquipmentForActor(
  admin: SupabaseClient,
  actor: Actor,
  id: string,
  input: UpdateEquipmentInput,
): Promise<EquipmentDto> {
  const existing = await findEquipmentById(admin, id);
  if (!existing) throw AppError.notFound("Equipment not found");
  if (!isWriter(actor, existing.institute_id)) {
    throw AppError.notFound("Equipment not found");
  }
  const patch: Record<string, unknown> = {};
  if (input.name !== undefined) patch.name = input.name.trim();
  if (input.category !== undefined) patch.category = input.category?.trim() || null;
  if (input.quantity !== undefined) patch.quantity = input.quantity;
  if (input.condition !== undefined) patch.condition = input.condition;
  if (input.status !== undefined) patch.status = input.status;
  if (input.notes !== undefined) patch.notes = input.notes?.trim() || null;
  if (Object.keys(patch).length === 0) return toEquipmentDto(existing);
  const updated = await updateEquipmentFields(admin, id, patch);
  if (!updated) throw AppError.notFound("Equipment not found");
  return toEquipmentDto(updated);
}

export async function deleteEquipmentForActor(
  admin: SupabaseClient,
  actor: Actor,
  id: string,
): Promise<void> {
  const existing = await findEquipmentById(admin, id);
  if (!existing) throw AppError.notFound("Equipment not found");
  if (!isWriter(actor, existing.institute_id)) {
    throw AppError.notFound("Equipment not found");
  }
  const deleted = await softDeleteEquipment(admin, id);
  if (!deleted) throw AppError.notFound("Equipment not found");
}

// ── Tournament service ───────────────────────────────────────────

function canReadTournament(actor: Actor, row: TournamentRow): boolean {
  if (!isMember(actor, row.institute_id)) return false;
  if (isStaffReader(actor, row.institute_id)) return true;
  return row.status !== "draft";
}

export async function listTournamentsForActor(
  admin: SupabaseClient,
  actor: Actor,
  instituteIdRaw: string,
): Promise<TournamentDto[]> {
  const instituteId = requireInstituteId(actor, instituteIdRaw);
  const rows = await listTournaments(admin, instituteId);
  return rows.filter((r) => canReadTournament(actor, r)).map(toTournamentDto);
}

export async function createTournamentForActor(
  admin: SupabaseClient,
  actor: Actor,
  input: CreateTournamentInput,
): Promise<TournamentDto> {
  const instituteId = requireInstituteId(actor, input.instituteId);
  if (!isWriter(actor, instituteId)) {
    throw AppError.forbidden("Insufficient activity write access");
  }
  const name = input.name.trim();
  if (!name) {
    throw AppError.validation("Referenced resource is invalid", {
      name: ["Required"],
    });
  }
  if (input.sectionId) {
    const section = await findSectionById(admin, input.sectionId);
    if (!section || section.institute_id !== instituteId) {
      throw AppError.validation("Referenced resource is invalid", {
        section_id: ["Section not found in this institute"],
      });
    }
  }
  if (input.venueId) {
    const venue = await findVenueById(admin, input.venueId);
    if (!venue || venue.institute_id !== instituteId) {
      throw AppError.validation("Referenced resource is invalid", {
        venue_id: ["Venue not found in this institute"],
      });
    }
  }
  assertOptionalDate(input.startsOn, "starts_on");
  assertOptionalDate(input.endsOn, "ends_on");
  const row = await insertTournament(admin, {
    ...input,
    instituteId,
    name,
    createdByUserId: actor.userId,
    status: input.status ?? "draft",
  });
  return toTournamentDto(row);
}

export async function updateTournamentForActor(
  admin: SupabaseClient,
  actor: Actor,
  id: string,
  input: UpdateTournamentInput,
): Promise<TournamentDto> {
  const existing = await findTournamentById(admin, id);
  if (!existing || !canReadTournament(actor, existing)) {
    throw AppError.notFound("Tournament not found");
  }
  if (!isWriter(actor, existing.institute_id)) {
    throw AppError.notFound("Tournament not found");
  }
  if (input.sectionId) {
    const section = await findSectionById(admin, input.sectionId);
    if (!section || section.institute_id !== existing.institute_id) {
      throw AppError.validation("Referenced resource is invalid", {
        section_id: ["Section not found in this institute"],
      });
    }
  }
  if (input.venueId) {
    const venue = await findVenueById(admin, input.venueId);
    if (!venue || venue.institute_id !== existing.institute_id) {
      throw AppError.validation("Referenced resource is invalid", {
        venue_id: ["Venue not found in this institute"],
      });
    }
  }
  const patch: Record<string, unknown> = {};
  if (input.name !== undefined) patch.name = input.name.trim();
  if (input.sportLabel !== undefined) patch.sport_label = input.sportLabel?.trim() || null;
  if (input.tournamentType !== undefined) patch.tournament_type = input.tournamentType?.trim() || null;
  if (input.sectionId !== undefined) patch.section_id = input.sectionId;
  if (input.venueId !== undefined) patch.venue_id = input.venueId;
  if (input.startsOn !== undefined) {
    assertOptionalDate(input.startsOn, "starts_on");
    patch.starts_on = input.startsOn;
  }
  if (input.endsOn !== undefined) {
    assertOptionalDate(input.endsOn, "ends_on");
    patch.ends_on = input.endsOn;
  }
  if (input.status !== undefined) patch.status = input.status;
  if (input.description !== undefined) patch.description = input.description?.trim() || null;
  if (Object.keys(patch).length === 0) return toTournamentDto(existing);
  const updated = await updateTournamentFields(admin, id, patch);
  if (!updated) throw AppError.notFound("Tournament not found");
  return toTournamentDto(updated);
}

export async function deleteTournamentForActor(
  admin: SupabaseClient,
  actor: Actor,
  id: string,
): Promise<void> {
  const existing = await findTournamentById(admin, id);
  if (!existing || !canReadTournament(actor, existing)) {
    throw AppError.notFound("Tournament not found");
  }
  if (!isWriter(actor, existing.institute_id)) {
    throw AppError.notFound("Tournament not found");
  }
  const deleted = await softDeleteTournament(admin, id);
  if (!deleted) throw AppError.notFound("Tournament not found");
}

// ── Match Result service ─────────────────────────────────────────

export async function listMatchResultsForActor(
  admin: SupabaseClient,
  actor: Actor,
  instituteIdRaw: string,
  tournamentId?: string,
): Promise<MatchResultDto[]> {
  const instituteId = requireInstituteId(actor, instituteIdRaw);
  const rows = await listMatchResults(admin, instituteId, tournamentId);
  if (isStaffReader(actor, instituteId)) return rows.map(toMatchResultDto);
  const out: MatchResultDto[] = [];
  for (const r of rows) {
    const tournament = await findTournamentById(admin, r.tournament_id);
    if (tournament && canReadTournament(actor, tournament)) {
      out.push(toMatchResultDto(r));
    }
  }
  return out;
}

export async function createMatchResultForActor(
  admin: SupabaseClient,
  actor: Actor,
  input: CreateMatchResultInput,
): Promise<MatchResultDto> {
  const instituteId = requireInstituteId(actor, input.instituteId);
  if (!isWriter(actor, instituteId)) {
    throw AppError.forbidden("Insufficient activity write access");
  }
  const tournament = await findTournamentById(admin, input.tournamentId);
  if (!tournament || tournament.institute_id !== instituteId) {
    throw AppError.validation("Referenced resource is invalid", {
      tournament_id: ["Tournament not found in this institute"],
    });
  }
  const matchLabel = input.matchLabel.trim();
  if (!matchLabel) {
    throw AppError.validation("Referenced resource is invalid", {
      match_label: ["Required"],
    });
  }
  assertOptionalDate(input.playedOn, "played_on");
  const row = await insertMatchResult(admin, {
    ...input,
    instituteId,
    matchLabel,
    createdByUserId: actor.userId,
    resultStatus: input.resultStatus ?? "scheduled",
  });
  return toMatchResultDto(row);
}

export async function updateMatchResultForActor(
  admin: SupabaseClient,
  actor: Actor,
  id: string,
  input: UpdateMatchResultInput,
): Promise<MatchResultDto> {
  const existing = await findMatchResultById(admin, id);
  if (!existing) throw AppError.notFound("Match result not found");
  if (!isWriter(actor, existing.institute_id)) {
    throw AppError.notFound("Match result not found");
  }
  const patch: Record<string, unknown> = {};
  if (input.matchLabel !== undefined) patch.match_label = input.matchLabel.trim();
  if (input.playedOn !== undefined) {
    assertOptionalDate(input.playedOn, "played_on");
    patch.played_on = input.playedOn;
  }
  if (input.venueText !== undefined) patch.venue_text = input.venueText?.trim() || null;
  if (input.homeScore !== undefined) patch.home_score = input.homeScore;
  if (input.awayScore !== undefined) patch.away_score = input.awayScore;
  if (input.resultStatus !== undefined) patch.result_status = input.resultStatus;
  if (input.notes !== undefined) patch.notes = input.notes?.trim() || null;
  if (Object.keys(patch).length === 0) return toMatchResultDto(existing);
  const updated = await updateMatchResultFields(admin, id, patch);
  if (!updated) throw AppError.notFound("Match result not found");
  return toMatchResultDto(updated);
}

export async function deleteMatchResultForActor(
  admin: SupabaseClient,
  actor: Actor,
  id: string,
): Promise<void> {
  const existing = await findMatchResultById(admin, id);
  if (!existing) throw AppError.notFound("Match result not found");
  if (!isWriter(actor, existing.institute_id)) {
    throw AppError.notFound("Match result not found");
  }
  const deleted = await softDeleteMatchResult(admin, id);
  if (!deleted) throw AppError.notFound("Match result not found");
}

// ── Coach Note service ───────────────────────────────────────────

async function canReadCoachNote(
  admin: SupabaseClient,
  actor: Actor,
  row: CoachNoteRow,
): Promise<boolean> {
  if (!isMember(actor, row.institute_id)) return false;
  if (isStaffReader(actor, row.institute_id)) return true;
  if (row.visibility !== "guardians") return false;
  if (!row.student_id) return true;
  return canAccessStudentRecord(admin, actor, row.institute_id, row.student_id);
}

export async function listCoachNotesForActor(
  admin: SupabaseClient,
  actor: Actor,
  instituteIdRaw: string,
  teamId?: string,
): Promise<CoachNoteDto[]> {
  const instituteId = requireInstituteId(actor, instituteIdRaw);
  const rows = await listCoachNotes(admin, instituteId, teamId);
  const out: CoachNoteDto[] = [];
  for (const r of rows) {
    if (await canReadCoachNote(admin, actor, r)) out.push(toCoachNoteDto(r));
  }
  return out;
}

export async function createCoachNoteForActor(
  admin: SupabaseClient,
  actor: Actor,
  input: CreateCoachNoteInput,
): Promise<CoachNoteDto> {
  const instituteId = requireInstituteId(actor, input.instituteId);
  if (!isWriter(actor, instituteId)) {
    throw AppError.forbidden("Insufficient activity write access");
  }
  const team = await findTeamById(admin, input.teamId);
  if (!team || team.institute_id !== instituteId) {
    throw AppError.validation("Referenced resource is invalid", {
      team_id: ["Team not found in this institute"],
    });
  }
  if (input.studentId) {
    const student = await findStudentById(admin, input.studentId);
    if (!student || student.institute_id !== instituteId) {
      throw AppError.validation("Referenced resource is invalid", {
        student_id: ["Student not found in this institute"],
      });
    }
  }
  const body = input.body.trim();
  if (!body) {
    throw AppError.validation("Referenced resource is invalid", {
      body: ["Required"],
    });
  }
  assertDate(input.noteDate, "note_date");
  const row = await insertCoachNote(admin, {
    ...input,
    instituteId,
    body,
    createdByUserId: actor.userId,
    visibility: input.visibility ?? "staff",
  });
  return toCoachNoteDto(row);
}

export async function updateCoachNoteForActor(
  admin: SupabaseClient,
  actor: Actor,
  id: string,
  input: UpdateCoachNoteInput,
): Promise<CoachNoteDto> {
  const existing = await findCoachNoteById(admin, id);
  if (!existing) throw AppError.notFound("Coach note not found");
  if (!isWriter(actor, existing.institute_id)) {
    throw AppError.notFound("Coach note not found");
  }
  const patch: Record<string, unknown> = {};
  if (input.body !== undefined) patch.body = input.body.trim();
  if (input.visibility !== undefined) patch.visibility = input.visibility;
  if (input.noteDate !== undefined) {
    assertDate(input.noteDate, "note_date");
    patch.note_date = input.noteDate;
  }
  if (input.studentId !== undefined) patch.student_id = input.studentId;
  if (Object.keys(patch).length === 0) return toCoachNoteDto(existing);
  const updated = await updateCoachNoteFields(admin, id, patch);
  if (!updated) throw AppError.notFound("Coach note not found");
  return toCoachNoteDto(updated);
}

export async function deleteCoachNoteForActor(
  admin: SupabaseClient,
  actor: Actor,
  id: string,
): Promise<void> {
  const existing = await findCoachNoteById(admin, id);
  if (!existing) throw AppError.notFound("Coach note not found");
  if (!isWriter(actor, existing.institute_id)) {
    throw AppError.notFound("Coach note not found");
  }
  const deleted = await softDeleteCoachNote(admin, id);
  if (!deleted) throw AppError.notFound("Coach note not found");
}

// ── Sports Attendance service ────────────────────────────────────

export async function listSportsAttendanceForActor(
  admin: SupabaseClient,
  actor: Actor,
  instituteIdRaw: string,
  teamId?: string,
): Promise<SportsAttendanceDto[]> {
  const instituteId = requireInstituteId(actor, instituteIdRaw);
  const rows = await listSportsAttendance(admin, instituteId, teamId);
  if (isStaffReader(actor, instituteId)) return rows.map(toSportsAttendanceDto);
  const out: SportsAttendanceDto[] = [];
  for (const r of rows) {
    if (await canAccessStudentRecord(admin, actor, r.institute_id, r.student_id)) {
      out.push(toSportsAttendanceDto(r));
    }
  }
  return out;
}

export async function createSportsAttendanceForActor(
  admin: SupabaseClient,
  actor: Actor,
  input: CreateSportsAttendanceInput,
): Promise<SportsAttendanceDto> {
  const instituteId = requireInstituteId(actor, input.instituteId);
  if (!isWriter(actor, instituteId)) {
    throw AppError.forbidden("Insufficient activity write access");
  }
  const team = await findTeamById(admin, input.teamId);
  if (!team || team.institute_id !== instituteId) {
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
  assertDate(input.sessionOn, "session_on");
  const row = await insertSportsAttendance(admin, {
    ...input,
    instituteId,
    createdByUserId: actor.userId,
    status: input.status ?? "present",
  });
  return toSportsAttendanceDto(row);
}

export async function updateSportsAttendanceForActor(
  admin: SupabaseClient,
  actor: Actor,
  id: string,
  input: UpdateSportsAttendanceInput,
): Promise<SportsAttendanceDto> {
  const existing = await findSportsAttendanceById(admin, id);
  if (!existing) throw AppError.notFound("Sports attendance not found");
  if (!isWriter(actor, existing.institute_id)) {
    throw AppError.notFound("Sports attendance not found");
  }
  const patch: Record<string, unknown> = {};
  if (input.status !== undefined) patch.status = input.status;
  if (input.notes !== undefined) patch.notes = input.notes?.trim() || null;
  if (Object.keys(patch).length === 0) return toSportsAttendanceDto(existing);
  const updated = await updateSportsAttendanceFields(admin, id, patch);
  if (!updated) throw AppError.notFound("Sports attendance not found");
  return toSportsAttendanceDto(updated);
}

export async function deleteSportsAttendanceForActor(
  admin: SupabaseClient,
  actor: Actor,
  id: string,
): Promise<void> {
  const existing = await findSportsAttendanceById(admin, id);
  if (!existing) throw AppError.notFound("Sports attendance not found");
  if (!isWriter(actor, existing.institute_id)) {
    throw AppError.notFound("Sports attendance not found");
  }
  const deleted = await softDeleteSportsAttendance(admin, id);
  if (!deleted) throw AppError.notFound("Sports attendance not found");
}

// ── Team Selection service ───────────────────────────────────────

function canReadTeamSelection(actor: Actor, row: TeamSelectionRow): boolean {
  if (!isMember(actor, row.institute_id)) return false;
  if (isStaffReader(actor, row.institute_id)) return true;
  return row.status === "published";
}

export async function listTeamSelectionsForActor(
  admin: SupabaseClient,
  actor: Actor,
  instituteIdRaw: string,
  teamId?: string,
): Promise<TeamSelectionDto[]> {
  const instituteId = requireInstituteId(actor, instituteIdRaw);
  const rows = await listTeamSelections(admin, instituteId, teamId);
  return rows.filter((r) => canReadTeamSelection(actor, r)).map(toTeamSelectionDto);
}

export async function createTeamSelectionForActor(
  admin: SupabaseClient,
  actor: Actor,
  input: CreateTeamSelectionInput,
): Promise<TeamSelectionDto> {
  const instituteId = requireInstituteId(actor, input.instituteId);
  if (!isWriter(actor, instituteId)) {
    throw AppError.forbidden("Insufficient activity write access");
  }
  const team = await findTeamById(admin, input.teamId);
  if (!team || team.institute_id !== instituteId) {
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
  assertOptionalDate(input.eventOn, "event_on");
  const row = await insertTeamSelection(admin, {
    ...input,
    instituteId,
    title,
    createdByUserId: actor.userId,
    status: input.status ?? "draft",
  });
  if (input.memberStudentIds && input.memberStudentIds.length > 0) {
    await insertTeamSelectionMembers(
      admin,
      instituteId,
      row.id,
      input.memberStudentIds,
    );
  }
  return toTeamSelectionDto(row);
}

export async function updateTeamSelectionForActor(
  admin: SupabaseClient,
  actor: Actor,
  id: string,
  input: UpdateTeamSelectionInput,
): Promise<TeamSelectionDto> {
  const existing = await findTeamSelectionById(admin, id);
  if (!existing || !canReadTeamSelection(actor, existing)) {
    throw AppError.notFound("Team selection not found");
  }
  if (!isWriter(actor, existing.institute_id)) {
    throw AppError.notFound("Team selection not found");
  }
  const patch: Record<string, unknown> = {};
  if (input.title !== undefined) patch.title = input.title.trim();
  if (input.eventOn !== undefined) {
    assertOptionalDate(input.eventOn, "event_on");
    patch.event_on = input.eventOn;
  }
  if (input.venueText !== undefined) patch.venue_text = input.venueText?.trim() || null;
  if (input.status !== undefined) patch.status = input.status;
  if (input.notes !== undefined) patch.notes = input.notes?.trim() || null;
  if (Object.keys(patch).length === 0) return toTeamSelectionDto(existing);
  const updated = await updateTeamSelectionFields(admin, id, patch);
  if (!updated) throw AppError.notFound("Team selection not found");
  return toTeamSelectionDto(updated);
}

export async function deleteTeamSelectionForActor(
  admin: SupabaseClient,
  actor: Actor,
  id: string,
): Promise<void> {
  const existing = await findTeamSelectionById(admin, id);
  if (!existing || !canReadTeamSelection(actor, existing)) {
    throw AppError.notFound("Team selection not found");
  }
  if (!isWriter(actor, existing.institute_id)) {
    throw AppError.notFound("Team selection not found");
  }
  const deleted = await softDeleteTeamSelection(admin, id);
  if (!deleted) throw AppError.notFound("Team selection not found");
}

// ── Medical Fitness service ──────────────────────────────────────

export async function listMedicalFitnessForActor(
  admin: SupabaseClient,
  actor: Actor,
  instituteIdRaw: string,
  studentId?: string,
): Promise<MedicalFitnessDto[]> {
  const instituteId = requireInstituteId(actor, instituteIdRaw);
  const rows = await listMedicalFitness(admin, instituteId, studentId);
  if (isStaffReader(actor, instituteId)) return rows.map(toMedicalFitnessDto);
  const out: MedicalFitnessDto[] = [];
  for (const r of rows) {
    if (await canAccessStudentRecord(admin, actor, r.institute_id, r.student_id)) {
      out.push(toMedicalFitnessDto(r));
    }
  }
  return out;
}

export async function createMedicalFitnessForActor(
  admin: SupabaseClient,
  actor: Actor,
  input: CreateMedicalFitnessInput,
): Promise<MedicalFitnessDto> {
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
  assertDate(input.assessedOn, "assessed_on");
  assertOptionalDate(input.validUntil, "valid_until");
  const row = await insertMedicalFitness(admin, {
    ...input,
    instituteId,
    createdByUserId: actor.userId,
    clearanceStatus: input.clearanceStatus ?? "pending",
  });
  return toMedicalFitnessDto(row);
}

export async function updateMedicalFitnessForActor(
  admin: SupabaseClient,
  actor: Actor,
  id: string,
  input: UpdateMedicalFitnessInput,
): Promise<MedicalFitnessDto> {
  const existing = await findMedicalFitnessById(admin, id);
  if (!existing) throw AppError.notFound("Medical fitness not found");
  if (!isWriter(actor, existing.institute_id)) {
    throw AppError.notFound("Medical fitness not found");
  }
  const patch: Record<string, unknown> = {};
  if (input.clearanceStatus !== undefined) patch.clearance_status = input.clearanceStatus;
  if (input.validUntil !== undefined) {
    assertOptionalDate(input.validUntil, "valid_until");
    patch.valid_until = input.validUntil;
  }
  if (input.notes !== undefined) patch.notes = input.notes?.trim() || null;
  if (input.assessedOn !== undefined) {
    assertDate(input.assessedOn, "assessed_on");
    patch.assessed_on = input.assessedOn;
  }
  if (Object.keys(patch).length === 0) return toMedicalFitnessDto(existing);
  const updated = await updateMedicalFitnessFields(admin, id, patch);
  if (!updated) throw AppError.notFound("Medical fitness not found");
  return toMedicalFitnessDto(updated);
}

export async function deleteMedicalFitnessForActor(
  admin: SupabaseClient,
  actor: Actor,
  id: string,
): Promise<void> {
  const existing = await findMedicalFitnessById(admin, id);
  if (!existing) throw AppError.notFound("Medical fitness not found");
  if (!isWriter(actor, existing.institute_id)) {
    throw AppError.notFound("Medical fitness not found");
  }
  const deleted = await softDeleteMedicalFitness(admin, id);
  if (!deleted) throw AppError.notFound("Medical fitness not found");
}

// ── Calendar Event service ───────────────────────────────────────

export async function listCalendarEventsForActor(
  admin: SupabaseClient,
  actor: Actor,
  instituteIdRaw: string,
  teamId?: string,
): Promise<CalendarEventDto[]> {
  const instituteId = requireInstituteId(actor, instituteIdRaw);
  if (!isMember(actor, instituteId)) return [];
  const rows = await listCalendarEvents(admin, instituteId, teamId);
  return rows.map(toCalendarEventDto);
}

export async function createCalendarEventForActor(
  admin: SupabaseClient,
  actor: Actor,
  input: CreateCalendarEventInput,
): Promise<CalendarEventDto> {
  const instituteId = requireInstituteId(actor, input.instituteId);
  if (!isWriter(actor, instituteId)) {
    throw AppError.forbidden("Insufficient activity write access");
  }
  const title = input.title.trim();
  if (!title) {
    throw AppError.validation("Referenced resource is invalid", {
      title: ["Required"],
    });
  }
  assertDate(input.eventOn, "event_on");
  assertOptionalTime(input.startTime, "start_time");
  assertOptionalTime(input.endTime, "end_time");
  if (input.sectionId) {
    const section = await findSectionById(admin, input.sectionId);
    if (!section || section.institute_id !== instituteId) {
      throw AppError.validation("Referenced resource is invalid", {
        section_id: ["Section not found in this institute"],
      });
    }
  }
  if (input.teamId) {
    const team = await findTeamById(admin, input.teamId);
    if (!team || team.institute_id !== instituteId) {
      throw AppError.validation("Referenced resource is invalid", {
        team_id: ["Team not found in this institute"],
      });
    }
  }
  const row = await insertCalendarEvent(admin, {
    ...input,
    instituteId,
    title,
    createdByUserId: actor.userId,
    eventKind: input.eventKind ?? "other",
  });
  return toCalendarEventDto(row);
}

export async function updateCalendarEventForActor(
  admin: SupabaseClient,
  actor: Actor,
  id: string,
  input: UpdateCalendarEventInput,
): Promise<CalendarEventDto> {
  const existing = await findCalendarEventById(admin, id);
  if (!existing) throw AppError.notFound("Calendar event not found");
  if (!isWriter(actor, existing.institute_id)) {
    throw AppError.notFound("Calendar event not found");
  }
  if (input.sectionId) {
    const section = await findSectionById(admin, input.sectionId);
    if (!section || section.institute_id !== existing.institute_id) {
      throw AppError.validation("Referenced resource is invalid", {
        section_id: ["Section not found in this institute"],
      });
    }
  }
  if (input.teamId) {
    const team = await findTeamById(admin, input.teamId);
    if (!team || team.institute_id !== existing.institute_id) {
      throw AppError.validation("Referenced resource is invalid", {
        team_id: ["Team not found in this institute"],
      });
    }
  }
  const patch: Record<string, unknown> = {};
  if (input.title !== undefined) patch.title = input.title.trim();
  if (input.eventOn !== undefined) {
    assertDate(input.eventOn, "event_on");
    patch.event_on = input.eventOn;
  }
  if (input.startTime !== undefined) {
    assertOptionalTime(input.startTime, "start_time");
    patch.start_time = input.startTime;
  }
  if (input.endTime !== undefined) {
    assertOptionalTime(input.endTime, "end_time");
    patch.end_time = input.endTime;
  }
  if (input.venueText !== undefined) patch.venue_text = input.venueText?.trim() || null;
  if (input.eventKind !== undefined) patch.event_kind = input.eventKind;
  if (input.sourceRef !== undefined) patch.source_ref = input.sourceRef?.trim() || null;
  if (input.sectionId !== undefined) patch.section_id = input.sectionId;
  if (input.teamId !== undefined) patch.team_id = input.teamId;
  if (Object.keys(patch).length === 0) return toCalendarEventDto(existing);
  const updated = await updateCalendarEventFields(admin, id, patch);
  if (!updated) throw AppError.notFound("Calendar event not found");
  return toCalendarEventDto(updated);
}

export async function deleteCalendarEventForActor(
  admin: SupabaseClient,
  actor: Actor,
  id: string,
): Promise<void> {
  const existing = await findCalendarEventById(admin, id);
  if (!existing) throw AppError.notFound("Calendar event not found");
  if (!isWriter(actor, existing.institute_id)) {
    throw AppError.notFound("Calendar event not found");
  }
  const deleted = await softDeleteCalendarEvent(admin, id);
  if (!deleted) throw AppError.notFound("Calendar event not found");
}
