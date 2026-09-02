/**
 * Admissions → student + optional parent convert — API auth mode only.
 */
import { getAdminApiClient } from "@/lib/admin-api";
import type { AdminApiClient } from "@/lib/api";
import { isApiAuthMode } from "@/auth/auth-mode";
import type { AdmissionConvertDraft } from "@/lib/admission-to-student";
import type { GuardianRelationship } from "@/lib/parents/types";
import type { StudentGender } from "@/lib/students/types";

function assertApiMode(): void {
  if (!isApiAuthMode()) {
    throw new Error("Admissions convert API is only available in API auth mode");
  }
}

function relationshipToApi(
  label: AdmissionConvertDraft["parentRelationship"],
): GuardianRelationship {
  if (label === "Mother") return "mother";
  if (label === "Father") return "father";
  return "guardian";
}

function genderToApi(gender: string): StudentGender {
  const normalized = gender.trim().toLowerCase();
  if (normalized === "female") return "female";
  if (normalized === "male") return "male";
  if (normalized === "other") return "other";
  return "prefer_not_to_say";
}

export type ConvertAdmissionResult = {
  applicationId: string;
  studentId: string;
  parentId?: string;
};

export async function convertAdmissionApplicationToStudent(
  applicationId: string,
  draft: AdmissionConvertDraft,
  client: AdminApiClient = getAdminApiClient(),
): Promise<ConvertAdmissionResult> {
  assertApiMode();

  const body = {
    first_name: draft.student.firstName.trim(),
    surname: draft.student.surname.trim(),
    gender: genderToApi(draft.student.gender),
    address: draft.student.address.trim(),
    date_of_birth: draft.student.dateOfBirth?.trim() || null,
    class_label: draft.student.className.trim(),
    section_label: draft.student.section.trim(),
    roll_no: draft.student.rollNo?.trim() || null,
    admission_number: draft.student.admissionNumber?.trim() || null,
    blood_group: null,
    parent_name: draft.student.parentName.trim(),
    parent_phone: draft.student.parentPhone.trim(),
    parent_email: draft.parentEmail.trim().toLowerCase() || null,
    parent_relationship: relationshipToApi(draft.parentRelationship),
    create_parent_account: draft.createParentAccount,
  };

  const result = await client.post<{
    application: { id: string };
    studentId: string;
    parentId?: string;
  }>(`/api/v1/admissions/applications/${applicationId.trim()}/convert-to-student`, body);

  return {
    applicationId,
    studentId: result.studentId,
    parentId: result.parentId,
  };
}
