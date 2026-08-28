/** Mirrors backend RecycleItemDto — keep in sync with domains/recycle/types.ts. */

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

/**
 * Presentation-only row consumed by RecycleBinPanel.
 * Never used as tenant/auth authority.
 */
export type RecycleListItem = {
  id: string;
  module: RecycleModule;
  title: string;
  subtitle?: string;
  deletedAt: string;
  deletedBy: string;
};

export type ListRecycleItemsParams = {
  instituteId: string;
};
