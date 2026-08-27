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
  createRecycleItemForActor,
  getRecycleItemForActor,
  listRecycleItemsForActor,
  purgeRecycleItemForActor,
  restoreRecycleItemForActor,
} from "../../domains/recycle/service.js";

const recycle = new Hono<AppBindings>();
recycle.use("*", requireAuth);

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

const moduleSchema = z.enum([
  "Students",
  "Teachers",
  "Parents",
  "Accounts",
  "Subjects",
  "Documents",
  "Events",
  "Templates",
  "Homework",
  "Assets",
  "Other",
]);

const entityKindSchema = z.enum([
  "student",
  "teacher",
  "parent",
  "staff_account",
  "subject",
  "event",
  "homework",
  "template",
  "generated_document",
  "stored_asset",
  "other",
]);

recycle.get("/items", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const query = validateQuery(
    z.object({ institute_id: uuid }),
    c.req.query(),
  );
  const data = await listRecycleItemsForActor(
    admin,
    actor,
    query.institute_id,
  );
  return c.json({ data });
});

recycle.post("/items", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const body = validateBody(
    z.object({
      institute_id: uuid,
      entity_kind: entityKindSchema,
      entity_id: uuid,
      module: moduleSchema,
      title: z.string().min(1).max(500),
      subtitle: z.string().max(1000).nullable().optional(),
      snapshot: z.unknown().nullable().optional(),
    }),
    await c.req.json(),
  );
  const data = await createRecycleItemForActor(admin, actor, {
    instituteId: body.institute_id,
    entityKind: body.entity_kind,
    entityId: body.entity_id,
    module: body.module,
    title: body.title,
    subtitle: body.subtitle,
    snapshot: body.snapshot,
  });
  return c.json({ data }, 201);
});

recycle.get("/items/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const data = await getRecycleItemForActor(admin, actor, id);
  return c.json({ data });
});

recycle.post("/items/:id/restore", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const data = await restoreRecycleItemForActor(admin, actor, id);
  return c.json({ data });
});

recycle.post("/items/:id/purge", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const data = await purgeRecycleItemForActor(admin, actor, id);
  return c.json({ data });
});

export default recycle;
