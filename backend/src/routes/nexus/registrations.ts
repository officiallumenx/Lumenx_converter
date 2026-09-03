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
  approveRegistrationForReviewer,
  listRegistrationsForReviewer,
  rejectRegistrationForReviewer,
} from "../../domains/registrations/review-service.js";
import { withIdempotency } from "../../domains/idempotency/with-idempotency.js";

const uuid = z.string().uuid();
const idParamsSchema = z.object({ id: uuid });

const registrationStatusSchema = z.enum(["pending", "approved", "rejected"]);

function requireAdmin(c: {
  get: (k: "supabase") => AppBindings["Variables"]["supabase"];
}) {
  const clients = c.get("supabase");
  if (!clients?.admin) {
    throw AppError.internal("Database unavailable");
  }
  return clients.admin;
}

const registrations = new Hono<AppBindings>();
registrations.use("*", requireAuth);

registrations.get("/", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const query = validateQuery(
    z.object({ status: registrationStatusSchema.optional() }),
    c.req.query(),
  );
  const data = await listRegistrationsForReviewer(admin, actor, {
    status: query.status,
  });
  return c.json({ data });
});

registrations.post("/:id/approve", async (c) => {
  return withIdempotency(
    c,
    "POST /api/nexus/registrations/:id/approve",
    async () => {
      const actor = assertAuthenticated(c);
      const admin = requireAdmin(c);
      const { id } = validateParams(idParamsSchema, c.req.param());
      const data = await approveRegistrationForReviewer(admin, actor, id);
      return { status: 200, body: { data } };
    },
  );
});

registrations.post("/:id/reject", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const body = validateBody(
    z.object({
      reason: z.string().min(1).max(500),
    }),
    await c.req.json(),
  );
  const data = await rejectRegistrationForReviewer(admin, actor, id, body.reason);
  return c.json({ data });
});

export default registrations;
