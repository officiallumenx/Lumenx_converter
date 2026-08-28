/** Mirrors backend ClassDto / SectionDto — keep in sync with domains/academics/types.ts. */

export type ClassStatus = "active" | "inactive";
export type SectionStatus = "active" | "inactive";

export type ClassDto = {
  id: string;
  instituteId: string;
  academicYearId: string;
  name: string;
  code: string;
  sortOrder: number;
  status: ClassStatus;
  createdAt: string;
  updatedAt: string;
};

export type SectionDto = {
  id: string;
  instituteId: string;
  academicYearId: string;
  classId: string;
  name: string;
  code: string;
  capacity: number | null;
  room: string | null;
  sortOrder: number;
  status: SectionStatus;
  createdAt: string;
  updatedAt: string;
};

/**
 * Presentation-only row for the Classes directory cards.
 * Shape-compatible with demo ClassSection for shared card JSX.
 */
export type ClassListItem = {
  id: string;
  name: string;
  levelId: string;
  timetableGrade: string;
  section: string;
  departmentId?: string;
  departmentCode?: string;
  departmentName?: string;
  teacher: string;
  students: number;
  capacity: number;
  room: string;
  hasTimetable: boolean;
  subjectTeacherAssignments?: Record<string, string>;
};

export type ListClassesParams = {
  instituteId: string;
};
