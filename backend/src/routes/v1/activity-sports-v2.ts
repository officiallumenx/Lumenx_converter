import { Hono } from "hono";
import { z } from "zod";
import { assertAuthenticated } from "../../auth/require-auth.js";
import type { AppBindings } from "../../types/app.js";
import { AppError } from "../../errors/app-error.js";
import { validateBody, validateParams, validateQuery } from "../../validation/validate.js";
import {
  createVenueForActor,
  updateVenueForActor,
  deleteVenueForActor,
  listVenuesForActor,
  createEquipmentForActor,
  updateEquipmentForActor,
  deleteEquipmentForActor,
  listEquipmentForActor,
  createTournamentForActor,
  updateTournamentForActor,
  deleteTournamentForActor,
  listTournamentsForActor,
  createMatchResultForActor,
  updateMatchResultForActor,
  deleteMatchResultForActor,
  listMatchResultsForActor,
  createCoachNoteForActor,
  updateCoachNoteForActor,
  deleteCoachNoteForActor,
  listCoachNotesForActor,
  createSportsAttendanceForActor,
  updateSportsAttendanceForActor,
  deleteSportsAttendanceForActor,
  listSportsAttendanceForActor,
  createTeamSelectionForActor,
  updateTeamSelectionForActor,
  deleteTeamSelectionForActor,
  listTeamSelectionsForActor,
  createMedicalFitnessForActor,
  updateMedicalFitnessForActor,
  deleteMedicalFitnessForActor,
  listMedicalFitnessForActor,
  createCalendarEventForActor,
  updateCalendarEventForActor,
  deleteCalendarEventForActor,
  listCalendarEventsForActor,
} from "../../domains/activity/sports-v2-service.js";

const sportsV2 = new Hono<AppBindings>();

function requireAdmin(c: {
  get: (k: "supabase") => AppBindings["Variables"]["supabase"];
}) {
  const clients = c.get("supabase");
  if (!clients?.admin) {
    throw AppError.internal("Database unavailable");
  }
  return clients.admin;
}

const uuid = z.string().uuid();
const idParamsSchema = z.object({ id: uuid });

// ── Venue schemas ────────────────────────────────────────────────

const venueStatusSchema = z.enum(["active", "archived"]);

sportsV2.get("/venues", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const query = validateQuery(z.object({ institute_id: uuid }), c.req.query());
  const data = await listVenuesForActor(admin, actor, query.institute_id);
  return c.json({ data });
});

sportsV2.post("/venues", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const body = validateBody(
    z.object({
      institute_id: uuid,
      name: z.string().min(1).max(300),
      venue_type: z.string().max(200).nullable().optional(),
      location_notes: z.string().max(4000).nullable().optional(),
      capacity: z.number().int().min(0).nullable().optional(),
      status: venueStatusSchema.optional(),
    }),
    await c.req.json(),
  );
  const data = await createVenueForActor(admin, actor, {
    instituteId: body.institute_id,
    name: body.name,
    venueType: body.venue_type,
    locationNotes: body.location_notes,
    capacity: body.capacity,
    status: body.status,
  });
  return c.json({ data }, 201);
});

sportsV2.patch("/venues/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const body = validateBody(
    z.object({
      name: z.string().min(1).max(300).optional(),
      venue_type: z.string().max(200).nullable().optional(),
      location_notes: z.string().max(4000).nullable().optional(),
      capacity: z.number().int().min(0).nullable().optional(),
      status: venueStatusSchema.optional(),
    }),
    await c.req.json(),
  );
  const data = await updateVenueForActor(admin, actor, id, {
    name: body.name,
    venueType: body.venue_type,
    locationNotes: body.location_notes,
    capacity: body.capacity,
    status: body.status,
  });
  return c.json({ data });
});

sportsV2.delete("/venues/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  await deleteVenueForActor(admin, actor, id);
  return c.json({ data: { ok: true } });
});

// ── Equipment schemas ────────────────────────────────────────────

const equipmentConditionSchema = z.enum(["good", "fair", "poor", "retired"]);
const equipmentStatusSchema = z.enum(["active", "archived"]);

sportsV2.get("/equipment", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const query = validateQuery(z.object({ institute_id: uuid }), c.req.query());
  const data = await listEquipmentForActor(admin, actor, query.institute_id);
  return c.json({ data });
});

sportsV2.post("/equipment", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const body = validateBody(
    z.object({
      institute_id: uuid,
      name: z.string().min(1).max(300),
      category: z.string().max(200).nullable().optional(),
      quantity: z.number().int().min(0).optional(),
      condition: equipmentConditionSchema.optional(),
      status: equipmentStatusSchema.optional(),
      notes: z.string().max(4000).nullable().optional(),
    }),
    await c.req.json(),
  );
  const data = await createEquipmentForActor(admin, actor, {
    instituteId: body.institute_id,
    name: body.name,
    category: body.category,
    quantity: body.quantity,
    condition: body.condition,
    status: body.status,
    notes: body.notes,
  });
  return c.json({ data }, 201);
});

sportsV2.patch("/equipment/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const body = validateBody(
    z.object({
      name: z.string().min(1).max(300).optional(),
      category: z.string().max(200).nullable().optional(),
      quantity: z.number().int().min(0).optional(),
      condition: equipmentConditionSchema.optional(),
      status: equipmentStatusSchema.optional(),
      notes: z.string().max(4000).nullable().optional(),
    }),
    await c.req.json(),
  );
  const data = await updateEquipmentForActor(admin, actor, id, {
    name: body.name,
    category: body.category,
    quantity: body.quantity,
    condition: body.condition,
    status: body.status,
    notes: body.notes,
  });
  return c.json({ data });
});

sportsV2.delete("/equipment/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  await deleteEquipmentForActor(admin, actor, id);
  return c.json({ data: { ok: true } });
});

// ── Tournament schemas ───────────────────────────────────────────

const tournamentStatusSchema = z.enum([
  "draft", "scheduled", "ongoing", "completed", "cancelled", "archived",
]);

sportsV2.get("/tournaments", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const query = validateQuery(z.object({ institute_id: uuid }), c.req.query());
  const data = await listTournamentsForActor(admin, actor, query.institute_id);
  return c.json({ data });
});

sportsV2.post("/tournaments", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const body = validateBody(
    z.object({
      institute_id: uuid,
      section_id: uuid.nullable().optional(),
      venue_id: uuid.nullable().optional(),
      name: z.string().min(1).max(300),
      sport_label: z.string().max(200).nullable().optional(),
      tournament_type: z.string().max(200).nullable().optional(),
      starts_on: z.string().max(32).nullable().optional(),
      ends_on: z.string().max(32).nullable().optional(),
      status: tournamentStatusSchema.optional(),
      description: z.string().max(8000).nullable().optional(),
    }),
    await c.req.json(),
  );
  const data = await createTournamentForActor(admin, actor, {
    instituteId: body.institute_id,
    sectionId: body.section_id,
    venueId: body.venue_id,
    name: body.name,
    sportLabel: body.sport_label,
    tournamentType: body.tournament_type,
    startsOn: body.starts_on,
    endsOn: body.ends_on,
    status: body.status,
    description: body.description,
  });
  return c.json({ data }, 201);
});

sportsV2.patch("/tournaments/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const body = validateBody(
    z.object({
      section_id: uuid.nullable().optional(),
      venue_id: uuid.nullable().optional(),
      name: z.string().min(1).max(300).optional(),
      sport_label: z.string().max(200).nullable().optional(),
      tournament_type: z.string().max(200).nullable().optional(),
      starts_on: z.string().max(32).nullable().optional(),
      ends_on: z.string().max(32).nullable().optional(),
      status: tournamentStatusSchema.optional(),
      description: z.string().max(8000).nullable().optional(),
    }),
    await c.req.json(),
  );
  const data = await updateTournamentForActor(admin, actor, id, {
    sectionId: body.section_id,
    venueId: body.venue_id,
    name: body.name,
    sportLabel: body.sport_label,
    tournamentType: body.tournament_type,
    startsOn: body.starts_on,
    endsOn: body.ends_on,
    status: body.status,
    description: body.description,
  });
  return c.json({ data });
});

sportsV2.delete("/tournaments/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  await deleteTournamentForActor(admin, actor, id);
  return c.json({ data: { ok: true } });
});

// ── Match Result schemas ─────────────────────────────────────────

const matchResultStatusSchema = z.enum([
  "scheduled", "completed", "walkover", "cancelled",
]);

sportsV2.get("/match-results", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const query = validateQuery(
    z.object({ institute_id: uuid, tournament_id: uuid.optional() }),
    c.req.query(),
  );
  const data = await listMatchResultsForActor(
    admin, actor, query.institute_id, query.tournament_id,
  );
  return c.json({ data });
});

sportsV2.post("/match-results", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const body = validateBody(
    z.object({
      institute_id: uuid,
      tournament_id: uuid,
      match_label: z.string().min(1).max(300),
      played_on: z.string().max(32).nullable().optional(),
      venue_text: z.string().max(300).nullable().optional(),
      home_score: z.number().int().nullable().optional(),
      away_score: z.number().int().nullable().optional(),
      result_status: matchResultStatusSchema.optional(),
      notes: z.string().max(4000).nullable().optional(),
    }),
    await c.req.json(),
  );
  const data = await createMatchResultForActor(admin, actor, {
    instituteId: body.institute_id,
    tournamentId: body.tournament_id,
    matchLabel: body.match_label,
    playedOn: body.played_on,
    venueText: body.venue_text,
    homeScore: body.home_score,
    awayScore: body.away_score,
    resultStatus: body.result_status,
    notes: body.notes,
  });
  return c.json({ data }, 201);
});

sportsV2.patch("/match-results/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const body = validateBody(
    z.object({
      match_label: z.string().min(1).max(300).optional(),
      played_on: z.string().max(32).nullable().optional(),
      venue_text: z.string().max(300).nullable().optional(),
      home_score: z.number().int().nullable().optional(),
      away_score: z.number().int().nullable().optional(),
      result_status: matchResultStatusSchema.optional(),
      notes: z.string().max(4000).nullable().optional(),
    }),
    await c.req.json(),
  );
  const data = await updateMatchResultForActor(admin, actor, id, {
    matchLabel: body.match_label,
    playedOn: body.played_on,
    venueText: body.venue_text,
    homeScore: body.home_score,
    awayScore: body.away_score,
    resultStatus: body.result_status,
    notes: body.notes,
  });
  return c.json({ data });
});

sportsV2.delete("/match-results/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  await deleteMatchResultForActor(admin, actor, id);
  return c.json({ data: { ok: true } });
});

// ── Coach Note schemas ───────────────────────────────────────────

const coachNoteVisibilitySchema = z.enum(["staff", "guardians"]);

sportsV2.get("/coach-notes", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const query = validateQuery(
    z.object({ institute_id: uuid, team_id: uuid.optional() }),
    c.req.query(),
  );
  const data = await listCoachNotesForActor(
    admin, actor, query.institute_id, query.team_id,
  );
  return c.json({ data });
});

sportsV2.post("/coach-notes", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const body = validateBody(
    z.object({
      institute_id: uuid,
      team_id: uuid,
      student_id: uuid.nullable().optional(),
      note_date: z.string().min(1).max(32),
      body: z.string().min(1).max(8000),
      visibility: coachNoteVisibilitySchema.optional(),
    }),
    await c.req.json(),
  );
  const data = await createCoachNoteForActor(admin, actor, {
    instituteId: body.institute_id,
    teamId: body.team_id,
    studentId: body.student_id,
    noteDate: body.note_date,
    body: body.body,
    visibility: body.visibility,
  });
  return c.json({ data }, 201);
});

sportsV2.patch("/coach-notes/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const body = validateBody(
    z.object({
      body: z.string().min(1).max(8000).optional(),
      visibility: coachNoteVisibilitySchema.optional(),
      note_date: z.string().min(1).max(32).optional(),
      student_id: uuid.nullable().optional(),
    }),
    await c.req.json(),
  );
  const data = await updateCoachNoteForActor(admin, actor, id, {
    body: body.body,
    visibility: body.visibility,
    noteDate: body.note_date,
    studentId: body.student_id,
  });
  return c.json({ data });
});

sportsV2.delete("/coach-notes/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  await deleteCoachNoteForActor(admin, actor, id);
  return c.json({ data: { ok: true } });
});

// ── Sports Attendance schemas ────────────────────────────────────

const sportsAttendanceStatusSchema = z.enum([
  "present", "absent", "late", "excused",
]);

sportsV2.get("/sports-attendance", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const query = validateQuery(
    z.object({ institute_id: uuid, team_id: uuid.optional() }),
    c.req.query(),
  );
  const data = await listSportsAttendanceForActor(
    admin, actor, query.institute_id, query.team_id,
  );
  return c.json({ data });
});

sportsV2.post("/sports-attendance", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const body = validateBody(
    z.object({
      institute_id: uuid,
      team_id: uuid,
      session_on: z.string().min(1).max(32),
      student_id: uuid,
      status: sportsAttendanceStatusSchema.optional(),
      notes: z.string().max(4000).nullable().optional(),
    }),
    await c.req.json(),
  );
  const data = await createSportsAttendanceForActor(admin, actor, {
    instituteId: body.institute_id,
    teamId: body.team_id,
    sessionOn: body.session_on,
    studentId: body.student_id,
    status: body.status,
    notes: body.notes,
  });
  return c.json({ data }, 201);
});

sportsV2.patch("/sports-attendance/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const body = validateBody(
    z.object({
      status: sportsAttendanceStatusSchema.optional(),
      notes: z.string().max(4000).nullable().optional(),
    }),
    await c.req.json(),
  );
  const data = await updateSportsAttendanceForActor(admin, actor, id, {
    status: body.status,
    notes: body.notes,
  });
  return c.json({ data });
});

sportsV2.delete("/sports-attendance/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  await deleteSportsAttendanceForActor(admin, actor, id);
  return c.json({ data: { ok: true } });
});

// ── Team Selection schemas ───────────────────────────────────────

const teamSelectionStatusSchema = z.enum(["draft", "published", "archived"]);

sportsV2.get("/team-selections", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const query = validateQuery(
    z.object({ institute_id: uuid, team_id: uuid.optional() }),
    c.req.query(),
  );
  const data = await listTeamSelectionsForActor(
    admin, actor, query.institute_id, query.team_id,
  );
  return c.json({ data });
});

sportsV2.post("/team-selections", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const body = validateBody(
    z.object({
      institute_id: uuid,
      team_id: uuid,
      title: z.string().min(1).max(300),
      event_on: z.string().max(32).nullable().optional(),
      venue_text: z.string().max(300).nullable().optional(),
      status: teamSelectionStatusSchema.optional(),
      notes: z.string().max(4000).nullable().optional(),
      member_student_ids: z.array(uuid).optional(),
    }),
    await c.req.json(),
  );
  const data = await createTeamSelectionForActor(admin, actor, {
    instituteId: body.institute_id,
    teamId: body.team_id,
    title: body.title,
    eventOn: body.event_on,
    venueText: body.venue_text,
    status: body.status,
    notes: body.notes,
    memberStudentIds: body.member_student_ids,
  });
  return c.json({ data }, 201);
});

sportsV2.patch("/team-selections/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const body = validateBody(
    z.object({
      title: z.string().min(1).max(300).optional(),
      event_on: z.string().max(32).nullable().optional(),
      venue_text: z.string().max(300).nullable().optional(),
      status: teamSelectionStatusSchema.optional(),
      notes: z.string().max(4000).nullable().optional(),
    }),
    await c.req.json(),
  );
  const data = await updateTeamSelectionForActor(admin, actor, id, {
    title: body.title,
    eventOn: body.event_on,
    venueText: body.venue_text,
    status: body.status,
    notes: body.notes,
  });
  return c.json({ data });
});

sportsV2.delete("/team-selections/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  await deleteTeamSelectionForActor(admin, actor, id);
  return c.json({ data: { ok: true } });
});

// ── Medical Fitness schemas ──────────────────────────────────────

const medicalClearanceSchema = z.enum([
  "clear", "restricted", "unfit", "pending",
]);

sportsV2.get("/medical-fitness", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const query = validateQuery(
    z.object({ institute_id: uuid, student_id: uuid.optional() }),
    c.req.query(),
  );
  const data = await listMedicalFitnessForActor(
    admin, actor, query.institute_id, query.student_id,
  );
  return c.json({ data });
});

sportsV2.post("/medical-fitness", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const body = validateBody(
    z.object({
      institute_id: uuid,
      student_id: uuid,
      clearance_status: medicalClearanceSchema.optional(),
      valid_until: z.string().max(32).nullable().optional(),
      notes: z.string().max(4000).nullable().optional(),
      assessed_on: z.string().min(1).max(32),
    }),
    await c.req.json(),
  );
  const data = await createMedicalFitnessForActor(admin, actor, {
    instituteId: body.institute_id,
    studentId: body.student_id,
    clearanceStatus: body.clearance_status,
    validUntil: body.valid_until,
    notes: body.notes,
    assessedOn: body.assessed_on,
  });
  return c.json({ data }, 201);
});

sportsV2.patch("/medical-fitness/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const body = validateBody(
    z.object({
      clearance_status: medicalClearanceSchema.optional(),
      valid_until: z.string().max(32).nullable().optional(),
      notes: z.string().max(4000).nullable().optional(),
      assessed_on: z.string().min(1).max(32).optional(),
    }),
    await c.req.json(),
  );
  const data = await updateMedicalFitnessForActor(admin, actor, id, {
    clearanceStatus: body.clearance_status,
    validUntil: body.valid_until,
    notes: body.notes,
    assessedOn: body.assessed_on,
  });
  return c.json({ data });
});

sportsV2.delete("/medical-fitness/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  await deleteMedicalFitnessForActor(admin, actor, id);
  return c.json({ data: { ok: true } });
});

// ── Calendar Event schemas ───────────────────────────────────────

const calendarEventKindSchema = z.enum([
  "practice", "match", "tournament", "other",
]);

sportsV2.get("/calendar-events", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const query = validateQuery(
    z.object({ institute_id: uuid, team_id: uuid.optional() }),
    c.req.query(),
  );
  const data = await listCalendarEventsForActor(
    admin, actor, query.institute_id, query.team_id,
  );
  return c.json({ data });
});

sportsV2.post("/calendar-events", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const body = validateBody(
    z.object({
      institute_id: uuid,
      section_id: uuid.nullable().optional(),
      team_id: uuid.nullable().optional(),
      title: z.string().min(1).max(300),
      event_on: z.string().min(1).max(32),
      start_time: z.string().max(16).nullable().optional(),
      end_time: z.string().max(16).nullable().optional(),
      venue_text: z.string().max(300).nullable().optional(),
      event_kind: calendarEventKindSchema.optional(),
      source_ref: z.string().max(500).nullable().optional(),
    }),
    await c.req.json(),
  );
  const data = await createCalendarEventForActor(admin, actor, {
    instituteId: body.institute_id,
    sectionId: body.section_id,
    teamId: body.team_id,
    title: body.title,
    eventOn: body.event_on,
    startTime: body.start_time,
    endTime: body.end_time,
    venueText: body.venue_text,
    eventKind: body.event_kind,
    sourceRef: body.source_ref,
  });
  return c.json({ data }, 201);
});

sportsV2.patch("/calendar-events/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const body = validateBody(
    z.object({
      section_id: uuid.nullable().optional(),
      team_id: uuid.nullable().optional(),
      title: z.string().min(1).max(300).optional(),
      event_on: z.string().min(1).max(32).optional(),
      start_time: z.string().max(16).nullable().optional(),
      end_time: z.string().max(16).nullable().optional(),
      venue_text: z.string().max(300).nullable().optional(),
      event_kind: calendarEventKindSchema.optional(),
      source_ref: z.string().max(500).nullable().optional(),
    }),
    await c.req.json(),
  );
  const data = await updateCalendarEventForActor(admin, actor, id, {
    sectionId: body.section_id,
    teamId: body.team_id,
    title: body.title,
    eventOn: body.event_on,
    startTime: body.start_time,
    endTime: body.end_time,
    venueText: body.venue_text,
    eventKind: body.event_kind,
    sourceRef: body.source_ref,
  });
  return c.json({ data });
});

sportsV2.delete("/calendar-events/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  await deleteCalendarEventForActor(admin, actor, id);
  return c.json({ data: { ok: true } });
});

export default sportsV2;
