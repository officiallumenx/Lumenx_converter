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
  createStudentForActor,
  deleteStudentForActor,
  getStudentForActor,
  listStudentsForActor,
  updateStudentForActor,
} from "../../domains/students/service.js";

const students = new Hono<AppBindings>();

students.use("*", requireAuth);

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

const genderSchema = z.enum([
  "female",
  "male",
  "other",
  "prefer_not_to_say",
]);
const statusSchema = z.enum([
  "active",
  "at-risk",
  "watch",
  "inactive",
  "graduated",
]);
const accessStatusSchema = z.enum(["active", "hold", "suspended"]);

const idParamsSchema = z.object({ id: uuid });

const listQuerySchema = z.object({
  institute_id: uuid,
  status: statusSchema.optional(),
  access_status: accessStatusSchema.optional(),
  class_label: z.string().min(1).max(50).optional(),
  section_label: z.string().min(1).max(50).optional(),
  q: z.string().max(200).optional(),
});

const createSchema = z.object({
  institute_id: uuid,
  first_name: z.string().min(1).max(100),
  surname: z.string().min(1).max(100),
  display_name: z.string().min(1).max(200).optional(),
  gender: genderSchema,
  address: z.string().min(1).max(2000),
  date_of_birth: dateOnly,
  class_label: z.string().max(50).nullable().optional(),
  section_label: z.string().max(50).nullable().optional(),
  roll_no: z.string().max(50).nullable().optional(),
  status: statusSchema.optional(),
  access_status: accessStatusSchema.optional(),
  blood_group: z.string().max(20).nullable().optional(),
  emergency_contact: z.string().max(200).nullable().optional(),
  house: z.string().max(100).nullable().optional(),
  photo_asset_path: z.string().max(1000).nullable().optional(),
  admission_number: z.string().max(100).nullable().optional(),
  legacy_code: z.string().max(100).nullable().optional(),
  id_card_issued_on: dateOnly,
  id_card_valid_till: dateOnly,
  user_profile_id: uuid.nullable().optional(),
});

const updateSchema = z
  .object({
    first_name: z.string().min(1).max(100).optional(),
    surname: z.string().min(1).max(100).optional(),
    display_name: z.string().min(1).max(200).optional(),
    gender: genderSchema.optional(),
    address: z.string().min(1).max(2000).optional(),
    date_of_birth: dateOnly,
    class_label: z.string().max(50).nullable().optional(),
    section_label: z.string().max(50).nullable().optional(),
    roll_no: z.string().max(50).nullable().optional(),
    status: statusSchema.optional(),
    access_status: accessStatusSchema.optional(),
    blood_group: z.string().max(20).nullable().optional(),
    emergency_contact: z.string().max(200).nullable().optional(),
    house: z.string().max(100).nullable().optional(),
    photo_asset_path: z.string().max(1000).nullable().optional(),
    admission_number: z.string().max(100).nullable().optional(),
    legacy_code: z.string().max(100).nullable().optional(),
    id_card_issued_on: dateOnly,
    id_card_valid_till: dateOnly,
  })
  .refine((body) => Object.keys(body).length > 0, {
    message: "At least one field is required",
  });

students.get("/", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const query = validateQuery(listQuerySchema, c.req.query());
  const data = await listStudentsForActor(admin, actor, {
    instituteId: query.institute_id,
    status: query.status,
    accessStatus: query.access_status,
    classLabel: query.class_label,
    sectionLabel: query.section_label,
    q: query.q,
  });
  return c.json({ data });
});

students.get("/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const data = await getStudentForActor(admin, actor, id);
  return c.json({ data });
});

students.post("/", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const body = validateBody(createSchema, await c.req.json());
  const data = await createStudentForActor(admin, actor, {
    instituteId: body.institute_id,
    firstName: body.first_name,
    surname: body.surname,
    displayName: body.display_name,
    gender: body.gender,
    address: body.address,
    dateOfBirth: body.date_of_birth,
    classLabel: body.class_label,
    sectionLabel: body.section_label,
    rollNo: body.roll_no,
    status: body.status,
    accessStatus: body.access_status,
    bloodGroup: body.blood_group,
    emergencyContact: body.emergency_contact,
    house: body.house,
    photoAssetPath: body.photo_asset_path,
    admissionNumber: body.admission_number,
    legacyCode: body.legacy_code,
    idCardIssuedOn: body.id_card_issued_on,
    idCardValidTill: body.id_card_valid_till,
    userProfileId: body.user_profile_id,
  });
  return c.json({ data }, 201);
});

students.patch("/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const body = validateBody(updateSchema, await c.req.json());
  const data = await updateStudentForActor(admin, actor, id, {
    firstName: body.first_name,
    surname: body.surname,
    displayName: body.display_name,
    gender: body.gender,
    address: body.address,
    dateOfBirth: body.date_of_birth,
    classLabel: body.class_label,
    sectionLabel: body.section_label,
    rollNo: body.roll_no,
    status: body.status,
    accessStatus: body.access_status,
    bloodGroup: body.blood_group,
    emergencyContact: body.emergency_contact,
    house: body.house,
    photoAssetPath: body.photo_asset_path,
    admissionNumber: body.admission_number,
    legacyCode: body.legacy_code,
    idCardIssuedOn: body.id_card_issued_on,
    idCardValidTill: body.id_card_valid_till,
  });
  return c.json({ data });
});

students.delete("/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  await deleteStudentForActor(admin, actor, id);
  return c.json({ data: { ok: true } });
});

export default students;
