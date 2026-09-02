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
  createAssetForActor,
  deleteAssetForActor,
  getAssetForActor,
  getAssetSignedUrlForActor,
  listAssetsForActor,
  updateAssetForActor,
  uploadAssetForActor,
} from "../../domains/assets/service.js";
import { resolveUploadPurpose } from "../../domains/storage/service.js";

const assets = new Hono<AppBindings>();
assets.use("*", requireAuth);

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

const bucketSchema = z.enum([
  "institute-branding",
  "student-media",
  "certificates",
  "admission-docs",
  "career-docs",
  "generated-documents",
]);

const categorySchema = z.enum([
  "logo",
  "avatar",
  "student_photo",
  "id_card",
  "certificate_pdf",
  "admission_doc",
  "career_doc",
  "generated_document",
  "other",
]);

const visibilitySchema = z.enum(["private", "institute", "staff"]);
const statusSchema = z.enum(["active", "pending", "archived"]);
const linkedKindSchema = z.enum([
  "student",
  "teacher",
  "parent",
  "admission_document",
  "career_application",
  "issued_certificate",
  "generated_document",
  "event",
  "other",
]);

assets.get("/", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const query = validateQuery(
    z.object({
      institute_id: uuid,
      category: categorySchema.optional(),
      bucket: bucketSchema.optional(),
      visibility: visibilitySchema.optional(),
      linked_entity_kind: linkedKindSchema.optional(),
      linked_entity_id: uuid.optional(),
    }),
    c.req.query(),
  );
  const data = await listAssetsForActor(admin, actor, {
    instituteId: query.institute_id,
    category: query.category,
    bucket: query.bucket,
    visibility: query.visibility,
    linkedEntityKind: query.linked_entity_kind,
    linkedEntityId: query.linked_entity_id,
  });
  return c.json({ data });
});

assets.post("/", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const body = validateBody(
    z.object({
      institute_id: uuid,
      bucket: bucketSchema,
      object_path: z.string().min(1).max(2000),
      category: categorySchema,
      file_name: z.string().max(500).nullable().optional(),
      content_type: z.string().max(200).nullable().optional(),
      byte_size: z.number().int().min(0).nullable().optional(),
      checksum: z.string().max(200).nullable().optional(),
      visibility: visibilitySchema.optional(),
      status: statusSchema.optional(),
      linked_entity_kind: linkedKindSchema.nullable().optional(),
      linked_entity_id: uuid.nullable().optional(),
      owner_user_id: uuid.nullable().optional(),
    }),
    await c.req.json(),
  );
  const data = await createAssetForActor(admin, actor, {
    instituteId: body.institute_id,
    bucket: body.bucket,
    objectPath: body.object_path,
    category: body.category,
    fileName: body.file_name,
    contentType: body.content_type,
    byteSize: body.byte_size,
    checksum: body.checksum,
    visibility: body.visibility,
    status: body.status,
    linkedEntityKind: body.linked_entity_kind,
    linkedEntityId: body.linked_entity_id,
    ownerUserId: body.owner_user_id,
  });
  return c.json({ data }, 201);
});

assets.post("/upload", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const form = await c.req.parseBody({ all: true });
  const instituteIdRaw = form["institute_id"];
  const fileRaw = form["file"];
  const purposeRaw = form["purpose"];
  const bucketRaw = form["bucket"];
  const categoryRaw = form["category"];

  if (typeof instituteIdRaw !== "string" || !(fileRaw instanceof File)) {
    throw AppError.validation("Invalid multipart upload", {
      file: ["institute_id and file are required"],
    });
  }

  let bucket: z.infer<typeof bucketSchema>;
  let category: z.infer<typeof categorySchema>;

  if (typeof purposeRaw === "string" && purposeRaw.trim()) {
    const purpose = validateBody(
      z.object({ purpose: z.enum(["logo", "general"]) }),
      { purpose: purposeRaw.trim() },
    ).purpose;
    const resolved = resolveUploadPurpose(purpose);
    bucket = resolved.bucket;
    category = resolved.category;
  } else if (typeof bucketRaw === "string" && typeof categoryRaw === "string") {
    bucket = validateBody(
      z.object({ bucket: bucketSchema }),
      { bucket: bucketRaw },
    ).bucket;
    category = validateBody(
      z.object({ category: categorySchema }),
      { category: categoryRaw },
    ).category;
  } else {
    throw AppError.validation("Invalid multipart upload", {
      file: ["purpose (logo|general) or bucket+category are required"],
    });
  }

  const visibilityRaw = form["visibility"];
  const linkedKindRaw = form["linked_entity_kind"];
  const linkedIdRaw = form["linked_entity_id"];
  const ownerRaw = form["owner_user_id"];

  const arrayBuffer = await fileRaw.arrayBuffer();
  const data = await uploadAssetForActor(admin, actor, {
    instituteId: validateBody(
      z.object({ institute_id: uuid }),
      { institute_id: instituteIdRaw },
    ).institute_id,
    bucket,
    category,
    fileName: fileRaw.name,
    contentType: fileRaw.type || "application/octet-stream",
    byteSize: fileRaw.size,
    body: arrayBuffer,
    visibility:
      typeof visibilityRaw === "string"
        ? validateBody(
            z.object({ visibility: visibilitySchema }),
            { visibility: visibilityRaw },
          ).visibility
        : undefined,
    linkedEntityKind:
      linkedKindRaw === undefined || linkedKindRaw === null
        ? undefined
        : linkedKindRaw === ""
          ? null
          : validateBody(
              z.object({ linked_entity_kind: linkedKindSchema.nullable() }),
              { linked_entity_kind: String(linkedKindRaw) },
            ).linked_entity_kind,
    linkedEntityId:
      linkedIdRaw === undefined || linkedIdRaw === null
        ? undefined
        : linkedIdRaw === ""
          ? null
          : validateBody(
              z.object({ linked_entity_id: uuid.nullable() }),
              { linked_entity_id: String(linkedIdRaw) },
            ).linked_entity_id,
    ownerUserId:
      typeof ownerRaw === "string" && ownerRaw.trim()
        ? validateBody(
            z.object({ owner_user_id: uuid }),
            { owner_user_id: ownerRaw.trim() },
          ).owner_user_id
        : undefined,
  });
  return c.json({ data }, 201);
});

assets.get("/:id/signed-url", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const query = validateQuery(
    z.object({
      expires_in: z.coerce.number().int().min(60).max(86_400).optional(),
    }),
    c.req.query(),
  );
  const data = await getAssetSignedUrlForActor(
    admin,
    actor,
    id,
    query.expires_in,
  );
  return c.json({ data });
});

assets.get("/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const data = await getAssetForActor(admin, actor, id);
  return c.json({ data });
});

assets.patch("/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const body = validateBody(
    z.object({
      file_name: z.string().max(500).nullable().optional(),
      content_type: z.string().max(200).nullable().optional(),
      byte_size: z.number().int().min(0).nullable().optional(),
      checksum: z.string().max(200).nullable().optional(),
      visibility: visibilitySchema.optional(),
      status: statusSchema.optional(),
      linked_entity_kind: linkedKindSchema.nullable().optional(),
      linked_entity_id: uuid.nullable().optional(),
      owner_user_id: uuid.nullable().optional(),
    }),
    await c.req.json(),
  );
  const data = await updateAssetForActor(admin, actor, id, {
    fileName: body.file_name,
    contentType: body.content_type,
    byteSize: body.byte_size,
    checksum: body.checksum,
    visibility: body.visibility,
    status: body.status,
    linkedEntityKind: body.linked_entity_kind,
    linkedEntityId: body.linked_entity_id,
    ownerUserId: body.owner_user_id,
  });
  return c.json({ data });
});

assets.delete("/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  await deleteAssetForActor(admin, actor, id);
  return c.json({ data: { ok: true } });
});

export default assets;
