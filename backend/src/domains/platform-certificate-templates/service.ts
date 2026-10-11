import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "../../errors/app-error.js";
import type { Actor } from "../../auth/types.js";
import {
  assertPlatformOperator,
  assertPlatformRoles,
} from "../../authorization/index.js";
import {
  DEFAULT_SIGNED_URL_TTL_SEC,
  MAX_SIGNED_URL_TTL_SEC,
} from "../assets/storage.js";
import { NEXUS_PLATFORM_CONFIG_WRITE_ROLES } from "../nexus/service.js";
import {
  findPlatformCertificateTemplateById,
  insertPlatformCertificateTemplate,
  listActiveVersionsInFamily,
  listPlatformCertificateTemplates,
  listPublishedPlatformCertificateTemplates,
  softDeletePlatformCertificateTemplate,
  updatePlatformCertificateTemplateFields,
} from "./repository.js";
import {
  assertPlatformCertificateFile,
  buildPlatformTemplateObjectPath,
  createPlatformTemplateSignedUrl,
  uploadPlatformTemplateObject,
} from "./storage.js";
import type {
  CreatePlatformCertificateTemplateInput,
  ImportPlatformCertificateTemplateInput,
  PlatformCertificateTemplateDto,
  PlatformCertificateTemplateRow,
  UpdatePlatformCertificateTemplateInput,
} from "./types.js";

function requirePlatformTemplateWriter(actor: Actor): void {
  assertPlatformOperator(actor);
  assertPlatformRoles(actor, [...NEXUS_PLATFORM_CONFIG_WRITE_ROLES]);
}

function requirePlatformTemplateReader(actor: Actor): void {
  assertPlatformOperator(actor);
}

function isInstituteStaffReader(actor: Actor): boolean {
  return actor.memberships.some((m) => m.status === "active");
}

export function toPlatformCertificateTemplateDto(
  row: PlatformCertificateTemplateRow,
): PlatformCertificateTemplateDto {
  return {
    id: row.id,
    familyId: row.family_id,
    name: row.name,
    description: row.description,
    category: row.category,
    status: row.status,
    source: row.source,
    version: row.version,
    layoutMode: "pptx",
    fileName: row.file_name,
    fileByteSize: row.file_byte_size,
    fileContentType: row.file_content_type,
    assetPath: row.asset_path,
    hasFile: !!row.asset_path,
    pptxMeta: row.pptx_meta ?? {},
    createdByUserId: row.created_by_user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Latest published version per family (Admin consumption). */
export function pickLatestPublishedPerFamily(
  rows: PlatformCertificateTemplateRow[],
): PlatformCertificateTemplateRow[] {
  const byFamily = new Map<string, PlatformCertificateTemplateRow>();
  for (const row of rows) {
    if (row.status !== "active") continue;
    const current = byFamily.get(row.family_id);
    if (!current || row.version > current.version) {
      byFamily.set(row.family_id, row);
    }
  }
  return [...byFamily.values()].sort((a, b) =>
    a.name.localeCompare(b.name),
  );
}

export async function listPlatformCertificateTemplatesForNexus(
  admin: SupabaseClient,
  actor: Actor,
  status?: "draft" | "active" | "archived",
): Promise<PlatformCertificateTemplateDto[]> {
  requirePlatformTemplateReader(actor);
  const rows = await listPlatformCertificateTemplates(
    admin,
    status ? { status } : {},
  );
  return rows.map(toPlatformCertificateTemplateDto);
}

export async function listPublishedPlatformCertificateTemplatesForAdmin(
  admin: SupabaseClient,
  actor: Actor,
): Promise<PlatformCertificateTemplateDto[]> {
  if (!actor.isPlatformOperator && !isInstituteStaffReader(actor)) {
    throw AppError.forbidden("Insufficient template access");
  }
  const rows = await listPublishedPlatformCertificateTemplates(admin);
  return pickLatestPublishedPerFamily(rows).map(
    toPlatformCertificateTemplateDto,
  );
}

export async function getPlatformCertificateTemplateForActor(
  admin: SupabaseClient,
  actor: Actor,
  id: string,
): Promise<PlatformCertificateTemplateDto> {
  // Reject unauthorized callers before a template lookup.
  if (!actor.isPlatformOperator && !isInstituteStaffReader(actor)) {
    throw AppError.forbidden("Insufficient template access");
  }
  const row = await findPlatformCertificateTemplateById(admin, id);
  if (!row) throw AppError.notFound("Platform certificate template not found");

  if (actor.isPlatformOperator) {
    return toPlatformCertificateTemplateDto(row);
  }
  // Institute staff: published (active) only — hide drafts/archived as not found.
  if (row.status !== "active") {
    throw AppError.notFound("Platform certificate template not found");
  }
  return toPlatformCertificateTemplateDto(row);
}

export async function createPlatformCertificateTemplateForActor(
  admin: SupabaseClient,
  actor: Actor,
  input: CreatePlatformCertificateTemplateInput,
): Promise<PlatformCertificateTemplateDto> {
  requirePlatformTemplateWriter(actor);
  const name = input.name.trim();
  if (!name) {
    throw AppError.validation("Referenced resource is invalid", {
      name: ["Required"],
    });
  }
  const id = crypto.randomUUID();
  const familyId = input.familyId?.trim() || id;
  const row = await insertPlatformCertificateTemplate(admin, {
    id,
    familyId,
    name,
    description: input.description?.trim() || null,
    category: input.category?.trim() || null,
    status: "draft",
    source: "custom",
    version: 1,
    pptxMeta: input.pptxMeta ?? {},
    createdByUserId: actor.userId,
  });
  return toPlatformCertificateTemplateDto(row);
}

export async function updatePlatformCertificateTemplateForActor(
  admin: SupabaseClient,
  actor: Actor,
  id: string,
  input: UpdatePlatformCertificateTemplateInput,
): Promise<PlatformCertificateTemplateDto> {
  requirePlatformTemplateWriter(actor);
  const existing = await findPlatformCertificateTemplateById(admin, id);
  if (!existing) {
    throw AppError.notFound("Platform certificate template not found");
  }
  if (existing.status === "archived") {
    throw AppError.conflict("Archived templates cannot be edited");
  }

  const patch: Record<string, unknown> = {};
  if (input.name !== undefined) {
    const name = input.name.trim();
    if (!name) {
      throw AppError.validation("Referenced resource is invalid", {
        name: ["Required"],
      });
    }
    patch.name = name;
  }
  if (input.description !== undefined) {
    patch.description = input.description?.trim() || null;
  }
  if (input.category !== undefined) {
    patch.category = input.category?.trim() || null;
  }
  if (input.pptxMeta !== undefined) {
    patch.pptx_meta = input.pptxMeta;
  }
  if (Object.keys(patch).length === 0) {
    return toPlatformCertificateTemplateDto(existing);
  }

  const updated = await updatePlatformCertificateTemplateFields(
    admin,
    id,
    patch,
  );
  if (!updated) {
    throw AppError.notFound("Platform certificate template not found");
  }
  return toPlatformCertificateTemplateDto(updated);
}

export async function uploadPlatformCertificateTemplateFileForActor(
  admin: SupabaseClient,
  actor: Actor,
  id: string,
  file: { fileName: string; contentType: string; byteSize: number; body: ArrayBuffer },
): Promise<PlatformCertificateTemplateDto> {
  requirePlatformTemplateWriter(actor);
  const existing = await findPlatformCertificateTemplateById(admin, id);
  if (!existing) {
    throw AppError.notFound("Platform certificate template not found");
  }
  if (existing.status === "archived") {
    throw AppError.conflict("Archived templates cannot accept uploads");
  }
  if (existing.asset_path) {
    throw AppError.conflict(
      "Template already has a file — create a new version instead",
    );
  }

  const checked = assertPlatformCertificateFile({
    ...file,
    bytes: file.body,
  });
  const objectPath = buildPlatformTemplateObjectPath(
    existing.id,
    existing.version,
    checked.fileName,
  );
  await uploadPlatformTemplateObject(
    admin,
    objectPath,
    file.body,
    checked.contentType,
  );

  const meta = {
    ...existing.pptx_meta,
    format: checked.format,
  };
  const updated = await updatePlatformCertificateTemplateFields(admin, id, {
    asset_path: objectPath,
    file_name: checked.fileName,
    file_byte_size: file.byteSize,
    file_content_type: checked.contentType,
    pptx_meta: meta,
  });
  if (!updated) {
    throw AppError.notFound("Platform certificate template not found");
  }
  return toPlatformCertificateTemplateDto(updated);
}

export async function publishPlatformCertificateTemplateForActor(
  admin: SupabaseClient,
  actor: Actor,
  id: string,
): Promise<PlatformCertificateTemplateDto> {
  requirePlatformTemplateWriter(actor);
  const existing = await findPlatformCertificateTemplateById(admin, id);
  if (!existing) {
    throw AppError.notFound("Platform certificate template not found");
  }
  if (existing.status === "active") {
    return toPlatformCertificateTemplateDto(existing);
  }
  if (existing.status === "archived") {
    throw AppError.conflict("Restore archived templates before publishing");
  }
  if (!existing.asset_path) {
    throw AppError.conflict("Upload a PPTX file before publishing");
  }

  const actives = await listActiveVersionsInFamily(admin, existing.family_id);
  for (const row of actives) {
    if (row.id === existing.id) continue;
    await updatePlatformCertificateTemplateFields(admin, row.id, {
      status: "archived",
    });
  }

  const updated = await updatePlatformCertificateTemplateFields(admin, id, {
    status: "active",
  });
  if (!updated) {
    throw AppError.notFound("Platform certificate template not found");
  }
  return toPlatformCertificateTemplateDto(updated);
}

export async function archivePlatformCertificateTemplateForActor(
  admin: SupabaseClient,
  actor: Actor,
  id: string,
): Promise<PlatformCertificateTemplateDto> {
  requirePlatformTemplateWriter(actor);
  const existing = await findPlatformCertificateTemplateById(admin, id);
  if (!existing) {
    throw AppError.notFound("Platform certificate template not found");
  }
  if (existing.status === "archived") {
    return toPlatformCertificateTemplateDto(existing);
  }
  const updated = await updatePlatformCertificateTemplateFields(admin, id, {
    status: "archived",
  });
  if (!updated) {
    throw AppError.notFound("Platform certificate template not found");
  }
  return toPlatformCertificateTemplateDto(updated);
}

export async function createPlatformCertificateTemplateDraftVersionForActor(
  admin: SupabaseClient,
  actor: Actor,
  id: string,
): Promise<PlatformCertificateTemplateDto> {
  requirePlatformTemplateWriter(actor);
  const existing = await findPlatformCertificateTemplateById(admin, id);
  if (!existing) {
    throw AppError.notFound("Platform certificate template not found");
  }

  const newId = crypto.randomUUID();
  const nextVersion = existing.version + 1;
  const row = await insertPlatformCertificateTemplate(admin, {
    id: newId,
    familyId: existing.family_id,
    name: existing.name,
    description: existing.description,
    category: existing.category,
    status: "draft",
    source: existing.source,
    version: nextVersion,
    pptxMeta: { ...existing.pptx_meta },
    createdByUserId: actor.userId,
  });
  return toPlatformCertificateTemplateDto(row);
}

export async function getPlatformCertificateTemplateSignedUrlForActor(
  admin: SupabaseClient,
  actor: Actor,
  id: string,
  expiresInSec?: number,
): Promise<{ signedUrl: string; expiresAt: string; templateId: string }> {
  if (!actor.isPlatformOperator && !isInstituteStaffReader(actor)) {
    throw AppError.forbidden("Insufficient template access");
  }
  const row = await findPlatformCertificateTemplateById(admin, id);
  if (!row) throw AppError.notFound("Platform certificate template not found");

  if (!actor.isPlatformOperator && row.status !== "active") {
    throw AppError.notFound("Platform certificate template not found");
  }
  if (!row.asset_path) {
    throw AppError.notFound("Template file not uploaded yet");
  }

  const ttl = Math.min(
    Math.max(expiresInSec ?? DEFAULT_SIGNED_URL_TTL_SEC, 60),
    MAX_SIGNED_URL_TTL_SEC,
  );
  const signed = await createPlatformTemplateSignedUrl(
    admin,
    row.asset_path,
    ttl,
  );
  return { ...signed, templateId: row.id };
}

export async function deletePlatformCertificateTemplateForActor(
  admin: SupabaseClient,
  actor: Actor,
  id: string,
): Promise<void> {
  requirePlatformTemplateWriter(actor);
  const existing = await findPlatformCertificateTemplateById(admin, id);
  if (!existing) {
    throw AppError.notFound("Platform certificate template not found");
  }
  if (existing.status === "active") {
    throw AppError.conflict("Archive template before deleting");
  }
  const ok = await softDeletePlatformCertificateTemplate(admin, id);
  if (!ok) throw AppError.notFound("Platform certificate template not found");
}

/**
 * Opt-in import of a single catalog entry (fixture/local export JSON).
 * Does not read browser localStorage or production data automatically.
 * Never deletes existing localStorage or Storage objects.
 */
export async function importPlatformCertificateTemplateForActor(
  admin: SupabaseClient,
  actor: Actor,
  input: ImportPlatformCertificateTemplateInput,
): Promise<PlatformCertificateTemplateDto> {
  requirePlatformTemplateWriter(actor);
  const name = input.name.trim();
  if (!name) {
    throw AppError.validation("Referenced resource is invalid", {
      name: ["Required"],
    });
  }

  const id = crypto.randomUUID();
  const familyId = input.familyId?.trim() || id;
  const status = input.status ?? "draft";
  if (status === "active" && !input.fileBase64) {
    throw AppError.conflict("Cannot import as published without a file");
  }

  let assetPath: string | null = null;
  let fileName: string | null = null;
  let fileByteSize: number | null = null;
  let fileContentType: string | null = null;
  let pptxMeta = { ...(input.pptxMeta ?? {}) };

  if (input.fileBase64) {
    const rawName = input.fileName?.trim() || "template.pptx";
    const bytes = Buffer.from(input.fileBase64, "base64");
    const checked = assertPlatformCertificateFile({
      fileName: rawName,
      contentType: input.contentType || "application/octet-stream",
      byteSize: bytes.byteLength,
      bytes,
    });
    const version = input.version && input.version >= 1 ? input.version : 1;
    assetPath = buildPlatformTemplateObjectPath(id, version, checked.fileName);
    await uploadPlatformTemplateObject(
      admin,
      assetPath,
      bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
      checked.contentType,
    );
    fileName = checked.fileName;
    fileByteSize = bytes.byteLength;
    fileContentType = checked.contentType;
    pptxMeta = { ...pptxMeta, format: checked.format, imported: true };
  }

  const row = await insertPlatformCertificateTemplate(admin, {
    id,
    familyId,
    name,
    description: input.description?.trim() || null,
    category: input.category?.trim() || null,
    status: status === "active" ? "draft" : status,
    source: "imported",
    version: input.version && input.version >= 1 ? input.version : 1,
    pptxMeta,
    createdByUserId: actor.userId,
    assetPath,
    fileName,
    fileByteSize,
    fileContentType,
  });

  if (status === "active") {
    return publishPlatformCertificateTemplateForActor(admin, actor, row.id);
  }
  return toPlatformCertificateTemplateDto(row);
}
