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
  createApplicationForActor,
  createDocumentForActor,
  createInquiryForActor,
  createOpeningForActor,
  createProgramForActor,
  deleteOpeningForActor,
  deleteProgramForActor,
  getApplicationForActor,
  getOpeningForActor,
  getProgramForActor,
  listApplicationsForActor,
  listDocumentsForActor,
  listInquiriesForActor,
  listOpeningsForActor,
  listProgramsForActor,
  respondInquiryForActor,
  transitionApplicationForActor,
  updateDocumentForActor,
  updateOpeningForActor,
  updateProgramForActor,
} from "../../domains/admissions/service.js";

const admissions = new Hono<AppBindings>();
admissions.use("*", requireAuth);

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
const applicationIdParamsSchema = z.object({ applicationId: uuid });
const programStatusSchema = z.enum(["draft", "published", "archived"]);
const openingStatusSchema = z.enum(["draft", "open", "closed"]);
const applicationStatusSchema = z.enum([
  "draft",
  "submitted",
  "review",
  "verification",
  "parent_confirmation",
  "waitlisted",
  "approved",
  "rejected",
  "withdrawn",
]);
const docTypeSchema = z.enum([
  "birth_certificate",
  "transfer_certificate",
  "marks_memo",
  "student_photo",
  "parent_id",
  "additional",
]);
const docStatusSchema = z.enum([
  "not_uploaded",
  "uploaded",
  "under_review",
  "verified",
  "rejected",
  "resubmission_required",
]);
const inquiryCategorySchema = z.enum([
  "admission",
  "program",
  "fees",
  "transport",
  "hostel",
  "general",
]);

// ── Programs ─────────────────────────────────────────────────────

admissions.get("/programs", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const query = validateQuery(
    z.object({ institute_id: uuid }),
    c.req.query(),
  );
  const data = await listProgramsForActor(admin, actor, query.institute_id);
  return c.json({ data });
});

admissions.post("/programs", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const body = validateBody(
    z.object({
      institute_id: uuid,
      name: z.string().min(1).max(300),
      slug: z.string().min(1).max(200).optional(),
      description: z.string().max(8000).nullable().optional(),
      duration: z.string().max(200).nullable().optional(),
      eligibility: z.string().max(2000).nullable().optional(),
      age_criteria: z.string().max(500).nullable().optional(),
      seats_available: z.number().int().min(0).optional(),
      grades: z.unknown().optional(),
      academic_year_label: z.string().max(100).nullable().optional(),
      application_deadline: z.string().optional(),
      publish_now: z.boolean().optional(),
    }),
    await c.req.json(),
  );
  const data = await createProgramForActor(admin, actor, {
    instituteId: body.institute_id,
    name: body.name,
    slug: body.slug ?? body.name,
    description: body.description,
    duration: body.duration,
    eligibility: body.eligibility,
    ageCriteria: body.age_criteria,
    seatsAvailable: body.seats_available,
    grades: body.grades,
    academicYearLabel: body.academic_year_label,
    applicationDeadline: body.application_deadline,
    publishNow: body.publish_now,
  });
  return c.json({ data }, 201);
});

admissions.get("/programs/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const data = await getProgramForActor(admin, actor, id);
  return c.json({ data });
});

admissions.patch("/programs/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const body = validateBody(
    z.object({
      name: z.string().min(1).max(300).optional(),
      slug: z.string().min(1).max(200).optional(),
      description: z.string().max(8000).nullable().optional(),
      duration: z.string().max(200).nullable().optional(),
      eligibility: z.string().max(2000).nullable().optional(),
      age_criteria: z.string().max(500).nullable().optional(),
      seats_available: z.number().int().min(0).optional(),
      grades: z.unknown().optional(),
      academic_year_label: z.string().max(100).nullable().optional(),
      application_deadline: z.string().nullable().optional(),
      status: programStatusSchema.optional(),
    }),
    await c.req.json(),
  );
  const data = await updateProgramForActor(admin, actor, id, {
    name: body.name,
    slug: body.slug,
    description: body.description,
    duration: body.duration,
    eligibility: body.eligibility,
    ageCriteria: body.age_criteria,
    seatsAvailable: body.seats_available,
    grades: body.grades,
    academicYearLabel: body.academic_year_label,
    applicationDeadline: body.application_deadline ?? undefined,
    status: body.status,
  });
  return c.json({ data });
});

admissions.delete("/programs/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  await deleteProgramForActor(admin, actor, id);
  return c.body(null, 204);
});

// ── Openings ─────────────────────────────────────────────────────

admissions.get("/openings", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const query = validateQuery(
    z.object({ institute_id: uuid }),
    c.req.query(),
  );
  const data = await listOpeningsForActor(admin, actor, query.institute_id);
  return c.json({ data });
});

admissions.post("/openings", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const body = validateBody(
    z.object({
      institute_id: uuid,
      program_id: uuid,
      name: z.string().min(1).max(300),
      slug: z.string().min(1).max(200).optional(),
      description: z.string().max(8000).nullable().optional(),
      seats_available: z.number().int().min(0).optional(),
      academic_year_label: z.string().max(100).nullable().optional(),
      application_deadline: z.string().optional(),
      open_now: z.boolean().optional(),
    }),
    await c.req.json(),
  );
  const data = await createOpeningForActor(admin, actor, {
    instituteId: body.institute_id,
    programId: body.program_id,
    name: body.name,
    slug: body.slug ?? body.name,
    description: body.description,
    seatsAvailable: body.seats_available,
    academicYearLabel: body.academic_year_label,
    applicationDeadline: body.application_deadline,
    openNow: body.open_now,
  });
  return c.json({ data }, 201);
});

admissions.get("/openings/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const data = await getOpeningForActor(admin, actor, id);
  return c.json({ data });
});

admissions.patch("/openings/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const body = validateBody(
    z.object({
      name: z.string().min(1).max(300).optional(),
      slug: z.string().min(1).max(200).optional(),
      description: z.string().max(8000).nullable().optional(),
      seats_available: z.number().int().min(0).optional(),
      academic_year_label: z.string().max(100).nullable().optional(),
      application_deadline: z.string().nullable().optional(),
      status: openingStatusSchema.optional(),
    }),
    await c.req.json(),
  );
  const data = await updateOpeningForActor(admin, actor, id, {
    name: body.name,
    slug: body.slug,
    description: body.description,
    seatsAvailable: body.seats_available,
    academicYearLabel: body.academic_year_label,
    applicationDeadline: body.application_deadline ?? undefined,
    status: body.status,
  });
  return c.json({ data });
});

admissions.delete("/openings/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  await deleteOpeningForActor(admin, actor, id);
  return c.body(null, 204);
});

// ── Applications ─────────────────────────────────────────────────

admissions.get("/applications", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const query = validateQuery(
    z.object({ institute_id: uuid }),
    c.req.query(),
  );
  const data = await listApplicationsForActor(admin, actor, query.institute_id);
  return c.json({ data });
});

admissions.post("/applications", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const body = validateBody(
    z.object({
      institute_id: uuid,
      opening_id: uuid,
      student_display_name: z.string().min(1).max(300),
      payload: z.unknown().optional(),
      submit_now: z.boolean().optional(),
    }),
    await c.req.json(),
  );
  const data = await createApplicationForActor(admin, actor, {
    instituteId: body.institute_id,
    openingId: body.opening_id,
    studentDisplayName: body.student_display_name,
    payload: body.payload,
    submitNow: body.submit_now,
  });
  return c.json({ data }, 201);
});

admissions.get("/applications/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const data = await getApplicationForActor(admin, actor, id);
  return c.json({ data });
});

admissions.post("/applications/:id/transition", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const body = validateBody(
    z.object({
      status: applicationStatusSchema,
      decision_note: z.string().max(4000).nullable().optional(),
    }),
    await c.req.json(),
  );
  const data = await transitionApplicationForActor(admin, actor, id, {
    status: body.status,
    decisionNote: body.decision_note,
  });
  return c.json({ data });
});

admissions.get("/applications/:applicationId/documents", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { applicationId } = validateParams(
    applicationIdParamsSchema,
    c.req.param(),
  );
  const data = await listDocumentsForActor(admin, actor, applicationId);
  return c.json({ data });
});

admissions.post("/applications/:applicationId/documents", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { applicationId } = validateParams(
    applicationIdParamsSchema,
    c.req.param(),
  );
  const body = validateBody(
    z.object({
      doc_type: docTypeSchema,
      label: z.string().min(1).max(300),
      file_name: z.string().max(500).nullable().optional(),
      asset_path: z.string().max(1000).nullable().optional(),
    }),
    await c.req.json(),
  );
  const data = await createDocumentForActor(admin, actor, applicationId, {
    docType: body.doc_type,
    label: body.label,
    fileName: body.file_name,
    assetPath: body.asset_path,
  });
  return c.json({ data }, 201);
});

admissions.patch("/documents/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const body = validateBody(
    z.object({
      status: docStatusSchema.optional(),
      note: z.string().max(2000).nullable().optional(),
      file_name: z.string().max(500).nullable().optional(),
      asset_path: z.string().max(1000).nullable().optional(),
    }),
    await c.req.json(),
  );
  const data = await updateDocumentForActor(admin, actor, id, {
    status: body.status,
    note: body.note,
    fileName: body.file_name,
    assetPath: body.asset_path,
  });
  return c.json({ data });
});

// ── Inquiries ────────────────────────────────────────────────────

admissions.get("/inquiries", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const query = validateQuery(
    z.object({ institute_id: uuid }),
    c.req.query(),
  );
  const data = await listInquiriesForActor(admin, actor, query.institute_id);
  return c.json({ data });
});

admissions.post("/inquiries", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const body = validateBody(
    z.object({
      institute_id: uuid,
      category: inquiryCategorySchema.optional(),
      subject: z.string().min(1).max(300),
      body: z.string().min(1).max(8000),
      contact_name: z.string().min(1).max(200),
      contact_email: z.string().email().nullable().optional(),
      contact_phone: z.string().max(50).nullable().optional(),
    }),
    await c.req.json(),
  );
  const data = await createInquiryForActor(admin, actor, {
    instituteId: body.institute_id,
    category: body.category,
    subject: body.subject,
    body: body.body,
    contactName: body.contact_name,
    contactEmail: body.contact_email,
    contactPhone: body.contact_phone,
  });
  return c.json({ data }, 201);
});

admissions.post("/inquiries/:id/respond", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const body = validateBody(
    z.object({
      status: z.enum(["responded", "closed"]),
      response_note: z.string().min(1).max(8000),
    }),
    await c.req.json(),
  );
  const data = await respondInquiryForActor(admin, actor, id, {
    status: body.status,
    responseNote: body.response_note,
  });
  return c.json({ data });
});

export default admissions;
