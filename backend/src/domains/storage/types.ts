/** Storage usage read models — bytes from stored_asset; quotas enforced at upload. */

export type StorageBreakdownDto = {
  key: string;
  label: string;
  count: number;
  bytes: number;
};

export type InstituteStorageUsageDto = {
  instituteId: string;
  totalAssets: number;
  totalBytes: number;
  byCategory: StorageBreakdownDto[];
  byBucket: StorageBreakdownDto[];
};

export type NetworkStorageSummaryDto = {
  instituteCount: number;
  totalAssets: number;
  totalBytes: number;
};

export type InstituteStorageRowDto = {
  instituteId: string;
  instituteName: string;
  instituteCode: string;
  totalAssets: number;
  totalBytes: number;
};
