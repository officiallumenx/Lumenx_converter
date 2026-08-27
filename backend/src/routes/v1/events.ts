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
  cancelEventForActor,
  createEventForActor,
  deleteEventForActor,
  getEventForActor,
  listCalendarEventsForActor,
  listEventsForActor,
  publishEventForActor,
  updateEventForActor,
} from "../../domains/events/service.js";

const events = new Hono<AppBindings>();
events.use("*", requireAuth);

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
const dateOnly = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD");
const timeOnly = z
  .string()
  .regex(/^\d{2}:\d{2}(:\d{2})?$/, "Must be HH:MM or HH:MM:SS")
  .nullable()
  .optional();

const kindSchema = z.enum([
  "holiday",
  "exam",
  "meeting",
  "function",
  "custom",
]);
const sourceSchema = z.enum(["calendar", "events"]);
const audienceScopeSchema = z.enum([
  "all",
  "students",
  "parents",
  "teachers",
  "classes",
]);
const reminderSchema = z.enum([
  "none",
  "one_day",
  "one_hour",
  "one_week_one_day",
]);

const listQuerySchema = z.object({
  institute_id: uuid,
  source: sourceSchema.optional(),
  kind: kindSchema.optional(),
  published: z.enum(["true", "false"]).optional(),
  from: dateOnly.optional(),
  to: dateOnly.optional(),
  include_cancelled: z.enum(["true", "false"]).optional(),
});

events.get("/calendar", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const query = validateQuery(
    listQuerySchema.omit({ source: true, include_cancelled: true }),
    c.req.query(),
  );
  const data = await listCalendarEventsForActor(admin, actor, {
    instituteId: query.institute_id,
    kind: query.kind,
    published:
      query.published === undefined ? undefined : query.published === "true",
    from: query.from,
    to: query.to,
  });
  return c.json({ data });
});

events.get("/", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const query = validateQuery(listQuerySchema, c.req.query());
  const data = await listEventsForActor(admin, actor, {
    instituteId: query.institute_id,
    source: query.source,
    kind: query.kind,
    published:
      query.published === undefined ? undefined : query.published === "true",
    from: query.from,
    to: query.to,
    includeCancelled: query.include_cancelled === "true",
  });
  return c.json({ data });
});

events.post("/", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const body = validateBody(
    z.object({
      institute_id: uuid,
      title: z.string().min(1).max(300),
      kind: kindSchema,
      custom_kind_label: z.string().min(1).max(100).nullable().optional(),
      source: sourceSchema,
      starts_on: dateOnly,
      ends_on: dateOnly.nullable().optional(),
      start_time: timeOnly,
      end_time: timeOnly,
      audience_scope: audienceScopeSchema.optional(),
      audience_label: z.string().max(300).nullable().optional(),
      class_id: uuid.nullable().optional(),
      section_id: uuid.nullable().optional(),
      location: z.string().max(300).nullable().optional(),
      description: z.string().max(8000).nullable().optional(),
      reminder: reminderSchema.optional(),
      banner_asset_path: z.string().max(1000).nullable().optional(),
      registration_required: z.boolean().optional(),
      recurrence: z.string().max(200).nullable().optional(),
      published: z.boolean().optional(),
    }),
    await c.req.json(),
  );

  const data = await createEventForActor(admin, actor, {
    instituteId: body.institute_id,
    title: body.title,
    kind: body.kind,
    customKindLabel: body.custom_kind_label,
    source: body.source,
    startsOn: body.starts_on,
    endsOn: body.ends_on,
    startTime: body.start_time,
    endTime: body.end_time,
    audienceScope: body.audience_scope,
    audienceLabel: body.audience_label,
    classId: body.class_id,
    sectionId: body.section_id,
    location: body.location,
    description: body.description,
    reminder: body.reminder,
    bannerAssetPath: body.banner_asset_path,
    registrationRequired: body.registration_required,
    recurrence: body.recurrence,
    published: body.published,
  });
  return c.json({ data }, 201);
});

events.get("/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const data = await getEventForActor(admin, actor, id);
  return c.json({ data });
});

events.patch("/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const body = validateBody(
    z.object({
      title: z.string().min(1).max(300).optional(),
      kind: kindSchema.optional(),
      custom_kind_label: z.string().min(1).max(100).nullable().optional(),
      source: sourceSchema.optional(),
      starts_on: dateOnly.optional(),
      ends_on: dateOnly.nullable().optional(),
      start_time: timeOnly,
      end_time: timeOnly,
      audience_scope: audienceScopeSchema.optional(),
      audience_label: z.string().max(300).nullable().optional(),
      class_id: uuid.nullable().optional(),
      section_id: uuid.nullable().optional(),
      location: z.string().max(300).nullable().optional(),
      description: z.string().max(8000).nullable().optional(),
      reminder: reminderSchema.optional(),
      banner_asset_path: z.string().max(1000).nullable().optional(),
      registration_required: z.boolean().optional(),
      recurrence: z.string().max(200).nullable().optional(),
    }),
    await c.req.json(),
  );

  const data = await updateEventForActor(admin, actor, id, {
    title: body.title,
    kind: body.kind,
    customKindLabel: body.custom_kind_label,
    source: body.source,
    startsOn: body.starts_on,
    endsOn: body.ends_on,
    startTime: body.start_time,
    endTime: body.end_time,
    audienceScope: body.audience_scope,
    audienceLabel: body.audience_label,
    classId: body.class_id,
    sectionId: body.section_id,
    location: body.location,
    description: body.description,
    reminder: body.reminder,
    bannerAssetPath: body.banner_asset_path,
    registrationRequired: body.registration_required,
    recurrence: body.recurrence,
  });
  return c.json({ data });
});

events.post("/:id/publish", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const data = await publishEventForActor(admin, actor, id);
  return c.json({ data });
});

events.post("/:id/cancel", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  let raw: unknown = {};
  try {
    raw = await c.req.json();
  } catch {
    raw = {};
  }
  const body = validateBody(
    z.object({
      cancellation_reason: z.string().max(2000).nullable().optional(),
    }),
    raw ?? {},
  );
  const data = await cancelEventForActor(admin, actor, id, {
    cancellationReason: body.cancellation_reason,
  });
  return c.json({ data });
});

events.delete("/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  await deleteEventForActor(admin, actor, id);
  return c.body(null, 204);
});

export default events;
