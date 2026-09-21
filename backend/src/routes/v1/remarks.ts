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
  createStudentRemarkForActor,
  deleteStudentRemarkForActor,
  listStudentRemarksForActor,
  updateStudentRemarkForActor,
} from "../../domains/remarks/service.js";

const remarks = new Hono<AppBindings>();

remarks.use("*", requireAuth);

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
const remarkTypeSchema = z.enum([
  "academic",
  "behaviour",
  "improvement",
  "parent_note",
]);
const remarkToneSchema = z.enum(["good", "bad", "none"]);

remarks.get("/", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const query = validateQuery(
    z.object({
      institute_id: uuid,
      student_id: uuid.optional(),
    }),
    c.req.query(),
  );
  const data = await listStudentRemarksForActor(admin, actor, {
    instituteId: query.institute_id,
    studentId: query.student_id,
  });
  return c.json({ data });
});

remarks.post("/", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const body = validateBody(
    z.object({
      institute_id: uuid,
      student_id: uuid,
      type: remarkTypeSchema,
      tone: remarkToneSchema.default("none"),
      text: z.string().min(8).max(10000),
    }),
    await c.req.json(),
  );
  const data = await createStudentRemarkForActor(admin, actor, {
    instituteId: body.institute_id,
    studentId: body.student_id,
    type: body.type,
    tone: body.tone,
    text: body.text,
  });
  return c.json({ data }, 201);
});

remarks.patch("/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(z.object({ id: uuid }), c.req.param());
  const body = validateBody(
    z
      .object({
        text: z.string().min(8).max(10000).optional(),
        tone: remarkToneSchema.optional(),
      })
      .refine((v) => v.text !== undefined || v.tone !== undefined, {
        message: "text or tone required",
      }),
    await c.req.json(),
  );
  const data = await updateStudentRemarkForActor(admin, actor, id, {
    text: body.text,
    tone: body.tone,
  });
  return c.json({ data });
});

remarks.delete("/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(z.object({ id: uuid }), c.req.param());
  await deleteStudentRemarkForActor(admin, actor, id);
  return c.json({ data: { ok: true } });
});

export default remarks;
