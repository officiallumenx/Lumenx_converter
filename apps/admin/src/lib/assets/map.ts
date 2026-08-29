import type { AssetDto, StorageUsageSummary } from "./types";

export function summarizeStorageUsage(assets: AssetDto[]): StorageUsageSummary {
  const byCategory = new Map<string, { count: number; bytes: number }>();
  let totalBytes = 0;
  for (const asset of assets) {
    const bytes = asset.byteSize ?? 0;
    totalBytes += bytes;
    const row = byCategory.get(asset.category) ?? { count: 0, bytes: 0 };
    row.count += 1;
    row.bytes += bytes;
    byCategory.set(asset.category, row);
  }
  return {
    totalAssets: assets.length,
    totalBytes,
    byCategory: [...byCategory.entries()].map(([category, stats]) => ({
      category: category as StorageUsageSummary["byCategory"][number]["category"],
      count: stats.count,
      bytes: stats.bytes,
    })),
  };
}
