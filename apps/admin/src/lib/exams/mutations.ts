/**
 * Exams write API — create / update / delete. API auth mode only.
 */
import { getAdminApiClient } from "@/lib/admin-api";
import type { AdminApiClient } from "@/lib/api";
import { isApiAuthMode } from "@/auth/auth-mode";
import { isInstituteUuid } from "@/lib/active-institute";
import type {
  ExamAudienceScope,
  ExamDto,
  ExamLifecycleStatus,
  ExamScheduleStatus,
} from "./types";

function assertApiMode(): void {
  if (!isApiAuthMode()) {
    throw new Error("Exams API is only available in API auth mode");
  }
}

export type ExamTargetSectionInput = {
  sectionId: string;
  classId: string;
};

export type ExamSubjectScheduleInput = {
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
  targetSections?: ExamTargetSectionInput[];
  subjectSchedules?: ExamSubjectScheduleInput[];
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
  targetSections?: ExamTargetSectionInput[];
  subjectSchedules?: ExamSubjectScheduleInput[];
};

function mapTargetSections(sections: ExamTargetSectionInput[]) {
  return sections.map((s) => ({
    section_id: s.sectionId.trim(),
    class_id: s.classId.trim(),
  }));
}

function mapSubjectSchedules(schedules: ExamSubjectScheduleInput[]) {
  return schedules.map((s) => ({
    subject_id: s.subjectId.trim(),
    paper_date: s.paperDate,
    starts_at: s.startsAt,
    ends_at: s.endsAt,
    room: s.room,
    invigilator_teacher_id: s.invigilatorTeacherId,
  }));
}

export async function createExam(
  input: CreateExamInput,
  client: AdminApiClient = getAdminApiClient(),
): Promise<ExamDto> {
  assertApiMode();
  if (!isInstituteUuid(input.instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }
  if (!isInstituteUuid(input.academicYearId)) {
    throw new Error("academic_year_id must be a valid UUID");
  }
  return client.post<ExamDto>("/api/v1/exams", {
    institute_id: input.instituteId.trim(),
    academic_year_id: input.academicYearId.trim(),
    name: input.name.trim(),
    header: input.header.trim(),
    start_date: input.startDate,
    end_date: input.endDate,
    default_starts_at: input.defaultStartsAt,
    default_ends_at: input.defaultEndsAt,
    total_marks: input.totalMarks,
    internal_marks: input.internalMarks,
    external_marks: input.externalMarks,
    audience_scope: input.audienceScope,
    target_sections: input.targetSections
      ? mapTargetSections(input.targetSections)
      : undefined,
    subject_schedules: input.subjectSchedules
      ? mapSubjectSchedules(input.subjectSchedules)
      : undefined,
  });
}

export async function updateExam(
  examId: string,
  input: UpdateExamInput,
  client: AdminApiClient = getAdminApiClient(),
): Promise<ExamDto> {
  assertApiMode();
  if (!isInstituteUuid(examId)) {
    throw new Error("exam_id must be a valid UUID");
  }
  const body: Record<string, unknown> = {};
  if (input.name !== undefined) body.name = input.name.trim();
  if (input.header !== undefined) body.header = input.header.trim();
  if (input.startDate !== undefined) body.start_date = input.startDate;
  if (input.endDate !== undefined) body.end_date = input.endDate;
  if (input.defaultStartsAt !== undefined) {
    body.default_starts_at = input.defaultStartsAt;
  }
  if (input.defaultEndsAt !== undefined) {
    body.default_ends_at = input.defaultEndsAt;
  }
  if (input.totalMarks !== undefined) body.total_marks = input.totalMarks;
  if (input.internalMarks !== undefined) body.internal_marks = input.internalMarks;
  if (input.externalMarks !== undefined) body.external_marks = input.externalMarks;
  if (input.audienceScope !== undefined) body.audience_scope = input.audienceScope;
  if (input.scheduleStatus !== undefined) {
    body.schedule_status = input.scheduleStatus;
  }
  if (input.lifecycleStatus !== undefined) {
    body.lifecycle_status = input.lifecycleStatus;
  }
  if (input.targetSections !== undefined) {
    body.target_sections = mapTargetSections(input.targetSections);
  }
  if (input.subjectSchedules !== undefined) {
    body.subject_schedules = mapSubjectSchedules(input.subjectSchedules);
  }
  if (Object.keys(body).length === 0) {
    throw new Error("At least one field is required");
  }
  return client.patch<ExamDto>(`/api/v1/exams/${examId.trim()}`, body);
}

export async function deleteExam(
  examId: string,
  client: AdminApiClient = getAdminApiClient(),
): Promise<void> {
  assertApiMode();
  if (!isInstituteUuid(examId)) {
    throw new Error("exam_id must be a valid UUID");
  }
  await client.delete(`/api/v1/exams/${examId.trim()}`);
}
