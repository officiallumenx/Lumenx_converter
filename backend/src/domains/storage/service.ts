import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "../../errors/app-error.js";
import type { Actor } from "../../auth/types.js";
import {
  assertPlatformOperator,
  requireInstituteId,
  actorHasInstituteRole,
} from "../../authorization/index.js";
import { findInstituteById } from "../identity/repository.js";
import { STAFF_READ_ROLES } from "../assets/service.js";
import { aggregateUsageRows } from "./aggregate.js";
import {
  listActiveAssetsAll,
  listActiveAssetsForInstitute,
} from "./repository.js";
import type {
  InstituteStorageRowDto,
  InstituteStorageUsageDto,
  NetworkStorageSummaryDto,
} from "./types.js";

function assertInstituteStorageReader(actor: Actor, instituteId: string): void {
  requireInstituteId(actor, instituteId);
  if (actor.isPlatformOperator) return;
  const allowed = STAFF_READ_ROLES.some((role) =>
    actorHasInstituteRole(actor, instituteId, role),
  );
  if (!allowed) {
    throw AppError.forbidden("Insufficient storage read access");
  }
}

function assertPlatformStorageReader(actor: Actor): void {
  assertPlatformOperator(actor);
}

export async function getInstituteStorageUsageForActor(
  admin: SupabaseClient,
  actor: Actor,
  instituteIdRaw: string,
): Promise<InstituteStorageUsageDto> {
  const instituteId = requireInstituteId(actor, instituteIdRaw);
  assertInstituteStorageReader(actor, instituteId);

  const institute = await findInstituteById(admin, instituteId);
  if (!institute) throw AppError.notFound("Institute not found");

  const rows = await listActiveAssetsForInstitute(admin, instituteId);
  const agg = aggregateUsageRows(rows);

  return {
    instituteId,
    totalAssets: agg.totalAssets,
    totalBytes: agg.totalBytes,
    byCategory: agg.byCategory,
    byBucket: agg.byBucket,
  };
}

export async function getNetworkStorageSummaryForActor(
  admin: SupabaseClient,
  actor: Actor,
): Promise<NetworkStorageSummaryDto> {
  assertPlatformStorageReader(actor);

  const rows = await listActiveAssetsAll(admin);
  const instituteIds = new Set(rows.map((r) => r.institute_id));
  const agg = aggregateUsageRows(rows);

  return {
    instituteCount: instituteIds.size,
    totalAssets: agg.totalAssets,
    totalBytes: agg.totalBytes,
  };
}

export async function listInstituteStorageUsageForActor(
  admin: SupabaseClient,
  actor: Actor,
): Promise<InstituteStorageRowDto[]> {
  assertPlatformStorageReader(actor);

  const rows = await listActiveAssetsAll(admin);
  const byInstitute = new Map<string, typeof rows>();

  for (const row of rows) {
    const list = byInstitute.get(row.institute_id) ?? [];
    list.push(row);
    byInstitute.set(row.institute_id, list);
  }

  const results: InstituteStorageRowDto[] = [];

  for (const [instituteId, assetRows] of byInstitute) {
    const institute = await findInstituteById(admin, instituteId);
    const agg = aggregateUsageRows(assetRows);
    results.push({
      instituteId,
      instituteName: institute?.name ?? instituteId,
      instituteCode: institute?.code ?? "—",
      totalAssets: agg.totalAssets,
      totalBytes: agg.totalBytes,
    });
  }

  return results.sort(
    (a, b) => b.totalBytes - a.totalBytes || a.instituteName.localeCompare(b.instituteName),
  );
}

/** Maps user-facing upload purpose to internal bucket/category. */
export function resolveUploadPurpose(purpose: "logo" | "general"): {
  bucket: "institute-branding" | "generated-documents";
  category: "logo" | "other";
} {
  if (purpose === "logo") {
    return { bucket: "institute-branding", category: "logo" };
  }
  return { bucket: "generated-documents", category: "other" };
}
