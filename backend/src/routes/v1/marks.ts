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
  createMarkEntryForActor,
  deleteMarkEntryForActor,
  getMarkEntryForActor,
  listMarkEntriesForActor,
  publishMarkEntryForActor,
  rejectMarkEntryForActor,
  returnMarkEntryForActor,
  submitMarkEntryForActor,
  updateMarkEntryForActor,
} from "../../domains/marks/service.js";
import {
  getStudentReportCardsForActor,
  getTeacherMarkSheetForActor,
} from "../../domains/marks/portal.js";

const marks = new Hono<AppBindings>();

marks.use("*", requireAuth);

marks.get("/portal/students/:studentId/report-cards", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { studentId } = validateParams(
    z.object({ studentId: uuid }),
    c.req.param(),
  );
  const query = validateQuery(
    z.object({ institute_id: uuid }),
    c.req.query(),
  );
  const data = await getStudentReportCardsForActor(admin, actor, {
    instituteId: query.institute_id,
    studentId,
  });
  return c.json({ data });
});

marks.get("/portal/teacher/sheet", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const query = validateQuery(
    z.object({
      institute_id: uuid,
      section_id: uuid,
      exam_id: uuid,
      subject_id: uuid,
    }),
    c.req.query(),
  );
  const data = await getTeacherMarkSheetForActor(admin, actor, {
    instituteId: query.institute_id,
    sectionId: query.section_id,
    examId: query.exam_id,
    subjectId: query.subject_id,
  });
  return c.json({ data });
});

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
const statusSchema = z.enum([
  "pending",
  "submitted",
  "published",
  "returned",
  "rejected",
]);

const scoreItemSchema = z.object({
  enrollment_id: uuid,
  marks: z.number().int().min(0).nullable(),
});

const idParamsSchema = z.object({ id: uuid });

const listQuerySchema = z.object({
  institute_id: uuid,
  academic_year_id: uuid.optional(),
  section_id: uuid.optional(),
  exam_id: uuid.optional(),
  subject_id: uuid.optional(),
  teacher_id: uuid.optional(),
  status: statusSchema.optional(),
});

const createSchema = z.object({
  institute_id: uuid,
  academic_year_id: uuid,
  class_id: uuid,
  section_id: uuid,
  exam_id: uuid,
  subject_id: uuid,
  teacher_id: uuid.optional(),
  max_marks: z.coerce.number().int().positive(),
  scores: z.array(scoreItemSchema).optional(),
});

const updateSchema = z.object({
  max_marks: z.coerce.number().int().positive().optional(),
  scores: z.array(scoreItemSchema).optional(),
  admin_note: z.string().max(2000).nullable().optional(),
});

const noteSchema = z.object({
  admin_note: z.string().max(2000).nullable().optional(),
});

marks.get("/entries", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const query = validateQuery(listQuerySchema, c.req.query());
  const data = await listMarkEntriesForActor(admin, actor, {
    instituteId: query.institute_id,
    academicYearId: query.academic_year_id,
    sectionId: query.section_id,
    examId: query.exam_id,
    subjectId: query.subject_id,
    teacherId: query.teacher_id,
    status: query.status,
  });
  return c.json({ data });
});

marks.get("/entries/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const data = await getMarkEntryForActor(admin, actor, id);
  return c.json({ data });
});

marks.post("/entries", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const body = validateBody(createSchema, await c.req.json());
  const data = await createMarkEntryForActor(admin, actor, {
    instituteId: body.institute_id,
    academicYearId: body.academic_year_id,
    classId: body.class_id,
    sectionId: body.section_id,
    examId: body.exam_id,
    subjectId: body.subject_id,
    teacherId: body.teacher_id,
    maxMarks: body.max_marks,
    scores: body.scores?.map((s) => ({
      enrollmentId: s.enrollment_id,
      marks: s.marks,
    })),
  });
  return c.json({ data }, 201);
});

marks.patch("/entries/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const body = validateBody(updateSchema, await c.req.json());
  const data = await updateMarkEntryForActor(admin, actor, id, {
    maxMarks: body.max_marks,
    scores: body.scores?.map((s) => ({
      enrollmentId: s.enrollment_id,
      marks: s.marks,
    })),
    adminNote: body.admin_note,
  });
  return c.json({ data });
});

marks.post("/entries/:id/submit", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const data = await submitMarkEntryForActor(admin, actor, id);
  return c.json({ data });
});

marks.post("/entries/:id/publish", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const data = await publishMarkEntryForActor(admin, actor, id);
  return c.json({ data });
});

marks.post("/entries/:id/return", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  let raw: unknown = {};
  try {
    raw = await c.req.json();
  } catch {
    raw = {};
  }
  const body = validateBody(noteSchema, raw ?? {});
  const data = await returnMarkEntryForActor(admin, actor, id, {
    adminNote: body.admin_note,
  });
  return c.json({ data });
});

marks.post("/entries/:id/reject", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  let raw: unknown = {};
  try {
    raw = await c.req.json();
  } catch {
    raw = {};
  }
  const body = validateBody(noteSchema, raw ?? {});
  const data = await rejectMarkEntryForActor(admin, actor, id, {
    adminNote: body.admin_note,
  });
  return c.json({ data });
});

marks.delete("/entries/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  await deleteMarkEntryForActor(admin, actor, id);
  return c.json({ data: { ok: true } });
});

export default marks;
