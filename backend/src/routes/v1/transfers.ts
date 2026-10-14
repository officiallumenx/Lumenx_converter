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
  acceptAndCompleteTransferForActor,
  cancelTransferForActor,
  getTransferForActor,
  initiateTransferForActor,
  listTransfersForActor,
  rejectTransferForActor,
} from "../../domains/transfers/service.js";

const transfers = new Hono<AppBindings>();
transfers.use("*", requireAuth);

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
const sharedFieldsSchema = z.object({
  firstName: z.boolean().optional(),
  surname: z.boolean().optional(),
  displayName: z.boolean().optional(),
  gender: z.boolean().optional(),
  dateOfBirth: z.boolean().optional(),
  bloodGroup: z.boolean().optional(),
  admissionNumber: z.boolean().optional(),
});

transfers.get("/", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const query = validateQuery(
    z.object({
      institute_id: uuid,
      status: z
        .enum(["pending", "accepted", "rejected", "cancelled", "completed"])
        .optional(),
    }),
    c.req.query(),
  );
  const data = await listTransfersForActor(
    admin,
    actor,
    query.institute_id,
    query.status,
  );
  return c.json({ data });
});

transfers.post("/", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const body = validateBody(
    z.object({
      source_institute_id: uuid,
      destination_institute_id: uuid,
      source_student_id: uuid,
      effective_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
      shared_fields: sharedFieldsSchema,
      client_request_id: z.string().min(1).max(120).nullable().optional(),
    }),
    await c.req.json(),
  );
  const data = await initiateTransferForActor(admin, actor, {
    sourceInstituteId: body.source_institute_id,
    destinationInstituteId: body.destination_institute_id,
    sourceStudentId: body.source_student_id,
    effectiveOn: body.effective_on,
    sharedFields: body.shared_fields,
    clientRequestId: body.client_request_id,
  });
  return c.json({ data }, 201);
});

transfers.get("/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const params = validateParams(z.object({ id: uuid }), c.req.param());
  const data = await getTransferForActor(admin, actor, params.id);
  return c.json({ data });
});

transfers.post("/:id/cancel", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const params = validateParams(z.object({ id: uuid }), c.req.param());
  const body = validateBody(
    z.object({ reason: z.string().optional() }).passthrough(),
    await c.req.json().catch(() => ({})),
  );
  const data = await cancelTransferForActor(
    admin,
    actor,
    params.id,
    body.reason,
  );
  return c.json({ data });
});

transfers.post("/:id/reject", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const params = validateParams(z.object({ id: uuid }), c.req.param());
  const body = validateBody(
    z.object({ reason: z.string().optional() }).passthrough(),
    await c.req.json().catch(() => ({})),
  );
  const data = await rejectTransferForActor(
    admin,
    actor,
    params.id,
    body.reason,
  );
  return c.json({ data });
});

transfers.post("/:id/accept", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const params = validateParams(z.object({ id: uuid }), c.req.param());
  const body = validateBody(
    z.object({
      destination_academic_year_id: uuid,
      destination_class_id: uuid,
      destination_section_id: uuid,
      destination_student_id: uuid.nullable().optional(),
      reason: z.string().optional(),
    }),
    await c.req.json(),
  );
  const data = await acceptAndCompleteTransferForActor(admin, actor, params.id, {
    destinationAcademicYearId: body.destination_academic_year_id,
    destinationClassId: body.destination_class_id,
    destinationSectionId: body.destination_section_id,
    destinationStudentId: body.destination_student_id,
    reason: body.reason,
  });
  return c.json({ data });
});

export default transfers;
