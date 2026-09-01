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

export async function fetchMe(
  client: ConnectApiClient = getConnectApiClient(),
): Promise<MeResponse> {
  assertApiMode();
  return client.get<MeResponse>("/api/v1/me");
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

export async function listSubjects(
  instituteId: string,
  client: ConnectApiClient = getConnectApiClient(),
): Promise<SubjectDto[]> {
  assertApiMode();
  const query = new URLSearchParams();
  query.set("institute_id", instituteId.trim());
  return client.get<SubjectDto[]>(`/api/v1/subjects?${query.toString()}`);
}

export async function listEnrollments(
  params: { instituteId: string; sectionId: string },
  client: ConnectApiClient = getConnectApiClient(),
): Promise<EnrollmentDto[]> {
  assertApiMode();
  const query = new URLSearchParams();
  query.set("institute_id", params.instituteId.trim());
  query.set("section_id", params.sectionId.trim());
  query.set("status", "active");
  return client.get<EnrollmentDto[]>(`/api/v1/enrollments?${query.toString()}`);
}
