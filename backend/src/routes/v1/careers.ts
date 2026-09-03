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
  createInquiryForActor,
  createJobForActor,
  createSavedItemForActor,
  createTalentPoolEntryForActor,
  deleteJobForActor,
  deleteSavedItemForActor,
  deleteTalentPoolEntryForActor,
  getApplicationForActor,
  getCandidateProfileForActor,
  getJobForActor,
  getMyCandidateProfileForActor,
  listApplicationsForActor,
  listInquiriesForActor,
  listJobsForActor,
  listSavedItemsForActor,
  listTalentPoolForActor,
  respondInquiryForActor,
  transitionApplicationForActor,
  updateApplicationForActor,
  updateJobForActor,
  upsertCandidateProfileForActor,
} from "../../domains/careers/service.js";
import { convertApplicationToTeacherForActor } from "../../domains/careers/convert-to-teacher.js";
import { withIdempotency } from "../../domains/idempotency/with-idempotency.js";

const careers = new Hono<AppBindings>();
careers.use("*", requireAuth);

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
const jobStatusSchema = z.enum(["draft", "open", "closed"]);
const employmentTypeSchema = z.enum(["full_time", "part_time", "contract"]);
const workModeSchema = z.enum(["onsite", "remote", "hybrid"]);
const applicationStatusSchema = z.enum([
  "draft",
  "submitted",
  "under_review",
  "shortlisted",
  "assessment",
  "demo_class",
  "interview_scheduled",
  "interview_completed",
  "offer_sent",
  "offer_accepted",
  "selected",
  "rejected",
  "on_hold",
  "withdrawn",
]);
const inquiryCategorySchema = z.enum([
  "job",
  "application",
  "recruitment",
  "general",
]);

// ── Jobs ─────────────────────────────────────────────────────────

careers.get("/jobs", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const query = validateQuery(
    z.object({ institute_id: uuid }),
    c.req.query(),
  );
  const data = await listJobsForActor(admin, actor, query.institute_id);
  return c.json({ data });
});

careers.post("/jobs", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const body = validateBody(
    z.object({
      institute_id: uuid,
      title: z.string().min(1).max(300),
      slug: z.string().min(1).max(200).optional(),
      description: z.string().max(8000).nullable().optional(),
      category: z.string().max(100).optional(),
      employment_type: employmentTypeSchema.optional(),
      work_mode: workModeSchema.optional(),
      location_label: z.string().max(300).nullable().optional(),
      openings_count: z.number().int().min(0).optional(),
      open_now: z.boolean().optional(),
    }),
    await c.req.json(),
  );
  const data = await createJobForActor(admin, actor, {
    instituteId: body.institute_id,
    title: body.title,
    slug: body.slug ?? body.title,
    description: body.description,
    category: body.category,
    employmentType: body.employment_type,
    workMode: body.work_mode,
    locationLabel: body.location_label,
    openingsCount: body.openings_count,
    openNow: body.open_now,
  });
  return c.json({ data }, 201);
});

careers.get("/jobs/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const data = await getJobForActor(admin, actor, id);
  return c.json({ data });
});

careers.patch("/jobs/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const body = validateBody(
    z.object({
      title: z.string().min(1).max(300).optional(),
      slug: z.string().min(1).max(200).optional(),
      description: z.string().max(8000).nullable().optional(),
      category: z.string().max(100).optional(),
      employment_type: employmentTypeSchema.optional(),
      work_mode: workModeSchema.optional(),
      location_label: z.string().max(300).nullable().optional(),
      openings_count: z.number().int().min(0).optional(),
      status: jobStatusSchema.optional(),
    }),
    await c.req.json(),
  );
  const data = await updateJobForActor(admin, actor, id, {
    title: body.title,
    slug: body.slug,
    description: body.description,
    category: body.category,
    employmentType: body.employment_type,
    workMode: body.work_mode,
    locationLabel: body.location_label,
    openingsCount: body.openings_count,
    status: body.status,
  });
  return c.json({ data });
});

careers.delete("/jobs/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  await deleteJobForActor(admin, actor, id);
  return c.json({ data: { ok: true } });
});

// ── Candidate profiles ───────────────────────────────────────────

careers.get("/me/profile", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const query = validateQuery(
    z.object({ institute_id: uuid }),
    c.req.query(),
  );
  const data = await getMyCandidateProfileForActor(
    admin,
    actor,
    query.institute_id,
  );
  return c.json({ data });
});

careers.put("/me/profile", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const body = validateBody(
    z.object({
      institute_id: uuid,
      display_name: z.string().min(1).max(300),
      headline: z.string().max(500).nullable().optional(),
      summary: z.string().max(8000).nullable().optional(),
      phone: z.string().max(50).nullable().optional(),
      email: z.string().max(320).nullable().optional(),
      payload: z.unknown().optional(),
    }),
    await c.req.json(),
  );
  const data = await upsertCandidateProfileForActor(admin, actor, {
    instituteId: body.institute_id,
    displayName: body.display_name,
    headline: body.headline,
    summary: body.summary,
    phone: body.phone,
    email: body.email,
    payload: body.payload,
  });
  return c.json({ data });
});

careers.get("/profiles/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const data = await getCandidateProfileForActor(admin, actor, id);
  return c.json({ data });
});

// ── Applications ─────────────────────────────────────────────────

careers.get("/applications", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const query = validateQuery(
    z.object({ institute_id: uuid }),
    c.req.query(),
  );
  const data = await listApplicationsForActor(admin, actor, query.institute_id);
  return c.json({ data });
});

careers.post("/applications", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const body = validateBody(
    z.object({
      institute_id: uuid,
      job_id: uuid,
      cover_letter: z.string().max(8000).nullable().optional(),
      payload: z.unknown().optional(),
      submit_now: z.boolean().optional(),
    }),
    await c.req.json(),
  );
  const data = await createApplicationForActor(admin, actor, {
    instituteId: body.institute_id,
    jobId: body.job_id,
    coverLetter: body.cover_letter,
    payload: body.payload,
    submitNow: body.submit_now,
  });
  return c.json({ data }, 201);
});

careers.get("/applications/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const data = await getApplicationForActor(admin, actor, id);
  return c.json({ data });
});

careers.patch("/applications/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const body = validateBody(
    z.object({
      cover_letter: z.string().max(8000).nullable().optional(),
      payload: z.unknown().optional(),
      decision_note: z.string().max(4000).nullable().optional(),
    }),
    await c.req.json(),
  );
  const data = await updateApplicationForActor(admin, actor, id, {
    coverLetter: body.cover_letter,
    payload: body.payload,
    decisionNote: body.decision_note,
  });
  return c.json({ data });
});

careers.post("/applications/:id/transition", async (c) => {
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

const teachingScopeSchema = z.enum([
  "subject_teacher",
  "activity_coordinator",
  "dual_role",
]);
const portalAccessSchema = z.enum([
  "faculty_grading",
  "faculty_only",
  "read_only",
]);
const teacherStatusSchema = z.enum(["active", "on_leave", "pending"]);

careers.post("/applications/:id/convert-to-teacher", async (c) => {
  return withIdempotency(
    c,
    "POST /api/v1/careers/applications/:id/convert-to-teacher",
    async () => {
      const actor = assertAuthenticated(c);
      const admin = requireAdmin(c);
      const { id } = validateParams(idParamsSchema, c.req.param());
      const body = validateBody(
        z.object({
          display_name: z.string().min(1).max(200),
          department: z.string().min(1).max(200),
          teaching_scope: teachingScopeSchema,
          portal_access_level: portalAccessSchema,
          status: teacherStatusSchema.optional(),
          phone: z.string().max(40).nullable().optional(),
          email: z.string().email().max(200).nullable().optional(),
          qualification: z.string().max(500).nullable().optional(),
          date_of_birth: z.string().nullable().optional(),
          employee_id: z.string().max(100).nullable().optional(),
          joined_on: z.string().nullable().optional(),
        }),
        await c.req.json(),
      );
      const data = await convertApplicationToTeacherForActor(admin, actor, id, {
        displayName: body.display_name,
        department: body.department,
        teachingScope: body.teaching_scope,
        portalAccessLevel: body.portal_access_level,
        status: body.status,
        phone: body.phone,
        email: body.email,
        qualification: body.qualification,
        dateOfBirth: body.date_of_birth,
        employeeId: body.employee_id,
        joinedOn: body.joined_on,
      });
      return { status: 201, body: { data } };
    },
  );
});

// ── Inquiries ────────────────────────────────────────────────────

careers.get("/inquiries", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const query = validateQuery(
    z.object({ institute_id: uuid }),
    c.req.query(),
  );
  const data = await listInquiriesForActor(admin, actor, query.institute_id);
  return c.json({ data });
});

careers.post("/inquiries", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const body = validateBody(
    z.object({
      institute_id: uuid,
      category: inquiryCategorySchema.optional(),
      subject: z.string().min(1).max(500),
      body: z.string().min(1).max(8000),
      contact_name: z.string().min(1).max(200),
      contact_email: z.string().max(320).nullable().optional(),
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

careers.post("/inquiries/:id/respond", async (c) => {
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

// ── Talent pool ──────────────────────────────────────────────────

careers.get("/talent-pool", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const query = validateQuery(
    z.object({ institute_id: uuid }),
    c.req.query(),
  );
  const data = await listTalentPoolForActor(admin, actor, query.institute_id);
  return c.json({ data });
});

careers.post("/talent-pool", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const body = validateBody(
    z.object({
      institute_id: uuid,
      candidate_user_id: uuid,
      notes: z.string().max(4000).nullable().optional(),
    }),
    await c.req.json(),
  );
  const data = await createTalentPoolEntryForActor(admin, actor, {
    instituteId: body.institute_id,
    candidateUserId: body.candidate_user_id,
    notes: body.notes,
  });
  return c.json({ data }, 201);
});

careers.delete("/talent-pool/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  await deleteTalentPoolEntryForActor(admin, actor, id);
  return c.json({ data: { ok: true } });
});

// ── Saved items ──────────────────────────────────────────────────

careers.get("/saved", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const query = validateQuery(
    z.object({ institute_id: uuid }),
    c.req.query(),
  );
  const data = await listSavedItemsForActor(admin, actor, query.institute_id);
  return c.json({ data });
});

careers.post("/saved", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const body = validateBody(
    z.object({
      institute_id: uuid,
      item_kind: z.literal("career_job"),
      item_id: uuid,
    }),
    await c.req.json(),
  );
  const data = await createSavedItemForActor(admin, actor, {
    instituteId: body.institute_id,
    itemKind: body.item_kind,
    itemId: body.item_id,
  });
  return c.json({ data }, 201);
});

careers.delete("/saved/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  await deleteSavedItemForActor(admin, actor, id);
  return c.json({ data: { ok: true } });
});

export default careers;
