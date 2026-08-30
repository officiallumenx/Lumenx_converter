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
  createSlotForActor,
  deleteSlotForActor,
  getSlotForActor,
  listAssignmentsForActor,
  listSlotsForActor,
  updateSlotForActor,
} from "../../domains/timetable/service.js";

const timetable = new Hono<AppBindings>();

timetable.use("*", requireAuth);

function requireAdmin(c: { get: (k: "supabase") => AppBindings["Variables"]["supabase"] }) {
  const clients = c.get("supabase");
  if (!clients?.admin) {
    throw AppError.internal("Database unavailable");
  }
  return clients.admin;
}

const timeRe = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;

const uuid = z.string().uuid();

const listQuerySchema = z.object({
  institute_id: uuid,
  academic_year_id: uuid.optional(),
  section_id: uuid.optional(),
  teacher_id: uuid.optional(),
});

const idParamsSchema = z.object({
  id: uuid,
});

const createBodySchema = z
  .object({
    institute_id: uuid,
    academic_year_id: uuid,
    class_id: uuid,
    section_id: uuid,
    teacher_assignment_id: uuid,
    day_of_week: z.coerce.number().int().min(1).max(7),
    period_index: z.coerce.number().int().min(1),
    starts_at: z.string().regex(timeRe, "Invalid time"),
    ends_at: z.string().regex(timeRe, "Invalid time"),
    room: z.string().max(120).nullable().optional(),
    status: z.enum(["active", "inactive"]).optional(),
  })
  .superRefine((val, ctx) => {
    if (val.ends_at <= val.starts_at) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "ends_at must be after starts_at",
        path: ["ends_at"],
      });
    }
  });

const updateBodySchema = z
  .object({
    academic_year_id: uuid.optional(),
    class_id: uuid.optional(),
    section_id: uuid.optional(),
    teacher_assignment_id: uuid.optional(),
    day_of_week: z.coerce.number().int().min(1).max(7).optional(),
    period_index: z.coerce.number().int().min(1).optional(),
    starts_at: z.string().regex(timeRe, "Invalid time").optional(),
    ends_at: z.string().regex(timeRe, "Invalid time").optional(),
    room: z.string().max(120).nullable().optional(),
    status: z.enum(["active", "inactive"]).optional(),
  })
  .superRefine((val, ctx) => {
    if (val.starts_at && val.ends_at && val.ends_at <= val.starts_at) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "ends_at must be after starts_at",
        path: ["ends_at"],
      });
    }
  });

const assignmentsQuerySchema = z.object({
  institute_id: uuid,
  academic_year_id: uuid.optional(),
  section_id: uuid.optional(),
  class_id: uuid.optional(),
  status: z.enum(["active", "inactive"]).optional(),
});

/**
 * GET /api/v1/timetable
 * List slots for an authorized institute (optional section / year / teacher filters).
 */
timetable.get("/", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const query = validateQuery(listQuerySchema, c.req.query());

  const data = await listSlotsForActor(admin, actor, {
    instituteId: query.institute_id,
    academicYearId: query.academic_year_id,
    sectionId: query.section_id,
    teacherId: query.teacher_id,
  });

  return c.json({ data });
});

/**
 * GET /api/v1/timetable/assignments
 * List teacher_assignment rows for slot create/edit pickers (read roles).
 * Must be registered before /:id.
 */
timetable.get("/assignments", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const query = validateQuery(assignmentsQuerySchema, c.req.query());

  const data = await listAssignmentsForActor(admin, actor, {
    instituteId: query.institute_id,
    academicYearId: query.academic_year_id,
    sectionId: query.section_id,
    classId: query.class_id,
    status: query.status,
  });

  return c.json({ data });
});

/**
 * GET /api/v1/timetable/:id
 */
timetable.get("/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const data = await getSlotForActor(admin, actor, id);
  return c.json({ data });
});

/**
 * POST /api/v1/timetable
 * Staff create — binds to teacher_assignment graph (no client teacher identity spoof).
 */
timetable.post("/", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const body = validateBody(createBodySchema, await c.req.json());

  const data = await createSlotForActor(admin, actor, {
    instituteId: body.institute_id,
    academicYearId: body.academic_year_id,
    classId: body.class_id,
    sectionId: body.section_id,
    teacherAssignmentId: body.teacher_assignment_id,
    dayOfWeek: body.day_of_week,
    periodIndex: body.period_index,
    startsAt: body.starts_at,
    endsAt: body.ends_at,
    room: body.room,
    status: body.status,
  });

  return c.json({ data }, 201);
});

/**
 * PATCH /api/v1/timetable/:id
 */
timetable.patch("/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const body = validateBody(updateBodySchema, await c.req.json());

  const data = await updateSlotForActor(admin, actor, id, {
    academicYearId: body.academic_year_id,
    classId: body.class_id,
    sectionId: body.section_id,
    teacherAssignmentId: body.teacher_assignment_id,
    dayOfWeek: body.day_of_week,
    periodIndex: body.period_index,
    startsAt: body.starts_at,
    endsAt: body.ends_at,
    room: body.room,
    status: body.status,
  });

  return c.json({ data });
});

/**
 * DELETE /api/v1/timetable/:id
 * Soft-delete (sets deleted_at).
 */
timetable.delete("/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  await deleteSlotForActor(admin, actor, id);
  return c.body(null, 204);
});

export default timetable;
