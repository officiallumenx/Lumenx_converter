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
  logoPreview: z.string().max(200_000).optional(),
});

const createRegistrationSchema = z.object({
  applicant_name: z.string().min(1).max(200),
  email: z.string().email().max(320),
  password: z.string().min(8).max(128),
  phone: z.string().max(30).nullable().optional(),
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
  const data = await createRegistration(admin, {
    applicantName: body.applicant_name,
    email: body.email,
    password: body.password,
    phone: body.phone,
    payload: body.payload,
  });
  return c.json({ data }, 201);
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
