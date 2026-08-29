/** Mirrors backend StoredAssetDto — keep in sync with domains/assets/types.ts. */

export type AssetBucket =
  | "institute-branding"
  | "student-media"
  | "certificates"
  | "admission-docs"
  | "career-docs"
  | "generated-documents";

export type AssetCategory =
  | "logo"
  | "avatar"
  | "student_photo"
  | "id_card"
  | "certificate_pdf"
  | "admission_doc"
  | "career_doc"
  | "generated_document"
  | "other";

export type AssetDto = {
  id: string;
  instituteId: string;
  bucket: AssetBucket;
  objectPath: string;
  category: AssetCategory;
  fileName: string | null;
  contentType: string | null;
  byteSize: number | null;
  checksum: string | null;
  visibility: "private" | "institute" | "staff";
  status: "active" | "pending" | "archived";
  linkedEntityKind: string | null;
  linkedEntityId: string | null;
  ownerUserId: string | null;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
};

export type ListAssetsParams = {
  instituteId: string;
  category?: AssetCategory;
  bucket?: AssetBucket;
};

export type StorageUsageSummary = {
  totalAssets: number;
  totalBytes: number;
  byCategory: Array<{ category: AssetCategory; count: number; bytes: number }>;
};
