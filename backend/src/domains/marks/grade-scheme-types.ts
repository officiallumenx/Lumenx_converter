/** Grade scheme types aligned to grade_scheme table. */

export type GradeBand = {
  min: number;
  max: number;
  grade: string;
  gpa?: number | null;
};

export type GradeSchemeRow = {
  id: string;
  institute_id: string;
  name: string;
  academic_year_id: string | null;
  is_default: boolean;
  bands: GradeBand[];
  created_by_user_id: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type GradeSchemeDto = {
  id: string;
  instituteId: string;
  name: string;
  academicYearId: string | null;
  isDefault: boolean;
  bands: GradeBand[];
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateGradeSchemeInput = {
  instituteId: string;
  name: string;
  academicYearId?: string | null;
  isDefault?: boolean;
  bands: GradeBand[];
};

export type UpdateGradeSchemeInput = {
  name?: string;
  academicYearId?: string | null;
  isDefault?: boolean;
  bands?: GradeBand[];
};

export type ListGradeSchemesFilter = {
  instituteId: string;
};
