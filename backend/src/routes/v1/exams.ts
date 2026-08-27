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
  createExamForActor,
  deleteExamForActor,
  getExamForActor,
  listExamsForActor,
  updateExamForActor,
} from "../../domains/exams/service.js";

const exams = new Hono<AppBindings>();

exams.use("*", requireAuth);

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
const dateRe = /^\d{4}-\d{2}-\d{2}$/;
const timeRe = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;

const audienceScopeSchema = z.enum(["year", "section"]);
const scheduleStatusSchema = z.enum(["draft", "published"]);
const lifecycleStatusSchema = z.enum(["open", "closed"]);

const targetSectionSchema = z.object({
  section_id: uuid,
  class_id: uuid,
});

const subjectScheduleSchema = z
  .object({
    subject_id: uuid,
    paper_date: z.string().regex(dateRe, "Invalid date"),
    starts_at: z.string().regex(timeRe, "Invalid time"),
    ends_at: z.string().regex(timeRe, "Invalid time"),
    room: z.string().max(120).nullable().optional(),
    invigilator_teacher_id: uuid.nullable().optional(),
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

const idParamsSchema = z.object({ id: uuid });

const listQuerySchema = z.object({
  institute_id: uuid,
  academic_year_id: uuid.optional(),
  schedule_status: scheduleStatusSchema.optional(),
  lifecycle_status: lifecycleStatusSchema.optional(),
});

const createSchema = z
  .object({
    institute_id: uuid,
    academic_year_id: uuid,
    name: z.string().min(1).max(200),
    header: z.string().min(1).max(300),
    start_date: z.string().regex(dateRe, "Invalid date"),
    end_date: z.string().regex(dateRe, "Invalid date"),
    default_starts_at: z.string().regex(timeRe, "Invalid time"),
    default_ends_at: z.string().regex(timeRe, "Invalid time"),
    total_marks: z.coerce.number().int().positive(),
    internal_marks: z.coerce.number().int().min(0).nullable().optional(),
    external_marks: z.coerce.number().int().min(0).nullable().optional(),
    audience_scope: audienceScopeSchema,
    target_sections: z.array(targetSectionSchema).optional(),
    subject_schedules: z.array(subjectScheduleSchema).optional(),
  })
  .superRefine((val, ctx) => {
    if (val.end_date < val.start_date) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "end_date must be on or after start_date",
        path: ["end_date"],
      });
    }
    if (val.default_ends_at <= val.default_starts_at) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "default_ends_at must be after default_starts_at",
        path: ["default_ends_at"],
      });
    }
  });

const updateSchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
    header: z.string().min(1).max(300).optional(),
    start_date: z.string().regex(dateRe).optional(),
    end_date: z.string().regex(dateRe).optional(),
    default_starts_at: z.string().regex(timeRe).optional(),
    default_ends_at: z.string().regex(timeRe).optional(),
    total_marks: z.coerce.number().int().positive().optional(),
    internal_marks: z.coerce.number().int().min(0).nullable().optional(),
    external_marks: z.coerce.number().int().min(0).nullable().optional(),
    audience_scope: audienceScopeSchema.optional(),
    schedule_status: scheduleStatusSchema.optional(),
    lifecycle_status: lifecycleStatusSchema.optional(),
    target_sections: z.array(targetSectionSchema).optional(),
    subject_schedules: z.array(subjectScheduleSchema).optional(),
  })
  .superRefine((val, ctx) => {
    if (
      val.start_date &&
      val.end_date &&
      val.end_date < val.start_date
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "end_date must be on or after start_date",
        path: ["end_date"],
      });
    }
    if (
      val.default_starts_at &&
      val.default_ends_at &&
      val.default_ends_at <= val.default_starts_at
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "default_ends_at must be after default_starts_at",
        path: ["default_ends_at"],
      });
    }
  });

exams.get("/", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const query = validateQuery(listQuerySchema, c.req.query());
  const data = await listExamsForActor(admin, actor, {
    instituteId: query.institute_id,
    academicYearId: query.academic_year_id,
    scheduleStatus: query.schedule_status,
    lifecycleStatus: query.lifecycle_status,
  });
  return c.json({ data });
});

exams.get("/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const data = await getExamForActor(admin, actor, id);
  return c.json({ data });
});

exams.post("/", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const body = validateBody(createSchema, await c.req.json());
  const data = await createExamForActor(admin, actor, {
    instituteId: body.institute_id,
    academicYearId: body.academic_year_id,
    name: body.name,
    header: body.header,
    startDate: body.start_date,
    endDate: body.end_date,
    defaultStartsAt: body.default_starts_at,
    defaultEndsAt: body.default_ends_at,
    totalMarks: body.total_marks,
    internalMarks: body.internal_marks,
    externalMarks: body.external_marks,
    audienceScope: body.audience_scope,
    targetSections: body.target_sections?.map((t) => ({
      sectionId: t.section_id,
      classId: t.class_id,
    })),
    subjectSchedules: body.subject_schedules?.map((s) => ({
      subjectId: s.subject_id,
      paperDate: s.paper_date,
      startsAt: s.starts_at,
      endsAt: s.ends_at,
      room: s.room,
      invigilatorTeacherId: s.invigilator_teacher_id,
    })),
  });
  return c.json({ data }, 201);
});

exams.patch("/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const body = validateBody(updateSchema, await c.req.json());
  const data = await updateExamForActor(admin, actor, id, {
    name: body.name,
    header: body.header,
    startDate: body.start_date,
    endDate: body.end_date,
    defaultStartsAt: body.default_starts_at,
    defaultEndsAt: body.default_ends_at,
    totalMarks: body.total_marks,
    internalMarks: body.internal_marks,
    externalMarks: body.external_marks,
    audienceScope: body.audience_scope,
    scheduleStatus: body.schedule_status,
    lifecycleStatus: body.lifecycle_status,
    targetSections: body.target_sections?.map((t) => ({
      sectionId: t.section_id,
      classId: t.class_id,
    })),
    subjectSchedules: body.subject_schedules?.map((s) => ({
      subjectId: s.subject_id,
      paperDate: s.paper_date,
      startsAt: s.starts_at,
      endsAt: s.ends_at,
      room: s.room,
      invigilatorTeacherId: s.invigilator_teacher_id,
    })),
  });
  return c.json({ data });
});

exams.delete("/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  await deleteExamForActor(admin, actor, id);
  return c.json({ data: { ok: true } });
});

export default exams;
