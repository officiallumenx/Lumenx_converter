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
  createEnrollmentForActor,
  getEnrollmentForActor,
  listEnrollmentsForActor,
  updateEnrollmentForActor,
} from "../../domains/academics/service.js";

const enrollments = new Hono<AppBindings>();
enrollments.use("*", requireAuth);

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
const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD");
const idParamsSchema = z.object({ id: uuid });
const enrollmentStatusSchema = z.enum([
  "active",
  "completed",
  "transferred",
  "dropped_out",
  "graduated",
]);

enrollments.get("/", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const query = validateQuery(
    z.object({
      institute_id: uuid,
      academic_year_id: uuid.optional(),
      class_id: uuid.optional(),
      section_id: uuid.optional(),
      student_id: uuid.optional(),
      status: enrollmentStatusSchema.optional(),
    }),
    c.req.query(),
  );
  const data = await listEnrollmentsForActor(admin, actor, {
    instituteId: query.institute_id,
    academicYearId: query.academic_year_id,
    classId: query.class_id,
    sectionId: query.section_id,
    studentId: query.student_id,
    status: query.status,
  });
  return c.json({ data });
});

enrollments.get("/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const data = await getEnrollmentForActor(admin, actor, id);
  return c.json({ data });
});

enrollments.post("/", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const body = validateBody(
    z.object({
      institute_id: uuid,
      academic_year_id: uuid,
      student_id: uuid,
      class_id: uuid,
      section_id: uuid,
      roll_no: z.string().min(1).max(50),
      enrolled_on: dateOnly,
      status: enrollmentStatusSchema.optional(),
    }),
    await c.req.json(),
  );
  const data = await createEnrollmentForActor(admin, actor, {
    instituteId: body.institute_id,
    academicYearId: body.academic_year_id,
    studentId: body.student_id,
    classId: body.class_id,
    sectionId: body.section_id,
    rollNo: body.roll_no,
    enrolledOn: body.enrolled_on,
    status: body.status,
  });
  return c.json({ data }, 201);
});

enrollments.patch("/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const body = validateBody(
    z
      .object({
        roll_no: z.string().min(1).max(50).optional(),
        status: enrollmentStatusSchema.optional(),
        class_id: uuid.optional(),
        section_id: uuid.optional(),
        withdrawn_on: dateOnly.nullable().optional(),
      })
      .refine(
        (value) =>
          value.roll_no !== undefined ||
          value.status !== undefined ||
          value.class_id !== undefined ||
          value.section_id !== undefined ||
          value.withdrawn_on !== undefined,
        { message: "At least one field is required" },
      ),
    await c.req.json(),
  );
  const data = await updateEnrollmentForActor(admin, actor, id, {
    rollNo: body.roll_no,
    status: body.status,
    classId: body.class_id,
    sectionId: body.section_id,
    withdrawnOn: body.withdrawn_on,
  });
  return c.json({ data });
});

export default enrollments;
