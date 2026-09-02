import { Hono } from "hono";
import { z } from "zod";
import { requireAuth, assertAuthenticated } from "../../auth/require-auth.js";
import type { AppBindings } from "../../types/app.js";
import { AppError } from "../../errors/app-error.js";
import { validateBody } from "../../validation/validate.js";
import { createProductFeedbackForActor } from "../../domains/support/service.js";

const productFeedback = new Hono<AppBindings>();
productFeedback.use("*", requireAuth);

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

productFeedback.post("/", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const body = validateBody(
    z.object({
      institute_id: uuid,
      source: z.enum([
        "admin",
        "connect",
        "transport",
        "admissions",
        "careers",
        "nexus",
      ]),
      kind: z.enum(["bug", "feature", "experience"]),
      rating: z.number().int().min(1).max(5),
      message: z.string().min(12).max(1000),
      screenshot_file_name: z.string().max(300).nullable().optional(),
    }),
    await c.req.json(),
  );
  const data = await createProductFeedbackForActor(admin, actor, {
    instituteId: body.institute_id,
    source: body.source,
    kind: body.kind,
    rating: body.rating,
    message: body.message,
    screenshotFileName: body.screenshot_file_name,
  });
  return c.json({ data }, 201);
});

export default productFeedback;
