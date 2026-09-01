/**
 * Students directory API repository — API auth mode only.
 * Never called from demo mode; institute UUID validated before any fetch.
 */
import { getAdminApiClient } from "@/lib/admin-api";
import type { AdminApiClient } from "@/lib/api";
import { isApiAuthMode } from "@/auth/auth-mode";
import { isInstituteUuid } from "@/lib/active-institute";
import type { ListStudentsParams, StudentDto, StudentGuardianDto } from "./types";

function assertApiMode(): void {
  if (!isApiAuthMode()) {
    throw new Error("Students API is only available in API auth mode");
  }
}

export { assertApiMode };

export async function listStudents(
  params: ListStudentsParams,
  client: AdminApiClient = getAdminApiClient(),
): Promise<StudentDto[]> {
  assertApiMode();
  if (!isInstituteUuid(params.instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }

  const query = new URLSearchParams();
  query.set("institute_id", params.instituteId.trim());
  if (params.status) query.set("status", params.status);
  if (params.classLabel?.trim()) query.set("class_label", params.classLabel.trim());
  if (params.sectionLabel?.trim()) query.set("section_label", params.sectionLabel.trim());
  if (params.q?.trim()) query.set("q", params.q.trim());

  return client.get<StudentDto[]>(`/api/v1/students?${query.toString()}`);
}

export async function getStudentGuardians(
  studentId: string,
  client: AdminApiClient = getAdminApiClient(),
): Promise<StudentGuardianDto[]> {
  assertApiMode();
  if (!isInstituteUuid(studentId)) {
    throw new Error("student_id must be a valid UUID");
  }
  return client.get<StudentGuardianDto[]>(`/api/v1/students/${studentId.trim()}/guardians`);
}

export async function getStudent(
  studentId: string,
  client: AdminApiClient = getAdminApiClient(),
): Promise<StudentDto> {
  assertApiMode();
  if (!isInstituteUuid(studentId)) {
    throw new Error("student_id must be a valid UUID");
  }
  return client.get<StudentDto>(`/api/v1/students/${studentId.trim()}`);
}
