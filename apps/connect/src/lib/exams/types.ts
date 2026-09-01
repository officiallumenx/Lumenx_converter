/** Mirrors backend ExamDto subset for Connect. */

export type ExamSubjectScheduleDto = {
  id: string;
  subjectId: string;
  paperDate: string;
  startsAt: string;
  endsAt: string;
  room: string | null;
  invigilatorTeacherId: string | null;
};

export type ExamTargetSectionDto = {
  id: string;
  classId: string;
  sectionId: string;
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
  audienceScope: "year" | "section";
  scheduleStatus: "draft" | "published";
  lifecycleStatus: "open" | "closed";
  schedulePublishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  targetSections: ExamTargetSectionDto[];
  subjectSchedules: ExamSubjectScheduleDto[];
};

export type ListExamsParams = {
  instituteId: string;
  scheduleStatus?: "draft" | "published";
};
