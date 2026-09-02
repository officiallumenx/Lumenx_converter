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
  createTeacherForActor,
  deleteTeacherForActor,
  getTeacherForActor,
  listTeachersForActor,
  updateTeacherForActor,
} from "../../domains/teachers/service.js";
import {
  getLearnerFacultyForActor,
  getTeacherSelfPortalForActor,
} from "../../domains/teachers/portal.js";

const teachers = new Hono<AppBindings>();

teachers.use("*", requireAuth);

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

const teachingScopeSchema = z.enum([
  "subject_teacher",
  "activity_coordinator",
  "dual_role",
]);
const portalAccessSchema = z.enum([
  "faculty_grading",
  "faculty_only",
  "read_only",
]);
const statusSchema = z.enum(["active", "on_leave", "pending"]);

const idParamsSchema = z.object({ id: uuid });

const listQuerySchema = z.object({
  institute_id: uuid,
  status: statusSchema.optional(),
  teaching_scope: teachingScopeSchema.optional(),
  q: z.string().max(200).optional(),
});

const stringArray = z.array(z.string().min(1).max(100)).max(50).nullable().optional();

const createSchema = z.object({
  institute_id: uuid,
  display_name: z.string().min(1).max(200),
  department: z.string().min(1).max(200),
  teaching_scope: teachingScopeSchema,
  portal_access_level: portalAccessSchema,
  status: statusSchema.optional(),
  phone: z.string().max(40).nullable().optional(),
  email: z.string().email().max(200).nullable().optional(),
  qualification: z.string().max(500).nullable().optional(),
  date_of_birth: dateOnly,
  joined_on: dateOnly,
  employee_id: z.string().max(100).nullable().optional(),
  legacy_code: z.string().max(100).nullable().optional(),
  subjects: stringArray,
  assigned_section_labels: stringArray,
  user_profile_id: uuid.nullable().optional(),
});

const updateSchema = z
  .object({
    display_name: z.string().min(1).max(200).optional(),
    department: z.string().min(1).max(200).optional(),
    teaching_scope: teachingScopeSchema.optional(),
    portal_access_level: portalAccessSchema.optional(),
    status: statusSchema.optional(),
    phone: z.string().max(40).nullable().optional(),
    email: z.string().email().max(200).nullable().optional(),
    qualification: z.string().max(500).nullable().optional(),
    date_of_birth: dateOnly,
    joined_on: dateOnly,
    employee_id: z.string().max(100).nullable().optional(),
    legacy_code: z.string().max(100).nullable().optional(),
    subjects: stringArray,
    assigned_section_labels: stringArray,
  })
  .refine((body) => Object.keys(body).length > 0, {
    message: "At least one field is required",
  });

teachers.get("/", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const query = validateQuery(listQuerySchema, c.req.query());
  const data = await listTeachersForActor(admin, actor, {
    instituteId: query.institute_id,
    status: query.status,
    teachingScope: query.teaching_scope,
    q: query.q,
  });
  return c.json({ data });
});

const portalStudentParamsSchema = z.object({
  studentId: uuid,
});

const portalStudentQuerySchema = z.object({
  institute_id: uuid,
});

const portalMeQuerySchema = z.object({
  institute_id: uuid,
  teacher_id: uuid.optional(),
});

teachers.get("/portal/students/:studentId", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { studentId } = validateParams(portalStudentParamsSchema, c.req.param());
  const query = validateQuery(portalStudentQuerySchema, c.req.query());
  const data = await getLearnerFacultyForActor(admin, actor, {
    instituteId: query.institute_id,
    studentId,
  });
  return c.json({ data });
});

teachers.get("/portal/me", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const query = validateQuery(portalMeQuerySchema, c.req.query());
  const data = await getTeacherSelfPortalForActor(admin, actor, {
    instituteId: query.institute_id,
    teacherId: query.teacher_id,
  });
  return c.json({ data });
});

teachers.get("/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const data = await getTeacherForActor(admin, actor, id);
  return c.json({ data });
});

teachers.post("/", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const body = validateBody(createSchema, await c.req.json());
  const data = await createTeacherForActor(admin, actor, {
    instituteId: body.institute_id,
    displayName: body.display_name,
    department: body.department,
    teachingScope: body.teaching_scope,
    portalAccessLevel: body.portal_access_level,
    status: body.status,
    phone: body.phone,
    email: body.email,
    qualification: body.qualification,
    dateOfBirth: body.date_of_birth,
    joinedOn: body.joined_on,
    employeeId: body.employee_id,
    legacyCode: body.legacy_code,
    subjects: body.subjects,
    assignedSectionLabels: body.assigned_section_labels,
    userProfileId: body.user_profile_id,
  });
  return c.json({ data }, 201);
});

teachers.patch("/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const body = validateBody(updateSchema, await c.req.json());
  const data = await updateTeacherForActor(admin, actor, id, {
    displayName: body.display_name,
    department: body.department,
    teachingScope: body.teaching_scope,
    portalAccessLevel: body.portal_access_level,
    status: body.status,
    phone: body.phone,
    email: body.email,
    qualification: body.qualification,
    dateOfBirth: body.date_of_birth,
    joinedOn: body.joined_on,
    employeeId: body.employee_id,
    legacyCode: body.legacy_code,
    subjects: body.subjects,
    assignedSectionLabels: body.assigned_section_labels,
  });
  return c.json({ data });
});

teachers.delete("/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  await deleteTeacherForActor(admin, actor, id);
  return c.json({ data: { ok: true } });
});

export default teachers;
