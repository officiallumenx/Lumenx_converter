/** Recycle bin registry types (soft-deleted entity entries). */

export const RECYCLE_RETENTION_DAYS = 90;

export type RecycleModule =
  | "Students"
  | "Teachers"
  | "Parents"
  | "Accounts"
  | "Subjects"
  | "Documents"
  | "Events"
  | "Templates"
  | "Homework"
  | "Assets"
  | "Other";

export type RecycleEntityKind =
  | "student"
  | "teacher"
  | "parent"
  | "staff_account"
  | "subject"
  | "event"
  | "homework"
  | "template"
  | "generated_document"
  | "stored_asset"
  | "other";

export type RecycleStatus = "in_bin" | "restored" | "purged";

export type RecycleItemRow = {
  id: string;
  institute_id: string;
  entity_kind: RecycleEntityKind;
  entity_id: string;
  module: RecycleModule;
  title: string;
  subtitle: string | null;
  snapshot: unknown | null;
  status: RecycleStatus;
  deleted_by_user_id: string;
  deleted_at: string;
  restored_by_user_id: string | null;
  restored_at: string | null;
  purged_by_user_id: string | null;
  purged_at: string | null;
  created_at: string;
  updated_at: string;
};

export type RecycleItemDto = {
  id: string;
  instituteId: string;
  entityKind: RecycleEntityKind;
  entityId: string;
  module: RecycleModule;
  title: string;
  subtitle: string | null;
  snapshot: unknown | null;
  status: RecycleStatus;
  deletedByUserId: string;
  deletedAt: string;
  restoredByUserId: string | null;
  restoredAt: string | null;
  purgedByUserId: string | null;
  purgedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateRecycleItemInput = {
  instituteId: string;
  entityKind: RecycleEntityKind;
  entityId: string;
  module: RecycleModule;
  title: string;
  subtitle?: string | null;
  snapshot?: unknown | null;
};
