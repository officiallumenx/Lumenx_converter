/**
 * Diary API repository — API auth mode only.
 * Never called from demo mode; institute UUID validated before any fetch.
 */
import { getAdminApiClient } from "@/lib/admin-api";
import type { AdminApiClient } from "@/lib/api";
import { isApiAuthMode } from "@/auth/auth-mode";
import { isInstituteUuid } from "@/lib/active-institute";
import type { DiaryDayDto, ListDiaryDaysParams } from "./types";

function assertApiMode(): void {
  if (!isApiAuthMode()) {
    throw new Error("Diary API is only available in API auth mode");
  }
}

export async function listDiaryDays(
  params: ListDiaryDaysParams,
  client: AdminApiClient = getAdminApiClient(),
): Promise<DiaryDayDto[]> {
  assertApiMode();
  if (!isInstituteUuid(params.instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }

  const query = new URLSearchParams();
  query.set("institute_id", params.instituteId.trim());
  query.set("submitted", params.submitted === false ? "false" : "true");
  if (params.teacherId) query.set("teacher_id", params.teacherId);
  if (params.academicYearId) query.set("academic_year_id", params.academicYearId);
  if (params.scope) query.set("scope", params.scope);
  if (params.diaryDate) query.set("diary_date", params.diaryDate);
  if (params.dateFrom) query.set("date_from", params.dateFrom);
  if (params.dateTo) query.set("date_to", params.dateTo);

  return client.get<DiaryDayDto[]>(`/api/v1/diary?${query.toString()}`);
}
