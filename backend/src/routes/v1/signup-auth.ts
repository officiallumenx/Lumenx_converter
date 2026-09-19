import { Hono } from "hono";
import { z } from "zod";
import { requireAuth, assertAuthenticated } from "../../auth/require-auth.js";
import type { AppBindings } from "../../types/app.js";
import { AppError } from "../../errors/app-error.js";
import { validateBody } from "../../validation/validate.js";
import {
  bindSignupPinToUser,
  requestSignupVerifyOtp,
  verifySignupChannelOtp,
} from "../../domains/auth-credentials/signup-verify.js";
import { completeAppSignup } from "../../domains/auth-credentials/app-signup.js";
import { getFirebaseAuth } from "../../integrations/firebase.js";

function requireAdmin(c: {
  get: (k: "supabase") => AppBindings["Variables"]["supabase"];
}) {
  const clients = c.get("supabase");
  if (!clients?.admin) throw AppError.internal("Database unavailable");
  return clients.admin;
}

const signupAuth = new Hono<AppBindings>();

signupAuth.post("/request-otp", async (c) => {
  const admin = requireAdmin(c);
  const body = validateBody(
    z.object({
      subject_key: z.string().min(3).max(320),
      channel: z.enum(["email", "mobile"]),
      destination: z.string().min(5).max(320),
      institute_id: z.string().uuid().nullable().optional(),
    }),
    await c.req.json(),
  );
  const data = await requestSignupVerifyOtp(admin, {
    subjectKey: body.subject_key,
    channel: body.channel,
    destination: body.destination,
    instituteId: body.institute_id,
  });
  return c.json({ data });
});

signupAuth.post("/verify-otp", async (c) => {
  const admin = requireAdmin(c);
  const body = validateBody(
    z.object({
      subject_key: z.string().min(3).max(320),
      channel: z.enum(["email", "mobile"]),
      otp: z.string().length(6),
    }),
    await c.req.json(),
  );
  const data = await verifySignupChannelOtp(admin, {
    subjectKey: body.subject_key,
    channel: body.channel,
    otp: body.otp,
  });
  return c.json({ data });
});

signupAuth.post("/complete", async (c) => {
  const admin = requireAdmin(c);
  const firebaseAuth = getFirebaseAuth(c.get("firebaseApp"));
  if (!firebaseAuth) {
    throw AppError.internal("Firebase Auth is not configured");
  }
  const body = validateBody(
    z.object({
      app: z.enum(["admissions", "careers"]),
      account_type: z.enum(["parent", "institute_admin", "job_seeker", "recruiter"]),
      email: z.string().email().max(320),
      password: z.string().min(8).max(128),
      display_name: z.string().min(1).max(200),
      phone: z.string().max(30).nullable().optional(),
      verification_grants: z.array(z.string().min(32).max(256)).min(1).max(2),
      metadata: z.record(z.unknown()).optional(),
    }),
    await c.req.json(),
  );
  const data = await completeAppSignup(admin, firebaseAuth, {
    app: body.app,
    accountType: body.account_type,
    email: body.email,
    password: body.password,
    displayName: body.display_name,
    phone: body.phone,
    verificationGrants: body.verification_grants,
    metadata: body.metadata,
  });
  return c.json({
    data: {
      user_id: data.userId,
      firebase_uid: data.firebaseUid,
      access_token: data.accessToken,
      refresh_token: data.refreshToken,
      token_type: "bearer",
    },
  }, 201);
});

const bindPin = new Hono<AppBindings>();
bindPin.use("*", requireAuth);
bindPin.post("/", async (c) => {
  const admin = requireAdmin(c);
  const actor = assertAuthenticated(c);
  const body = validateBody(
    z.object({
      pin: z.string().min(4).max(8),
      username: z.string().min(3).max(64).nullable().optional(),
    }),
    await c.req.json(),
  );
  const data = await bindSignupPinToUser(admin, {
    userId: actor.userId,
    pin: body.pin,
    username: body.username,
  });
  return c.json({ data });
});

signupAuth.route("/bind-pin", bindPin);

export default signupAuth;
