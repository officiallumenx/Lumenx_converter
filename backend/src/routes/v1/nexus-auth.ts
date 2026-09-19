import { Hono } from "hono";
import { z } from "zod";
import type { AppBindings } from "../../types/app.js";
import { AppError } from "../../errors/app-error.js";
import { validateBody } from "../../validation/validate.js";
import {
  completeNexusFirebaseLogin,
  completeNexusLogin,
  completeNexusPasswordReset,
  completeNexusPinReset,
  openNexusOpenAccessSession,
  requestNexusLoginOtp,
  requestNexusPasswordResetOtp,
  requestNexusPinResetOtp,
  resolveNexusLoginMode,
  verifyNexusChannelOtp,
  verifyNexusPasswordResetOtp,
  verifyNexusPinResetOtp,
} from "../../domains/auth-credentials/nexus-login.js";
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

const channelSchema = z.enum(["email", "mobile"]);
const identifierSchema = z.string().min(3).max(200);
const otpSchema = z.string().length(6);
const grantSchema = z.string().length(64);

const nexusAuth = new Hono<AppBindings>();

nexusAuth.post("/login-mode", async (c) => {
  const admin = requireAdmin(c);
  const body = validateBody(
    z.object({ identifier: identifierSchema }),
    await c.req.json(),
  );
  const data = await resolveNexusLoginMode(admin, body.identifier);
  return c.json({ data });
});

/** Local/dev: session without login UI (requires NEXUS_OPEN_ACCESS=1). */
nexusAuth.post("/open-access", async (c) => {
  const admin = requireAdmin(c);
  const data = await openNexusOpenAccessSession(admin);
  return c.json({
    data: {
      access_token: data.accessToken,
      refresh_token: data.refreshToken,
      display_name: data.displayName,
      first_login_completed: data.firstLoginCompleted,
      is_root: data.isRoot,
    },
  });
});

nexusAuth.post("/request-otp", async (c) => {
  const admin = requireAdmin(c);
  const body = validateBody(
    z.object({
      identifier: identifierSchema,
      channel: channelSchema,
      delivery: z.enum(["server", "firebase_client"]).optional(),
    }),
    await c.req.json(),
  );
  const data = await requestNexusLoginOtp(admin, body);
  return c.json({ data });
});

nexusAuth.post("/verify-otp", async (c) => {
  const admin = requireAdmin(c);
  const body = validateBody(
    z.object({
      identifier: identifierSchema,
      channel: channelSchema,
      otp: otpSchema,
    }),
    await c.req.json(),
  );
  const data = await verifyNexusChannelOtp(admin, body);
  return c.json({ data });
});

nexusAuth.post("/login", async (c) => {
  const admin = requireAdmin(c);
  const body = validateBody(
    z.object({
      identifier: identifierSchema,
      pin: z.string().min(4).max(8),
      password: z.string().min(1).max(200),
      mobile_otp_grant: grantSchema,
      email_otp_grant: grantSchema,
    }),
    await c.req.json(),
  );
  const data = await completeNexusLogin(admin, {
    identifier: body.identifier,
    pin: body.pin,
    password: body.password,
    mobileOtpGrant: body.mobile_otp_grant,
    emailOtpGrant: body.email_otp_grant,
  });
  return c.json({
    data: {
      access_token: data.accessToken,
      refresh_token: data.refreshToken,
      display_name: data.displayName,
      first_login_completed: data.firstLoginCompleted,
      is_root: data.isRoot,
    },
  });
});

nexusAuth.post("/firebase-login", requireFirebaseAuth({ checkRevoked: true }), async (c) => {
  const admin = requireAdmin(c);
  const identity = assertFirebaseAuthenticated(c);
  const body = validateBody(
    z.object({
      provider: z.enum(["password", "phone"]),
      pin: z.string().min(4).max(8),
      password: z.string().min(1).max(200).optional(),
      mobile_otp_grant: grantSchema.optional(),
      email_otp_grant: grantSchema.optional(),
    }),
    await c.req.json(),
  );
  const data = await completeNexusFirebaseLogin(admin, identity, {
    provider: body.provider,
    pin: body.pin,
    password: body.password,
    mobileOtpGrant: body.mobile_otp_grant,
    emailOtpGrant: body.email_otp_grant,
  });
  return c.json({
    data: {
      access_token: data.accessToken,
      refresh_token: data.refreshToken,
      display_name: data.displayName,
      first_login_completed: data.firstLoginCompleted,
      is_root: data.isRoot,
    },
  });
});

nexusAuth.post("/forgot-password/request-otp", async (c) => {
  const admin = requireAdmin(c);
  const body = validateBody(
    z.object({
      identifier: identifierSchema,
      channel: channelSchema,
    }),
    await c.req.json(),
  );
  const data = await requestNexusPasswordResetOtp(admin, body);
  return c.json({ data });
});

nexusAuth.post("/forgot-password/verify-otp", async (c) => {
  const admin = requireAdmin(c);
  const body = validateBody(
    z.object({
      identifier: identifierSchema,
      channel: channelSchema,
      otp: otpSchema,
    }),
    await c.req.json(),
  );
  const data = await verifyNexusPasswordResetOtp(admin, body);
  return c.json({ data });
});

nexusAuth.post("/forgot-password/complete", async (c) => {
  const admin = requireAdmin(c);
  const body = validateBody(
    z.object({
      identifier: identifierSchema,
      mobile_otp_grant: grantSchema,
      email_otp_grant: grantSchema,
      new_password: z.string().min(8).max(128),
    }),
    await c.req.json(),
  );
  const data = await completeNexusPasswordReset(admin, {
    identifier: body.identifier,
    mobileOtpGrant: body.mobile_otp_grant,
    emailOtpGrant: body.email_otp_grant,
    newPassword: body.new_password,
  });
  return c.json({ data });
});

nexusAuth.post("/forgot-pin/request-otp", async (c) => {
  const admin = requireAdmin(c);
  const body = validateBody(
    z.object({
      identifier: identifierSchema,
      channel: channelSchema,
    }),
    await c.req.json(),
  );
  const data = await requestNexusPinResetOtp(admin, body);
  return c.json({ data });
});

nexusAuth.post("/forgot-pin/verify-otp", async (c) => {
  const admin = requireAdmin(c);
  const body = validateBody(
    z.object({
      identifier: identifierSchema,
      channel: channelSchema,
      otp: otpSchema,
    }),
    await c.req.json(),
  );
  const data = await verifyNexusPinResetOtp(admin, body);
  return c.json({ data });
});

nexusAuth.post("/forgot-pin/complete", async (c) => {
  const admin = requireAdmin(c);
  const body = validateBody(
    z.object({
      identifier: identifierSchema,
      mobile_otp_grant: grantSchema,
      email_otp_grant: grantSchema,
      new_pin: z.string().min(4).max(8),
    }),
    await c.req.json(),
  );
  const data = await completeNexusPinReset(admin, {
    identifier: body.identifier,
    mobileOtpGrant: body.mobile_otp_grant,
    emailOtpGrant: body.email_otp_grant,
    newPin: body.new_pin,
  });
  return c.json({ data });
});

export default nexusAuth;
