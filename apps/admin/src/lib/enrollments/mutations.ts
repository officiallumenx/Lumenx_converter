/**
 * Academic enrollments write API — create / update. API auth mode only.
 */
import { getAdminApiClient } from "@/lib/admin-api";
import type { AdminApiClient } from "@/lib/api";
import { isApiAuthMode } from "@/auth/auth-mode";
import { isInstituteUuid } from "@/lib/active-institute";
import type {
  CreateEnrollmentInput,
  EnrollmentDto,
  EnrollmentStatus,
  UpdateEnrollmentInput,
} from "./types";

function assertApiMode(): void {
  if (!isApiAuthMode()) {
    throw new Error("Enrollments API is only available in API auth mode");
  }
}

export type { CreateEnrollmentInput, UpdateEnrollmentInput };

export async function createEnrollmentRecord(
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

export async function updateEnrollmentRecord(
  enrollmentId: string,
  patch: UpdateEnrollmentInput,
  client: AdminApiClient = getAdminApiClient(),
): Promise<EnrollmentDto> {
  assertApiMode();
  if (!isInstituteUuid(enrollmentId)) {
    throw new Error("enrollment_id must be a valid UUID");
  }
  const body: Record<string, unknown> = {};
  if (patch.rollNo !== undefined) body.roll_no = patch.rollNo;
  if (patch.status !== undefined) body.status = patch.status;
  if (patch.classId !== undefined) body.class_id = patch.classId.trim();
  if (patch.sectionId !== undefined) body.section_id = patch.sectionId.trim();
  if (patch.withdrawnOn !== undefined) body.withdrawn_on = patch.withdrawnOn;
  return client.patch<EnrollmentDto>(
    `/api/v1/enrollments/${enrollmentId.trim()}`,
    body,
  );
}

export function enrollmentStatusLabel(status: EnrollmentStatus): string {
  switch (status) {
    case "active":
      return "Active";
    case "completed":
      return "Completed";
    case "transferred":
      return "Transferred";
    case "dropped_out":
      return "Dropped out";
    case "graduated":
      return "Graduated";
    default:
      return status;
  }
}
