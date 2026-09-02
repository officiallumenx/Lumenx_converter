/** Mirrors backend ExamDto — keep in sync with domains/exams/types.ts. */

export type ExamAudienceScope = "year" | "section";
export type ExamScheduleStatus = "draft" | "published";
export type ExamLifecycleStatus = "open" | "closed";

export type ExamTargetSectionDto = {
  id: string;
  classId: string;
  sectionId: string;
  createdAt: string;
  updatedAt: string;
};

export type ExamSubjectScheduleDto = {
  id: string;
  subjectId: string;
  paperDate: string;
  startsAt: string;
  endsAt: string;
  room: string | null;
  invigilatorTeacherId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ExamDto = {
  id: string;
  instituteId: string;
  academicYearId: string;
  name: string;
  header: string;
  startDate: string;
  endDate: string;
  defaultStartsAt: string;
  defaultEndsAt: string;
  totalMarks: number;
  internalMarks: number | null;
  externalMarks: number | null;
  audienceScope: ExamAudienceScope;
  scheduleStatus: ExamScheduleStatus;
  lifecycleStatus: ExamLifecycleStatus;
  schedulePublishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  targetSections: ExamTargetSectionDto[];
  subjectSchedules: ExamSubjectScheduleDto[];
};

export type ExamListStatus =
  | "scheduled"
  | "in-progress"
  | "grading"
  | "published";

/**
 * Presentation row shape-compatible with demo ExamRecord for shared list JSX.
 */
export type ExamListItem = {
  id: string;
  name: string;
  header: string;
  grade: string;
  classScope: "all" | "selected";
  grades: string[];
  section: string;
  term: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  status: ExamListStatus;
  progress: number;
  subjects: string[];
  totalMarks: number;
  internalMarks: number | null;
  externalMarks: number | null;
};

export type ExamTimetableSlotItem = {
  id: string;
  date: string;
  dayNumber: number;
  subject: string;
  subjectId?: string;
  grade: string;
  section: string;
  startTime: string;
  endTime: string;
  room: string;
  invigilator: string;
};

/** Shape-compatible with demo ExamTimetable for timetable cards. */
export type ExamTimetableListItem = {
  id: string;
  examId: string;
  examName: string;
  header: string;
  term: string;
  grade: string;
  section: string;
  startTime: string;
  endTime: string;
  status: ExamScheduleStatus;
  slots: ExamTimetableSlotItem[];
  updatedAt: string;
};

export type ExamsCatalog = {
  items: ExamListItem[];
  timetables: ExamTimetableListItem[];
};

export type ListExamsParams = {
  instituteId: string;
  academicYearId?: string;
  scheduleStatus?: ExamScheduleStatus;
  lifecycleStatus?: ExamLifecycleStatus;
};
