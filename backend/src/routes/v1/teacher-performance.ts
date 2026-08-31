import { Hono } from "hono";
import { z } from "zod";
import { requireAuth, assertAuthenticated } from "../../auth/require-auth.js";
import type { AppBindings } from "../../types/app.js";
import { AppError } from "../../errors/app-error.js";
import { validateQuery } from "../../validation/validate.js";
import { listTeacherPerformanceForActor } from "../../domains/teacher-performance/service.js";

const teacherPerformance = new Hono<AppBindings>();
teacherPerformance.use("*", requireAuth);

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

teacherPerformance.get("/", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const query = validateQuery(
    z.object({ institute_id: uuid }),
    c.req.query(),
  );
  const result = await listTeacherPerformanceForActor(
    admin,
    actor,
    query.institute_id,
  );
  return c.json({ data: result });
});

export default teacherPerformance;
