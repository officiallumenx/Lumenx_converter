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
  createThreadForActor,
  deleteThreadForActor,
  getThreadForActor,
  listThreadsForActor,
  postInternalNoteForActor,
  postMessageForActor,
  updateThreadForActor,
} from "../../domains/support/service.js";

const support = new Hono<AppBindings>();
support.use("*", requireAuth);

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
  "issue",
  "feature_request",
  "feedback",
  "improvement_request",
]);
const statusSchema = z.enum(["open", "in_progress", "waiting", "resolved"]);
const prioritySchema = z.enum(["low", "medium", "high"]);

const instituteQuerySchema = z.object({
  institute_id: uuid,
  status: statusSchema.optional(),
});

support.get("/threads", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const query = validateQuery(instituteQuerySchema, c.req.query());
  const data = await listThreadsForActor(
    admin,
    actor,
    query.institute_id,
    query.status,
  );
  return c.json({ data });
});

support.post("/threads", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const body = validateBody(
    z.object({
      institute_id: uuid,
      subject: z.string().min(1).max(300),
      category: categorySchema.optional(),
      priority: prioritySchema.optional(),
      body: z.string().min(1).max(8000),
      author_role: z.enum(["institute", "nexus"]).optional(),
      author_label: z.string().min(1).max(120).optional(),
    }),
    await c.req.json(),
  );
  const data = await createThreadForActor(admin, actor, {
    instituteId: body.institute_id,
    subject: body.subject,
    category: body.category,
    priority: body.priority,
    body: body.body,
    authorRole: body.author_role,
    authorLabel: body.author_label,
  });
  return c.json({ data }, 201);
});

support.get("/threads/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const data = await getThreadForActor(admin, actor, id);
  return c.json({ data });
});

support.patch("/threads/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const body = validateBody(
    z
      .object({
        status: statusSchema.optional(),
        priority: prioritySchema.optional(),
        assignee_handle: z.string().min(1).max(64).nullable().optional(),
        assignee_user_id: uuid.nullable().optional(),
      })
      .refine((v) => Object.keys(v).length > 0, {
        message: "At least one field is required",
      }),
    await c.req.json(),
  );
  const data = await updateThreadForActor(admin, actor, id, {
    status: body.status,
    priority: body.priority,
    assigneeHandle: body.assignee_handle,
    assigneeUserId: body.assignee_user_id,
  });
  return c.json({ data });
});

support.delete("/threads/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  await deleteThreadForActor(admin, actor, id);
  return c.json({ data: { ok: true } });
});

support.post("/threads/:id/messages", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const body = validateBody(
    z.object({
      body: z.string().min(1).max(8000),
      author_label: z.string().min(1).max(120).optional(),
    }),
    await c.req.json(),
  );
  const data = await postMessageForActor(admin, actor, id, {
    body: body.body,
    authorLabel: body.author_label,
  });
  return c.json({ data }, 201);
});

support.post("/threads/:id/notes", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const body = validateBody(
    z.object({
      body: z.string().min(1).max(8000),
      author_label: z.string().min(1).max(120).optional(),
    }),
    await c.req.json(),
  );
  const data = await postInternalNoteForActor(admin, actor, id, {
    body: body.body,
    authorLabel: body.author_label,
  });
  return c.json({ data }, 201);
});

export default support;
