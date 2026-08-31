/** Mirrors backend RecycleItemDto for Nexus platform oversight. */

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

export type RecycleItemDto = {
  id: string;
  instituteId: string;
  entityKind: string;
  entityId: string;
  module: RecycleModule;
  title: string;
  subtitle: string | null;
  status: "in_bin" | "restored" | "purged";
  deletedByUserId: string;
  deletedAt: string;
  createdAt: string;
  updatedAt: string;
};

export type RecycleListItem = {
  id: string;
  instituteId: string;
  module: RecycleModule;
  title: string;
  subtitle?: string;
  deletedAt: string;
};

export type ListPlatformRecycleParams = {
  instituteId?: string;
};
