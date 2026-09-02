/** Mirrors backend diary DTOs — keep aligned with backend/src/domains/diary/types.ts */

export type DiaryScope = "subject" | "activity";

export type DiaryDayRowDto = {
  id: string;
  sectionId: string | null;
  classLabel: string;
  description: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type DiaryDayDto = {
  id: string;
  instituteId: string;
  academicYearId: string | null;
  teacherId: string;
  diaryDate: string;
  scope: DiaryScope;
  submittedAt: string | null;
  createdAt: string;
  updatedAt: string;
  rows: DiaryDayRowDto[];
};

export type ListDiaryDaysParams = {
  instituteId: string;
  teacherId?: string;
  academicYearId?: string;
  scope?: DiaryScope;
  diaryDate?: string;
  dateFrom?: string;
  dateTo?: string;
  submitted?: boolean;
};

export type DiaryRowInput = {
  sectionId?: string | null;
  classLabel: string;
  description: string;
  sortOrder?: number;
};

export type TeacherAssignmentDto = {
  id: string;
  instituteId: string;
  academicYearId: string;
  classId: string;
  sectionId: string;
  subjectId: string;
  teacherId: string;
  status: "active" | "inactive";
};

export type SectionDto = {
  id: string;
  instituteId: string;
  academicYearId: string;
  classId: string;
  name: string;
  code: string;
};

export type ClassDto = {
  id: string;
  instituteId: string;
  academicYearId: string;
  name: string;
  code: string;
};

export type DiarySectionOption = {
  sectionId: string;
  label: string;
  classId: string;
};
