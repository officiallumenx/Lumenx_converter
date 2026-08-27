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
  createHomeworkForActor,
  deleteHomeworkForActor,
  expireHomeworkForActor,
  getHomeworkForActor,
  listHomeworkForActor,
  publishHomeworkForActor,
  updateHomeworkForActor,
} from "../../domains/homework/service.js";

const homework = new Hono<AppBindings>();

homework.use("*", requireAuth);

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
const kindSchema = z.enum(["homework", "assignment"]);
const statusSchema = z.enum(["draft", "published", "expired"]);

const idParamsSchema = z.object({ id: uuid });

const listQuerySchema = z.object({
  institute_id: uuid,
  academic_year_id: uuid.optional(),
  section_id: uuid.optional(),
  subject_id: uuid.optional(),
  teacher_id: uuid.optional(),
  status: statusSchema.optional(),
  kind: kindSchema.optional(),
  due_from: dateOnly.optional(),
  due_to: dateOnly.optional(),
});

const createSchema = z.object({
  institute_id: uuid,
  academic_year_id: uuid,
  class_id: uuid,
  section_id: uuid,
  subject_id: uuid,
  teacher_id: uuid.optional(),
  kind: kindSchema,
  title: z.string().min(1).max(500),
  description: z.string().min(1).max(10000),
  instructions: z.string().max(10000).nullable().optional(),
  due_date: dateOnly,
});

const updateSchema = z
  .object({
    title: z.string().min(1).max(500).optional(),
    description: z.string().min(1).max(10000).optional(),
    instructions: z.string().max(10000).nullable().optional(),
    due_date: dateOnly.optional(),
    kind: kindSchema.optional(),
  })
  .refine(
    (body) =>
      body.title !== undefined ||
      body.description !== undefined ||
      body.instructions !== undefined ||
      body.due_date !== undefined ||
      body.kind !== undefined,
    { message: "At least one field is required" },
  );

homework.get("/", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const query = validateQuery(listQuerySchema, c.req.query());
  const data = await listHomeworkForActor(admin, actor, {
    instituteId: query.institute_id,
    academicYearId: query.academic_year_id,
    sectionId: query.section_id,
    subjectId: query.subject_id,
    teacherId: query.teacher_id,
    status: query.status,
    kind: query.kind,
    dueFrom: query.due_from,
    dueTo: query.due_to,
  });
  return c.json({ data });
});

homework.get("/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const data = await getHomeworkForActor(admin, actor, id);
  return c.json({ data });
});

homework.post("/", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const body = validateBody(createSchema, await c.req.json());
  const data = await createHomeworkForActor(admin, actor, {
    instituteId: body.institute_id,
    academicYearId: body.academic_year_id,
    classId: body.class_id,
    sectionId: body.section_id,
    subjectId: body.subject_id,
    teacherId: body.teacher_id,
    kind: body.kind,
    title: body.title,
    description: body.description,
    instructions: body.instructions,
    dueDate: body.due_date,
  });
  return c.json({ data }, 201);
});

homework.patch("/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const body = validateBody(updateSchema, await c.req.json());
  const data = await updateHomeworkForActor(admin, actor, id, {
    title: body.title,
    description: body.description,
    instructions: body.instructions,
    dueDate: body.due_date,
    kind: body.kind,
  });
  return c.json({ data });
});

homework.post("/:id/publish", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const data = await publishHomeworkForActor(admin, actor, id);
  return c.json({ data });
});

homework.post("/:id/expire", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const data = await expireHomeworkForActor(admin, actor, id);
  return c.json({ data });
});

homework.delete("/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  await deleteHomeworkForActor(admin, actor, id);
  return c.json({ data: { ok: true } });
});

export default homework;
