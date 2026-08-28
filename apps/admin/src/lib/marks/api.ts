/**
 * Marks entries API repository — API auth mode only.
 */
import { getAdminApiClient } from "@/lib/admin-api";
import type { AdminApiClient } from "@/lib/api";
import { isApiAuthMode } from "@/auth/auth-mode";
import { isInstituteUuid } from "@/lib/active-institute";
import type { MarkEntryDto, ListMarkEntriesParams } from "./types";

function assertApiMode(): void {
  if (!isApiAuthMode()) {
    throw new Error("Marks API is only available in API auth mode");
  }
}

export { assertApiMode };

function buildQuery(params: ListMarkEntriesParams): string {
  const query = new URLSearchParams();
  query.set("institute_id", params.instituteId.trim());
  if (params.academicYearId) {
    query.set("academic_year_id", params.academicYearId);
  }
  if (params.sectionId) {
    query.set("section_id", params.sectionId);
  }
  if (params.examId) {
    query.set("exam_id", params.examId);
  }
  if (params.subjectId) {
    query.set("subject_id", params.subjectId);
  }
  if (params.teacherId) {
    query.set("teacher_id", params.teacherId);
  }
  if (params.status) {
    query.set("status", params.status);
  }
  return query.toString();
}

export async function listMarkEntries(
  params: ListMarkEntriesParams,
  client: AdminApiClient = getAdminApiClient(),
): Promise<MarkEntryDto[]> {
  assertApiMode();
  if (!isInstituteUuid(params.instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }
  return client.get<MarkEntryDto[]>(
    `/api/v1/marks/entries?${buildQuery(params)}`,
  );
}
