import { getConnectApiClient } from "@/lib/connect-api";
import type { ConnectApiClient } from "@/lib/api";
import { fetchAllListPages } from "@/lib/api/list-pages";
import { isApiAuthMode } from "@/auth/auth-mode";
import { isInstituteUuid } from "@/lib/institute-id";
import type { ListStudentsParams, StudentDto, StudentGuardianDto } from "./types";

function assertApiMode(): void {
  if (!isApiAuthMode()) {
    throw new Error("Students API is only available in API auth mode");
  }
}

/** Short TTL — Parent linked-children + portal snapshot often hit the same student. */
const STUDENT_DTO_TTL_MS = 45_000;
const studentDtoCache = new Map<string, { at: number; data: StudentDto }>();

export function clearStudentDtoCache(): void {
  studentDtoCache.clear();
}

export async function listStudents(
  params: ListStudentsParams,
  client: ConnectApiClient = getConnectApiClient(),
): Promise<StudentDto[]> {
  assertApiMode();
  if (!isInstituteUuid(params.instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }

  return fetchAllListPages<StudentDto>(client, (cursor) => {
    const query = new URLSearchParams();
    query.set("institute_id", params.instituteId.trim());
    query.set("limit", "100");
    if (params.status) query.set("status", params.status);
    if (params.classLabel?.trim()) query.set("class_label", params.classLabel.trim());
    if (params.sectionLabel?.trim()) query.set("section_label", params.sectionLabel.trim());
    if (params.q?.trim()) query.set("q", params.q.trim());
    if (cursor) query.set("cursor", cursor);
    return `/api/v1/students?${query.toString()}`;
  });
}

export async function getStudent(
  studentId: string,
  client: ConnectApiClient = getConnectApiClient(),
): Promise<StudentDto> {
  assertApiMode();
  if (!isInstituteUuid(studentId)) {
    throw new Error("student_id must be a valid UUID");
  }
  const id = studentId.trim();
  const hit = studentDtoCache.get(id);
  if (hit && Date.now() - hit.at < STUDENT_DTO_TTL_MS) {
    return hit.data;
  }
  const data = await client.get<StudentDto>(`/api/v1/students/${id}`);
  studentDtoCache.set(id, { at: Date.now(), data });
  return data;
}

export async function getStudentGuardians(
  studentId: string,
  client: ConnectApiClient = getConnectApiClient(),
): Promise<StudentGuardianDto[]> {
  assertApiMode();
  if (!isInstituteUuid(studentId)) {
    throw new Error("student_id must be a valid UUID");
  }
  return client.get<StudentGuardianDto[]>(`/api/v1/students/${studentId.trim()}/guardians`);
}
