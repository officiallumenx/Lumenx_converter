/**
 * Academic enrollments API repository — API auth mode only.
 * Used by student attendance create/mark (roster from real enrollments).
 */
import { getAdminApiClient } from "@/lib/admin-api";
import type { AdminApiClient } from "@/lib/api";
import { isApiAuthMode } from "@/auth/auth-mode";
import { isInstituteUuid } from "@/lib/active-institute";
import type {
  CreateEnrollmentInput,
  EnrollmentDto,
  ListEnrollmentsParams,
} from "./types";

function assertApiMode(): void {
  if (!isApiAuthMode()) {
    throw new Error("Enrollments API is only available in API auth mode");
  }
}

export { assertApiMode };

function buildQuery(params: ListEnrollmentsParams): string {
  const query = new URLSearchParams();
  query.set("institute_id", params.instituteId.trim());
  if (params.academicYearId) query.set("academic_year_id", params.academicYearId.trim());
  if (params.classId) query.set("class_id", params.classId.trim());
  if (params.sectionId) query.set("section_id", params.sectionId.trim());
  if (params.studentId) query.set("student_id", params.studentId.trim());
  if (params.status) query.set("status", params.status);
  return query.toString();
}

export async function listEnrollments(
  params: ListEnrollmentsParams,
  client: AdminApiClient = getAdminApiClient(),
): Promise<EnrollmentDto[]> {
  assertApiMode();
  if (!isInstituteUuid(params.instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }
  if (params.sectionId && !isInstituteUuid(params.sectionId)) {
    throw new Error("section_id must be a valid UUID");
  }
  if (params.classId && !isInstituteUuid(params.classId)) {
    throw new Error("class_id must be a valid UUID");
  }
  if (params.academicYearId && !isInstituteUuid(params.academicYearId)) {
    throw new Error("academic_year_id must be a valid UUID");
  }
  if (params.studentId && !isInstituteUuid(params.studentId)) {
    throw new Error("student_id must be a valid UUID");
  }
  return client.get<EnrollmentDto[]>(`/api/v1/enrollments?${buildQuery(params)}`);
}

export async function getEnrollment(
  enrollmentId: string,
  client: AdminApiClient = getAdminApiClient(),
): Promise<EnrollmentDto> {
  assertApiMode();
  if (!isInstituteUuid(enrollmentId)) {
    throw new Error("enrollment_id must be a valid UUID");
  }
  return client.get<EnrollmentDto>(`/api/v1/enrollments/${enrollmentId.trim()}`);
}

export async function createEnrollment(
  input: CreateEnrollmentInput,
  client: AdminApiClient = getAdminApiClient(),
): Promise<EnrollmentDto> {
  assertApiMode();
  if (!isInstituteUuid(input.instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }
  if (!isInstituteUuid(input.academicYearId)) {
    throw new Error("academic_year_id must be a valid UUID");
  }
  if (!isInstituteUuid(input.studentId)) {
    throw new Error("student_id must be a valid UUID");
  }
  if (!isInstituteUuid(input.classId)) {
    throw new Error("class_id must be a valid UUID");
  }
  if (!isInstituteUuid(input.sectionId)) {
    throw new Error("section_id must be a valid UUID");
  }
  return client.post<EnrollmentDto>("/api/v1/enrollments", {
    institute_id: input.instituteId.trim(),
    academic_year_id: input.academicYearId.trim(),
    student_id: input.studentId.trim(),
    class_id: input.classId.trim(),
    section_id: input.sectionId.trim(),
    roll_no: input.rollNo,
    enrolled_on: input.enrolledOn,
    status: input.status,
  });
}
