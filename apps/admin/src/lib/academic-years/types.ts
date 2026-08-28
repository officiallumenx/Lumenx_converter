/** Mirrors backend AcademicYearDto — keep in sync with domains/academics/types.ts. */

export type AcademicYearStatus = "active" | "completed" | "upcoming" | "archived";

export type AcademicYearDto = {
  id: string;
  instituteId: string;
  name: string;
  code: string;
  startsOn: string;
  endsOn: string;
  status: AcademicYearStatus;
  createdAt: string;
  updatedAt: string;
};

/**
 * Presentation row shape-compatible with demo AcademicYear for shared table JSX.
 */
export type AcademicYearListItem = {
  id: string;
  label: string;
  startDate: string;
  endDate: string;
  status: AcademicYearStatus;
  code: string;
};

export type ListAcademicYearsParams = {
  instituteId: string;
  status?: AcademicYearStatus;
};
