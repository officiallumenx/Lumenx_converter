import type { StoredAssetRow } from "../assets/types.js";
import type { StorageBreakdownDto } from "./types.js";

function labelCategory(key: string): string {
  return key.replace(/_/g, " ");
}

function labelBucket(key: string): string {
  return key.replace(/-/g, " ");
}

export function aggregateUsageRows(rows: StoredAssetRow[]): {
  totalAssets: number;
  totalBytes: number;
  byCategory: StorageBreakdownDto[];
  byBucket: StorageBreakdownDto[];
} {
  const categoryMap = new Map<string, { count: number; bytes: number }>();
  const bucketMap = new Map<string, { count: number; bytes: number }>();
  let totalBytes = 0;

  for (const row of rows) {
    const bytes =
      row.byte_size == null
        ? 0
        : typeof row.byte_size === "number"
          ? row.byte_size
          : Number(row.byte_size);
    totalBytes += Number.isFinite(bytes) ? bytes : 0;

    const cat = row.category ?? "other";
    const catRow = categoryMap.get(cat) ?? { count: 0, bytes: 0 };
    catRow.count += 1;
    catRow.bytes += Number.isFinite(bytes) ? bytes : 0;
    categoryMap.set(cat, catRow);

    const bucket = row.bucket ?? "unknown";
    const bucketRow = bucketMap.get(bucket) ?? { count: 0, bytes: 0 };
    bucketRow.count += 1;
    bucketRow.bytes += Number.isFinite(bytes) ? bytes : 0;
    bucketMap.set(bucket, bucketRow);
  }

  const toBreakdown = (
    map: Map<string, { count: number; bytes: number }>,
    labelFn: (k: string) => string,
  ): StorageBreakdownDto[] =>
    [...map.entries()]
      .map(([key, stats]) => ({
        key,
        label: labelFn(key),
        count: stats.count,
        bytes: stats.bytes,
      }))
      .sort((a, b) => b.bytes - a.bytes || b.count - a.count);

  return {
    totalAssets: rows.length,
    totalBytes,
    byCategory: toBreakdown(categoryMap, labelCategory),
    byBucket: toBreakdown(bucketMap, labelBucket),
  };
}
