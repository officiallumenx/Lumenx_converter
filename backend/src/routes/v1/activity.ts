import { Hono } from "hono";
import { z } from "zod";
import { requireAuth, assertAuthenticated } from "../../auth/require-auth.js";
import type { AppBindings } from "../../types/app.js";
import { AppError } from "../../errors/app-error.js";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "../../validation/validate.js";
import {
  createAchievementForActor,
  createMembershipForActor,
  createPracticeSessionForActor,
  createSectionForActor,
  createTeamForActor,
  deleteAchievementForActor,
  deleteMembershipForActor,
  deletePracticeSessionForActor,
  deleteSectionForActor,
  deleteTeamForActor,
  getPracticeSessionForActor,
  getSectionForActor,
  getTeamForActor,
  listAchievementsForActor,
  listMembershipsForActor,
  listPracticeSessionsForActor,
  listSectionsForActor,
  listTeamsForActor,
  updateAchievementForActor,
  updateMembershipForActor,
  updatePracticeSessionForActor,
  updateSectionForActor,
  updateTeamForActor,
} from "../../domains/activity/service.js";

const activity = new Hono<AppBindings>();
activity.use("*", requireAuth);

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
const domainSchema = z.enum(["sports", "eca"]);
const sportsCategorySchema = z.enum(["indoor", "outdoor"]);
const sectionStatusSchema = z.enum(["draft", "active", "archived"]);
const teamKindSchema = z.enum(["team", "group"]);
const teamStatusSchema = z.enum(["active", "archived"]);
const membershipRoleSchema = z.enum(["member", "captain", "coach_assist"]);
const membershipStatusSchema = z.enum(["active", "left"]);
const achievementKindSchema = z.enum([
  "award",
  "certificate",
  "participation",
  "other",
]);
const practiceStatusSchema = z.enum(["scheduled", "completed", "cancelled"]);

// ── Sections ─────────────────────────────────────────────────────

activity.get("/sections", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const query = validateQuery(
    z.object({ institute_id: uuid }),
    c.req.query(),
  );
  const data = await listSectionsForActor(admin, actor, query.institute_id);
  return c.json({ data });
});

activity.post("/sections", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const body = validateBody(
    z.object({
      institute_id: uuid,
      domain: domainSchema,
      sports_category: sportsCategorySchema.nullable().optional(),
      name: z.string().min(1).max(300),
      slug: z.string().min(1).max(200).optional(),
      description: z.string().max(8000).nullable().optional(),
      status: sectionStatusSchema.optional(),
    }),
    await c.req.json(),
  );
  const data = await createSectionForActor(admin, actor, {
    instituteId: body.institute_id,
    domain: body.domain,
    sportsCategory: body.sports_category,
    name: body.name,
    slug: body.slug,
    description: body.description,
    status: body.status,
  });
  return c.json({ data }, 201);
});

activity.get("/sections/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const data = await getSectionForActor(admin, actor, id);
  return c.json({ data });
});

activity.patch("/sections/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const body = validateBody(
    z.object({
      name: z.string().min(1).max(300).optional(),
      slug: z.string().min(1).max(200).optional(),
      description: z.string().max(8000).nullable().optional(),
      sports_category: sportsCategorySchema.nullable().optional(),
      status: sectionStatusSchema.optional(),
    }),
    await c.req.json(),
  );
  const data = await updateSectionForActor(admin, actor, id, {
    name: body.name,
    slug: body.slug,
    description: body.description,
    sportsCategory: body.sports_category,
    status: body.status,
  });
  return c.json({ data });
});

activity.delete("/sections/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  await deleteSectionForActor(admin, actor, id);
  return c.json({ data: { ok: true } });
});

// ── Teams ────────────────────────────────────────────────────────

activity.get("/teams", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const query = validateQuery(
    z.object({
      institute_id: uuid,
      section_id: uuid.optional(),
    }),
    c.req.query(),
  );
  const data = await listTeamsForActor(
    admin,
    actor,
    query.institute_id,
    query.section_id,
  );
  return c.json({ data });
});

activity.post("/teams", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const body = validateBody(
    z.object({
      institute_id: uuid,
      section_id: uuid,
      kind: teamKindSchema,
      name: z.string().min(1).max(300),
      status: teamStatusSchema.optional(),
    }),
    await c.req.json(),
  );
  const data = await createTeamForActor(admin, actor, {
    instituteId: body.institute_id,
    sectionId: body.section_id,
    kind: body.kind,
    name: body.name,
    status: body.status,
  });
  return c.json({ data }, 201);
});

activity.get("/teams/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const data = await getTeamForActor(admin, actor, id);
  return c.json({ data });
});

activity.patch("/teams/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const body = validateBody(
    z.object({
      name: z.string().min(1).max(300).optional(),
      kind: teamKindSchema.optional(),
      status: teamStatusSchema.optional(),
    }),
    await c.req.json(),
  );
  const data = await updateTeamForActor(admin, actor, id, {
    name: body.name,
    kind: body.kind,
    status: body.status,
  });
  return c.json({ data });
});

activity.delete("/teams/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  await deleteTeamForActor(admin, actor, id);
  return c.json({ data: { ok: true } });
});

// ── Memberships ──────────────────────────────────────────────────

activity.get("/memberships", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const query = validateQuery(
    z.object({
      institute_id: uuid,
      team_id: uuid.optional(),
    }),
    c.req.query(),
  );
  const data = await listMembershipsForActor(
    admin,
    actor,
    query.institute_id,
    query.team_id,
  );
  return c.json({ data });
});

activity.post("/memberships", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const body = validateBody(
    z.object({
      institute_id: uuid,
      team_id: uuid,
      student_id: uuid,
      role: membershipRoleSchema.optional(),
    }),
    await c.req.json(),
  );
  const data = await createMembershipForActor(admin, actor, {
    instituteId: body.institute_id,
    teamId: body.team_id,
    studentId: body.student_id,
    role: body.role,
  });
  return c.json({ data }, 201);
});

activity.patch("/memberships/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const body = validateBody(
    z.object({
      role: membershipRoleSchema.optional(),
      status: membershipStatusSchema.optional(),
    }),
    await c.req.json(),
  );
  const data = await updateMembershipForActor(admin, actor, id, {
    role: body.role,
    status: body.status,
  });
  return c.json({ data });
});

activity.delete("/memberships/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  await deleteMembershipForActor(admin, actor, id);
  return c.json({ data: { ok: true } });
});

// ── Achievements ─────────────────────────────────────────────────

activity.get("/achievements", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const query = validateQuery(
    z.object({
      institute_id: uuid,
      student_id: uuid.optional(),
    }),
    c.req.query(),
  );
  const data = await listAchievementsForActor(
    admin,
    actor,
    query.institute_id,
    query.student_id,
  );
  return c.json({ data });
});

activity.post("/achievements", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const body = validateBody(
    z.object({
      institute_id: uuid,
      student_id: uuid,
      section_id: uuid.nullable().optional(),
      team_id: uuid.nullable().optional(),
      title: z.string().min(1).max(300),
      kind: achievementKindSchema.optional(),
      awarded_on: z.string().min(1).max(32),
      notes: z.string().max(4000).nullable().optional(),
    }),
    await c.req.json(),
  );
  const data = await createAchievementForActor(admin, actor, {
    instituteId: body.institute_id,
    studentId: body.student_id,
    sectionId: body.section_id,
    teamId: body.team_id,
    title: body.title,
    kind: body.kind,
    awardedOn: body.awarded_on,
    notes: body.notes,
  });
  return c.json({ data }, 201);
});

activity.patch("/achievements/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const body = validateBody(
    z.object({
      title: z.string().min(1).max(300).optional(),
      kind: achievementKindSchema.optional(),
      awarded_on: z.string().min(1).max(32).optional(),
      notes: z.string().max(4000).nullable().optional(),
      section_id: uuid.nullable().optional(),
      team_id: uuid.nullable().optional(),
    }),
    await c.req.json(),
  );
  const data = await updateAchievementForActor(admin, actor, id, {
    title: body.title,
    kind: body.kind,
    awardedOn: body.awarded_on,
    notes: body.notes,
    sectionId: body.section_id,
    teamId: body.team_id,
  });
  return c.json({ data });
});

activity.delete("/achievements/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  await deleteAchievementForActor(admin, actor, id);
  return c.json({ data: { ok: true } });
});

// ── Practice sessions ────────────────────────────────────────────

activity.get("/practice-sessions", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const query = validateQuery(
    z.object({
      institute_id: uuid,
      team_id: uuid.optional(),
    }),
    c.req.query(),
  );
  const data = await listPracticeSessionsForActor(
    admin,
    actor,
    query.institute_id,
    query.team_id,
  );
  return c.json({ data });
});

activity.post("/practice-sessions", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const body = validateBody(
    z.object({
      institute_id: uuid,
      team_id: uuid,
      title: z.string().min(1).max(300),
      scheduled_on: z.string().min(1).max(32),
      start_time: z.string().max(16).nullable().optional(),
      end_time: z.string().max(16).nullable().optional(),
      location: z.string().max(300).nullable().optional(),
      notes: z.string().max(4000).nullable().optional(),
      status: practiceStatusSchema.optional(),
    }),
    await c.req.json(),
  );
  const data = await createPracticeSessionForActor(admin, actor, {
    instituteId: body.institute_id,
    teamId: body.team_id,
    title: body.title,
    scheduledOn: body.scheduled_on,
    startTime: body.start_time,
    endTime: body.end_time,
    location: body.location,
    notes: body.notes,
    status: body.status,
  });
  return c.json({ data }, 201);
});

activity.get("/practice-sessions/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const data = await getPracticeSessionForActor(admin, actor, id);
  return c.json({ data });
});

activity.patch("/practice-sessions/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const body = validateBody(
    z.object({
      title: z.string().min(1).max(300).optional(),
      scheduled_on: z.string().min(1).max(32).optional(),
      start_time: z.string().max(16).nullable().optional(),
      end_time: z.string().max(16).nullable().optional(),
      location: z.string().max(300).nullable().optional(),
      notes: z.string().max(4000).nullable().optional(),
      status: practiceStatusSchema.optional(),
    }),
    await c.req.json(),
  );
  const data = await updatePracticeSessionForActor(admin, actor, id, {
    title: body.title,
    scheduledOn: body.scheduled_on,
    startTime: body.start_time,
    endTime: body.end_time,
    location: body.location,
    notes: body.notes,
    status: body.status,
  });
  return c.json({ data });
});

activity.delete("/practice-sessions/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  await deletePracticeSessionForActor(admin, actor, id);
  return c.json({ data: { ok: true } });
});

export default activity;
