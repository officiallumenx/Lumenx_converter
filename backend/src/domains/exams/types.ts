/** Exams domain types aligned to exam / exam_target_section / exam_subject_schedule. */

export type ExamAudienceScope = "year" | "section";

export type ExamScheduleStatus = "draft" | "published";

export type ExamLifecycleStatus = "open" | "closed";

export type ExamRow = {
  id: string;
  institute_id: string;
  academic_year_id: string;
  name: string;
  header: string;
  start_date: string;
  end_date: string;
  default_starts_at: string;
  default_ends_at: string;
  total_marks: number;
  internal_marks: number | null;
  external_marks: number | null;
  audience_scope: ExamAudienceScope;
  schedule_status: ExamScheduleStatus;
  lifecycle_status: ExamLifecycleStatus;
  schedule_published_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type ExamTargetSectionRow = {
  id: string;
  institute_id: string;
  academic_year_id: string;
  class_id: string;
  exam_id: string;
  section_id: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type ExamSubjectScheduleRow = {
  id: string;
  institute_id: string;
  exam_id: string;
  subject_id: string;
  paper_date: string;
  starts_at: string;
  ends_at: string;
  room: string | null;
  invigilator_teacher_id: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

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

export type TargetSectionInput = {
  sectionId: string;
  classId: string;
};

export type SubjectScheduleInput = {
  subjectId: string;
  paperDate: string;
  startsAt: string;
  endsAt: string;
  room?: string | null;
  invigilatorTeacherId?: string | null;
};

export type CreateExamInput = {
  instituteId: string;
  academicYearId: string;
  name: string;
  header: string;
  startDate: string;
  endDate: string;
  defaultStartsAt: string;
  defaultEndsAt: string;
  totalMarks: number;
  internalMarks?: number | null;
  externalMarks?: number | null;
  audienceScope: ExamAudienceScope;
  targetSections?: TargetSectionInput[];
  subjectSchedules?: SubjectScheduleInput[];
};

export type UpdateExamInput = {
  name?: string;
  header?: string;
  startDate?: string;
  endDate?: string;
  defaultStartsAt?: string;
  defaultEndsAt?: string;
  totalMarks?: number;
  internalMarks?: number | null;
  externalMarks?: number | null;
  audienceScope?: ExamAudienceScope;
  scheduleStatus?: ExamScheduleStatus;
  lifecycleStatus?: ExamLifecycleStatus;
  targetSections?: TargetSectionInput[];
  subjectSchedules?: SubjectScheduleInput[];
};

export type ListExamsFilter = {
  instituteId: string;
  academicYearId?: string;
  scheduleStatus?: ExamScheduleStatus;
  lifecycleStatus?: ExamLifecycleStatus;
};
