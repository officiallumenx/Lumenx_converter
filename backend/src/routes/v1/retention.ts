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
  decideRetentionReviewForActor,
  getRetentionReviewForActor,
  listRetentionReviewsForActor,
  processRetentionReviewEligibilitySystem,
} from "../../domains/retention/service.js";

const retention = new Hono<AppBindings>();
retention.use("*", requireAuth);

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
const statusSchema = z.enum([
  "pending_graduation_date",
  "active_retention",
  "review_eligible",
  "extended",
  "legal_hold",
  "deletion_approved",
  "closed",
]);

retention.get("/reviews", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const query = validateQuery(
    z.object({
      institute_id: uuid,
      status: statusSchema.optional(),
    }),
    c.req.query(),
  );
  const data = await listRetentionReviewsForActor(admin, actor, {
    instituteId: query.institute_id,
    status: query.status,
  });
  return c.json({ data });
});

retention.get("/reviews/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const params = validateParams(z.object({ id: uuid }), c.req.param());
  const data = await getRetentionReviewForActor(admin, actor, params.id);
  return c.json({ data });
});

retention.post("/reviews/:id/decide", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const params = validateParams(z.object({ id: uuid }), c.req.param());
  const body = validateBody(
    z.object({
      decision: z.enum([
        "retain",
        "extend",
        "legal_hold",
        "approve_deletion",
        "set_graduation_date",
        "clear_legal_hold",
      ]),
      reason: z.string().min(1),
      extended_until: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
      graduated_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
    }),
    await c.req.json(),
  );
  const data = await decideRetentionReviewForActor(admin, actor, params.id, {
    decision: body.decision,
    reason: body.reason,
    extendedUntil: body.extended_until,
    graduatedOn: body.graduated_on,
  });
  return c.json({ data });
});

/** Idempotent eligibility job entry — auth required; platform or institute admin. */
retention.post("/jobs/mark-eligible", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  if (!actor.isPlatformOperator) {
    const membership = actor.memberships.find((m) =>
      m.roles.some((r) =>
        ["institute_admin", "principal"].includes(r),
      ),
    );
    if (!membership) {
      throw AppError.forbidden("Insufficient permissions");
    }
  }
  const data = await processRetentionReviewEligibilitySystem(admin);
  return c.json({ data });
});

export default retention;
