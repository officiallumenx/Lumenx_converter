/**
 * Diary write API — create / update / submit / delete. API auth mode only.
 */
import { getAdminApiClient } from "@/lib/admin-api";
import type { AdminApiClient } from "@/lib/api";
import { isApiAuthMode } from "@/auth/auth-mode";
import { isInstituteUuid } from "@/lib/active-institute";
import type { DiaryDayDto, DiaryScope } from "./types";

function assertApiMode(): void {
  if (!isApiAuthMode()) {
    throw new Error("Diary API is only available in API auth mode");
  }
}

export type DiaryRowInput = {
  sectionId?: string | null;
  classLabel: string;
  description: string;
  sortOrder?: number;
};

export type CreateDiaryDayInput = {
  instituteId: string;
  academicYearId?: string | null;
  teacherId?: string;
  diaryDate: string;
  scope: DiaryScope;
  rows?: DiaryRowInput[];
};

export type UpdateDiaryDayInput = {
  academicYearId?: string | null;
  rows?: DiaryRowInput[];
};

export async function createDiaryDay(
  input: CreateDiaryDayInput,
  client: AdminApiClient = getAdminApiClient(),
): Promise<DiaryDayDto> {
  assertApiMode();
  if (!isInstituteUuid(input.instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }
  if (
    input.academicYearId != null &&
    input.academicYearId !== "" &&
    !isInstituteUuid(input.academicYearId)
  ) {
    throw new Error("academic_year_id must be a valid UUID");
  }
  if (input.teacherId !== undefined && !isInstituteUuid(input.teacherId)) {
    throw new Error("teacher_id must be a valid UUID");
  }
  return client.post<DiaryDayDto>("/api/v1/diary", {
    institute_id: input.instituteId.trim(),
    academic_year_id: input.academicYearId ?? undefined,
    teacher_id: input.teacherId?.trim(),
    diary_date: input.diaryDate,
    scope: input.scope,
    rows: input.rows?.map((r) => ({
      section_id: r.sectionId,
      class_label: r.classLabel.trim(),
      description: r.description.trim(),
      sort_order: r.sortOrder,
    })),
  });
}

export async function updateDiaryDay(
  diaryId: string,
  input: UpdateDiaryDayInput,
  client: AdminApiClient = getAdminApiClient(),
): Promise<DiaryDayDto> {
  assertApiMode();
  if (!isInstituteUuid(diaryId)) {
    throw new Error("diary_id must be a valid UUID");
  }
  const body: Record<string, unknown> = {};
  if (input.academicYearId !== undefined) {
    body.academic_year_id = input.academicYearId;
  }
  if (input.rows !== undefined) {
    body.rows = input.rows.map((r) => ({
      section_id: r.sectionId,
      class_label: r.classLabel.trim(),
      description: r.description.trim(),
      sort_order: r.sortOrder,
    }));
  }
  if (Object.keys(body).length === 0) {
    throw new Error("At least one field is required");
  }
  return client.patch<DiaryDayDto>(`/api/v1/diary/${diaryId.trim()}`, body);
}

export async function submitDiaryDay(
  diaryId: string,
  client: AdminApiClient = getAdminApiClient(),
): Promise<DiaryDayDto> {
  assertApiMode();
  if (!isInstituteUuid(diaryId)) {
    throw new Error("diary_id must be a valid UUID");
  }
  return client.post<DiaryDayDto>(`/api/v1/diary/${diaryId.trim()}/submit`);
}

export async function deleteDiaryDay(
  diaryId: string,
  client: AdminApiClient = getAdminApiClient(),
): Promise<void> {
  assertApiMode();
  if (!isInstituteUuid(diaryId)) {
    throw new Error("diary_id must be a valid UUID");
  }
  await client.delete(`/api/v1/diary/${diaryId.trim()}`);
}
