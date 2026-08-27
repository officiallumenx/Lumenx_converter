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
  deleteStaffAttendanceForActor,
  getStaffAttendanceForActor,
  listStaffAttendanceForActor,
  reopenStaffAttendanceDayForActor,
  submitStaffAttendanceDayForActor,
  upsertStaffAttendanceDayForActor,
} from "../../domains/staff-attendance/service.js";

const staffAttendance = new Hono<AppBindings>();
staffAttendance.use("*", requireAuth);

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
const dateOnly = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD");
const timeOnly = z
  .string()
  .regex(/^\d{2}:\d{2}(:\d{2})?$/, "Must be HH:MM or HH:MM:SS")
  .nullable()
  .optional();
const statusSchema = z.enum([
  "present",
  "late",
  "absent",
  "leave",
  "half-day",
]);
const dayStatusSchema = z.enum(["draft", "submitted"]);

staffAttendance.get("/", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const query = validateQuery(
    z.object({
      institute_id: uuid,
      date: dateOnly.optional(),
      teacher_id: uuid.optional(),
      day_status: dayStatusSchema.optional(),
      from: dateOnly.optional(),
      to: dateOnly.optional(),
    }),
    c.req.query(),
  );
  const data = await listStaffAttendanceForActor(admin, actor, {
    instituteId: query.institute_id,
    attendanceDate: query.date,
    teacherId: query.teacher_id,
    dayStatus: query.day_status,
    from: query.from,
    to: query.to,
  });
  return c.json({ data });
});

staffAttendance.put("/day", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const body = validateBody(
    z.object({
      institute_id: uuid,
      date: dateOnly,
      marks: z
        .array(
          z.object({
            teacher_id: uuid,
            status: statusSchema,
            check_in: timeOnly,
            check_out: timeOnly,
            note: z.string().max(2000).nullable().optional(),
          }),
        )
        .min(1)
        .max(500),
    }),
    await c.req.json(),
  );

  const data = await upsertStaffAttendanceDayForActor(admin, actor, {
    instituteId: body.institute_id,
    attendanceDate: body.date,
    marks: body.marks.map((m) => ({
      teacherId: m.teacher_id,
      status: m.status,
      checkIn: m.check_in,
      checkOut: m.check_out,
      note: m.note,
    })),
  });
  return c.json({ data });
});

staffAttendance.post("/day/submit", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const body = validateBody(
    z.object({
      institute_id: uuid,
      date: dateOnly,
    }),
    await c.req.json(),
  );
  const data = await submitStaffAttendanceDayForActor(admin, actor, {
    instituteId: body.institute_id,
    attendanceDate: body.date,
  });
  return c.json({ data });
});

staffAttendance.post("/day/reopen", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const body = validateBody(
    z.object({
      institute_id: uuid,
      date: dateOnly,
    }),
    await c.req.json(),
  );
  const data = await reopenStaffAttendanceDayForActor(admin, actor, {
    instituteId: body.institute_id,
    attendanceDate: body.date,
  });
  return c.json({ data });
});

staffAttendance.get("/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const data = await getStaffAttendanceForActor(admin, actor, id);
  return c.json({ data });
});

staffAttendance.delete("/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  await deleteStaffAttendanceForActor(admin, actor, id);
  return c.body(null, 204);
});

export default staffAttendance;
