import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "../../errors/app-error.js";
import type { Actor } from "../../auth/types.js";
import {
  actorHasInstituteRole,
  requireInstituteId,
} from "../../authorization/index.js";
import {
  findAssetByBucketPath,
  findAssetById,
  insertAsset,
  listAssets,
  softDeleteAsset,
  updateAssetFields,
} from "./repository.js";
import type {
  AssetLinkedEntityKind,
  CreateAssetInput,
  ListAssetsFilter,
  StoredAssetDto,
  StoredAssetRow,
  UpdateAssetInput,
} from "./types.js";

export const WRITE_ROLES = [
  "institute_admin",
  "principal",
  "vice_principal",
  "coordinator",
  "it_admin",
  "staff",
  "teacher",
] as const;

export const STAFF_READ_ROLES = [
  ...WRITE_ROLES,
  "accountant",
  "admissions_officer",
] as const;

export function toAssetDto(row: StoredAssetRow): StoredAssetDto {
  return {
    id: row.id,
    instituteId: row.institute_id,
    bucket: row.bucket,
    objectPath: row.object_path,
    category: row.category,
    fileName: row.file_name,
    contentType: row.content_type,
    byteSize: row.byte_size,
    checksum: row.checksum,
    visibility: row.visibility,
    status: row.status,
    linkedEntityKind: row.linked_entity_kind,
    linkedEntityId: row.linked_entity_id,
    ownerUserId: row.owner_user_id,
    createdByUserId: row.created_by_user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function isMember(actor: Actor, instituteId: string): boolean {
  return (
    actor.isPlatformOperator ||
    actor.memberships.some(
      (m) => m.instituteId === instituteId && m.status === "active",
    )
  );
}

function isWriter(actor: Actor, instituteId: string): boolean {
  if (actor.isPlatformOperator) return true;
  return WRITE_ROLES.some((role) =>
    actorHasInstituteRole(actor, instituteId, role),
  );
}

function isStaffReader(actor: Actor, instituteId: string): boolean {
  if (actor.isPlatformOperator) return true;
  return STAFF_READ_ROLES.some((role) =>
    actorHasInstituteRole(actor, instituteId, role),
  );
}

export function canReadAsset(actor: Actor, row: StoredAssetRow): boolean {
  if (!isMember(actor, row.institute_id)) return false;
  if (isStaffReader(actor, row.institute_id)) return true;
  if (row.visibility === "private") {
    return row.owner_user_id === actor.userId;
  }
  if (row.visibility === "institute") return true;
  // visibility === "staff" — non-staff already filtered above
  return false;
}

function canMutateAsset(actor: Actor, row: StoredAssetRow): boolean {
  if (!canReadAsset(actor, row)) return false;
  if (isWriter(actor, row.institute_id)) return true;
  return (
    row.visibility === "private" && row.owner_user_id === actor.userId
  );
}

function assertLinkedPair(
  kind: AssetLinkedEntityKind | null | undefined,
  id: string | null | undefined,
): { kind: AssetLinkedEntityKind | null; id: string | null } {
  const hasKind = kind != null;
  const hasId = id != null;
  if (hasKind !== hasId) {
    throw AppError.validation("Referenced resource is invalid", {
      linked_entity_kind: [
        "linked_entity_kind and linked_entity_id must both be set or both null",
      ],
    });
  }
  return {
    kind: kind ?? null,
    id: id ?? null,
  };
}

function assertObjectPath(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length < 1) {
    throw AppError.validation("Referenced resource is invalid", {
      object_path: ["Required"],
    });
  }
  return trimmed;
}

export async function listAssetsForActor(
  admin: SupabaseClient,
  actor: Actor,
  filter: ListAssetsFilter,
): Promise<StoredAssetDto[]> {
  const instituteId = requireInstituteId(actor, filter.instituteId);
  const rows = await listAssets(admin, { ...filter, instituteId });
  return rows.filter((r) => canReadAsset(actor, r)).map(toAssetDto);
}

export async function getAssetForActor(
  admin: SupabaseClient,
  actor: Actor,
  id: string,
): Promise<StoredAssetDto> {
  const row = await findAssetById(admin, id);
  if (!row || !canReadAsset(actor, row)) {
    throw AppError.notFound("Asset not found");
  }
  return toAssetDto(row);
}

export async function createAssetForActor(
  admin: SupabaseClient,
  actor: Actor,
  input: CreateAssetInput,
): Promise<StoredAssetDto> {
  const instituteId = requireInstituteId(actor, input.instituteId);
  if (!isWriter(actor, instituteId)) {
    throw AppError.forbidden("Insufficient assets write access");
  }

  const objectPath = assertObjectPath(input.objectPath);
  const linked = assertLinkedPair(
    input.linkedEntityKind,
    input.linkedEntityId,
  );

  const existing = await findAssetByBucketPath(
    admin,
    instituteId,
    input.bucket,
    objectPath,
  );
  if (existing) {
    throw AppError.conflict("Asset already exists for this bucket and path");
  }

  const row = await insertAsset(admin, {
    ...input,
    instituteId,
    objectPath,
    linkedEntityKind: linked.kind,
    linkedEntityId: linked.id,
    createdByUserId: actor.userId,
    ownerUserId:
      input.ownerUserId !== undefined ? input.ownerUserId : actor.userId,
    visibility: input.visibility ?? "institute",
    status: input.status ?? "active",
    category: input.category,
  });
  return toAssetDto(row);
}

export async function updateAssetForActor(
  admin: SupabaseClient,
  actor: Actor,
  id: string,
  input: UpdateAssetInput,
): Promise<StoredAssetDto> {
  const existing = await findAssetById(admin, id);
  if (!existing || !canMutateAsset(actor, existing)) {
    throw AppError.notFound("Asset not found");
  }

  const writer = isWriter(actor, existing.institute_id);
  const aclChange =
    input.visibility !== undefined ||
    input.status !== undefined ||
    input.ownerUserId !== undefined ||
    input.linkedEntityKind !== undefined ||
    input.linkedEntityId !== undefined;
  if (aclChange && !writer) {
    // Non-writer private owners may only touch self-service metadata fields
    throw AppError.notFound("Asset not found");
  }

  const patch: Record<string, unknown> = {};
  if (input.fileName !== undefined) {
    patch.file_name = input.fileName?.trim() || null;
  }
  if (input.contentType !== undefined) {
    patch.content_type = input.contentType?.trim() || null;
  }
  if (input.byteSize !== undefined) patch.byte_size = input.byteSize;
  if (input.checksum !== undefined) {
    patch.checksum = input.checksum?.trim() || null;
  }
  if (input.visibility !== undefined) patch.visibility = input.visibility;
  if (input.status !== undefined) patch.status = input.status;
  if (input.ownerUserId !== undefined) patch.owner_user_id = input.ownerUserId;

  if (
    input.linkedEntityKind !== undefined ||
    input.linkedEntityId !== undefined
  ) {
    const nextKind =
      input.linkedEntityKind !== undefined
        ? input.linkedEntityKind
        : existing.linked_entity_kind;
    const nextId =
      input.linkedEntityId !== undefined
        ? input.linkedEntityId
        : existing.linked_entity_id;
    const linked = assertLinkedPair(nextKind, nextId);
    patch.linked_entity_kind = linked.kind;
    patch.linked_entity_id = linked.id;
  }

  if (Object.keys(patch).length === 0) return toAssetDto(existing);

  const updated = await updateAssetFields(admin, id, patch);
  if (!updated) throw AppError.notFound("Asset not found");
  return toAssetDto(updated);
}

export async function deleteAssetForActor(
  admin: SupabaseClient,
  actor: Actor,
  id: string,
): Promise<void> {
  const existing = await findAssetById(admin, id);
  if (!existing || !canMutateAsset(actor, existing)) {
    throw AppError.notFound("Asset not found");
  }
  const deleted = await softDeleteAsset(admin, id);
  if (!deleted) throw AppError.notFound("Asset not found");
}
