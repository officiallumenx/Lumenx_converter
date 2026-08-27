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
  cancelLeaveForActor,
  createStudentLeaveForActor,
  createTeacherLeaveForActor,
  decideLeaveForActor,
  getLeaveDecisionForActor,
  getLeaveRequestForActor,
  listLeaveRequestsForActor,
} from "../../domains/leave/service.js";

const leave = new Hono<AppBindings>();
leave.use("*", requireAuth);

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

const subjectKindSchema = z.enum(["student", "teacher"]);
const statusSchema = z.enum([
  "pending",
  "approved",
  "rejected",
  "ignored",
  "cancelled",
]);
const teacherLeaveTypeSchema = z.enum([
  "sick",
  "casual",
  "emergency",
  "permission",
]);
const intendedApproverSchema = z.enum(["institute_admin", "principal"]);
const outcomeSchema = z.enum(["approved", "rejected", "ignored"]);

leave.get("/requests", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const query = validateQuery(
    z.object({
      institute_id: uuid,
      subject_kind: subjectKindSchema.optional(),
      status: statusSchema.optional(),
      student_id: uuid.optional(),
      teacher_id: uuid.optional(),
    }),
    c.req.query(),
  );
  const data = await listLeaveRequestsForActor(admin, actor, {
    instituteId: query.institute_id,
    subjectKind: query.subject_kind,
    status: query.status,
    studentId: query.student_id,
    teacherId: query.teacher_id,
  });
  return c.json({ data });
});

leave.post("/requests", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const body = validateBody(
    z.discriminatedUnion("subject_kind", [
      z.object({
        subject_kind: z.literal("student"),
        institute_id: uuid,
        student_id: uuid,
        start_date: dateOnly,
        end_date: dateOnly,
        reason: z.string().min(1).max(4000),
      }),
      z.object({
        subject_kind: z.literal("teacher"),
        institute_id: uuid,
        leave_type: teacherLeaveTypeSchema,
        intended_approver_role: intendedApproverSchema,
        start_date: dateOnly,
        end_date: dateOnly,
        reason: z.string().min(1).max(4000),
      }),
    ]),
    await c.req.json(),
  );

  if (body.subject_kind === "student") {
    const data = await createStudentLeaveForActor(admin, actor, {
      instituteId: body.institute_id,
      studentId: body.student_id,
      startDate: body.start_date,
      endDate: body.end_date,
      reason: body.reason,
    });
    return c.json({ data }, 201);
  }

  const data = await createTeacherLeaveForActor(admin, actor, {
    instituteId: body.institute_id,
    leaveType: body.leave_type,
    intendedApproverRole: body.intended_approver_role,
    startDate: body.start_date,
    endDate: body.end_date,
    reason: body.reason,
  });
  return c.json({ data }, 201);
});

leave.get("/requests/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const data = await getLeaveRequestForActor(admin, actor, id);
  return c.json({ data });
});

leave.get("/requests/:id/decision", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const data = await getLeaveDecisionForActor(admin, actor, id);
  return c.json({ data });
});

leave.post("/requests/:id/decide", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const body = validateBody(
    z.object({
      outcome: outcomeSchema,
      note: z.string().max(4000).nullable().optional(),
    }),
    await c.req.json(),
  );
  const data = await decideLeaveForActor(admin, actor, id, {
    outcome: body.outcome,
    note: body.note,
  });
  return c.json({ data });
});

leave.post("/requests/:id/cancel", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const data = await cancelLeaveForActor(admin, actor, id);
  return c.json({ data });
});

export default leave;
