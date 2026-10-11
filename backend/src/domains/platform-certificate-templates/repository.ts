import type { SupabaseClient } from "@supabase/supabase-js";
import { ensureDbOk } from "../../db/errors.js";
import type {
  PlatformCertificateTemplateRow,
  PlatformTemplateStatus,
} from "./types.js";

export const PLATFORM_CERTIFICATE_TEMPLATE_COLS =
  "id, owner_scope, institute_id, type, name, description, category, status, source, version, family_id, preview_aspect, layout_mode, blocks, visual_theme, visual_fields, tags, asset_path, file_name, file_byte_size, file_content_type, pptx_meta, created_by_user_id, created_at, updated_at, deleted_at";

function asMeta(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

export function normalizePlatformTemplateRow(
  row: PlatformCertificateTemplateRow,
): PlatformCertificateTemplateRow {
  return {
    ...row,
    pptx_meta: asMeta(row.pptx_meta),
  };
}

export async function listPlatformCertificateTemplates(
  admin: SupabaseClient,
  filter: { status?: PlatformTemplateStatus } = {},
): Promise<PlatformCertificateTemplateRow[]> {
  let q = admin
    .from("template")
    .select(PLATFORM_CERTIFICATE_TEMPLATE_COLS)
    .eq("owner_scope", "platform")
    .eq("type", "certificate")
    .eq("layout_mode", "pptx")
    .is("deleted_at", null)
    .order("updated_at", { ascending: false });
  if (filter.status) q = q.eq("status", filter.status);
  const result = await q;
  const rows = ensureDbOk(result) as PlatformCertificateTemplateRow[];
  return rows.map(normalizePlatformTemplateRow);
}

export async function listPublishedPlatformCertificateTemplates(
  admin: SupabaseClient,
): Promise<PlatformCertificateTemplateRow[]> {
  return listPlatformCertificateTemplates(admin, { status: "active" });
}

export async function findPlatformCertificateTemplateById(
  admin: SupabaseClient,
  id: string,
): Promise<PlatformCertificateTemplateRow | null> {
  const result = await admin
    .from("template")
    .select(PLATFORM_CERTIFICATE_TEMPLATE_COLS)
    .eq("id", id)
    .eq("owner_scope", "platform")
    .eq("type", "certificate")
    .is("deleted_at", null)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  if (!result.data) return null;
  return normalizePlatformTemplateRow(
    result.data as PlatformCertificateTemplateRow,
  );
}

export async function insertPlatformCertificateTemplate(
  admin: SupabaseClient,
  input: {
    id?: string;
    familyId: string;
    name: string;
    description: string | null;
    category: string | null;
    status: PlatformTemplateStatus;
    source: "system" | "custom" | "imported";
    version: number;
    pptxMeta: Record<string, unknown>;
    createdByUserId: string;
    assetPath?: string | null;
    fileName?: string | null;
    fileByteSize?: number | null;
    fileContentType?: string | null;
  },
): Promise<PlatformCertificateTemplateRow> {
  const id = input.id ?? crypto.randomUUID();
  const result = await admin
    .from("template")
    .insert({
      id,
      owner_scope: "platform",
      institute_id: null,
      type: "certificate",
      name: input.name.trim(),
      description: input.description,
      category: input.category,
      status: input.status,
      source: input.source,
      version: input.version,
      family_id: input.familyId,
      preview_aspect: "a4",
      layout_mode: "pptx",
      blocks: [],
      visual_theme: null,
      visual_fields: null,
      tags: [],
      asset_path: input.assetPath ?? null,
      file_name: input.fileName ?? null,
      file_byte_size: input.fileByteSize ?? null,
      file_content_type: input.fileContentType ?? null,
      pptx_meta: input.pptxMeta,
      created_by_user_id: input.createdByUserId,
    })
    .select(PLATFORM_CERTIFICATE_TEMPLATE_COLS)
    .single();
  return normalizePlatformTemplateRow(
    ensureDbOk(result) as PlatformCertificateTemplateRow,
  );
}

export async function updatePlatformCertificateTemplateFields(
  admin: SupabaseClient,
  id: string,
  patch: Record<string, unknown>,
): Promise<PlatformCertificateTemplateRow | null> {
  const result = await admin
    .from("template")
    .update(patch)
    .eq("id", id)
    .eq("owner_scope", "platform")
    .eq("type", "certificate")
    .is("deleted_at", null)
    .select(PLATFORM_CERTIFICATE_TEMPLATE_COLS)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  if (!result.data) return null;
  return normalizePlatformTemplateRow(
    result.data as PlatformCertificateTemplateRow,
  );
}

export async function softDeletePlatformCertificateTemplate(
  admin: SupabaseClient,
  id: string,
): Promise<boolean> {
  const result = await admin
    .from("template")
    .update({ deleted_at: new Date().toISOString(), status: "archived" })
    .eq("id", id)
    .eq("owner_scope", "platform")
    .eq("type", "certificate")
    .is("deleted_at", null)
    .select("id")
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return !!result.data;
}

/** Active (published) rows for a family, highest version first. */
export async function listActiveVersionsInFamily(
  admin: SupabaseClient,
  familyId: string,
): Promise<PlatformCertificateTemplateRow[]> {
  const result = await admin
    .from("template")
    .select(PLATFORM_CERTIFICATE_TEMPLATE_COLS)
    .eq("owner_scope", "platform")
    .eq("type", "certificate")
    .eq("family_id", familyId)
    .eq("status", "active")
    .is("deleted_at", null)
    .order("version", { ascending: false });
  const rows = ensureDbOk(result) as PlatformCertificateTemplateRow[];
  return rows.map(normalizePlatformTemplateRow);
}
