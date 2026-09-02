/** Storage usage DTOs — mirrors backend. */

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
