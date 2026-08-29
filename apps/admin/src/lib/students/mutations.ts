/**
 * Students write API — create / update / delete. API auth mode only.
 */
import { getAdminApiClient } from "@/lib/admin-api";
import type { AdminApiClient } from "@/lib/api";
import { isApiAuthMode } from "@/auth/auth-mode";
import { isInstituteUuid } from "@/lib/active-institute";
import type {
  StudentAccessStatus,
  StudentDto,
  StudentGender,
  StudentStatus,
} from "./types";

function assertApiMode(): void {
  if (!isApiAuthMode()) {
    throw new Error("Students API is only available in API auth mode");
  }
}

export type CreateStudentInput = {
  instituteId: string;
  firstName: string;
  surname: string;
  displayName?: string;
  gender: StudentGender;
  address: string;
  dateOfBirth?: string | null;
  classLabel?: string | null;
  sectionLabel?: string | null;
  rollNo?: string | null;
  status?: StudentStatus;
  accessStatus?: StudentAccessStatus;
  bloodGroup?: string | null;
  emergencyContact?: string | null;
  house?: string | null;
  admissionNumber?: string | null;
  legacyCode?: string | null;
};

export type UpdateStudentInput = Partial<
  Omit<CreateStudentInput, "instituteId">
>;

function toCreateBody(input: CreateStudentInput): Record<string, unknown> {
  return {
    institute_id: input.instituteId.trim(),
    first_name: input.firstName.trim(),
    surname: input.surname.trim(),
    display_name: input.displayName?.trim() || undefined,
    gender: input.gender,
    address: input.address.trim(),
    date_of_birth: input.dateOfBirth ?? null,
    class_label: input.classLabel ?? null,
    section_label: input.sectionLabel ?? null,
    roll_no: input.rollNo ?? null,
    status: input.status,
    access_status: input.accessStatus,
    blood_group: input.bloodGroup ?? null,
    emergency_contact: input.emergencyContact ?? null,
    house: input.house ?? null,
    admission_number: input.admissionNumber ?? null,
    legacy_code: input.legacyCode ?? null,
  };
}

function toUpdateBody(input: UpdateStudentInput): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  if (input.firstName !== undefined) body.first_name = input.firstName.trim();
  if (input.surname !== undefined) body.surname = input.surname.trim();
  if (input.displayName !== undefined) body.display_name = input.displayName.trim();
  if (input.gender !== undefined) body.gender = input.gender;
  if (input.address !== undefined) body.address = input.address.trim();
  if (input.dateOfBirth !== undefined) body.date_of_birth = input.dateOfBirth;
  if (input.classLabel !== undefined) body.class_label = input.classLabel;
  if (input.sectionLabel !== undefined) body.section_label = input.sectionLabel;
  if (input.rollNo !== undefined) body.roll_no = input.rollNo;
  if (input.status !== undefined) body.status = input.status;
  if (input.accessStatus !== undefined) body.access_status = input.accessStatus;
  if (input.bloodGroup !== undefined) body.blood_group = input.bloodGroup;
  if (input.emergencyContact !== undefined) {
    body.emergency_contact = input.emergencyContact;
  }
  if (input.house !== undefined) body.house = input.house;
  if (input.admissionNumber !== undefined) {
    body.admission_number = input.admissionNumber;
  }
  if (input.legacyCode !== undefined) body.legacy_code = input.legacyCode;
  return body;
}

export async function createStudent(
  input: CreateStudentInput,
  client: AdminApiClient = getAdminApiClient(),
): Promise<StudentDto> {
  assertApiMode();
  if (!isInstituteUuid(input.instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }
  return client.post<StudentDto>("/api/v1/students", toCreateBody(input));
}

export async function updateStudent(
  studentId: string,
  input: UpdateStudentInput,
  client: AdminApiClient = getAdminApiClient(),
): Promise<StudentDto> {
  assertApiMode();
  if (!isInstituteUuid(studentId)) {
    throw new Error("student_id must be a valid UUID");
  }
  const body = toUpdateBody(input);
  if (Object.keys(body).length === 0) {
    throw new Error("At least one field is required");
  }
  return client.patch<StudentDto>(
    `/api/v1/students/${studentId.trim()}`,
    body,
  );
}

export async function deleteStudent(
  studentId: string,
  client: AdminApiClient = getAdminApiClient(),
): Promise<void> {
  assertApiMode();
  if (!isInstituteUuid(studentId)) {
    throw new Error("student_id must be a valid UUID");
  }
  await client.delete(`/api/v1/students/${studentId.trim()}`);
}
