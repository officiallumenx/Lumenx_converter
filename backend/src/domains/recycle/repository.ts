import type { SupabaseClient } from "@supabase/supabase-js";
import { ensureDbOk } from "../../db/errors.js";
import type {
  CreateRecycleItemInput,
  RecycleEntityKind,
  RecycleItemRow,
  RecycleStatus,
} from "./types.js";
import { RECYCLE_RETENTION_DAYS } from "./types.js";

export const RECYCLE_COLS =
  "id, institute_id, entity_kind, entity_id, module, title, subtitle, snapshot, status, deleted_by_user_id, deleted_at, restored_by_user_id, restored_at, purged_by_user_id, purged_at, created_at, updated_at";

/** Source tables cleared on restore (entity_kind → table). `other` skips. */
export const ENTITY_KIND_SOURCE_TABLE: Partial<
  Record<RecycleEntityKind, string>
> = {
  student: "student",
  teacher: "teacher",
  parent: "parent",
  staff_account: "staff_account",
  subject: "subject",
  event: "event",
  homework: "homework",
  template: "template",
  generated_document: "generated_document",
  stored_asset: "stored_asset",
};

export function retentionCutoffIso(
  now: Date = new Date(),
  retentionDays: number = RECYCLE_RETENTION_DAYS,
): string {
  const cutoff = new Date(now.getTime());
  cutoff.setUTCDate(cutoff.getUTCDate() - retentionDays);
  return cutoff.toISOString();
}

export async function listRecycleItemsInBin(
  admin: SupabaseClient,
  instituteId: string,
): Promise<RecycleItemRow[]> {
  const cutoff = retentionCutoffIso();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result: any = await admin
    .from("recycle_item")
    .select(RECYCLE_COLS)
    .eq("institute_id", instituteId)
    .eq("status", "in_bin")
    .gte("deleted_at", cutoff);
  return ensureDbOk(result) as RecycleItemRow[];
}

/** Platform operator view — optional institute filter. */
export async function listRecycleItemsInBinForPlatform(
  admin: SupabaseClient,
  instituteId?: string,
): Promise<RecycleItemRow[]> {
  const cutoff = retentionCutoffIso();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = admin
    .from("recycle_item")
    .select(RECYCLE_COLS)
    .eq("status", "in_bin")
    .gte("deleted_at", cutoff)
    .order("deleted_at", { ascending: false });
  if (instituteId) {
    query = query.eq("institute_id", instituteId);
  }
  const result = await query;
  return ensureDbOk(result) as RecycleItemRow[];
}

export async function findRecycleItemById(
  admin: SupabaseClient,
  id: string,
): Promise<RecycleItemRow | null> {
  const result = await admin
    .from("recycle_item")
    .select(RECYCLE_COLS)
    .eq("id", id)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as RecycleItemRow | null) ?? null;
}

export async function findActiveRecycleItemForEntity(
  admin: SupabaseClient,
  instituteId: string,
  entityKind: RecycleEntityKind,
  entityId: string,
): Promise<RecycleItemRow | null> {
  const result = await admin
    .from("recycle_item")
    .select(RECYCLE_COLS)
    .eq("institute_id", instituteId)
    .eq("entity_kind", entityKind)
    .eq("entity_id", entityId)
    .eq("status", "in_bin")
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as RecycleItemRow | null) ?? null;
}

export async function insertRecycleItem(
  admin: SupabaseClient,
  input: CreateRecycleItemInput & {
    deletedByUserId: string;
    deletedAt: string;
    status: RecycleStatus;
  },
): Promise<RecycleItemRow> {
  const result = await admin
    .from("recycle_item")
    .insert({
      institute_id: input.instituteId,
      entity_kind: input.entityKind,
      entity_id: input.entityId,
      module: input.module,
      title: input.title.trim(),
      subtitle: input.subtitle?.trim() || null,
      snapshot: input.snapshot ?? null,
      status: input.status,
      deleted_by_user_id: input.deletedByUserId,
      deleted_at: input.deletedAt,
    })
    .select(RECYCLE_COLS)
    .single();
  return ensureDbOk(result) as RecycleItemRow;
}

export async function updateRecycleItemFields(
  admin: SupabaseClient,
  id: string,
  patch: Record<string, unknown>,
): Promise<RecycleItemRow | null> {
  const result = await admin
    .from("recycle_item")
    .update(patch)
    .eq("id", id)
    .select(RECYCLE_COLS)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as RecycleItemRow | null) ?? null;
}

/**
 * Best-effort clear of source soft-delete. Missing tables / no matching row
 * are ignored; callers still mark the recycle entry restored.
 */
export async function clearSourceDeletedAt(
  admin: SupabaseClient,
  entityKind: RecycleEntityKind,
  entityId: string,
  instituteId: string,
): Promise<void> {
  const table = ENTITY_KIND_SOURCE_TABLE[entityKind];
  if (!table) return;
  try {
    await admin
      .from(table)
      .update({ deleted_at: null })
      .eq("id", entityId)
      .eq("institute_id", instituteId);
  } catch {
    // ignore — source restore is best-effort
  }
}
