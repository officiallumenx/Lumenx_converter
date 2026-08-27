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
  createGuardianLinkForActor,
  createParentForActor,
  deleteGuardianLinkForActor,
  deleteParentForActor,
  getParentForActor,
  listParentsForActor,
  updateGuardianLinkForActor,
  updateParentForActor,
} from "../../domains/parents/service.js";

const parents = new Hono<AppBindings>();

parents.use("*", requireAuth);

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
const inviteSchema = z.enum(["pending", "active"]);
const accessSchema = z.enum(["active", "hold", "suspended"]);
const relationshipSchema = z.enum(["mother", "father", "guardian"]);
const linkStatusSchema = z.enum(["active", "inactive"]);

const idParamsSchema = z.object({ id: uuid });
const linkParamsSchema = z.object({ id: uuid, linkId: uuid });

const listQuerySchema = z.object({
  institute_id: uuid,
  invite_status: inviteSchema.optional(),
  access_status: accessSchema.optional(),
  q: z.string().max(200).optional(),
});

const createSchema = z.object({
  institute_id: uuid,
  name: z.string().min(1).max(200),
  phone: z.string().min(1).max(40),
  email: z.string().email().max(200).nullable().optional(),
  address: z.string().max(2000).nullable().optional(),
  invite_status: inviteSchema.optional(),
  access_status: accessSchema.optional(),
  legacy_code: z.string().max(100).nullable().optional(),
  user_profile_id: uuid.nullable().optional(),
});

const updateSchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
    phone: z.string().min(1).max(40).optional(),
    email: z.string().email().max(200).nullable().optional(),
    address: z.string().max(2000).nullable().optional(),
    invite_status: inviteSchema.optional(),
    access_status: accessSchema.optional(),
    legacy_code: z.string().max(100).nullable().optional(),
  })
  .refine((body) => Object.keys(body).length > 0, {
    message: "At least one field is required",
  });

const createLinkSchema = z.object({
  student_id: uuid,
  relationship: relationshipSchema,
  is_primary: z.boolean().optional(),
  is_emergency_contact: z.boolean().optional(),
  status: linkStatusSchema.optional(),
});

const updateLinkSchema = z
  .object({
    relationship: relationshipSchema.optional(),
    is_primary: z.boolean().optional(),
    is_emergency_contact: z.boolean().optional(),
    status: linkStatusSchema.optional(),
  })
  .refine((body) => Object.keys(body).length > 0, {
    message: "At least one field is required",
  });

parents.get("/", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const query = validateQuery(listQuerySchema, c.req.query());
  const data = await listParentsForActor(admin, actor, {
    instituteId: query.institute_id,
    inviteStatus: query.invite_status,
    accessStatus: query.access_status,
    q: query.q,
  });
  return c.json({ data });
});

parents.get("/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const data = await getParentForActor(admin, actor, id);
  return c.json({ data });
});

parents.post("/", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const body = validateBody(createSchema, await c.req.json());
  const data = await createParentForActor(admin, actor, {
    instituteId: body.institute_id,
    name: body.name,
    phone: body.phone,
    email: body.email,
    address: body.address,
    inviteStatus: body.invite_status,
    accessStatus: body.access_status,
    legacyCode: body.legacy_code,
    userProfileId: body.user_profile_id,
  });
  return c.json({ data }, 201);
});

parents.patch("/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const body = validateBody(updateSchema, await c.req.json());
  const data = await updateParentForActor(admin, actor, id, {
    name: body.name,
    phone: body.phone,
    email: body.email,
    address: body.address,
    inviteStatus: body.invite_status,
    accessStatus: body.access_status,
    legacyCode: body.legacy_code,
  });
  return c.json({ data });
});

parents.delete("/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  await deleteParentForActor(admin, actor, id);
  return c.json({ data: { ok: true } });
});

parents.post("/:id/links", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const body = validateBody(createLinkSchema, await c.req.json());
  const data = await createGuardianLinkForActor(admin, actor, id, {
    studentId: body.student_id,
    relationship: body.relationship,
    isPrimary: body.is_primary,
    isEmergencyContact: body.is_emergency_contact,
    status: body.status,
  });
  return c.json({ data }, 201);
});

parents.patch("/:id/links/:linkId", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id, linkId } = validateParams(linkParamsSchema, c.req.param());
  const body = validateBody(updateLinkSchema, await c.req.json());
  const data = await updateGuardianLinkForActor(admin, actor, id, linkId, {
    relationship: body.relationship,
    isPrimary: body.is_primary,
    isEmergencyContact: body.is_emergency_contact,
    status: body.status,
  });
  return c.json({ data });
});

parents.delete("/:id/links/:linkId", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id, linkId } = validateParams(linkParamsSchema, c.req.param());
  await deleteGuardianLinkForActor(admin, actor, id, linkId);
  return c.json({ data: { ok: true } });
});

export default parents;
