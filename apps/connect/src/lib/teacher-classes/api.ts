import { getConnectApiClient } from "@/lib/connect-api";
import type { ConnectApiClient } from "@/lib/api";
import { isApiAuthMode } from "@/auth/auth-mode";
import { isInstituteUuid } from "@/lib/institute-id";
import type { MeResponse } from "@/lib/api/me-types";

export type ClassDto = {
  id: string;
  instituteId: string;
  academicYearId: string;
  name: string;
  code: string;
  sortOrder: number;
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
};

export type SectionDto = {
  id: string;
  instituteId: string;
  academicYearId: string;
  classId: string;
  name: string;
  code: string;
  capacity: number | null;
  room: string | null;
  sortOrder: number;
  status: "active" | "inactive";
  classTeacherId?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TeacherAssignmentDto = {
  id: string;
  instituteId: string;
  academicYearId: string;
  classId: string;
  sectionId: string;
  subjectId: string;
  teacherId: string;
  status: "active" | "inactive";
};

export type EnrollmentDto = {
  id: string;
  instituteId: string;
  academicYearId: string;
  studentId: string;
  studentName: string;
  classId: string;
  sectionId: string;
  rollNo: string;
  status: "active" | "completed" | "transferred" | "dropped_out" | "graduated";
  enrolledOn: string;
  withdrawnOn: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SubjectDto = {
  id: string;
  instituteId: string;
  name: string;
  code: string;
  status: "active" | "draft";
};

function assertApiMode(): void {
  if (!isApiAuthMode()) {
    throw new Error("Teacher classes API is only available in API auth mode");
  }
}

/** Short TTL for catalog GETs reused by roster, diary, exams, homework on the same Home load. */
const CATALOG_TTL_MS = 45_000;
const catalogCache = new Map<string, { at: number; data: unknown }>();

function readCatalogCache<T>(key: string): T | null {
  const hit = catalogCache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > CATALOG_TTL_MS) {
    catalogCache.delete(key);
    return null;
  }
  return hit.data as T;
}

function writeCatalogCache(key: string, data: unknown): void {
  catalogCache.set(key, { at: Date.now(), data });
}

/** Cleared on logout / institute switch via clearTeacherPortalApiCache. */
export function clearTeacherCatalogCache(): void {
  catalogCache.clear();
}

export async function fetchMe(
  client: ConnectApiClient = getConnectApiClient(),
): Promise<MeResponse> {
  assertApiMode();
  const key = "me";
  const cached = readCatalogCache<MeResponse>(key);
  if (cached) return cached;
  const data = await client.get<MeResponse>("/api/v1/me");
  writeCatalogCache(key, data);
  return data;
}

export async function listTeacherAssignments(
  params: { instituteId: string; teacherId: string },
  client: ConnectApiClient = getConnectApiClient(),
): Promise<TeacherAssignmentDto[]> {
  assertApiMode();
  const key = `assignments:${params.instituteId.trim()}:${params.teacherId.trim()}`;
  const cached = readCatalogCache<TeacherAssignmentDto[]>(key);
  if (cached) return cached;
  const query = new URLSearchParams();
  query.set("institute_id", params.instituteId.trim());
  query.set("teacher_id", params.teacherId.trim());
  query.set("status", "active");
  const data = await client.get<TeacherAssignmentDto[]>(
    `/api/v1/timetable/assignments?${query.toString()}`,
  );
  writeCatalogCache(key, data);
  return data;
}

export async function listSections(
  instituteId: string,
  client: ConnectApiClient = getConnectApiClient(),
): Promise<SectionDto[]> {
  assertApiMode();
  const key = `sections:${instituteId.trim()}`;
  const cached = readCatalogCache<SectionDto[]>(key);
  if (cached) return cached;
  const query = new URLSearchParams();
  query.set("institute_id", instituteId.trim());
  const data = await client.get<SectionDto[]>(`/api/v1/sections?${query.toString()}`);
  writeCatalogCache(key, data);
  return data;
}

export async function listClasses(
  instituteId: string,
  client: ConnectApiClient = getConnectApiClient(),
): Promise<ClassDto[]> {
  assertApiMode();
  const key = `classes:${instituteId.trim()}`;
  const cached = readCatalogCache<ClassDto[]>(key);
  if (cached) return cached;
  const query = new URLSearchParams();
  query.set("institute_id", instituteId.trim());
  const data = await client.get<ClassDto[]>(`/api/v1/classes?${query.toString()}`);
  writeCatalogCache(key, data);
  return data;
}

export async function listSubjects(
  instituteId: string,
  client: ConnectApiClient = getConnectApiClient(),
): Promise<SubjectDto[]> {
  assertApiMode();
  const key = `subjects:${instituteId.trim()}`;
  const cached = readCatalogCache<SubjectDto[]>(key);
  if (cached) return cached;
  const query = new URLSearchParams();
  query.set("institute_id", instituteId.trim());
  const data = await client.get<SubjectDto[]>(`/api/v1/subjects?${query.toString()}`);
  writeCatalogCache(key, data);
  return data;
}

export async function listEnrollments(
  params: {
    instituteId: string;
    sectionId?: string;
    studentId?: string;
    status?: EnrollmentDto["status"];
  },
  client: ConnectApiClient = getConnectApiClient(),
): Promise<EnrollmentDto[]> {
  assertApiMode();
  const query = new URLSearchParams();
  query.set("institute_id", params.instituteId.trim());
  if (params.sectionId) query.set("section_id", params.sectionId.trim());
  if (params.studentId) query.set("student_id", params.studentId.trim());
  if (params.status) query.set("status", params.status);
  else if (params.sectionId && !params.studentId) query.set("status", "active");
  return client.get<EnrollmentDto[]>(`/api/v1/enrollments?${query.toString()}`);
}
