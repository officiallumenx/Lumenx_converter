import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "../../errors/app-error.js";
import type { Actor } from "../../auth/types.js";
import {
  actorHasInstituteRole,
  requireInstituteId,
} from "../../authorization/index.js";
import {
  clearSourceDeletedAt,
  findActiveRecycleItemForEntity,
  findRecycleItemById,
  insertRecycleItem,
  listRecycleItemsInBin,
  retentionCutoffIso,
  updateRecycleItemFields,
} from "./repository.js";
import type {
  CreateRecycleItemInput,
  RecycleItemDto,
  RecycleItemRow,
} from "./types.js";
import { RECYCLE_RETENTION_DAYS } from "./types.js";

export { RECYCLE_RETENTION_DAYS };

export const WRITE_ROLES = [
  "institute_admin",
  "principal",
  "vice_principal",
  "coordinator",
  "it_admin",
] as const;

/** Align people restores with domain write ACLs (no generic staff undelete). */
const PEOPLE_RESTORE_ROLES = [
  "institute_admin",
  "principal",
  "vice_principal",
  "coordinator",
  "admissions_officer",
] as const;

export const STAFF_READ_ROLES = [
  ...WRITE_ROLES,
  "staff",
  "teacher",
  "accountant",
  "admissions_officer",
] as const;

export function toRecycleItemDto(row: RecycleItemRow): RecycleItemDto {
  return {
    id: row.id,
    instituteId: row.institute_id,
    entityKind: row.entity_kind,
    entityId: row.entity_id,
    module: row.module,
    title: row.title,
    subtitle: row.subtitle,
    snapshot: row.snapshot,
    status: row.status,
    deletedByUserId: row.deleted_by_user_id,
    deletedAt: row.deleted_at,
    restoredByUserId: row.restored_by_user_id,
    restoredAt: row.restored_at,
    purgedByUserId: row.purged_by_user_id,
    purgedAt: row.purged_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function isWriter(actor: Actor, instituteId: string): boolean {
  if (actor.isPlatformOperator) return true;
  return WRITE_ROLES.some((role) =>
    actorHasInstituteRole(actor, instituteId, role),
  );
}

function canRestoreEntityKind(
  actor: Actor,
  instituteId: string,
  entityKind: RecycleItemRow["entity_kind"],
): boolean {
  if (actor.isPlatformOperator) return true;
  if (
    entityKind === "student" ||
    entityKind === "teacher" ||
    entityKind === "parent" ||
    entityKind === "staff_account"
  ) {
    return PEOPLE_RESTORE_ROLES.some((role) =>
      actorHasInstituteRole(actor, instituteId, role),
    );
  }
  return isWriter(actor, instituteId);
}

function isStaffReader(actor: Actor, instituteId: string): boolean {
  if (actor.isPlatformOperator) return true;
  return STAFF_READ_ROLES.some((role) =>
    actorHasInstituteRole(actor, instituteId, role),
  );
}

function canSeeRecycleItem(actor: Actor, row: RecycleItemRow): boolean {
  return isStaffReader(actor, row.institute_id);
}

export function isRecycleItemExpired(
  row: RecycleItemRow,
  now: Date = new Date(),
): boolean {
  const cutoff = retentionCutoffIso(now, RECYCLE_RETENTION_DAYS);
  return row.deleted_at < cutoff;
}

export async function listRecycleItemsForActor(
  admin: SupabaseClient,
  actor: Actor,
  instituteIdRaw: string,
): Promise<RecycleItemDto[]> {
  const instituteId = requireInstituteId(actor, instituteIdRaw);
  if (!isStaffReader(actor, instituteId)) {
    throw AppError.forbidden("Insufficient recycle access");
  }
  const rows = await listRecycleItemsInBin(admin, instituteId);
  return rows.map(toRecycleItemDto);
}

export async function getRecycleItemForActor(
  admin: SupabaseClient,
  actor: Actor,
  id: string,
): Promise<RecycleItemDto> {
  const row = await findRecycleItemById(admin, id);
  if (!row || !canSeeRecycleItem(actor, row)) {
    throw AppError.notFound("Recycle item not found");
  }
  // Match list retention: expired in-bin rows are gone from the bin surface
  if (row.status === "in_bin" && isRecycleItemExpired(row)) {
    throw AppError.notFound("Recycle item not found");
  }
  return toRecycleItemDto(row);
}

export async function createRecycleItemForActor(
  admin: SupabaseClient,
  actor: Actor,
  input: CreateRecycleItemInput,
): Promise<RecycleItemDto> {
  const instituteId = requireInstituteId(actor, input.instituteId);
  if (!isWriter(actor, instituteId)) {
    throw AppError.forbidden("Insufficient recycle write access");
  }

  const title = input.title.trim();
  if (!title) {
    throw AppError.validation("Referenced resource is invalid", {
      title: ["Required"],
    });
  }

  const existing = await findActiveRecycleItemForEntity(
    admin,
    instituteId,
    input.entityKind,
    input.entityId,
  );
  if (existing) {
    throw AppError.conflict(
      "An active recycle bin entry already exists for this entity",
    );
  }

  const now = new Date().toISOString();
  const row = await insertRecycleItem(admin, {
    ...input,
    instituteId,
    title,
    subtitle: input.subtitle?.trim() || null,
    deletedByUserId: actor.userId,
    deletedAt: now,
    status: "in_bin",
  });
  return toRecycleItemDto(row);
}

export async function restoreRecycleItemForActor(
  admin: SupabaseClient,
  actor: Actor,
  id: string,
): Promise<RecycleItemDto> {
  const row = await findRecycleItemById(admin, id);
  if (!row || !canSeeRecycleItem(actor, row)) {
    throw AppError.notFound("Recycle item not found");
  }
  if (!isWriter(actor, row.institute_id)) {
    throw AppError.notFound("Recycle item not found");
  }

  if (row.status !== "in_bin" || isRecycleItemExpired(row)) {
    throw AppError.conflict("Recycle item cannot be restored");
  }
  if (!canRestoreEntityKind(actor, row.institute_id, row.entity_kind)) {
    throw AppError.notFound("Recycle item not found");
  }

  await clearSourceDeletedAt(
    admin,
    row.entity_kind,
    row.entity_id,
    row.institute_id,
  );

  const now = new Date().toISOString();
  const updated = await updateRecycleItemFields(admin, id, {
    status: "restored",
    restored_at: now,
    restored_by_user_id: actor.userId,
  });
  if (!updated) throw AppError.notFound("Recycle item not found");
  return toRecycleItemDto(updated);
}

export async function purgeRecycleItemForActor(
  admin: SupabaseClient,
  actor: Actor,
  id: string,
): Promise<RecycleItemDto> {
  const row = await findRecycleItemById(admin, id);
  if (!row || !canSeeRecycleItem(actor, row)) {
    throw AppError.notFound("Recycle item not found");
  }
  if (!isWriter(actor, row.institute_id)) {
    throw AppError.notFound("Recycle item not found");
  }

  if (row.status !== "in_bin") {
    throw AppError.conflict("Recycle item cannot be purged");
  }

  const now = new Date().toISOString();
  const updated = await updateRecycleItemFields(admin, id, {
    status: "purged",
    purged_at: now,
    purged_by_user_id: actor.userId,
  });
  if (!updated) throw AppError.notFound("Recycle item not found");
  return toRecycleItemDto(updated);
}
