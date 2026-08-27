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
  createDiaryDayForActor,
  deleteDiaryDayForActor,
  getDiaryDayForActor,
  listDiaryDaysForActor,
  submitDiaryDayForActor,
  updateDiaryDayForActor,
} from "../../domains/diary/service.js";

const diary = new Hono<AppBindings>();

diary.use("*", requireAuth);

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
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD");
const scopeSchema = z.enum(["subject", "activity"]);

const idParamsSchema = z.object({ id: uuid });

const rowSchema = z.object({
  section_id: uuid.nullable().optional(),
  class_label: z.string().min(1).max(200),
  description: z.string().min(1).max(10000),
  sort_order: z.coerce.number().int().min(0).optional(),
});

const listQuerySchema = z.object({
  institute_id: uuid,
  teacher_id: uuid.optional(),
  academic_year_id: uuid.optional(),
  scope: scopeSchema.optional(),
  diary_date: dateOnly.optional(),
  date_from: dateOnly.optional(),
  date_to: dateOnly.optional(),
  submitted: z.enum(["true", "false"]).optional(),
});

const createSchema = z.object({
  institute_id: uuid,
  academic_year_id: uuid.nullable().optional(),
  teacher_id: uuid.optional(),
  diary_date: dateOnly,
  scope: scopeSchema,
  rows: z.array(rowSchema).optional(),
});

const updateSchema = z
  .object({
    academic_year_id: uuid.nullable().optional(),
    rows: z.array(rowSchema).optional(),
  })
  .refine(
    (body) => body.academic_year_id !== undefined || body.rows !== undefined,
    { message: "At least one field is required" },
  );

diary.get("/", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const query = validateQuery(listQuerySchema, c.req.query());
  const data = await listDiaryDaysForActor(admin, actor, {
    instituteId: query.institute_id,
    teacherId: query.teacher_id,
    academicYearId: query.academic_year_id,
    scope: query.scope,
    diaryDate: query.diary_date,
    dateFrom: query.date_from,
    dateTo: query.date_to,
    submitted:
      query.submitted === undefined ? undefined : query.submitted === "true",
  });
  return c.json({ data });
});

diary.get("/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const data = await getDiaryDayForActor(admin, actor, id);
  return c.json({ data });
});

diary.post("/", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const body = validateBody(createSchema, await c.req.json());
  const data = await createDiaryDayForActor(admin, actor, {
    instituteId: body.institute_id,
    academicYearId: body.academic_year_id,
    teacherId: body.teacher_id,
    diaryDate: body.diary_date,
    scope: body.scope,
    rows: body.rows?.map((r) => ({
      sectionId: r.section_id,
      classLabel: r.class_label,
      description: r.description,
      sortOrder: r.sort_order,
    })),
  });
  return c.json({ data }, 201);
});

diary.patch("/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const body = validateBody(updateSchema, await c.req.json());
  const data = await updateDiaryDayForActor(admin, actor, id, {
    academicYearId: body.academic_year_id,
    rows: body.rows?.map((r) => ({
      sectionId: r.section_id,
      classLabel: r.class_label,
      description: r.description,
      sortOrder: r.sort_order,
    })),
  });
  return c.json({ data });
});

diary.post("/:id/submit", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const data = await submitDiaryDayForActor(admin, actor, id);
  return c.json({ data });
});

diary.delete("/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  await deleteDiaryDayForActor(admin, actor, id);
  return c.json({ data: { ok: true } });
});

export default diary;
