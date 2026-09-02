import { Hono } from "hono";
import { z } from "zod";
import type { AppBindings } from "../../types/app.js";
import { AppError } from "../../errors/app-error.js";
import { validateBody } from "../../validation/validate.js";
import {
  requestParentLoginOtp,
  verifyParentLoginOtp,
} from "../../domains/parents/parent-login.js";

const parentAuth = new Hono<AppBindings>();

function requireAdmin(c: {
  get: (k: "supabase") => AppBindings["Variables"]["supabase"];
}) {
  const clients = c.get("supabase");
  if (!clients?.admin) {
    throw AppError.internal("Database unavailable");
  }
  return clients.admin;
}

const phoneInstituteSchema = z.object({
  institute_id: z.string().uuid(),
  phone: z.string().min(10).max(40),
});

const verifySchema = phoneInstituteSchema.extend({
  otp: z.string().length(6),
});

/** Public — sends OTP only when mobile matches a parent at the institute. */
parentAuth.post("/request-otp", async (c) => {
  const admin = requireAdmin(c);
  const body = validateBody(phoneInstituteSchema, await c.req.json());
  const data = await requestParentLoginOtp(admin, {
    instituteId: body.institute_id,
    phone: body.phone,
  });
  return c.json({ data });
});

/** Public — verifies OTP and returns Supabase session tokens. */
parentAuth.post("/verify-otp", async (c) => {
  const admin = requireAdmin(c);
  const body = validateBody(verifySchema, await c.req.json());
  const data = await verifyParentLoginOtp(admin, {
    instituteId: body.institute_id,
    phone: body.phone,
    otp: body.otp,
  });
  return c.json({
    data: {
      access_token: data.accessToken,
      refresh_token: data.refreshToken,
      institute_id: data.instituteId,
      display_name: data.displayName,
    },
  });
});

export default parentAuth;
