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
  createAlertRuleForActor,
  evaluateAlertRulesForActor,
  listAlertRulesForActor,
  updateAlertRuleForActor,
} from "../../domains/alert-rules/service.js";

const alertRules = new Hono<AppBindings>();
alertRules.use("*", requireAuth);

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
const prioritySchema = z.enum(["P0", "P1", "P2", "P3"]);
const iconKeySchema = z.enum([
  "attendance",
  "warning",
  "complaint",
  "security",
  "emergency",
]);

alertRules.get("/", async (c) => {
  const actor = assertAuthenticated(c);
  const query = validateQuery(
    z.object({ institute_id: uuid }),
    c.req.query(),
  );
  const data = listAlertRulesForActor(actor, query.institute_id);
  return c.json({ data });
});

alertRules.post("/", async (c) => {
  const actor = assertAuthenticated(c);
  const body = validateBody(
    z.object({
      institute_id: uuid,
      name: z.string().min(1).max(200),
      icon_key: iconKeySchema.optional(),
      desc: z.string().max(1000).optional(),
      priority: prioritySchema.optional(),
      channels: z.array(z.string().min(1).max(50)).max(10).optional(),
      audience: z.string().max(200).optional(),
      active: z.boolean().optional(),
      config: z
        .object({
          threshold_pct: z.number().min(1).max(100).optional(),
          consecutive_exams: z.number().int().min(2).max(10).optional(),
        })
        .optional(),
    }),
    await c.req.json(),
  );
  const data = createAlertRuleForActor(actor, {
    instituteId: body.institute_id,
    name: body.name,
    iconKey: body.icon_key,
    desc: body.desc,
    priority: body.priority,
    channels: body.channels,
    audience: body.audience,
    active: body.active,
    config: body.config
      ? {
          thresholdPct: body.config.threshold_pct,
          consecutiveExams: body.config.consecutive_exams,
        }
      : undefined,
  });
  return c.json({ data }, 201);
});

alertRules.post("/evaluate", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const query = validateQuery(
    z.object({ institute_id: uuid }),
    c.req.query(),
  );
  const data = await evaluateAlertRulesForActor(
    admin,
    actor,
    query.institute_id,
  );
  return c.json({ data });
});

alertRules.patch("/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const body = validateBody(
    z.object({
      name: z.string().min(1).max(200).optional(),
      icon_key: iconKeySchema.optional(),
      desc: z.string().max(1000).optional(),
      priority: prioritySchema.optional(),
      channels: z.array(z.string().min(1).max(50)).max(10).optional(),
      audience: z.string().max(200).optional(),
      active: z.boolean().optional(),
      config: z
        .object({
          threshold_pct: z.number().min(1).max(100).optional(),
          consecutive_exams: z.number().int().min(2).max(10).optional(),
        })
        .optional(),
    }),
    await c.req.json(),
  );
  const data = updateAlertRuleForActor(actor, id, {
    name: body.name,
    iconKey: body.icon_key,
    desc: body.desc,
    priority: body.priority,
    channels: body.channels,
    audience: body.audience,
    active: body.active,
    config: body.config
      ? {
          thresholdPct: body.config.threshold_pct,
          consecutiveExams: body.config.consecutive_exams,
        }
      : undefined,
  });
  return c.json({ data });
});

export default alertRules;
