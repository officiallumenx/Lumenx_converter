import { Hono } from "hono";
import { z } from "zod";
import { requireAuth, assertAuthenticated } from "../../auth/require-auth.js";
import type { AppBindings } from "../../types/app.js";
import { AppError } from "../../errors/app-error.js";
import {
  validateParams,
  validateQuery,
} from "../../validation/validate.js";
import {
  getInstituteAuditForActor,
  listInstituteAuditForActor,
} from "../../domains/audit/service.js";

/** Institute audit is read-only over HTTP; append is server-internal only. */
const audit = new Hono<AppBindings>();
audit.use("*", requireAuth);

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

audit.get("/", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const query = validateQuery(
    z.object({
      institute_id: uuid,
      actor_user_id: uuid.optional(),
      entity_type: z.string().min(1).max(100).optional(),
      entity_id: z.string().min(1).max(200).optional(),
      action: z.string().min(1).max(200).optional(),
      limit: z.coerce.number().int().min(1).max(200).optional(),
    }),
    c.req.query(),
  );
  const data = await listInstituteAuditForActor(admin, actor, {
    instituteId: query.institute_id,
    actorUserId: query.actor_user_id,
    entityType: query.entity_type,
    entityId: query.entity_id,
    action: query.action,
    limit: query.limit,
  });
  return c.json({ data });
});

audit.get("/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const data = await getInstituteAuditForActor(admin, actor, id);
  return c.json({ data });
});

export default audit;
