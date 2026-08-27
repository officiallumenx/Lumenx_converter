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
  createComponentForActor,
  createFeePlanForActor,
  deleteComponentForActor,
  deleteConcessionForActor,
  getFeePlanForActor,
  getStudentFeeAccountForActor,
  listComponentsForActor,
  listConcessionsForActor,
  listFeePlansForActor,
  listPaymentsForActor,
  publishFeePlanForActor,
  recordPaymentForActor,
  unpublishFeePlanForActor,
  updateComponentForActor,
  upsertConcessionForActor,
} from "../../domains/fees/service.js";

const fees = new Hono<AppBindings>();
fees.use("*", requireAuth);

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
const kindSchema = z.enum(["tuition", "books", "transport", "custom"]);
const methodSchema = z.enum([
  "cash",
  "cheque",
  "upi_office",
  "bank_transfer",
  "other",
]);
const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD");
const classAmountsSchema = z.record(z.string().uuid(), z.number().nonnegative());

// Static paths before /:id
fees.get("/plans", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const query = validateQuery(
    z.object({ institute_id: uuid }),
    c.req.query(),
  );
  const data = await listFeePlansForActor(admin, actor, query.institute_id);
  return c.json({ data });
});

fees.post("/plans", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const body = validateBody(
    z.object({
      institute_id: uuid,
      academic_year_id: uuid,
    }),
    await c.req.json(),
  );
  const data = await createFeePlanForActor(admin, actor, {
    instituteId: body.institute_id,
    academicYearId: body.academic_year_id,
  });
  return c.json({ data }, 201);
});

fees.get("/plans/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const data = await getFeePlanForActor(admin, actor, id);
  return c.json({ data });
});

fees.post("/plans/:id/publish", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const body = validateBody(
    z.object({
      publish_scope: z.enum(["institute", "classes"]),
      published_class_ids: z.array(uuid).optional(),
    }),
    await c.req.json(),
  );
  const data = await publishFeePlanForActor(admin, actor, id, {
    publishScope: body.publish_scope,
    publishedClassIds: body.published_class_ids,
  });
  return c.json({ data });
});

fees.post("/plans/:id/unpublish", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const data = await unpublishFeePlanForActor(admin, actor, id);
  return c.json({ data });
});

fees.get("/components", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const query = validateQuery(z.object({ plan_id: uuid }), c.req.query());
  const data = await listComponentsForActor(admin, actor, query.plan_id);
  return c.json({ data });
});

fees.post("/components", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const body = validateBody(
    z.object({
      fee_plan_id: uuid,
      kind: kindSchema,
      name: z.string().min(1).max(200),
      active: z.boolean().optional(),
      assigned_to_all: z.boolean().optional(),
      assigned_class_ids: z.array(uuid).optional(),
      class_amounts: classAmountsSchema.optional(),
    }),
    await c.req.json(),
  );
  const data = await createComponentForActor(admin, actor, {
    feePlanId: body.fee_plan_id,
    kind: body.kind,
    name: body.name,
    active: body.active,
    assignedToAll: body.assigned_to_all,
    assignedClassIds: body.assigned_class_ids,
    classAmounts: body.class_amounts,
  });
  return c.json({ data }, 201);
});

fees.patch("/components/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const body = validateBody(
    z
      .object({
        name: z.string().min(1).max(200).optional(),
        active: z.boolean().optional(),
        assigned_to_all: z.boolean().optional(),
        assigned_class_ids: z.array(uuid).optional(),
        class_amounts: classAmountsSchema.optional(),
      })
      .refine((v) => Object.keys(v).length > 0, {
        message: "At least one field is required",
      }),
    await c.req.json(),
  );
  const data = await updateComponentForActor(admin, actor, id, {
    name: body.name,
    active: body.active,
    assignedToAll: body.assigned_to_all,
    assignedClassIds: body.assigned_class_ids,
    classAmounts: body.class_amounts,
  });
  return c.json({ data });
});

fees.delete("/components/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  await deleteComponentForActor(admin, actor, id);
  return c.json({ data: { ok: true } });
});

fees.get("/concessions", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const query = validateQuery(
    z.object({
      plan_id: uuid,
      student_id: uuid.optional(),
    }),
    c.req.query(),
  );
  const data = await listConcessionsForActor(
    admin,
    actor,
    query.plan_id,
    query.student_id,
  );
  return c.json({ data });
});

fees.put("/concessions", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const body = validateBody(
    z.object({
      fee_plan_id: uuid,
      student_id: uuid,
      fee_component_id: uuid,
      amount: z.number().nonnegative(),
      note: z.string().max(500).nullable().optional(),
    }),
    await c.req.json(),
  );
  const data = await upsertConcessionForActor(admin, actor, {
    feePlanId: body.fee_plan_id,
    studentId: body.student_id,
    feeComponentId: body.fee_component_id,
    amount: body.amount,
    note: body.note,
  });
  return c.json({ data });
});

fees.delete("/concessions/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  await deleteConcessionForActor(admin, actor, id);
  return c.json({ data: { ok: true } });
});

fees.get("/accounts/:studentId", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { studentId } = validateParams(
    z.object({ studentId: uuid }),
    c.req.param(),
  );
  const query = validateQuery(
    z.object({
      plan_id: uuid,
      class_id: uuid,
    }),
    c.req.query(),
  );
  const data = await getStudentFeeAccountForActor(admin, actor, {
    planId: query.plan_id,
    studentId,
    classId: query.class_id,
  });
  return c.json({ data });
});

fees.get("/payments", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const query = validateQuery(
    z.object({
      plan_id: uuid,
      student_id: uuid.optional(),
    }),
    c.req.query(),
  );
  const data = await listPaymentsForActor(
    admin,
    actor,
    query.plan_id,
    query.student_id,
  );
  return c.json({ data });
});

fees.post("/payments", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const body = validateBody(
    z.object({
      fee_plan_id: uuid,
      student_id: uuid,
      class_id: uuid,
      amount: z.number().positive(),
      method: methodSchema,
      paid_on: dateOnly,
      note: z.string().max(500).nullable().optional(),
    }),
    await c.req.json(),
  );
  const data = await recordPaymentForActor(admin, actor, {
    feePlanId: body.fee_plan_id,
    studentId: body.student_id,
    classId: body.class_id,
    amount: body.amount,
    method: body.method,
    paidOn: body.paid_on,
    note: body.note,
  });
  return c.json({ data }, 201);
});

export default fees;
