/**
 * Batch promote / graduate enrollments — API auth mode.
 */
import { getAdminApiClient } from "@/lib/admin-api";
import type { AdminApiClient } from "@/lib/api";
import { isApiAuthMode } from "@/auth/auth-mode";
import { isInstituteUuid } from "@/lib/active-institute";
import type { EnrollmentDto } from "./types";

export type EnrollmentPromoteAction =
  | "promote"
  | "repeat"
  | "hold"
  | "transfer"
  | "dropout"
  | "graduate";

export type PromoteEnrollmentItemInput = {
  enrollmentId: string;
  targetClassId?: string;
  targetSectionId?: string;
  rollNo?: string;
  action: EnrollmentPromoteAction;
};

export type PromoteEnrollmentsInput = {
  instituteId: string;
  sourceAcademicYearId: string;
  targetAcademicYearId: string;
  items: PromoteEnrollmentItemInput[];
};

export type PromoteEnrollmentResultItem = {
  enrollmentId: string;
  action: EnrollmentPromoteAction;
  sourceEnrollment: EnrollmentDto;
  targetEnrollment: EnrollmentDto | null;
};

export type GraduateEnrollmentsInput = {
  instituteId: string;
  academicYearId: string;
  enrollmentIds: string[];
};

function assertApiMode(): void {
  if (!isApiAuthMode()) {
    throw new Error("Enrollment promote API is only available in API auth mode");
  }
}

export async function promoteEnrollments(
  input: PromoteEnrollmentsInput,
  client: AdminApiClient = getAdminApiClient(),
): Promise<PromoteEnrollmentResultItem[]> {
  assertApiMode();
  if (!isInstituteUuid(input.instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }
  const data = await client.post<{ items: PromoteEnrollmentResultItem[] }>(
    "/api/v1/enrollments/promote",
    {
      institute_id: input.instituteId.trim(),
      source_academic_year_id: input.sourceAcademicYearId.trim(),
      target_academic_year_id: input.targetAcademicYearId.trim(),
      items: input.items.map((item) => ({
        enrollment_id: item.enrollmentId,
        target_class_id: item.targetClassId,
        target_section_id: item.targetSectionId,
        roll_no: item.rollNo,
        action: item.action,
      })),
    },
  );
  return data.items ?? [];
}

export async function graduateEnrollments(
  input: GraduateEnrollmentsInput,
  client: AdminApiClient = getAdminApiClient(),
): Promise<EnrollmentDto[]> {
  assertApiMode();
  if (!isInstituteUuid(input.instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }
  return client.post<EnrollmentDto[]>("/api/v1/enrollments/graduate", {
    institute_id: input.instituteId.trim(),
    academic_year_id: input.academicYearId.trim(),
    enrollment_ids: input.enrollmentIds,
  });
}
