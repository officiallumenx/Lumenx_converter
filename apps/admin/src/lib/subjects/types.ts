/** Mirrors backend SubjectDto — keep in sync with domains/academics/types.ts. */

export type SubjectStatus = "active" | "draft";

export type SubjectDto = {
  id: string;
  instituteId: string;
  name: string;
  code: string;
  category: string;
  periodsPerWeek: number;
  applicableClassCodes: string[];
  status: SubjectStatus;
  createdAt: string;
  updatedAt: string;
};

/**
 * Presentation-only row consumed by the Subjects catalog list.
 * Shape-compatible with demo SubjectCatalogItem for shared table rendering.
 */
export type SubjectListItem = {
  id: string;
  name: string;
  code: string;
  category: string;
  periodsPerWeek: number;
  grades: string[];
  /** Demo-compat — not populated from API list DTO. */
  assignedTeacherIds: string[];
  status: SubjectStatus;
};

export type ListSubjectsParams = {
  instituteId: string;
};
