/** Mirrors backend DiaryDayDto — keep in sync with domains/diary/types.ts. */

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

/**
 * Presentation-only row consumed by the Diary admin route.
 * Never used as tenant/auth authority.
 */
export type DiaryListItem = {
  id: string;
  instituteId: string;
  teacherId: string;
  academicYearId: string | null;
  date: string;
  submittedAt: string;
  teacherName: string;
  scope: DiaryScope;
  rows: { sectionId: string | null; className: string; description: string }[];
};

export type ListDiaryDaysParams = {
  instituteId: string;
  submitted?: boolean;
  teacherId?: string;
  academicYearId?: string;
  scope?: DiaryScope;
  diaryDate?: string;
  dateFrom?: string;
  dateTo?: string;
};
