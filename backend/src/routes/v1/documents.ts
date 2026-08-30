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
  activateTemplateForActor,
  archiveTemplateForActor,
  createGeneratedForActor,
  createTemplateForActor,
  deleteGeneratedForActor,
  deleteTemplateForActor,
  getGeneratedForActor,
  getTemplateForActor,
  listGeneratedForActor,
  listTemplatesForActor,
  transitionGeneratedForActor,
  updateTemplateForActor,
  getGeneratedDocumentSignedUrlForActor,
} from "../../domains/documents/service.js";

const documents = new Hono<AppBindings>();
documents.use("*", requireAuth);

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
const templateTypeSchema = z.enum([
  "certificate",
  "report",
  "id_card",
  "document",
]);
const templateStatusSchema = z.enum(["draft", "active", "archived"]);
const ownerScopeSchema = z.enum(["platform", "institute"]);
const workflowSchema = z.enum([
  "draft",
  "teacher_review",
  "admin_review",
  "published",
  "rejected",
]);

// ── Templates ────────────────────────────────────────────────────

documents.get("/templates", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const query = validateQuery(
    z.object({
      institute_id: uuid,
      type: templateTypeSchema.optional(),
      status: templateStatusSchema.optional(),
      owner_scope: ownerScopeSchema.optional(),
    }),
    c.req.query(),
  );
  const data = await listTemplatesForActor(admin, actor, {
    instituteId: query.institute_id,
    type: query.type,
    status: query.status,
    ownerScope: query.owner_scope,
  });
  return c.json({ data });
});

documents.post("/templates", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const body = validateBody(
    z.object({
      institute_id: uuid,
      type: templateTypeSchema,
      name: z.string().min(1).max(300),
      description: z.string().max(4000).nullable().optional(),
      category: z.string().max(200).nullable().optional(),
      source: z.enum(["system", "custom", "imported"]).optional(),
      preview_aspect: z.enum(["a4", "id_card", "letter"]).optional(),
      layout_mode: z.enum(["blocks", "visual"]).optional(),
      blocks: z.unknown().optional(),
      visual_theme: z.string().max(100).nullable().optional(),
      visual_fields: z.unknown().nullable().optional(),
      tags: z.unknown().optional(),
      activate_now: z.boolean().optional(),
    }),
    await c.req.json(),
  );

  const data = await createTemplateForActor(admin, actor, {
    instituteId: body.institute_id,
    type: body.type,
    name: body.name,
    description: body.description,
    category: body.category,
    source: body.source,
    previewAspect: body.preview_aspect,
    layoutMode: body.layout_mode,
    blocks: body.blocks,
    visualTheme: body.visual_theme,
    visualFields: body.visual_fields,
    tags: body.tags,
    activateNow: body.activate_now,
  });
  return c.json({ data }, 201);
});

documents.get("/templates/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const data = await getTemplateForActor(admin, actor, id);
  return c.json({ data });
});

documents.patch("/templates/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const body = validateBody(
    z.object({
      name: z.string().min(1).max(300).optional(),
      description: z.string().max(4000).nullable().optional(),
      category: z.string().max(200).nullable().optional(),
      preview_aspect: z.enum(["a4", "id_card", "letter"]).optional(),
      layout_mode: z.enum(["blocks", "visual"]).optional(),
      blocks: z.unknown().optional(),
      visual_theme: z.string().max(100).nullable().optional(),
      visual_fields: z.unknown().nullable().optional(),
      tags: z.unknown().optional(),
    }),
    await c.req.json(),
  );

  const data = await updateTemplateForActor(admin, actor, id, {
    name: body.name,
    description: body.description,
    category: body.category,
    previewAspect: body.preview_aspect,
    layoutMode: body.layout_mode,
    blocks: body.blocks,
    visualTheme: body.visual_theme,
    visualFields: body.visual_fields,
    tags: body.tags,
  });
  return c.json({ data });
});

documents.post("/templates/:id/activate", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const data = await activateTemplateForActor(admin, actor, id);
  return c.json({ data });
});

documents.post("/templates/:id/archive", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const data = await archiveTemplateForActor(admin, actor, id);
  return c.json({ data });
});

documents.delete("/templates/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  await deleteTemplateForActor(admin, actor, id);
  return c.body(null, 204);
});

// ── Generated documents ──────────────────────────────────────────

documents.get("/generated", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const query = validateQuery(
    z.object({
      institute_id: uuid,
      type: templateTypeSchema.optional(),
      workflow_state: workflowSchema.optional(),
      student_id: uuid.optional(),
      template_id: uuid.optional(),
    }),
    c.req.query(),
  );
  const data = await listGeneratedForActor(admin, actor, {
    instituteId: query.institute_id,
    type: query.type,
    workflowState: query.workflow_state,
    studentId: query.student_id,
    templateId: query.template_id,
  });
  return c.json({ data });
});

documents.post("/generated", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const body = validateBody(
    z.object({
      institute_id: uuid,
      template_id: uuid,
      title: z.string().min(1).max(300).optional(),
      student_id: uuid.nullable().optional(),
      teacher_id: uuid.nullable().optional(),
      recipient_name: z.string().min(1).max(300),
      recipient_ref: z.string().max(100).nullable().optional(),
      certificate_number: z.string().max(100).nullable().optional(),
      payload: z.unknown().optional(),
    }),
    await c.req.json(),
  );

  const data = await createGeneratedForActor(admin, actor, {
    instituteId: body.institute_id,
    templateId: body.template_id,
    title: body.title,
    studentId: body.student_id,
    teacherId: body.teacher_id,
    recipientName: body.recipient_name,
    recipientRef: body.recipient_ref,
    certificateNumber: body.certificate_number,
    payload: body.payload,
  });
  return c.json({ data }, 201);
});

documents.get("/generated/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const data = await getGeneratedForActor(admin, actor, id);
  return c.json({ data });
});

documents.get("/generated/:id/signed-url", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const query = validateQuery(
    z.object({ expires_in: z.coerce.number().int().min(60).max(86_400).optional() }),
    c.req.query(),
  );
  const data = await getGeneratedDocumentSignedUrlForActor(
    admin,
    actor,
    id,
    query.expires_in,
  );
  return c.json({ data });
});

documents.post("/generated/:id/transition", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const body = validateBody(
    z.object({
      workflow_state: workflowSchema,
      rejection_reason: z.string().max(2000).nullable().optional(),
    }),
    await c.req.json(),
  );

  const data = await transitionGeneratedForActor(admin, actor, id, {
    workflowState: body.workflow_state,
    rejectionReason: body.rejection_reason,
  });
  return c.json({ data });
});

documents.delete("/generated/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  await deleteGeneratedForActor(admin, actor, id);
  return c.body(null, 204);
});

export default documents;
