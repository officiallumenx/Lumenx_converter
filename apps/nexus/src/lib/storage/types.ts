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

export type StorageLoadState = {
  status: "demo" | "loading" | "ready" | "error";
  summary: NetworkStorageSummaryDto | null;
  institutes: InstituteStorageRowDto[];
  errorMessage: string | null;
};
