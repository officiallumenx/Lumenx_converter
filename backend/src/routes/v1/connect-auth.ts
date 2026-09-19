import { Hono } from "hono";
import { z } from "zod";
import type { AppBindings } from "../../types/app.js";
import { AppError } from "../../errors/app-error.js";
import { validateBody } from "../../validation/validate.js";
import {
  completeConnectFirebaseLogin,
  completeConnectForgotPin,
  completeConnectLogin,
  completeConnectPinWithOtpGrant,
  requestConnectMobileOtp,
  resolveConnectLoginMode,
  verifyConnectMobileOtp,
} from "../../domains/auth-credentials/connect-login.js";
import {
  assertFirebaseAuthenticated,
  requireFirebaseAuth,
} from "../../auth/require-firebase-auth.js";

function requireAdmin(c: {
  get: (k: "supabase") => AppBindings["Variables"]["supabase"];
}) {
  const clients = c.get("supabase");
  if (!clients?.admin) throw AppError.internal("Database unavailable");
  return clients.admin;
}

const roleSchema = z.enum(["teacher", "parent", "student"]);

const connectAuth = new Hono<AppBindings>();

connectAuth.post("/login-mode", async (c) => {
  const admin = requireAdmin(c);
  const body = validateBody(
    z.object({
      institute_id: z.string().uuid(),
      phone: z.string().min(10).max(40),
      role: roleSchema,
    }),
    await c.req.json(),
  );
  const data = await resolveConnectLoginMode(admin, {
    instituteId: body.institute_id,
    phone: body.phone,
    role: body.role,
  });
  return c.json({ data });
});

connectAuth.post("/login", async (c) => {
  const admin = requireAdmin(c);
  const body = validateBody(
    z.object({
      institute_id: z.string().uuid(),
      phone: z.string().min(10).max(40),
      role: roleSchema,
      pin: z.string().min(4).max(8),
    }),
    await c.req.json(),
  );
  const data = await completeConnectLogin(admin, {
    instituteId: body.institute_id,
    phone: body.phone,
    role: body.role,
    pin: body.pin,
  });
  return c.json({
    data: {
      access_token: data.accessToken,
      refresh_token: data.refreshToken,
      institute_id: data.instituteId,
      display_name: data.displayName,
      role: data.role,
    },
  });
});

connectAuth.post("/request-otp", async (c) => {
  const admin = requireAdmin(c);
  const body = validateBody(
    z.object({
      institute_id: z.string().uuid(),
      phone: z.string().min(10).max(40),
      role: roleSchema,
    }),
    await c.req.json(),
  );
  const data = await requestConnectMobileOtp(admin, {
    instituteId: body.institute_id,
    phone: body.phone,
    role: body.role,
  });
  return c.json({ data });
});

connectAuth.post("/verify-otp", async (c) => {
  const admin = requireAdmin(c);
  const body = validateBody(
    z.object({
      institute_id: z.string().uuid(),
      phone: z.string().min(10).max(40),
      role: roleSchema,
      otp: z.string().regex(/^\d{6}$/),
    }),
    await c.req.json(),
  );
  const data = await verifyConnectMobileOtp(admin, {
    instituteId: body.institute_id,
    phone: body.phone,
    role: body.role,
    otp: body.otp,
  });
  return c.json({ data });
});

connectAuth.post("/complete-pin", async (c) => {
  const admin = requireAdmin(c);
  const body = validateBody(
    z.object({
      institute_id: z.string().uuid(),
      phone: z.string().min(10).max(40),
      role: roleSchema,
      pin: z.string().min(4).max(8),
      otp_grant: z.string().min(32).max(128),
    }),
    await c.req.json(),
  );
  const data = await completeConnectPinWithOtpGrant(admin, {
    instituteId: body.institute_id,
    phone: body.phone,
    role: body.role,
    pin: body.pin,
    otpGrant: body.otp_grant,
  });
  return c.json({
    data: {
      access_token: data.accessToken,
      refresh_token: data.refreshToken,
      institute_id: data.instituteId,
      display_name: data.displayName,
      role: data.role,
    },
  });
});

connectAuth.post(
  "/firebase-login",
  requireFirebaseAuth({ checkRevoked: true }),
  async (c) => {
    const admin = requireAdmin(c);
    const identity = assertFirebaseAuthenticated(c);
    const body = validateBody(
      z.object({
        institute_id: z.string().uuid(),
        role: roleSchema,
        pin: z.string().min(4).max(8),
      }),
      await c.req.json(),
    );
    const data = await completeConnectFirebaseLogin(admin, identity, {
      instituteId: body.institute_id,
      role: body.role,
      pin: body.pin,
    });
    return c.json({
      data: {
        access_token: data.accessToken,
        refresh_token: data.refreshToken,
        institute_id: data.instituteId,
        display_name: data.displayName,
        role: data.role,
      },
    });
  },
);

connectAuth.post(
  "/reset-pin",
  requireFirebaseAuth({ checkRevoked: true }),
  async (c) => {
    const admin = requireAdmin(c);
    const identity = assertFirebaseAuthenticated(c);
    const body = validateBody(
      z.object({
        institute_id: z.string().uuid(),
        role: roleSchema,
        pin: z.string().min(4).max(8),
      }),
      await c.req.json(),
    );
    const data = await completeConnectForgotPin(admin, identity, {
      instituteId: body.institute_id,
      role: body.role,
      pin: body.pin,
    });
    return c.json({
      data: {
        access_token: data.accessToken,
        refresh_token: data.refreshToken,
        institute_id: data.instituteId,
        display_name: data.displayName,
        role: data.role,
      },
    });
  },
);

export default connectAuth;
