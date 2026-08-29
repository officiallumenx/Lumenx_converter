import { isApiAuthMode } from "@/auth/auth-mode";
import { ApiClientError } from "@/lib/api";
import { isInstituteUuid } from "@/lib/active-institute";
import { listAssets } from "./api";
import { summarizeStorageUsage } from "./map";
import type { StorageUsageSummary } from "./types";

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
  errorMessage: string | null;
};

export async function loadStorageUsage(
  activeInstituteId: string | null,
): Promise<StorageUsageState> {
  if (!isApiAuthMode()) {
    return { status: "demo", summary: null, errorMessage: null };
  }
  if (!activeInstituteId || !isInstituteUuid(activeInstituteId)) {
    return { status: "needs_institute", summary: null, errorMessage: null };
  }
  try {
    const assets = await listAssets({ instituteId: activeInstituteId });
    const summary = summarizeStorageUsage(assets);
    return {
      status: assets.length === 0 ? "empty" : "ready",
      summary,
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
      return { status: "forbidden", summary: null, errorMessage: message };
    }
    return { status: "error", summary: null, errorMessage: message };
  }
}
