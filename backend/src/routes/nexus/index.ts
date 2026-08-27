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
  createOperatorForActor,
  createPeriodForActor,
  deleteLicenseForActor,
  deleteOperatorForActor,
  deleteSubscriptionForActor,
  getLicenseForActor,
  getOperatorForActor,
  getSubscriptionForActor,
  listLicensesForActor,
  listOperatorsForActor,
  listPeriodsForActor,
  listSubscriptionsForActor,
  updateOperatorForActor,
  upsertLicenseForActor,
  upsertSubscriptionForActor,
} from "../../domains/nexus/service.js";
import platformAudit from "./audit.js";
import billing from "./billing.js";

const uuid = z.string().uuid();
const idParamsSchema = z.object({ id: uuid });

const platformRoleSchema = z.enum([
  "nexus_root",
  "operations",
  "billing",
  "support",
  "analyst",
]);
const operatorStatusSchema = z.enum(["active", "invited", "disabled"]);
const planSchema = z.enum(["core", "plus", "max"]);
const cadenceSchema = z.enum(["monthly", "yearly"]);
const entitlementScopeSchema = z.enum([
  "admin_module",
  "connect_portal",
  "connect_module",
  "platform_app",
]);
const portalSchema = z.enum(["teachers", "parents", "students"]);
const lifecycleSchema = z.enum([
  "registered",
  "approved",
  "trial_active",
  "trial_expiring",
  "trial_expired",
  "grace_period",
  "read_only",
  "active",
]);
const paymentMethodSchema = z.enum(["online", "offline"]);
const paymentStatusSchema = z.enum([
  "none",
  "checkout_started",
  "verification_pending",
  "paid",
  "failed",
  "rejected",
]);
const durationSchema = z.union([z.literal(1), z.literal(6), z.literal(12)]);

function requireAdmin(c: {
  get: (k: "supabase") => AppBindings["Variables"]["supabase"];
}) {
  const clients = c.get("supabase");
  if (!clients?.admin) {
    throw AppError.internal("Database unavailable");
  }
  return clients.admin;
}

function mountAuth(app: Hono<AppBindings>) {
  app.use("*", requireAuth);
  return app;
}

const operators = mountAuth(new Hono<AppBindings>());

operators.get("/", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const data = await listOperatorsForActor(admin, actor);
  return c.json({ data });
});

operators.get("/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const data = await getOperatorForActor(admin, actor, id);
  return c.json({ data });
});

operators.post("/", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const body = validateBody(
    z.object({
      userId: uuid,
      roleCode: platformRoleSchema,
      handle: z.string().min(1).max(64),
      displayName: z.string().min(1).max(200),
      status: operatorStatusSchema.optional(),
    }),
    await c.req.json(),
  );
  const data = await createOperatorForActor(admin, actor, body);
  return c.json({ data }, 201);
});

operators.patch("/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const body = validateBody(
    z
      .object({
        roleCode: platformRoleSchema.optional(),
        handle: z.string().min(1).max(64).optional(),
        displayName: z.string().min(1).max(200).optional(),
        status: operatorStatusSchema.optional(),
      })
      .refine((v) => Object.keys(v).length > 0, {
        message: "At least one field is required",
      }),
    await c.req.json(),
  );
  const data = await updateOperatorForActor(admin, actor, id, body);
  return c.json({ data });
});

operators.delete("/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  await deleteOperatorForActor(admin, actor, id);
  return c.json({ data: { ok: true } });
});

const licenses = mountAuth(new Hono<AppBindings>());

licenses.get("/", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const query = validateQuery(
    z.object({ institute_id: uuid.optional() }),
    c.req.query(),
  );
  const data = await listLicensesForActor(admin, actor, query.institute_id);
  return c.json({ data });
});

licenses.get("/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const data = await getLicenseForActor(admin, actor, id);
  return c.json({ data });
});

licenses.put("/", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const body = validateBody(
    z.object({
      instituteId: uuid,
      plan: planSchema,
      cadence: cadenceSchema,
      startsOn: z.string().date().nullable().optional(),
      reminderDays: z.array(z.number().int().positive()).max(10).optional(),
      entitlements: z
        .array(
          z.object({
            scope: entitlementScopeSchema,
            portalId: portalSchema.nullable().optional(),
            targetId: z.string().min(1).max(128),
            enabled: z.boolean().optional(),
          }),
        )
        .optional(),
    }),
    await c.req.json(),
  );
  const data = await upsertLicenseForActor(admin, actor, body);
  return c.json({ data });
});

licenses.delete("/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  await deleteLicenseForActor(admin, actor, id);
  return c.json({ data: { ok: true } });
});

const subscriptions = mountAuth(new Hono<AppBindings>());

subscriptions.get("/", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const query = validateQuery(
    z.object({ institute_id: uuid.optional() }),
    c.req.query(),
  );
  const data = await listSubscriptionsForActor(
    admin,
    actor,
    query.institute_id,
  );
  return c.json({ data });
});

subscriptions.get("/:id/periods", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const data = await listPeriodsForActor(admin, actor, id);
  return c.json({ data });
});

subscriptions.post("/:id/periods", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const body = validateBody(
    z.object({
      durationMonths: durationSchema,
      activeStudentCount: z.number().int().nonnegative(),
      assignedRateInr: z.number().nonnegative(),
      monthlyPriceInr: z.number().nonnegative(),
      regularAmountInr: z.number().nonnegative(),
      discountAmountInr: z.number().nonnegative().optional(),
      payableAmountInr: z.number().nonnegative(),
      freeMonths: z.number().int().nonnegative().optional(),
      startsAt: z.string().datetime(),
      endsAt: z.string().datetime(),
      paymentMethod: paymentMethodSchema,
      paymentStatus: paymentStatusSchema.optional(),
      paymentRef: z.string().max(200).nullable().optional(),
      amountPaidInr: z.number().nonnegative().optional(),
      paidAt: z.string().datetime().nullable().optional(),
      makeCurrent: z.boolean().optional(),
    }),
    await c.req.json(),
  );
  const data = await createPeriodForActor(admin, actor, {
    ...body,
    subscriptionId: id,
  });
  return c.json({ data }, 201);
});

subscriptions.get("/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const data = await getSubscriptionForActor(admin, actor, id);
  return c.json({ data });
});

subscriptions.put("/", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const body = validateBody(
    z.object({
      instituteId: uuid,
      lifecycleStatus: lifecycleSchema,
      assignedRateInr: z.number().nonnegative(),
      activeStudentCount: z.number().int().nonnegative().optional(),
      trialStartAt: z.string().datetime().nullable().optional(),
      trialEndAt: z.string().datetime().nullable().optional(),
      graceEndsAt: z.string().datetime().nullable().optional(),
    }),
    await c.req.json(),
  );
  const data = await upsertSubscriptionForActor(admin, actor, body);
  return c.json({ data });
});

subscriptions.delete("/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  await deleteSubscriptionForActor(admin, actor, id);
  return c.json({ data: { ok: true } });
});

/**
 * /api/nexus — Platform-level API (structurally separate from institute v1).
 */
const nexus = new Hono<AppBindings>();

nexus.get("/health", (c) => {
  return c.json({
    service: "lumenx-nexus",
    status: "ok",
    version: "nexus",
  });
});

nexus.route("/operators", operators);
nexus.route("/licenses", licenses);
nexus.route("/subscriptions", subscriptions);
nexus.route("/audit", platformAudit);
nexus.route("/billing", billing);

export default nexus;
