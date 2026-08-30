/**
 * Exams API repository — API auth mode only.
 */
import { getAdminApiClient } from "@/lib/admin-api";
import type { AdminApiClient } from "@/lib/api";
import { isApiAuthMode } from "@/auth/auth-mode";
import { isInstituteUuid } from "@/lib/active-institute";
import type { ExamDto, ListExamsParams } from "./types";

function assertApiMode(): void {
  if (!isApiAuthMode()) {
    throw new Error("Exams API is only available in API auth mode");
  }
}

export { assertApiMode };

function buildQuery(params: ListExamsParams): string {
  const query = new URLSearchParams();
  query.set("institute_id", params.instituteId.trim());
  if (params.academicYearId) {
    query.set("academic_year_id", params.academicYearId);
  }
  if (params.scheduleStatus) {
    query.set("schedule_status", params.scheduleStatus);
  }
  if (params.lifecycleStatus) {
    query.set("lifecycle_status", params.lifecycleStatus);
  }
  return query.toString();
}

export async function listExams(
  params: ListExamsParams,
  client: AdminApiClient = getAdminApiClient(),
): Promise<ExamDto[]> {
  assertApiMode();
  if (!isInstituteUuid(params.instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }
  return client.get<ExamDto[]>(`/api/v1/exams?${buildQuery(params)}`);
}

export async function getExam(
  examId: string,
  client: AdminApiClient = getAdminApiClient(),
): Promise<ExamDto> {
  assertApiMode();
  if (!isInstituteUuid(examId)) {
    throw new Error("exam_id must be a valid UUID");
  }
  return client.get<ExamDto>(`/api/v1/exams/${examId.trim()}`);
}
