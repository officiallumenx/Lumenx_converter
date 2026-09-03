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
  getCurrentSubscriptionForActor,
  getSubscriptionDetailForActor,
  getSubscriptionHistoryForActor,
  getSubscriptionQuoteForActor,
  submitOfflinePaymentForActor,
} from "../../domains/subscriptions/service.js";
import { getInstituteRenewalInvoicePdfForActor } from "../../domains/billing/service.js";
import { withIdempotency } from "../../domains/idempotency/with-idempotency.js";
import { beginOnlineCheckoutForActor } from "../../domains/subscriptions/online-checkout.js";

const subscriptions = new Hono<AppBindings>();
subscriptions.use("*", requireAuth);

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
const instituteQuerySchema = z.object({ institute_id: uuid });
const durationSchema = z.union([z.literal(1), z.literal(6), z.literal(12)]);
const idParamsSchema = z.object({ id: uuid });

subscriptions.get("/current", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const query = validateQuery(instituteQuerySchema, c.req.query());
  const data = await getCurrentSubscriptionForActor(
    admin,
    actor,
    query.institute_id,
  );
  return c.json({ data });
});

subscriptions.get("/detail", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const query = validateQuery(instituteQuerySchema, c.req.query());
  const data = await getSubscriptionDetailForActor(
    admin,
    actor,
    query.institute_id,
  );
  return c.json({ data });
});

subscriptions.get("/quote", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const query = validateQuery(
    z.object({
      institute_id: uuid,
      duration_months: durationSchema.optional(),
    }),
    c.req.query(),
  );
  const data = await getSubscriptionQuoteForActor(
    admin,
    actor,
    query.institute_id,
    query.duration_months ?? null,
  );
  return c.json({ data });
});

subscriptions.get("/history", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const query = validateQuery(instituteQuerySchema, c.req.query());
  const data = await getSubscriptionHistoryForActor(
    admin,
    actor,
    query.institute_id,
  );
  return c.json({ data });
});

subscriptions.get("/renewals/:id/pdf", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const data = await getInstituteRenewalInvoicePdfForActor(admin, actor, id);
  return c.json({ data });
});

subscriptions.post("/offline-payments", async (c) => {
  return withIdempotency(
    c,
    "POST /api/v1/subscriptions/offline-payments",
    async () => {
      const actor = assertAuthenticated(c);
      const admin = requireAdmin(c);
      const body = validateBody(
        z.object({
          institute_id: uuid,
          duration_months: durationSchema,
          reference_id: z.string().min(1).max(200),
          proof_label: z.string().max(500).nullable().optional(),
        }),
        await c.req.json(),
      );
      const data = await submitOfflinePaymentForActor(admin, actor, {
        instituteId: body.institute_id,
        durationMonths: body.duration_months,
        referenceId: body.reference_id,
        proofLabel: body.proof_label,
      });
      return { status: 201, body: { data } };
    },
  );
});

subscriptions.post("/online-checkout", async (c) => {
  return withIdempotency(
    c,
    "POST /api/v1/subscriptions/online-checkout",
    async () => {
      const actor = assertAuthenticated(c);
      const admin = requireAdmin(c);
      const body = validateBody(
        z.object({
          institute_id: uuid,
          duration_months: durationSchema,
          client_reference: z.string().max(200).nullable().optional(),
        }),
        await c.req.json(),
      );
      const data = await beginOnlineCheckoutForActor(admin, actor, {
        instituteId: body.institute_id,
        durationMonths: body.duration_months,
        clientReference: body.client_reference,
      });
      return { status: 201, body: { data } };
    },
  );
});

export default subscriptions;
