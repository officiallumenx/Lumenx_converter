import { getAdminApiClient } from "@/lib/admin-api";
import type { AdminApiClient } from "@/lib/api";
import { isApiAuthMode } from "@/auth/auth-mode";
import { isInstituteUuid } from "@/lib/active-institute";
import type { HomeworkDto, ListHomeworkParams } from "./types";

function assertApiMode(): void {
  if (!isApiAuthMode()) {
    throw new Error("Homework API is only available in API auth mode");
  }
}

export { assertApiMode };

export async function listHomework(
  params: ListHomeworkParams,
  client: AdminApiClient = getAdminApiClient(),
): Promise<HomeworkDto[]> {
  assertApiMode();
  if (!isInstituteUuid(params.instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }
  const query = new URLSearchParams();
  query.set("institute_id", params.instituteId.trim());
  if (params.academicYearId) query.set("academic_year_id", params.academicYearId);
  if (params.sectionId) query.set("section_id", params.sectionId);
  if (params.subjectId) query.set("subject_id", params.subjectId);
  if (params.teacherId) query.set("teacher_id", params.teacherId);
  if (params.status) query.set("status", params.status);
  if (params.kind) query.set("kind", params.kind);
  if (params.dueFrom) query.set("due_from", params.dueFrom);
  if (params.dueTo) query.set("due_to", params.dueTo);
  return client.get<HomeworkDto[]>(`/api/v1/homework?${query.toString()}`);
}
