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
  createStaffAccountForActor,
  deleteStaffAccountForActor,
  getStaffAccountForActor,
  listStaffAccountsForActor,
  updateStaffAccountForActor,
} from "../../domains/staff/service.js";

const staff = new Hono<AppBindings>();
staff.use("*", requireAuth);

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
const dateOnly = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD")
  .nullable()
  .optional();

const statusSchema = z.enum(["active", "on_leave", "pending", "suspended"]);
const idParamsSchema = z.object({ id: uuid });

const listQuerySchema = z.object({
  institute_id: uuid,
  status: statusSchema.optional(),
  q: z.string().max(200).optional(),
});

const createSchema = z.object({
  institute_id: uuid,
  display_name: z.string().min(1).max(200),
  department: z.string().min(1).max(200),
  status: statusSchema.optional(),
  phone: z.string().max(40).nullable().optional(),
  email: z.string().email().max(200).nullable().optional(),
  job_title: z.string().max(200).nullable().optional(),
  date_of_birth: dateOnly,
  joined_on: dateOnly,
  employee_id: z.string().max(100).nullable().optional(),
  legacy_code: z.string().max(100).nullable().optional(),
  user_profile_id: uuid.nullable().optional(),
});

const updateSchema = z
  .object({
    display_name: z.string().min(1).max(200).optional(),
    department: z.string().min(1).max(200).optional(),
    status: statusSchema.optional(),
    phone: z.string().max(40).nullable().optional(),
    email: z.string().email().max(200).nullable().optional(),
    job_title: z.string().max(200).nullable().optional(),
    date_of_birth: dateOnly,
    joined_on: dateOnly,
    employee_id: z.string().max(100).nullable().optional(),
    legacy_code: z.string().max(100).nullable().optional(),
  })
  .refine((body) => Object.keys(body).length > 0, {
    message: "At least one field is required",
  });

staff.get("/", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const query = validateQuery(listQuerySchema, c.req.query());
  const data = await listStaffAccountsForActor(admin, actor, {
    instituteId: query.institute_id,
    status: query.status,
    q: query.q,
  });
  return c.json({ data });
});

staff.get("/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const data = await getStaffAccountForActor(admin, actor, id);
  return c.json({ data });
});

staff.post("/", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const body = validateBody(createSchema, await c.req.json());
  const data = await createStaffAccountForActor(admin, actor, {
    instituteId: body.institute_id,
    displayName: body.display_name,
    department: body.department,
    status: body.status,
    phone: body.phone,
    email: body.email,
    jobTitle: body.job_title,
    dateOfBirth: body.date_of_birth,
    joinedOn: body.joined_on,
    employeeId: body.employee_id,
    legacyCode: body.legacy_code,
    userProfileId: body.user_profile_id,
  });
  return c.json({ data }, 201);
});

staff.patch("/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const body = validateBody(updateSchema, await c.req.json());
  const data = await updateStaffAccountForActor(admin, actor, id, {
    displayName: body.display_name,
    department: body.department,
    status: body.status,
    phone: body.phone,
    email: body.email,
    jobTitle: body.job_title,
    dateOfBirth: body.date_of_birth,
    joinedOn: body.joined_on,
    employeeId: body.employee_id,
    legacyCode: body.legacy_code,
  });
  return c.json({ data });
});

staff.delete("/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  await deleteStaffAccountForActor(admin, actor, id);
  return c.json({ data: { ok: true } });
});

export default staff;
