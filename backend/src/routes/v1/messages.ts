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
  createMessageForActor,
  createThreadForActor,
  deleteMessageForActor,
  getThreadForActor,
  listMessagesForActor,
  listThreadsForActor,
  markMessageReadForActor,
  updateThreadForActor,
} from "../../domains/messages/service.js";

const messages = new Hono<AppBindings>();
messages.use("*", requireAuth);

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
const threadStatusSchema = z.enum(["open", "closed", "archived"]);

// ── Threads ──────────────────────────────────────────────────────

messages.get("/threads", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const query = validateQuery(
    z.object({ institute_id: uuid }),
    c.req.query(),
  );
  const data = await listThreadsForActor(admin, actor, query.institute_id);
  return c.json({ data });
});

messages.post("/threads", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const body = validateBody(
    z.object({
      institute_id: uuid,
      counterpart_user_id: uuid,
      subject: z.string().min(1).max(500).nullable().optional(),
      student_id: uuid.nullable().optional(),
      body: z.string().min(1).max(8000).nullable().optional(),
    }),
    await c.req.json(),
  );
  const data = await createThreadForActor(admin, actor, {
    instituteId: body.institute_id,
    counterpartUserId: body.counterpart_user_id,
    subject: body.subject,
    studentId: body.student_id,
    body: body.body,
  });
  return c.json({ data }, 201);
});

messages.get("/threads/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const data = await getThreadForActor(admin, actor, id);
  return c.json({ data });
});

messages.patch("/threads/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const body = validateBody(
    z.object({
      subject: z.string().min(1).max(500).nullable().optional(),
      status: threadStatusSchema.optional(),
    }),
    await c.req.json(),
  );
  const data = await updateThreadForActor(admin, actor, id, {
    subject: body.subject,
    status: body.status,
  });
  return c.json({ data });
});

messages.get("/threads/:id/messages", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const data = await listMessagesForActor(admin, actor, id);
  return c.json({ data });
});

messages.post("/threads/:id/messages", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const body = validateBody(
    z.object({
      body: z.string().min(1).max(8000),
    }),
    await c.req.json(),
  );
  const data = await createMessageForActor(admin, actor, id, {
    body: body.body,
  });
  return c.json({ data }, 201);
});

// ── Messages ─────────────────────────────────────────────────────

messages.patch("/messages/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const body = validateBody(
    z.object({
      read: z.literal(true),
    }),
    await c.req.json(),
  );
  void body;
  const data = await markMessageReadForActor(admin, actor, id);
  return c.json({ data });
});

messages.delete("/messages/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  await deleteMessageForActor(admin, actor, id);
  return c.json({ data: { ok: true } });
});

export default messages;
