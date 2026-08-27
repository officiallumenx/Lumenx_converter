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
  createComplaintForActor,
  deleteComplaintForActor,
  getComplaintForActor,
  listComplaintsForActor,
  transitionComplaintForActor,
  updateComplaintForActor,
} from "../../domains/complaints/service.js";

const complaints = new Hono<AppBindings>();
complaints.use("*", requireAuth);

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
const idParamsSchema = z.object({ id: uuid });
const statusSchema = z.enum([
  "draft",
  "pending",
  "review",
  "forwarded",
  "resolved",
  "rejected",
  "closed",
  "archived",
]);
const prioritySchema = z.enum(["low", "medium", "high"]);
const destinationSchema = z.enum(["class_teacher", "principal_admin"]);

complaints.get("/", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const query = validateQuery(
    z.object({
      institute_id: uuid,
      status: statusSchema.optional(),
      destination: destinationSchema.optional(),
      priority: prioritySchema.optional(),
      student_id: uuid.optional(),
      teacher_id: uuid.optional(),
    }),
    c.req.query(),
  );
  const data = await listComplaintsForActor(admin, actor, {
    instituteId: query.institute_id,
    status: query.status,
    destination: query.destination,
    priority: query.priority,
    studentId: query.student_id,
    teacherId: query.teacher_id,
  });
  return c.json({ data });
});

complaints.post("/", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const body = validateBody(
    z.object({
      institute_id: uuid,
      title: z.string().min(1).max(300),
      body: z.string().min(1).max(8000),
      category: z.string().min(1).max(100),
      priority: prioritySchema.optional(),
      destination: destinationSchema.nullable().optional(),
      student_id: uuid.nullable().optional(),
      as_draft: z.boolean().optional(),
    }),
    await c.req.json(),
  );

  const data = await createComplaintForActor(admin, actor, {
    instituteId: body.institute_id,
    title: body.title,
    body: body.body,
    category: body.category,
    priority: body.priority,
    destination: body.destination,
    studentId: body.student_id,
    asDraft: body.as_draft,
  });
  return c.json({ data }, 201);
});

complaints.get("/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const data = await getComplaintForActor(admin, actor, id);
  return c.json({ data });
});

complaints.patch("/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const body = validateBody(
    z.object({
      title: z.string().min(1).max(300).optional(),
      body: z.string().min(1).max(8000).optional(),
      category: z.string().min(1).max(100).optional(),
      priority: prioritySchema.optional(),
      destination: destinationSchema.nullable().optional(),
    }),
    await c.req.json(),
  );

  const data = await updateComplaintForActor(admin, actor, id, {
    title: body.title,
    body: body.body,
    category: body.category,
    priority: body.priority,
    destination: body.destination,
  });
  return c.json({ data });
});

complaints.post("/:id/transition", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const body = validateBody(
    z.object({
      status: statusSchema,
      response_note: z.string().max(4000).nullable().optional(),
    }),
    await c.req.json(),
  );
  const data = await transitionComplaintForActor(admin, actor, id, {
    status: body.status,
    responseNote: body.response_note,
  });
  return c.json({ data });
});

complaints.delete("/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  await deleteComplaintForActor(admin, actor, id);
  return c.body(null, 204);
});

export default complaints;
