/**
 * Teachers directory API repository — API auth mode only.
 * Never called from demo mode; institute UUID validated before any fetch.
 */
import { getAdminApiClient } from "@/lib/admin-api";
import type { AdminApiClient } from "@/lib/api";
import {
  fetchAllListPages,
  fetchListPage,
  type ListPageResult,
} from "@/lib/api/list-pages";
import { isApiAuthMode } from "@/auth/auth-mode";
import { isInstituteUuid } from "@/lib/active-institute";
import type { ListTeachersParams, TeacherDto } from "./types";

function assertApiMode(): void {
  if (!isApiAuthMode()) {
    throw new Error("Teachers API is only available in API auth mode");
  }
}

export { assertApiMode };

function teachersListPath(
  params: ListTeachersParams,
  cursor?: string,
): string {
  const query = new URLSearchParams();
  query.set("institute_id", params.instituteId.trim());
  query.set("limit", "100");
  if (params.status) query.set("status", params.status);
  if (params.teachingScope) query.set("teaching_scope", params.teachingScope);
  if (params.q?.trim()) query.set("q", params.q.trim());
  if (cursor) query.set("cursor", cursor);
  return `/api/v1/teachers?${query.toString()}`;
}

export async function listTeachersPage(
  params: ListTeachersParams & { cursor?: string },
  client: AdminApiClient = getAdminApiClient(),
): Promise<ListPageResult<TeacherDto>> {
  assertApiMode();
  if (!isInstituteUuid(params.instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }
  return fetchListPage<TeacherDto>(
    client,
    teachersListPath(params, params.cursor),
  );
}

export async function listTeachers(
  params: ListTeachersParams,
  client: AdminApiClient = getAdminApiClient(),
): Promise<TeacherDto[]> {
  assertApiMode();
  if (!isInstituteUuid(params.instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }

  return fetchAllListPages<TeacherDto>(client, (cursor) =>
    teachersListPath(params, cursor),
  );
}

export async function getTeacher(
  teacherId: string,
  client: AdminApiClient = getAdminApiClient(),
): Promise<TeacherDto> {
  assertApiMode();
  if (!isInstituteUuid(teacherId)) {
    throw new Error("teacher_id must be a valid UUID");
  }
  return client.get<TeacherDto>(`/api/v1/teachers/${teacherId.trim()}`);
}
