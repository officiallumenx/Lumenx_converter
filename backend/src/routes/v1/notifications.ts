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
  deleteDeviceTokenForActor,
  deleteInboxItemForActor,
  emitNotificationForActor,
  getInboxItemForActor,
  listDeviceTokensForActor,
  listInboxForActor,
  listTemplatesForActor,
  registerDeviceTokenForActor,
  updateInboxItemForActor,
} from "../../domains/notifications/service.js";

const notifications = new Hono<AppBindings>();
notifications.use("*", requireAuth);

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

const categorySchema = z.enum([
  "attendance",
  "homework",
  "fees",
  "exams",
  "events",
  "transport",
  "leave",
  "announcements",
  "messages",
  "complaints",
  "admissions",
  "careers",
  "certificates",
  "documents",
  "timetable",
  "system",
  "nexus",
]);
const prioritySchema = z.enum(["normal", "important", "critical", "success"]);
const templateStatusSchema = z.enum(["draft", "published", "archived"]);
const deviceAppSchema = z.enum(["connect", "admin", "transport", "nexus", "careers"]);
const devicePlatformSchema = z.enum(["android", "ios", "web"]);

// Static paths BEFORE /:id
notifications.get("/templates", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const query = validateQuery(
    z.object({
      institute_id: uuid.optional(),
      status: templateStatusSchema.optional(),
      category: categorySchema.optional(),
    }),
    c.req.query(),
  );
  const data = await listTemplatesForActor(admin, actor, {
    instituteId: query.institute_id,
    status: query.status,
    category: query.category,
  });
  return c.json({ data });
});

notifications.get("/device-tokens", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const data = await listDeviceTokensForActor(admin, actor);
  return c.json({ data });
});

notifications.post("/device-tokens", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const body = validateBody(
    z.object({
      app: deviceAppSchema,
      platform: devicePlatformSchema,
      token: z.string().min(1).max(4096),
    }),
    await c.req.json(),
  );
  const data = await registerDeviceTokenForActor(admin, actor, {
    app: body.app,
    platform: body.platform,
    token: body.token,
  });
  return c.json({ data }, 201);
});

notifications.delete("/device-tokens/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  await deleteDeviceTokenForActor(admin, actor, id);
  return c.json({ data: { ok: true } });
});

notifications.get("/", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const query = validateQuery(
    z.object({
      institute_id: uuid.optional(),
      unread_only: z.enum(["true", "false"]).optional(),
    }),
    c.req.query(),
  );
  const data = await listInboxForActor(admin, actor, {
    instituteId: query.institute_id,
    unreadOnly: query.unread_only === "true",
  });
  return c.json({ data });
});

notifications.post("/", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const audienceSchema = z.enum([
    "everyone",
    "students",
    "parents",
    "teachers",
  ]);
  const body = validateBody(
    z
      .object({
        institute_id: uuid,
        template_id: uuid.nullable().optional(),
        category: categorySchema,
        priority: prioritySchema.optional(),
        title: z.string().min(1).max(300),
        body: z.string().min(1).max(4000),
        payload: z.record(z.unknown()).optional(),
        deep_link: z.string().max(500).nullable().optional(),
        dedupe_key: z.string().max(200).nullable().optional(),
        recipient_user_ids: z.array(uuid).min(1).max(500).optional(),
        audience: audienceSchema.optional(),
      })
      .superRefine((val, ctx) => {
        const hasIds = Boolean(val.recipient_user_ids?.length);
        const hasAudience = Boolean(val.audience);
        if (hasIds === hasAudience) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message:
              "Provide either recipient_user_ids or audience (not both, not neither)",
            path: ["recipient_user_ids"],
          });
        }
      }),
    await c.req.json(),
  );
  const data = await emitNotificationForActor(admin, actor, {
    instituteId: body.institute_id,
    templateId: body.template_id,
    category: body.category,
    priority: body.priority,
    title: body.title,
    body: body.body,
    payload: body.payload,
    deepLink: body.deep_link,
    dedupeKey: body.dedupe_key,
    recipientUserIds: body.recipient_user_ids,
    audience: body.audience,
  });
  return c.json({ data }, 201);
});

notifications.get("/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const data = await getInboxItemForActor(admin, actor, id);
  return c.json({ data });
});

notifications.patch("/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const body = validateBody(
    z
      .object({
        read: z.boolean().optional(),
        starred: z.boolean().optional(),
      })
      .refine((b) => Object.keys(b).length > 0, {
        message: "At least one field is required",
      }),
    await c.req.json(),
  );
  const data = await updateInboxItemForActor(admin, actor, id, {
    read: body.read,
    starred: body.starred,
  });
  return c.json({ data });
});

notifications.delete("/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  await deleteInboxItemForActor(admin, actor, id);
  return c.json({ data: { ok: true } });
});

export default notifications;
