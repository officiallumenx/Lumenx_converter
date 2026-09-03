/**
 * Careers → teacher convert — API auth mode only.
 */
import { getAdminApiClient } from "@/lib/admin-api";
import type { AdminApiClient } from "@/lib/api";
import { isApiAuthMode } from "@/auth/auth-mode";
import type { CareerConvertDraft } from "@/lib/career-to-teacher";
import { roleToTeachingScope } from "@/lib/teachers/map";

function assertApiMode(): void {
  if (!isApiAuthMode()) {
    throw new Error("Careers convert API is only available in API auth mode");
  }
}

export type ConvertCareerResult = {
  applicationId: string;
  teacherId: string;
};

export async function convertCareerApplicationToTeacher(
  applicationId: string,
  draft: CareerConvertDraft,
  client: AdminApiClient = getAdminApiClient(),
): Promise<ConvertCareerResult> {
  assertApiMode();

  const body = {
    display_name: draft.name.trim(),
    department: draft.dept.trim(),
    teaching_scope: roleToTeachingScope(draft.role),
    portal_access_level: "faculty_grading" as const,
    status: draft.createConnectAccount ? ("pending" as const) : ("active" as const),
    phone: draft.phone.trim() || null,
    email: draft.email.trim().toLowerCase() || null,
    qualification: draft.qualification.trim() || null,
    date_of_birth: draft.dateOfBirth.trim() || null,
    employee_id: draft.employeeId.trim() || null,
  };

  const result = await client.post<{
    application: { id: string };
    teacher: { id: string };
  }>(
    `/api/v1/careers/applications/${applicationId.trim()}/convert-to-teacher`,
    body,
  );

  return {
    applicationId,
    teacherId: result.teacher.id,
  };
}
