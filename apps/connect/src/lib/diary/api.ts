import { getConnectApiClient } from "@/lib/connect-api";
import type { ConnectApiClient } from "@/lib/api";
import { isApiAuthMode } from "@/auth/auth-mode";
import { isInstituteUuid } from "@/lib/institute-id";
import type {
  ClassDto,
  DiaryDayDto,
  DiaryRowInput,
  DiaryScope,
  ListDiaryDaysParams,
  SectionDto,
  TeacherAssignmentDto,
} from "./types";

function assertApiMode(): void {
  if (!isApiAuthMode()) {
    throw new Error("Diary API is only available in API auth mode");
  }
}

export async function listDiaryDays(
  params: ListDiaryDaysParams,
  client: ConnectApiClient = getConnectApiClient(),
): Promise<DiaryDayDto[]> {
  assertApiMode();
  if (!isInstituteUuid(params.instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }

  const query = new URLSearchParams();
  query.set("institute_id", params.instituteId.trim());
  if (params.teacherId) query.set("teacher_id", params.teacherId);
  if (params.academicYearId) query.set("academic_year_id", params.academicYearId);
  if (params.scope) query.set("scope", params.scope);
  if (params.diaryDate) query.set("diary_date", params.diaryDate);
  if (params.dateFrom) query.set("date_from", params.dateFrom);
  if (params.dateTo) query.set("date_to", params.dateTo);
  if (params.submitted !== undefined) {
    query.set("submitted", params.submitted ? "true" : "false");
  }

  return client.get<DiaryDayDto[]>(`/api/v1/diary?${query.toString()}`);
}

export async function getDiaryDay(
  diaryId: string,
  client: ConnectApiClient = getConnectApiClient(),
): Promise<DiaryDayDto> {
  assertApiMode();
  return client.get<DiaryDayDto>(`/api/v1/diary/${diaryId.trim()}`);
}

export async function createDiaryDay(
  input: {
    instituteId: string;
    academicYearId?: string | null;
    diaryDate: string;
    scope: DiaryScope;
    rows?: DiaryRowInput[];
  },
  client: ConnectApiClient = getConnectApiClient(),
): Promise<DiaryDayDto> {
  assertApiMode();
  return client.post<DiaryDayDto>("/api/v1/diary", {
    institute_id: input.instituteId.trim(),
    academic_year_id: input.academicYearId ?? undefined,
    diary_date: input.diaryDate,
    scope: input.scope,
    rows: input.rows?.map((r, i) => ({
      section_id: r.sectionId,
      class_label: r.classLabel.trim(),
      description: r.description.trim(),
      sort_order: r.sortOrder ?? i,
    })),
  });
}

export async function updateDiaryDay(
  diaryId: string,
  input: { rows?: DiaryRowInput[]; academicYearId?: string | null },
  client: ConnectApiClient = getConnectApiClient(),
): Promise<DiaryDayDto> {
  assertApiMode();
  const body: Record<string, unknown> = {};
  if (input.academicYearId !== undefined) body.academic_year_id = input.academicYearId;
  if (input.rows !== undefined) {
    body.rows = input.rows.map((r, i) => ({
      section_id: r.sectionId,
      class_label: r.classLabel.trim(),
      description: r.description.trim(),
      sort_order: r.sortOrder ?? i,
    }));
  }
  return client.patch<DiaryDayDto>(`/api/v1/diary/${diaryId.trim()}`, body);
}

export async function submitDiaryDayApi(
  diaryId: string,
  client: ConnectApiClient = getConnectApiClient(),
): Promise<DiaryDayDto> {
  assertApiMode();
  return client.post<DiaryDayDto>(`/api/v1/diary/${diaryId.trim()}/submit`);
}

export async function listTeacherAssignments(
  params: { instituteId: string; teacherId: string },
  client: ConnectApiClient = getConnectApiClient(),
): Promise<TeacherAssignmentDto[]> {
  assertApiMode();
  const query = new URLSearchParams();
  query.set("institute_id", params.instituteId.trim());
  query.set("teacher_id", params.teacherId.trim());
  query.set("status", "active");
  return client.get<TeacherAssignmentDto[]>(
    `/api/v1/timetable/assignments?${query.toString()}`,
  );
}

export async function listSections(
  instituteId: string,
  client: ConnectApiClient = getConnectApiClient(),
): Promise<SectionDto[]> {
  assertApiMode();
  const query = new URLSearchParams();
  query.set("institute_id", instituteId.trim());
  return client.get<SectionDto[]>(`/api/v1/sections?${query.toString()}`);
}

export async function listClasses(
  instituteId: string,
  client: ConnectApiClient = getConnectApiClient(),
): Promise<ClassDto[]> {
  assertApiMode();
  const query = new URLSearchParams();
  query.set("institute_id", instituteId.trim());
  return client.get<ClassDto[]>(`/api/v1/classes?${query.toString()}`);
}
