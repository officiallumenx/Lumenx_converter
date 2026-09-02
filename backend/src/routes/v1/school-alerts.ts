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
  acknowledgeAllPortalSchoolAlertsForActor,
  acknowledgePortalSchoolAlertForActor,
  broadcastSchoolAlertForActor,
  listPortalSchoolAlertsForActor,
  listRecentSchoolAlertsForActor,
} from "../../domains/school-alerts/service.js";

const schoolAlerts = new Hono<AppBindings>();
schoolAlerts.use("*", requireAuth);

function requireAdmin(c: {
  get: (k: "supabase") => AppBindings["Variables"]["supabase"];
}) {
  const clients = c.get("supabase");
  if (!clients?.admin) throw AppError.internal("Database unavailable");
  return clients.admin;
}

const uuid = z.string().uuid();

const instituteQuerySchema = z.object({
  institute_id: uuid,
});

const broadcastSchema = z.object({
  institute_id: uuid,
  title: z.string().min(1).max(200),
  summary: z.string().max(500).optional(),
  detail: z.string().max(5000).optional(),
  severity: z.enum(["mandatory", "emergency"]).optional(),
  category: z
    .enum([
      "absence",
      "health",
      "remark",
      "safety",
      "attendance",
      "leave",
      "holiday",
      "closure",
      "weather",
      "general",
    ])
    .optional(),
  source_label: z.string().max(200).optional(),
  student_id: uuid.nullable().optional(),
  audience: z.enum(["parents", "students", "parents_and_students"]),
});

const recipientParamsSchema = z.object({ recipientId: uuid });

/** Admin recent broadcasts for institute — institute staff only. */
schoolAlerts.get("/recent", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const query = validateQuery(instituteQuerySchema, c.req.query());
  const data = await listRecentSchoolAlertsForActor(admin, actor, query.institute_id);
  return c.json({ data });
});

schoolAlerts.get("/portal/inbox", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const query = validateQuery(instituteQuerySchema, c.req.query());
  const data = await listPortalSchoolAlertsForActor(admin, actor, query.institute_id);
  return c.json({ data });
});

schoolAlerts.post("/portal/inbox/acknowledge-all", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const body = validateBody(instituteQuerySchema, await c.req.json());
  const data = await acknowledgeAllPortalSchoolAlertsForActor(admin, actor, body.institute_id);
  return c.json({ data });
});

schoolAlerts.patch("/portal/inbox/:recipientId/acknowledge", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { recipientId } = validateParams(recipientParamsSchema, c.req.param());
  const data = await acknowledgePortalSchoolAlertForActor(admin, actor, recipientId);
  return c.json({ data });
});

schoolAlerts.post("/broadcast", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const body = validateBody(broadcastSchema, await c.req.json());
  const data = await broadcastSchoolAlertForActor(admin, actor, {
    instituteId: body.institute_id,
    title: body.title,
    summary: body.summary,
    detail: body.detail,
    severity: body.severity,
    category: body.category,
    sourceLabel: body.source_label,
    studentId: body.student_id,
    audience: body.audience,
  });
  return c.json({ data }, 201);
});

export default schoolAlerts;
