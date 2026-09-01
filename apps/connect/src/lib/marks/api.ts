import { getConnectApiClient } from "@/lib/connect-api";
import type { ConnectApiClient } from "@/lib/api";
import { isApiAuthMode } from "@/auth/auth-mode";
import { isInstituteUuid } from "@/lib/institute-id";
import type {
  CreateMarkEntryInput,
  GetStudentReportCardsParams,
  GetTeacherMarkSheetParams,
  ListMarkEntriesParams,
  MarkEntryDto,
  StudentReportCardDto,
  TeacherMarkSheetDto,
  UpdateMarkEntryInput,
} from "./types";

function assertApiMode(): void {
  if (!isApiAuthMode()) {
    throw new Error("Marks API is only available in API auth mode");
  }
}

function buildListQuery(params: ListMarkEntriesParams): string {
  const query = new URLSearchParams();
  query.set("institute_id", params.instituteId.trim());
  if (params.sectionId) query.set("section_id", params.sectionId);
  if (params.examId) query.set("exam_id", params.examId);
  if (params.subjectId) query.set("subject_id", params.subjectId);
  if (params.teacherId) query.set("teacher_id", params.teacherId);
  if (params.status) query.set("status", params.status);
  return query.toString();
}

export async function listMarkEntries(
  params: ListMarkEntriesParams,
  client: ConnectApiClient = getConnectApiClient(),
): Promise<MarkEntryDto[]> {
  assertApiMode();
  if (!isInstituteUuid(params.instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }
  return client.get<MarkEntryDto[]>(
    `/api/v1/marks/entries?${buildListQuery(params)}`,
  );
}

export async function getMarkEntry(
  entryId: string,
  client: ConnectApiClient = getConnectApiClient(),
): Promise<MarkEntryDto> {
  assertApiMode();
  if (!isInstituteUuid(entryId)) {
    throw new Error("entry_id must be a valid UUID");
  }
  return client.get<MarkEntryDto>(`/api/v1/marks/entries/${entryId.trim()}`);
}

export async function createMarkEntry(
  input: CreateMarkEntryInput,
  client: ConnectApiClient = getConnectApiClient(),
): Promise<MarkEntryDto> {
  assertApiMode();
  return client.post<MarkEntryDto>("/api/v1/marks/entries", {
    institute_id: input.instituteId,
    academic_year_id: input.academicYearId,
    class_id: input.classId,
    section_id: input.sectionId,
    exam_id: input.examId,
    subject_id: input.subjectId,
    max_marks: input.maxMarks,
    scores: input.scores?.map((s) => ({
      enrollment_id: s.enrollmentId,
      marks: s.marks,
    })),
  });
}

export async function updateMarkEntry(
  entryId: string,
  input: UpdateMarkEntryInput,
  client: ConnectApiClient = getConnectApiClient(),
): Promise<MarkEntryDto> {
  assertApiMode();
  return client.patch<MarkEntryDto>(`/api/v1/marks/entries/${entryId.trim()}`, {
    max_marks: input.maxMarks,
    scores: input.scores?.map((s) => ({
      enrollment_id: s.enrollmentId,
      marks: s.marks,
    })),
  });
}

export async function submitMarkEntry(
  entryId: string,
  client: ConnectApiClient = getConnectApiClient(),
): Promise<MarkEntryDto> {
  assertApiMode();
  return client.post<MarkEntryDto>(`/api/v1/marks/entries/${entryId.trim()}/submit`);
}

export async function getStudentReportCards(
  params: GetStudentReportCardsParams,
  client: ConnectApiClient = getConnectApiClient(),
): Promise<StudentReportCardDto[]> {
  assertApiMode();
  if (!isInstituteUuid(params.instituteId) || !isInstituteUuid(params.studentId)) {
    throw new Error("institute_id and student_id must be valid UUIDs");
  }
  const query = new URLSearchParams();
  query.set("institute_id", params.instituteId.trim());
  return client.get<StudentReportCardDto[]>(
    `/api/v1/marks/portal/students/${params.studentId.trim()}/report-cards?${query.toString()}`,
  );
}

export async function getTeacherMarkSheet(
  params: GetTeacherMarkSheetParams,
  client: ConnectApiClient = getConnectApiClient(),
): Promise<TeacherMarkSheetDto> {
  assertApiMode();
  const query = new URLSearchParams();
  query.set("institute_id", params.instituteId.trim());
  query.set("section_id", params.sectionId.trim());
  query.set("exam_id", params.examId.trim());
  query.set("subject_id", params.subjectId.trim());
  return client.get<TeacherMarkSheetDto>(
    `/api/v1/marks/portal/teacher/sheet?${query.toString()}`,
  );
}
