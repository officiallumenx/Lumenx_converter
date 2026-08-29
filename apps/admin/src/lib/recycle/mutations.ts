/**
 * Recycle write API — soft-delete create / restore / purge. API auth mode only.
 */
import { getAdminApiClient } from "@/lib/admin-api";
import type { AdminApiClient } from "@/lib/api";
import { isApiAuthMode } from "@/auth/auth-mode";
import { isInstituteUuid } from "@/lib/active-institute";
import type {
  RecycleEntityKind,
  RecycleItemDto,
  RecycleModule,
} from "./types";

function assertApiMode(): void {
  if (!isApiAuthMode()) {
    throw new Error("Recycle API is only available in API auth mode");
  }
}

export type CreateRecycleItemInput = {
  instituteId: string;
  entityKind: RecycleEntityKind;
  entityId: string;
  module: RecycleModule;
  title: string;
  subtitle?: string | null;
  snapshot?: unknown | null;
};

export async function createRecycleItem(
  input: CreateRecycleItemInput,
  client: AdminApiClient = getAdminApiClient(),
): Promise<RecycleItemDto> {
  assertApiMode();
  if (!isInstituteUuid(input.instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }
  if (!isInstituteUuid(input.entityId)) {
    throw new Error("entity_id must be a valid UUID");
  }
  return client.post<RecycleItemDto>("/api/v1/recycle/items", {
    institute_id: input.instituteId.trim(),
    entity_kind: input.entityKind,
    entity_id: input.entityId.trim(),
    module: input.module,
    title: input.title.trim(),
    subtitle: input.subtitle,
    snapshot: input.snapshot,
  });
}

export async function restoreRecycleItem(
  itemId: string,
  client: AdminApiClient = getAdminApiClient(),
): Promise<RecycleItemDto> {
  assertApiMode();
  if (!isInstituteUuid(itemId)) {
    throw new Error("item_id must be a valid UUID");
  }
  return client.post<RecycleItemDto>(
    `/api/v1/recycle/items/${itemId.trim()}/restore`,
  );
}

export async function purgeRecycleItem(
  itemId: string,
  client: AdminApiClient = getAdminApiClient(),
): Promise<RecycleItemDto> {
  assertApiMode();
  if (!isInstituteUuid(itemId)) {
    throw new Error("item_id must be a valid UUID");
  }
  return client.post<RecycleItemDto>(
    `/api/v1/recycle/items/${itemId.trim()}/purge`,
  );
}
