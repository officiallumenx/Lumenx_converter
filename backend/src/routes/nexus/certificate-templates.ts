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
  archivePlatformCertificateTemplateForActor,
  createPlatformCertificateTemplateDraftVersionForActor,
  createPlatformCertificateTemplateForActor,
  deletePlatformCertificateTemplateForActor,
  getPlatformCertificateTemplateForActor,
  getPlatformCertificateTemplateSignedUrlForActor,
  importPlatformCertificateTemplateForActor,
  listPlatformCertificateTemplatesForNexus,
  publishPlatformCertificateTemplateForActor,
  updatePlatformCertificateTemplateForActor,
  uploadPlatformCertificateTemplateFileForActor,
} from "../../domains/platform-certificate-templates/service.js";

const uuid = z.string().uuid();
const idParamsSchema = z.object({ id: uuid });

function requireAdmin(c: {
  get: (k: "supabase") => AppBindings["Variables"]["supabase"];
}) {
  const clients = c.get("supabase");
  if (!clients?.admin) {
    throw AppError.internal("Database unavailable");
  }
  return clients.admin;
}

const certificateTemplates = new Hono<AppBindings>();
certificateTemplates.use("*", requireAuth);

const pptxMetaSchema = z.record(z.string(), z.unknown()).optional();

certificateTemplates.get("/", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const query = validateQuery(
    z.object({
      status: z.enum(["draft", "active", "archived"]).optional(),
    }),
    c.req.query(),
  );
  const data = await listPlatformCertificateTemplatesForNexus(
    admin,
    actor,
    query.status,
  );
  return c.json({ data });
});

certificateTemplates.post("/", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const body = validateBody(
    z.object({
      name: z.string().min(1).max(200),
      description: z.string().max(2000).nullable().optional(),
      category: z.string().max(120).nullable().optional(),
      family_id: uuid.optional(),
      pptx_meta: pptxMetaSchema,
    }),
    await c.req.json(),
  );
  const data = await createPlatformCertificateTemplateForActor(admin, actor, {
    name: body.name,
    description: body.description,
    category: body.category,
    familyId: body.family_id,
    pptxMeta: body.pptx_meta,
  });
  return c.json({ data }, 201);
});

certificateTemplates.post("/import", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const body = validateBody(
    z.object({
      name: z.string().min(1).max(200),
      description: z.string().max(2000).nullable().optional(),
      category: z.string().max(120).nullable().optional(),
      version: z.number().int().min(1).max(10_000).optional(),
      family_id: uuid.optional(),
      status: z.enum(["draft", "active", "archived"]).optional(),
      pptx_meta: pptxMetaSchema,
      file_base64: z.string().min(1).max(10_000_000).optional(),
      file_name: z.string().min(1).max(200).optional(),
      content_type: z.string().max(200).optional(),
    }),
    await c.req.json(),
  );
  const data = await importPlatformCertificateTemplateForActor(admin, actor, {
    name: body.name,
    description: body.description,
    category: body.category,
    version: body.version,
    familyId: body.family_id,
    status: body.status,
    pptxMeta: body.pptx_meta,
    fileBase64: body.file_base64,
    fileName: body.file_name,
    contentType: body.content_type,
  });
  return c.json({ data }, 201);
});

certificateTemplates.get("/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const data = await getPlatformCertificateTemplateForActor(admin, actor, id);
  return c.json({ data });
});

certificateTemplates.patch("/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const body = validateBody(
    z.object({
      name: z.string().min(1).max(200).optional(),
      description: z.string().max(2000).nullable().optional(),
      category: z.string().max(120).nullable().optional(),
      pptx_meta: pptxMetaSchema,
    }),
    await c.req.json(),
  );
  const data = await updatePlatformCertificateTemplateForActor(
    admin,
    actor,
    id,
    {
      name: body.name,
      description: body.description,
      category: body.category,
      pptxMeta: body.pptx_meta,
    },
  );
  return c.json({ data });
});

certificateTemplates.post("/:id/upload", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const form = await c.req.parseBody({ all: true });
  const fileRaw = form["file"];
  if (!(fileRaw instanceof File)) {
    throw AppError.validation("Invalid multipart upload", {
      file: ["file is required"],
    });
  }
  const arrayBuffer = await fileRaw.arrayBuffer();
  const data = await uploadPlatformCertificateTemplateFileForActor(
    admin,
    actor,
    id,
    {
      fileName: fileRaw.name,
      contentType: fileRaw.type || "application/octet-stream",
      byteSize: fileRaw.size,
      body: arrayBuffer,
    },
  );
  return c.json({ data });
});

certificateTemplates.post("/:id/publish", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const data = await publishPlatformCertificateTemplateForActor(
    admin,
    actor,
    id,
  );
  return c.json({ data });
});

certificateTemplates.post("/:id/archive", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const data = await archivePlatformCertificateTemplateForActor(
    admin,
    actor,
    id,
  );
  return c.json({ data });
});

certificateTemplates.post("/:id/new-version", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const data = await createPlatformCertificateTemplateDraftVersionForActor(
    admin,
    actor,
    id,
  );
  return c.json({ data }, 201);
});

certificateTemplates.get("/:id/signed-url", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const query = validateQuery(
    z.object({
      expires_in: z.coerce.number().int().min(60).max(86_400).optional(),
    }),
    c.req.query(),
  );
  const data = await getPlatformCertificateTemplateSignedUrlForActor(
    admin,
    actor,
    id,
    query.expires_in,
  );
  return c.json({ data });
});

certificateTemplates.delete("/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  await deletePlatformCertificateTemplateForActor(admin, actor, id);
  return c.json({ data: { ok: true } });
});

export default certificateTemplates;
