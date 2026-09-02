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
  createAdjustmentForActor,
  createPaymentForActor,
  createRenewalForActor,
  getAdjustmentForActor,
  getPaymentForActor,
  getRenewalForActor,
  getRenewalInvoicePdfForActor,
  issueInvoiceFromSubscriptionForActor,
  issueRenewalForActor,
  listAdjustmentsForActor,
  listPaymentsForActor,
  listPendingOfflinePaymentsForActor,
  listRenewalsForActor,
  rejectPaymentForActor,
  updateAdjustmentForActor,
  updateRenewalForActor,
  verifyPaymentForActor,
} from "../../domains/billing/service.js";

const billing = new Hono<AppBindings>();
billing.use("*", requireAuth);

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

const renewalStatusSchema = z.enum([
  "draft",
  "issued",
  "pending",
  "paid",
  "overdue",
  "cancelled",
]);
const adjustmentKindSchema = z.enum([
  "headcount_increase",
  "credit",
  "debit",
  "other",
]);
const adjustmentStatusSchema = z.enum([
  "pending",
  "applied",
  "waived",
  "cancelled",
]);
const paymentMethodSchema = z.enum([
  "online",
  "offline",
  "bank_transfer",
  "upi",
  "cheque",
  "other",
]);

const instituteQuerySchema = z.object({ institute_id: uuid });

// ── Renewals ─────────────────────────────────────────────────

billing.get("/renewals", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const query = validateQuery(instituteQuerySchema, c.req.query());
  const data = await listRenewalsForActor(admin, actor, query.institute_id);
  return c.json({ data });
});

billing.post("/renewals", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const body = validateBody(
    z.object({
      institute_id: uuid,
      subscription_id: uuid,
      subscription_period_id: uuid.nullable().optional(),
      invoice_number: z.string().min(1).max(100),
      period_starts_at: z.string().datetime(),
      period_ends_at: z.string().datetime(),
      due_at: z.string().datetime().nullable().optional(),
      active_student_count: z.number().int().nonnegative().optional(),
      assigned_rate_inr: z.number().nonnegative().optional(),
      regular_amount_inr: z.number().nonnegative().optional(),
      discount_amount_inr: z.number().nonnegative().optional(),
      payable_amount_inr: z.number().nonnegative().optional(),
      notes: z.string().max(2000).nullable().optional(),
    }),
    await c.req.json(),
  );
  const data = await createRenewalForActor(admin, actor, {
    instituteId: body.institute_id,
    subscriptionId: body.subscription_id,
    subscriptionPeriodId: body.subscription_period_id,
    invoiceNumber: body.invoice_number,
    periodStartsAt: body.period_starts_at,
    periodEndsAt: body.period_ends_at,
    dueAt: body.due_at,
    activeStudentCount: body.active_student_count,
    assignedRateInr: body.assigned_rate_inr,
    regularAmountInr: body.regular_amount_inr,
    discountAmountInr: body.discount_amount_inr,
    payableAmountInr: body.payable_amount_inr,
    notes: body.notes,
  });
  return c.json({ data }, 201);
});

billing.post("/renewals/issue-invoice", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const body = validateBody(
    z.object({
      institute_id: uuid,
      duration_months: z.union([z.literal(1), z.literal(6), z.literal(12)]),
      due_at: z.string().datetime().nullable().optional(),
      notes: z.string().max(2000).nullable().optional(),
    }),
    await c.req.json(),
  );
  const data = await issueInvoiceFromSubscriptionForActor(admin, actor, {
    instituteId: body.institute_id,
    durationMonths: body.duration_months,
    dueAt: body.due_at,
    notes: body.notes,
  });
  return c.json({ data }, 201);
});

billing.get("/renewals/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const data = await getRenewalForActor(admin, actor, id);
  return c.json({ data });
});

billing.patch("/renewals/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const body = validateBody(
    z
      .object({
        status: renewalStatusSchema.optional(),
        due_at: z.string().datetime().nullable().optional(),
        active_student_count: z.number().int().nonnegative().optional(),
        assigned_rate_inr: z.number().nonnegative().optional(),
        regular_amount_inr: z.number().nonnegative().optional(),
        discount_amount_inr: z.number().nonnegative().optional(),
        payable_amount_inr: z.number().nonnegative().optional(),
        amount_paid_inr: z.number().nonnegative().optional(),
        notes: z.string().max(2000).nullable().optional(),
      })
      .refine((v) => Object.keys(v).length > 0, {
        message: "At least one field is required",
      }),
    await c.req.json(),
  );
  const data = await updateRenewalForActor(admin, actor, id, {
    status: body.status,
    dueAt: body.due_at,
    activeStudentCount: body.active_student_count,
    assignedRateInr: body.assigned_rate_inr,
    regularAmountInr: body.regular_amount_inr,
    discountAmountInr: body.discount_amount_inr,
    payableAmountInr: body.payable_amount_inr,
    amountPaidInr: body.amount_paid_inr,
    notes: body.notes,
  });
  return c.json({ data });
});

billing.post("/renewals/:id/issue", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const data = await issueRenewalForActor(admin, actor, id);
  return c.json({ data });
});

billing.get("/renewals/:id/pdf", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const data = await getRenewalInvoicePdfForActor(admin, actor, id);
  return c.json({ data });
});

// ── Adjustments ──────────────────────────────────────────────

billing.get("/adjustments", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const query = validateQuery(instituteQuerySchema, c.req.query());
  const data = await listAdjustmentsForActor(admin, actor, query.institute_id);
  return c.json({ data });
});

billing.post("/adjustments", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const body = validateBody(
    z.object({
      institute_id: uuid,
      subscription_id: uuid,
      renewal_record_id: uuid.nullable().optional(),
      kind: adjustmentKindSchema.optional(),
      purchase_student_count: z.number().int().nonnegative().optional(),
      live_student_count: z.number().int().nonnegative().optional(),
      additional_student_count: z.number().int().nonnegative().optional(),
      additional_monthly_inr: z.number().nonnegative().optional(),
      remaining_months: z.number().int().nonnegative().optional(),
      payable_amount_inr: z.number().nonnegative().optional(),
      note: z.string().max(2000).nullable().optional(),
    }),
    await c.req.json(),
  );
  const data = await createAdjustmentForActor(admin, actor, {
    instituteId: body.institute_id,
    subscriptionId: body.subscription_id,
    renewalRecordId: body.renewal_record_id,
    kind: body.kind,
    purchaseStudentCount: body.purchase_student_count,
    liveStudentCount: body.live_student_count,
    additionalStudentCount: body.additional_student_count,
    additionalMonthlyInr: body.additional_monthly_inr,
    remainingMonths: body.remaining_months,
    payableAmountInr: body.payable_amount_inr,
    note: body.note,
  });
  return c.json({ data }, 201);
});

billing.get("/adjustments/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const data = await getAdjustmentForActor(admin, actor, id);
  return c.json({ data });
});

billing.patch("/adjustments/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const body = validateBody(
    z
      .object({
        status: adjustmentStatusSchema.optional(),
        purchase_student_count: z.number().int().nonnegative().optional(),
        live_student_count: z.number().int().nonnegative().optional(),
        additional_student_count: z.number().int().nonnegative().optional(),
        additional_monthly_inr: z.number().nonnegative().optional(),
        remaining_months: z.number().int().nonnegative().optional(),
        payable_amount_inr: z.number().nonnegative().optional(),
        note: z.string().max(2000).nullable().optional(),
      })
      .refine((v) => Object.keys(v).length > 0, {
        message: "At least one field is required",
      }),
    await c.req.json(),
  );
  const data = await updateAdjustmentForActor(admin, actor, id, {
    status: body.status,
    purchaseStudentCount: body.purchase_student_count,
    liveStudentCount: body.live_student_count,
    additionalStudentCount: body.additional_student_count,
    additionalMonthlyInr: body.additional_monthly_inr,
    remainingMonths: body.remaining_months,
    payableAmountInr: body.payable_amount_inr,
    note: body.note,
  });
  return c.json({ data });
});

// ── Payments ─────────────────────────────────────────────────

billing.get("/payments/pending", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const data = await listPendingOfflinePaymentsForActor(admin, actor);
  return c.json({ data });
});

billing.get("/payments", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const query = validateQuery(instituteQuerySchema, c.req.query());
  const data = await listPaymentsForActor(admin, actor, query.institute_id);
  return c.json({ data });
});

billing.post("/payments", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const body = validateBody(
    z
      .object({
        institute_id: uuid,
        subscription_id: uuid.nullable().optional(),
        renewal_record_id: uuid.nullable().optional(),
        billing_adjustment_id: uuid.nullable().optional(),
        amount_inr: z.number().positive(),
        method: paymentMethodSchema.optional(),
        provider: z.string().max(100).nullable().optional(),
        provider_ref: z.string().max(200).nullable().optional(),
        note: z.string().max(2000).nullable().optional(),
      })
      .refine(
        (v) =>
          (v.renewal_record_id != null && v.renewal_record_id !== "") ||
          (v.billing_adjustment_id != null && v.billing_adjustment_id !== ""),
        {
          message:
            "renewal_record_id or billing_adjustment_id is required",
        },
      ),
    await c.req.json(),
  );
  const data = await createPaymentForActor(admin, actor, {
    instituteId: body.institute_id,
    subscriptionId: body.subscription_id,
    renewalRecordId: body.renewal_record_id,
    billingAdjustmentId: body.billing_adjustment_id,
    amountInr: body.amount_inr,
    method: body.method,
    provider: body.provider,
    providerRef: body.provider_ref,
    note: body.note,
  });
  return c.json({ data }, 201);
});

billing.get("/payments/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const data = await getPaymentForActor(admin, actor, id);
  return c.json({ data });
});

billing.post("/payments/:id/verify", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const data = await verifyPaymentForActor(admin, actor, id);
  return c.json({ data });
});

billing.post("/payments/:id/reject", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  let reason: string | undefined;
  try {
    const raw = await c.req.json();
    if (raw && typeof raw === "object" && "reason" in raw) {
      const parsed = z.object({ reason: z.string().max(2000) }).safeParse(raw);
      if (parsed.success) reason = parsed.data.reason;
    }
  } catch {
    // empty body is allowed
  }
  const data = await rejectPaymentForActor(admin, actor, id, reason);
  return c.json({ data });
});

export default billing;
