import { Hono } from "hono";
import { z } from "zod";
import type { AppBindings } from "../../types/app.js";
import { AppError } from "../../errors/app-error.js";
import { validateBody, validateParams } from "../../validation/validate.js";
import { confirmOnlinePaymentWebhook } from "../../domains/subscriptions/online-checkout.js";

/**
 * Provider webhooks (unauthenticated — verified via shared secret header).
 */
const webhooks = new Hono<AppBindings>();

function requireAdmin(c: {
  get: (k: "supabase") => AppBindings["Variables"]["supabase"];
}) {
  const clients = c.get("supabase");
  if (!clients?.admin) {
    throw AppError.internal("Database unavailable");
  }
  return clients.admin;
}

webhooks.post("/payments/:provider", async (c) => {
  const admin = requireAdmin(c);
  const { provider } = validateParams(
    z.object({ provider: z.enum(["demo", "webhook"]) }),
    c.req.param(),
  );
  const body = validateBody(
    z.object({
      provider_session_id: z.string().min(8).max(200),
    }),
    await c.req.json(),
  );
  const secret =
    c.req.header("x-lumenx-webhook-secret") ??
    c.req.header("x-webhook-secret") ??
    undefined;
  const data = await confirmOnlinePaymentWebhook(admin, {
    provider,
    providerSessionId: body.provider_session_id,
    webhookSecret: secret,
  });
  return c.json({ data });
});

export default webhooks;
