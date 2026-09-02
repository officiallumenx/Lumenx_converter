import { Hono } from "hono";
import { z } from "zod";
import { requireAuth, assertAuthenticated } from "../../auth/require-auth.js";
import type { AppBindings } from "../../types/app.js";
import { AppError } from "../../errors/app-error.js";
import { validateQuery } from "../../validation/validate.js";
import { getNetworkAnalyticsForActor } from "../../domains/nexus/network-analytics.js";

const analytics = new Hono<AppBindings>();
analytics.use("*", requireAuth);

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
const rangeSchema = z.enum(["30d", "90d", "6m", "12m"]);
const planSchema = z.enum(["all", "core", "plus", "max"]);

analytics.get("/network", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const query = validateQuery(
    z.object({
      range: rangeSchema.optional(),
      institute_id: uuid.optional(),
      plan: planSchema.optional(),
    }),
    c.req.query(),
  );
  const data = await getNetworkAnalyticsForActor(admin, actor, {
    range: query.range,
    instituteId: query.institute_id ?? null,
    plan: query.plan,
  });
  return c.json({ data });
});

export default analytics;
