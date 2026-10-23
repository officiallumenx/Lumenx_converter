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
  capacity: number | null;
  classPeriods: Record<string, number>;
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
  capacity: number | null;
  classPeriods: Record<string, number>;
  /** Demo-compat — not populated from API list DTO. */
  assignedTeacherIds: string[];
  status: SubjectStatus;
};

export type SubjectDetailItem = SubjectListItem & {
  instituteId: string;
  updatedAt: string;
};

export type ListSubjectsParams = {
  instituteId: string;
};
