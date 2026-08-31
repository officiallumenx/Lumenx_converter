import type { SupabaseClient } from "@supabase/supabase-js";
import type { Actor } from "../../auth/types.js";
import {
  findActiveRecycleItemForEntity,
  insertRecycleItem,
} from "./repository.js";
import type { CreateRecycleItemInput } from "./types.js";

/** Records a soft-deleted entity in recycle_item (idempotent per active bin entry). */
export async function recordEntitySoftDeleteInRecycleBin(
  admin: SupabaseClient,
  actor: Actor,
  input: CreateRecycleItemInput,
): Promise<void> {
  const title = input.title.trim();
  if (!title) return;

  const existing = await findActiveRecycleItemForEntity(
    admin,
    input.instituteId,
    input.entityKind,
    input.entityId,
  );
  if (existing) return;

  const now = new Date().toISOString();
  await insertRecycleItem(admin, {
    ...input,
    title,
    subtitle: input.subtitle?.trim() || null,
    deletedByUserId: actor.userId,
    deletedAt: now,
    status: "in_bin",
  });
}
