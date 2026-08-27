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
  createConfigForActor,
  createRegisterForActor,
  getRegisterForActor,
  listConfigForActor,
  listRegistersForActor,
  submitRegisterForActor,
  updateRegisterForActor,
} from "../../domains/attendance/service.js";

const attendance = new Hono<AppBindings>();

attendance.use("*", requireAuth);

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
const timeRe = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;
const dateRe = /^\d{4}-\d{2}-\d{2}$/;

const methodSchema = z.enum([
  "daily",
  "morning_first_period",
  "morning_afternoon",
  "period_wise",
]);
const ownerSchema = z.enum([
  "class_teacher",
  "current_period_teacher",
  "attendance_incharge",
]);
const scopeSchema = z.enum(["institute", "class", "section"]);
const slotKindSchema = z.enum(["day", "morning", "afternoon", "period"]);
const markStatusSchema = z.enum(["present", "absent", "leave"]);
const registerStatusSchema = z.enum(["draft", "submitted"]);

const markItemSchema = z.object({
  enrollment_id: uuid,
  status: markStatusSchema,
});

const idParamsSchema = z.object({ id: uuid });

const configListQuerySchema = z.object({
  institute_id: uuid,
});

const configCreateSchema = z.object({
  institute_id: uuid,
  effective_from: z.string().regex(dateRe, "Invalid date"),
  method: methodSchema,
  owner: ownerSchema,
  scope: scopeSchema,
  class_codes: z.array(z.string().min(1).max(64)).optional(),
  section_codes: z.array(z.string().min(1).max(64)).optional(),
});

const registerListQuerySchema = z.object({
  institute_id: uuid,
  academic_year_id: uuid.optional(),
  section_id: uuid.optional(),
  attendance_date: z.string().regex(dateRe).optional(),
  status: registerStatusSchema.optional(),
});

const registerCreateSchema = z
  .object({
    institute_id: uuid,
    academic_year_id: uuid,
    class_id: uuid,
    section_id: uuid,
    config_version_id: uuid,
    attendance_date: z.string().regex(dateRe, "Invalid date"),
    slot_kind: slotKindSchema,
    slot_code: z.string().min(1).max(120),
    period_index: z.coerce.number().int().min(0).nullable().optional(),
    timetable_slot_id: uuid.nullable().optional(),
    slot_label: z.string().min(1).max(200),
    subject_label: z.string().max(200).nullable().optional(),
    starts_at: z.string().regex(timeRe).nullable().optional(),
    ends_at: z.string().regex(timeRe).nullable().optional(),
    marks: z.array(markItemSchema).min(1),
  })
  .superRefine((val, ctx) => {
    if (
      val.starts_at &&
      val.ends_at &&
      val.ends_at <= val.starts_at
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "ends_at must be after starts_at",
        path: ["ends_at"],
      });
    }
    if (val.slot_kind === "period" && val.period_index == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "period_index is required for period slots",
        path: ["period_index"],
      });
    }
  });

const registerUpdateSchema = z
  .object({
    slot_label: z.string().min(1).max(200).optional(),
    subject_label: z.string().max(200).nullable().optional(),
    starts_at: z.string().regex(timeRe).nullable().optional(),
    ends_at: z.string().regex(timeRe).nullable().optional(),
    period_index: z.coerce.number().int().min(0).nullable().optional(),
    timetable_slot_id: uuid.nullable().optional(),
    marks: z.array(markItemSchema).min(1).optional(),
  })
  .superRefine((val, ctx) => {
    if (
      val.starts_at &&
      val.ends_at &&
      val.ends_at <= val.starts_at
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "ends_at must be after starts_at",
        path: ["ends_at"],
      });
    }
  });

attendance.get("/config", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const query = validateQuery(configListQuerySchema, c.req.query());
  const data = await listConfigForActor(admin, actor, query.institute_id);
  return c.json({ data });
});

attendance.post("/config", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const body = validateBody(configCreateSchema, await c.req.json());
  const data = await createConfigForActor(admin, actor, {
    instituteId: body.institute_id,
    effectiveFrom: body.effective_from,
    method: body.method,
    owner: body.owner,
    scope: body.scope,
    classCodes: body.class_codes,
    sectionCodes: body.section_codes,
  });
  return c.json({ data }, 201);
});

attendance.get("/registers", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const query = validateQuery(registerListQuerySchema, c.req.query());
  const data = await listRegistersForActor(admin, actor, {
    instituteId: query.institute_id,
    academicYearId: query.academic_year_id,
    sectionId: query.section_id,
    attendanceDate: query.attendance_date,
    status: query.status,
  });
  return c.json({ data });
});

attendance.get("/registers/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const data = await getRegisterForActor(admin, actor, id);
  return c.json({ data });
});

attendance.post("/registers", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const body = validateBody(registerCreateSchema, await c.req.json());
  const data = await createRegisterForActor(admin, actor, {
    instituteId: body.institute_id,
    academicYearId: body.academic_year_id,
    classId: body.class_id,
    sectionId: body.section_id,
    configVersionId: body.config_version_id,
    attendanceDate: body.attendance_date,
    slotKind: body.slot_kind,
    slotCode: body.slot_code,
    periodIndex: body.period_index,
    timetableSlotId: body.timetable_slot_id,
    slotLabel: body.slot_label,
    subjectLabel: body.subject_label,
    startsAt: body.starts_at,
    endsAt: body.ends_at,
    marks: body.marks.map((m) => ({
      enrollmentId: m.enrollment_id,
      status: m.status,
    })),
  });
  return c.json({ data }, 201);
});

attendance.patch("/registers/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const body = validateBody(registerUpdateSchema, await c.req.json());
  const data = await updateRegisterForActor(admin, actor, id, {
    slotLabel: body.slot_label,
    subjectLabel: body.subject_label,
    startsAt: body.starts_at,
    endsAt: body.ends_at,
    periodIndex: body.period_index,
    timetableSlotId: body.timetable_slot_id,
    marks: body.marks?.map((m) => ({
      enrollmentId: m.enrollment_id,
      status: m.status,
    })),
  });
  return c.json({ data });
});

attendance.post("/registers/:id/submit", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const data = await submitRegisterForActor(admin, actor, id);
  return c.json({ data });
});

export default attendance;
