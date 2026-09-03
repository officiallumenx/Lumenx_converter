import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "../../errors/app-error.js";
import { findLicenseByInstituteId } from "../nexus/repository.js";
import { findStorageQuotaByPlan } from "../policies/repository.js";
import type { StoragePlan } from "../policies/types.js";
import { aggregateUsageRows } from "./aggregate.js";
import { listActiveAssetsForInstitute } from "./repository.js";

const BYTES_PER_GB = 1024 * 1024 * 1024;

/**
 * Hard-deny uploads that would push institute usage over the plan storage quota.
 * If no quota row exists for the institute plan, uploads are allowed (alerts-only config).
 */
export async function assertInstituteStorageQuota(
  admin: SupabaseClient,
  instituteId: string,
  additionalBytes: number,
): Promise<void> {
  if (additionalBytes <= 0) return;

  const license = await findLicenseByInstituteId(admin, instituteId);
  const plan = (license?.plan ?? "core") as StoragePlan;
  const quota = await findStorageQuotaByPlan(admin, plan);
  if (!quota || quota.deleted_at) return;

  const limitBytes = Number(quota.limit_gb) * BYTES_PER_GB;
  if (!Number.isFinite(limitBytes) || limitBytes <= 0) return;

  const rows = await listActiveAssetsForInstitute(admin, instituteId);
  const { totalBytes } = aggregateUsageRows(rows);
  if (totalBytes + additionalBytes > limitBytes) {
    throw AppError.conflict(
      `Storage quota exceeded for plan ${plan} (${quota.limit_gb} GB)`,
    );
  }
}
