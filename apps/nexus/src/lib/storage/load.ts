import { isNexusApiMode } from "@/lib/auth-mode";
import { ApiClientError } from "@/lib/api";
import { getNetworkStorageSummary, listInstituteStorageUsage } from "./api";
import type { StorageLoadState } from "./types";

export async function loadNetworkStorageUsage(): Promise<StorageLoadState> {
  if (!isNexusApiMode()) {
    return {
      status: "demo",
      summary: null,
      institutes: [],
      errorMessage: null,
    };
  }
  try {
    const [summary, institutes] = await Promise.all([
      getNetworkStorageSummary(),
      listInstituteStorageUsage(),
    ]);
    return { status: "ready", summary, institutes, errorMessage: null };
  } catch (err) {
    return {
      status: "error",
      summary: null,
      institutes: [],
      errorMessage:
        err instanceof ApiClientError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Failed to load storage usage",
    };
  }
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
