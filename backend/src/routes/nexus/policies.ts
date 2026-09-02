import { Hono } from "hono";
import { z } from "zod";
import { requireAuth, assertAuthenticated } from "../../auth/require-auth.js";
import type { AppBindings } from "../../types/app.js";
import { AppError } from "../../errors/app-error.js";
import {
  validateBody,
  validateParams,
} from "../../validation/validate.js";
import {
  createRuleForActor,
  deleteRuleForActor,
  getQuotaForActor,
  getRuleForActor,
  listQuotasForActor,
  listRulesForActor,
  listDerivedAlertsForActor,
  handlePlatformAlertForActor,
  reopenPlatformAlertForActor,
  updateRuleForActor,
  upsertQuotaForActor,
} from "../../domains/policies/service.js";

const policies = new Hono<AppBindings>();
policies.use("*", requireAuth);

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

const kindSchema = z.enum([
  "payment_overdue",
  "renewal_approaching",
  "storage_quota_exceeded",
  "platform_incident",
  "security_issue",
  "sla_breach",
  "institute_usage_risk",
  "support_escalation",
]);
const severitySchema = z.enum(["low", "medium", "high", "critical"]);
const planSchema = z.enum(["core", "plus", "max"]);

// ── Policy rules ─────────────────────────────────────────────

policies.get("/rules", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const data = await listRulesForActor(admin, actor);
  return c.json({ data });
});

/** Derived read-only platform alerts from live billing/support/storage signals. */
policies.get("/alerts", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const data = await listDerivedAlertsForActor(admin, actor);
  return c.json({ data });
});

policies.post("/alerts/:alertKey/handle", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const alertKey = decodeURIComponent(c.req.param("alertKey") ?? "").trim();
  const data = await handlePlatformAlertForActor(admin, actor, alertKey);
  return c.json({ data });
});

policies.post("/alerts/:alertKey/reopen", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const alertKey = decodeURIComponent(c.req.param("alertKey") ?? "").trim();
  const data = await reopenPlatformAlertForActor(admin, actor, alertKey);
  return c.json({ data });
});

policies.post("/rules", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const body = validateBody(
    z.object({
      kind: kindSchema,
      name: z.string().min(1).max(200),
      description: z.string().max(2000).optional(),
      condition_text: z.string().max(500).optional(),
      severity_default: severitySchema.optional(),
      enabled: z.boolean().optional(),
    }),
    await c.req.json(),
  );
  const data = await createRuleForActor(admin, actor, {
    kind: body.kind,
    name: body.name,
    description: body.description,
    conditionText: body.condition_text,
    severityDefault: body.severity_default,
    enabled: body.enabled,
  });
  return c.json({ data }, 201);
});

policies.get("/rules/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const data = await getRuleForActor(admin, actor, id);
  return c.json({ data });
});

policies.patch("/rules/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const body = validateBody(
    z
      .object({
        name: z.string().min(1).max(200).optional(),
        description: z.string().max(2000).optional(),
        condition_text: z.string().max(500).optional(),
        severity_default: severitySchema.optional(),
        enabled: z.boolean().optional(),
      })
      .refine((v) => Object.keys(v).length > 0, {
        message: "At least one field is required",
      }),
    await c.req.json(),
  );
  const data = await updateRuleForActor(admin, actor, id, {
    name: body.name,
    description: body.description,
    conditionText: body.condition_text,
    severityDefault: body.severity_default,
    enabled: body.enabled,
  });
  return c.json({ data });
});

policies.delete("/rules/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  await deleteRuleForActor(admin, actor, id);
  return c.json({ data: { ok: true } });
});

// ── Storage quotas ───────────────────────────────────────────

policies.get("/storage-quotas", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const data = await listQuotasForActor(admin, actor);
  return c.json({ data });
});

policies.get("/storage-quotas/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const data = await getQuotaForActor(admin, actor, id);
  return c.json({ data });
});

policies.put("/storage-quotas", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const body = validateBody(
    z.object({
      plan: planSchema,
      limit_gb: z.number().int().min(1),
      warning_pct: z.number().int().min(1).max(100).optional(),
    }),
    await c.req.json(),
  );
  const data = await upsertQuotaForActor(admin, actor, {
    plan: body.plan,
    limitGb: body.limit_gb,
    warningPct: body.warning_pct,
  });
  return c.json({ data });
});

export default policies;
