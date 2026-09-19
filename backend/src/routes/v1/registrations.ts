import { Hono } from "hono";
import { z } from "zod";
import { requireAuth, assertAuthenticated } from "../../auth/require-auth.js";
import type { AppBindings } from "../../types/app.js";
import { AppError } from "../../errors/app-error.js";
import { validateBody } from "../../validation/validate.js";
import {
  createRegistration,
  getOwnRegistrationForActor,
  resubmitRegistrationForActor,
} from "../../domains/registrations/service.js";
import { MAX_REGISTRATION_LOGO_DATA_URL_CHARS } from "../../domains/registrations/types.js";
import { upsertUserAuthCredential } from "../../domains/auth-credentials/repository.js";
import { getFirebaseAuth } from "../../integrations/firebase.js";
import { ensureOwnedFirebaseIdentity } from "../../domains/auth-credentials/app-signup.js";
import {
  completeFirebasePhoneSignup,
  verifyFirebasePhoneSignup,
} from "../../domains/registrations/firebase-signup.js";

async function syncRegistrationApplicantToFirebase(
  c: { get: (k: "firebaseApp") => AppBindings["Variables"]["firebaseApp"] },
  admin: ReturnType<typeof requireAdmin>,
  input: {
    applicantUserId: string;
    applicantName: string;
    email: string;
  },
  password: string,
): Promise<boolean> {
  const auth = getFirebaseAuth(c.get("firebaseApp"));
  if (!auth) return false;
  await ensureOwnedFirebaseIdentity(admin, auth, input.applicantUserId, {
    email: input.email,
    password,
    displayName: input.applicantName,
  });
  return true;
}

function requireAdmin(c: {
  get: (k: "supabase") => AppBindings["Variables"]["supabase"];
}) {
  const clients = c.get("supabase");
  if (!clients?.admin) {
    throw AppError.internal("Database unavailable");
  }
  return clients.admin;
}

const registrationPayloadSchema = z.object({
  instituteName: z.string().min(1).max(200),
  instituteType: z.string().max(120).optional(),
  educationBoard: z.string().max(120).optional(),
  country: z.string().max(80).optional(),
  state: z.string().max(120).optional(),
  district: z.string().max(120).optional(),
  city: z.string().max(120).optional(),
  address: z.string().max(500).optional(),
  pincode: z.string().max(20).optional(),
  website: z.string().max(300).optional(),
  principalName: z.string().max(200).optional(),
  principalEmail: z.string().email().max(320).optional(),
  principalMobile: z.string().max(30).optional(),
  principalDesignation: z.string().max(120).optional(),
  employeeId: z.string().max(80).optional(),
  logoPreview: z.string().max(MAX_REGISTRATION_LOGO_DATA_URL_CHARS).optional(),
});

const createRegistrationSchema = z.object({
  applicant_name: z.string().min(1).max(200),
  email: z.string().email().max(320),
  password: z.string().min(8).max(128),
  phone: z.string().max(30).nullable().optional(),
  firebase_id_token: z.string().min(20).max(4096).optional(),
  pin: z.string().min(4).max(8).optional(),
  payload: registrationPayloadSchema,
});

const resubmitRegistrationSchema = z.object({
  applicant_name: z.string().min(1).max(200).optional(),
  phone: z.string().max(30).nullable().optional(),
  payload: registrationPayloadSchema,
});

const registrations = new Hono<AppBindings>();

/**
 * Public — submit institute registration (pending Nexus approval).
 * Password is consumed by Supabase Auth only; never stored or returned.
 */
registrations.post("/", async (c) => {
  const admin = requireAdmin(c);
  const body = validateBody(createRegistrationSchema, await c.req.json());
  const auth = getFirebaseAuth(c.get("firebaseApp"));
  let verifiedFirebase: { firebaseUid: string } | null = null;
  if (body.firebase_id_token) {
    if (!body.phone) {
      throw AppError.validation(
        "phone is required when firebase_id_token is provided",
      );
    }
    if (!auth) {
      throw AppError.internal("Firebase Auth is unavailable");
    }
    verifiedFirebase = await verifyFirebasePhoneSignup(auth, {
      idToken: body.firebase_id_token,
      phone: body.phone,
      email: body.email,
    });
  }
  const data = await createRegistration(admin, {
    applicantName: body.applicant_name,
    email: body.email,
    password: body.password,
    phone: body.phone,
    pin: body.pin,
    payload: body.payload,
  });
  let firebaseProvisioned: boolean;
  if (verifiedFirebase && auth) {
    await completeFirebasePhoneSignup(admin, auth, {
      firebaseUid: verifiedFirebase.firebaseUid,
      applicantUserId: data.applicantUserId,
      applicantName: data.applicantName,
      email: body.email,
      password: body.password,
    });
    firebaseProvisioned = true;
  } else {
    // Legacy Supabase/non-Firebase provider fallback.
    firebaseProvisioned = await syncRegistrationApplicantToFirebase(
      c,
      admin,
      data,
      body.password,
    );
  }
  if (body.pin) {
    await upsertUserAuthCredential(admin, {
      userId: data.applicantUserId,
      pin: body.pin,
      // Signup OTP is separate; first Admin login still requires OTP per notebook.
      markPhoneVerified: Boolean(verifiedFirebase),
      markEmailVerified: false,
    });
  }
  return c.json({ data: { ...data, firebaseProvisioned } }, 201);
});

const me = new Hono<AppBindings>();
me.use("*", requireAuth);

/** Authenticated applicant — own registration only (scoped by JWT user id). */
me.get("/", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const data = await getOwnRegistrationForActor(admin, actor);
  return c.json({ data });
});

/** Authenticated applicant — resubmit a rejected registration. */
me.post("/resubmit", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const body = validateBody(resubmitRegistrationSchema, await c.req.json());
  const data = await resubmitRegistrationForActor(admin, actor, {
    applicantName: body.applicant_name,
    phone: body.phone,
    payload: body.payload,
  });
  return c.json({ data });
});

registrations.route("/me", me);

export default registrations;
