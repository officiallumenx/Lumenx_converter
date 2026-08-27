/** Stored asset foundation types (step 5.3). */

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

export type AssetVisibility = "private" | "institute" | "staff";

export type AssetStatus = "active" | "pending" | "archived";

export type AssetLinkedEntityKind =
  | "student"
  | "teacher"
  | "parent"
  | "admission_document"
  | "career_application"
  | "issued_certificate"
  | "generated_document"
  | "event"
  | "other";

export type StoredAssetRow = {
  id: string;
  institute_id: string;
  bucket: AssetBucket;
  object_path: string;
  category: AssetCategory;
  file_name: string | null;
  content_type: string | null;
  byte_size: number | null;
  checksum: string | null;
  visibility: AssetVisibility;
  status: AssetStatus;
  linked_entity_kind: AssetLinkedEntityKind | null;
  linked_entity_id: string | null;
  owner_user_id: string | null;
  created_by_user_id: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type StoredAssetDto = {
  id: string;
  instituteId: string;
  bucket: AssetBucket;
  objectPath: string;
  category: AssetCategory;
  fileName: string | null;
  contentType: string | null;
  byteSize: number | null;
  checksum: string | null;
  visibility: AssetVisibility;
  status: AssetStatus;
  linkedEntityKind: AssetLinkedEntityKind | null;
  linkedEntityId: string | null;
  ownerUserId: string | null;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
};

export type ListAssetsFilter = {
  instituteId: string;
  category?: AssetCategory;
  bucket?: AssetBucket;
  visibility?: AssetVisibility;
  linkedEntityKind?: AssetLinkedEntityKind;
  linkedEntityId?: string;
};

export type CreateAssetInput = {
  instituteId: string;
  bucket: AssetBucket;
  objectPath: string;
  category: AssetCategory;
  fileName?: string | null;
  contentType?: string | null;
  byteSize?: number | null;
  checksum?: string | null;
  visibility?: AssetVisibility;
  status?: AssetStatus;
  linkedEntityKind?: AssetLinkedEntityKind | null;
  linkedEntityId?: string | null;
  ownerUserId?: string | null;
};

export type UpdateAssetInput = {
  fileName?: string | null;
  contentType?: string | null;
  byteSize?: number | null;
  checksum?: string | null;
  visibility?: AssetVisibility;
  status?: AssetStatus;
  linkedEntityKind?: AssetLinkedEntityKind | null;
  linkedEntityId?: string | null;
  ownerUserId?: string | null;
};
