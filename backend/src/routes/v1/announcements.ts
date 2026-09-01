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
  archiveAnnouncementForActor,
  createAnnouncementForActor,
  deleteAnnouncementForActor,
  getAnnouncementForActor,
  listAnnouncementsForActor,
  publishAnnouncementForActor,
  recordAnnouncementViewForActor,
  updateAnnouncementForActor,
} from "../../domains/announcements/service.js";

const announcements = new Hono<AppBindings>();
announcements.use("*", requireAuth);

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
const statusSchema = z.enum(["draft", "scheduled", "published", "archived"]);
const audienceScopeSchema = z.enum([
  "all",
  "students",
  "parents",
  "teachers",
  "classes",
  "activity_team",
]);

announcements.get("/", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const query = validateQuery(
    z.object({
      institute_id: uuid,
      status: statusSchema.optional(),
      audience_scope: audienceScopeSchema.optional(),
      pinned: z.enum(["true", "false"]).optional(),
    }),
    c.req.query(),
  );
  const data = await listAnnouncementsForActor(admin, actor, {
    instituteId: query.institute_id,
    status: query.status,
    audienceScope: query.audience_scope,
    pinned: query.pinned === undefined ? undefined : query.pinned === "true",
  });
  return c.json({ data });
});

announcements.post("/", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const body = validateBody(
    z.object({
      institute_id: uuid,
      title: z.string().min(1).max(300),
      body: z.string().max(20000).nullable().optional(),
      audience_scope: audienceScopeSchema.optional(),
      audience_label: z.string().max(300).nullable().optional(),
      class_id: uuid.nullable().optional(),
      section_id: uuid.nullable().optional(),
      activity_team_id: uuid.nullable().optional(),
      scheduled_at: z.string().datetime({ offset: true }).nullable().optional(),
      publish_now: z.boolean().optional(),
      pinned: z.boolean().optional(),
      pin_until: z.string().datetime({ offset: true }).nullable().optional(),
    }),
    await c.req.json(),
  );

  const data = await createAnnouncementForActor(admin, actor, {
    instituteId: body.institute_id,
    title: body.title,
    body: body.body,
    audienceScope: body.audience_scope,
    audienceLabel: body.audience_label,
    classId: body.class_id,
    sectionId: body.section_id,
    activityTeamId: body.activity_team_id,
    scheduledAt: body.scheduled_at,
    publishNow: body.publish_now,
    pinned: body.pinned,
    pinUntil: body.pin_until,
  });
  return c.json({ data }, 201);
});

announcements.get("/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const data = await getAnnouncementForActor(admin, actor, id);
  return c.json({ data });
});

announcements.patch("/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const body = validateBody(
    z.object({
      title: z.string().min(1).max(300).optional(),
      body: z.string().max(20000).nullable().optional(),
      audience_scope: audienceScopeSchema.optional(),
      audience_label: z.string().max(300).nullable().optional(),
      class_id: uuid.nullable().optional(),
      section_id: uuid.nullable().optional(),
      activity_team_id: uuid.nullable().optional(),
      scheduled_at: z.string().datetime({ offset: true }).nullable().optional(),
      pinned: z.boolean().optional(),
      pin_until: z.string().datetime({ offset: true }).nullable().optional(),
    }),
    await c.req.json(),
  );

  const data = await updateAnnouncementForActor(admin, actor, id, {
    title: body.title,
    body: body.body,
    audienceScope: body.audience_scope,
    audienceLabel: body.audience_label,
    classId: body.class_id,
    sectionId: body.section_id,
    activityTeamId: body.activity_team_id,
    scheduledAt: body.scheduled_at,
    pinned: body.pinned,
    pinUntil: body.pin_until,
  });
  return c.json({ data });
});

announcements.post("/:id/publish", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const data = await publishAnnouncementForActor(admin, actor, id);
  return c.json({ data });
});

announcements.post("/:id/archive", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const data = await archiveAnnouncementForActor(admin, actor, id);
  return c.json({ data });
});

announcements.post("/:id/view", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const data = await recordAnnouncementViewForActor(admin, actor, id);
  return c.json({ data });
});

announcements.delete("/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  await deleteAnnouncementForActor(admin, actor, id);
  return c.body(null, 204);
});

export default announcements;
