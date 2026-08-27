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
  getIssuedCertificateForActor,
  issueCertificateForActor,
  listIssuedCertificatesForActor,
  lookupIssuedCertificateForActor,
  revokeIssuedCertificateForActor,
} from "../../domains/certificates/service.js";

const certificates = new Hono<AppBindings>();
certificates.use("*", requireAuth);

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
const statusSchema = z.enum(["issued", "revoked", "superseded"]);
const fileKindSchema = z.enum(["pdf", "html", "pptx"]);

certificates.get("/", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const query = validateQuery(
    z.object({
      institute_id: uuid,
      student_id: uuid.optional(),
      status: statusSchema.optional(),
      template_id: uuid.optional(),
    }),
    c.req.query(),
  );
  const data = await listIssuedCertificatesForActor(admin, actor, {
    instituteId: query.institute_id,
    studentId: query.student_id,
    status: query.status,
    templateId: query.template_id,
  });
  return c.json({ data });
});

certificates.get("/lookup", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const query = validateQuery(
    z.object({
      institute_id: uuid,
      certificate_number: z.string().min(1).max(120),
    }),
    c.req.query(),
  );
  const data = await lookupIssuedCertificateForActor(
    admin,
    actor,
    query.institute_id,
    query.certificate_number,
  );
  return c.json({ data });
});

certificates.post("/", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const body = validateBody(
    z.object({
      institute_id: uuid,
      generated_document_id: uuid.optional(),
      template_id: uuid.optional(),
      student_id: uuid.nullable().optional(),
      teacher_id: uuid.nullable().optional(),
      title: z.string().min(1).max(300).optional(),
      category: z.string().max(200).nullable().optional(),
      recipient_name: z.string().min(1).max(300).optional(),
      recipient_ref: z.string().max(100).nullable().optional(),
      certificate_number: z.string().min(1).max(120).optional(),
      year: z.number().int().optional(),
      asset_path: z.string().max(1000).nullable().optional(),
      file_kind: fileKindSchema.nullable().optional(),
    }),
    await c.req.json(),
  );

  const data = await issueCertificateForActor(admin, actor, {
    instituteId: body.institute_id,
    generatedDocumentId: body.generated_document_id,
    templateId: body.template_id,
    studentId: body.student_id,
    teacherId: body.teacher_id,
    title: body.title,
    category: body.category,
    recipientName: body.recipient_name,
    recipientRef: body.recipient_ref,
    certificateNumber: body.certificate_number,
    year: body.year,
    assetPath: body.asset_path,
    fileKind: body.file_kind,
  });
  return c.json({ data }, 201);
});

certificates.get("/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const data = await getIssuedCertificateForActor(admin, actor, id);
  return c.json({ data });
});

certificates.post("/:id/revoke", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const body = validateBody(
    z.object({
      reason: z.string().min(1).max(2000),
      status: z.enum(["revoked", "superseded"]).optional(),
    }),
    await c.req.json(),
  );
  const data = await revokeIssuedCertificateForActor(admin, actor, id, {
    reason: body.reason,
    status: body.status,
  });
  return c.json({ data });
});

export default certificates;
