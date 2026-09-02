import { isApiAuthMode } from "@/auth/auth-mode";
import { ApiClientError } from "@/lib/api";
import { isInstituteUuid } from "@/lib/active-institute";
import { getStorageUsage } from "@/lib/storage/api";
import { listAssets } from "./api";
import type { AssetDto, StorageUsageSummary } from "./types";

export type AssetsLoadStatus =
  | "demo"
  | "loading"
  | "ready"
  | "needs_institute"
  | "empty"
  | "forbidden"
  | "error";

export type StorageUsageState = {
  status: AssetsLoadStatus;
  summary: StorageUsageSummary | null;
  assets: AssetDto[];
  errorMessage: string | null;
};

export async function loadStorageUsage(
  activeInstituteId: string | null,
): Promise<StorageUsageState> {
  if (!isApiAuthMode()) {
    return { status: "demo", summary: null, assets: [], errorMessage: null };
  }
  if (!activeInstituteId || !isInstituteUuid(activeInstituteId)) {
    return {
      status: "needs_institute",
      summary: null,
      assets: [],
      errorMessage: null,
    };
  }
  try {
    const [assets, usage] = await Promise.all([
      listAssets({ instituteId: activeInstituteId }),
      getStorageUsage(activeInstituteId),
    ]);
    const summary: StorageUsageSummary = {
      totalAssets: usage.totalAssets,
      totalBytes: usage.totalBytes,
      byCategory: usage.byCategory.map((row) => ({
        category: row.key as StorageUsageSummary["byCategory"][number]["category"],
        count: row.count,
        bytes: row.bytes,
      })),
      byBucket: usage.byBucket.map((row) => ({
        bucket: row.key as StorageUsageSummary["byBucket"][number]["bucket"],
        count: row.count,
        bytes: row.bytes,
      })),
    };
    return {
      status: assets.length === 0 ? "empty" : "ready",
      summary,
      assets,
      errorMessage: null,
    };
  } catch (err) {
    const status =
      err instanceof ApiClientError
        ? err.status
        : err &&
            typeof err === "object" &&
            "status" in err &&
            typeof (err as { status: unknown }).status === "number"
          ? (err as { status: number }).status
          : null;
    const message = err instanceof Error ? err.message : "Failed to load assets";
    if (status === 403) {
      return {
        status: "forbidden",
        summary: null,
        assets: [],
        errorMessage: message,
      };
    }
    return { status: "error", summary: null, assets: [], errorMessage: message };
  }
}
