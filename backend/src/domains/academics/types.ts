/** Academics foundation: academic_year, class, section, subject. */

export type AcademicYearStatus =
  | "active"
  | "completed"
  | "upcoming"
  | "archived";

export type ClassStatus = "active" | "inactive";
export type SectionStatus = "active" | "inactive";
export type SubjectStatus = "active" | "draft";

export type AcademicYearRow = {
  id: string;
  institute_id: string;
  name: string;
  code: string;
  starts_on: string;
  ends_on: string;
  status: AcademicYearStatus;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type ClassRow = {
  id: string;
  institute_id: string;
  academic_year_id: string;
  name: string;
  code: string;
  sort_order: number;
  status: ClassStatus;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type SectionRow = {
  id: string;
  institute_id: string;
  academic_year_id: string;
  class_id: string;
  name: string;
  code: string;
  capacity: number | null;
  room: string | null;
  sort_order: number;
  status: SectionStatus;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type SubjectRow = {
  id: string;
  institute_id: string;
  name: string;
  code: string;
  category: string;
  periods_per_week: number;
  applicable_class_codes: string[];
  status: SubjectStatus;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type EnrollmentScopeRow = {
  id: string;
  institute_id: string;
  academic_year_id: string;
  student_id: string;
  class_id: string;
  section_id: string;
  status: string;
  deleted_at: string | null;
};

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

export type ListAcademicYearsFilter = {
  instituteId: string;
  status?: AcademicYearStatus;
};

export type ListClassesFilter = {
  instituteId: string;
  academicYearId?: string;
  status?: ClassStatus;
};

export type ListSectionsFilter = {
  instituteId: string;
  academicYearId?: string;
  classId?: string;
  status?: SectionStatus;
};

export type ListSubjectsFilter = {
  instituteId: string;
  status?: SubjectStatus;
};

export type CreateAcademicYearInput = {
  instituteId: string;
  name: string;
  code: string;
  startsOn: string;
  endsOn: string;
  status?: AcademicYearStatus;
};

export type UpdateAcademicYearInput = {
  name?: string;
  code?: string;
  startsOn?: string;
  endsOn?: string;
  status?: AcademicYearStatus;
};

export type CreateClassInput = {
  instituteId: string;
  academicYearId: string;
  name: string;
  code: string;
  sortOrder?: number;
  status?: ClassStatus;
};

export type UpdateClassInput = {
  name?: string;
  code?: string;
  sortOrder?: number;
  status?: ClassStatus;
};

export type CreateSectionInput = {
  instituteId: string;
  academicYearId: string;
  classId: string;
  name: string;
  code: string;
  capacity?: number | null;
  room?: string | null;
  sortOrder?: number;
  status?: SectionStatus;
};

export type UpdateSectionInput = {
  name?: string;
  code?: string;
  capacity?: number | null;
  room?: string | null;
  sortOrder?: number;
  status?: SectionStatus;
};

export type CreateSubjectInput = {
  instituteId: string;
  name: string;
  code: string;
  category: string;
  periodsPerWeek: number;
  applicableClassCodes: string[];
  status?: SubjectStatus;
};

export type UpdateSubjectInput = {
  name?: string;
  code?: string;
  category?: string;
  periodsPerWeek?: number;
  applicableClassCodes?: string[];
  status?: SubjectStatus;
};
