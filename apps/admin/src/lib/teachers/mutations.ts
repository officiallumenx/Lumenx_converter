/**
 * Teachers write API — create / update / delete. API auth mode only.
 */
import { getAdminApiClient } from "@/lib/admin-api";
import type { AdminApiClient } from "@/lib/api";
import { isApiAuthMode } from "@/auth/auth-mode";
import { isInstituteUuid } from "@/lib/active-institute";
import type {
  ApiTeacherStatus,
  PortalAccessLevel,
  TeacherDto,
  TeachingScope,
} from "./types";

function assertApiMode(): void {
  if (!isApiAuthMode()) {
    throw new Error("Teachers API is only available in API auth mode");
  }
}

export type CreateTeacherInput = {
  instituteId: string;
  displayName: string;
  department: string;
  teachingScope: TeachingScope;
  portalAccessLevel: PortalAccessLevel;
  status?: ApiTeacherStatus;
  phone?: string | null;
  email?: string | null;
  qualification?: string | null;
  dateOfBirth?: string | null;
  joinedOn?: string | null;
  employeeId?: string | null;
  legacyCode?: string | null;
  subjects?: string[] | null;
  assignedSectionLabels?: string[] | null;
  userProfileId?: string | null;
};

export type UpdateTeacherInput = Partial<
  Omit<CreateTeacherInput, "instituteId" | "userProfileId">
>;

function toCreateBody(input: CreateTeacherInput): Record<string, unknown> {
  return {
    institute_id: input.instituteId.trim(),
    display_name: input.displayName.trim(),
    department: input.department.trim(),
    teaching_scope: input.teachingScope,
    portal_access_level: input.portalAccessLevel,
    status: input.status,
    phone: input.phone?.trim() || null,
    email: input.email?.trim() || null,
    qualification: input.qualification?.trim() || null,
    date_of_birth: input.dateOfBirth ?? null,
    joined_on: input.joinedOn ?? null,
    employee_id: input.employeeId ?? null,
    legacy_code: input.legacyCode ?? null,
    subjects: input.subjects ?? null,
    assigned_section_labels: input.assignedSectionLabels ?? null,
    user_profile_id: input.userProfileId ?? null,
  };
}

function toUpdateBody(input: UpdateTeacherInput): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  if (input.displayName !== undefined) {
    body.display_name = input.displayName.trim();
  }
  if (input.department !== undefined) body.department = input.department.trim();
  if (input.teachingScope !== undefined) body.teaching_scope = input.teachingScope;
  if (input.portalAccessLevel !== undefined) {
    body.portal_access_level = input.portalAccessLevel;
  }
  if (input.status !== undefined) body.status = input.status;
  if (input.phone !== undefined) body.phone = input.phone?.trim() || null;
  if (input.email !== undefined) body.email = input.email?.trim() || null;
  if (input.qualification !== undefined) {
    body.qualification = input.qualification?.trim() || null;
  }
  if (input.dateOfBirth !== undefined) body.date_of_birth = input.dateOfBirth;
  if (input.joinedOn !== undefined) body.joined_on = input.joinedOn;
  if (input.employeeId !== undefined) body.employee_id = input.employeeId;
  if (input.legacyCode !== undefined) body.legacy_code = input.legacyCode;
  if (input.subjects !== undefined) body.subjects = input.subjects;
  if (input.assignedSectionLabels !== undefined) {
    body.assigned_section_labels = input.assignedSectionLabels;
  }
  return body;
}

export async function createTeacher(
  input: CreateTeacherInput,
  client: AdminApiClient = getAdminApiClient(),
): Promise<TeacherDto> {
  assertApiMode();
  if (!isInstituteUuid(input.instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }
  return client.post<TeacherDto>("/api/v1/teachers", toCreateBody(input));
}

export async function updateTeacher(
  teacherId: string,
  input: UpdateTeacherInput,
  client: AdminApiClient = getAdminApiClient(),
): Promise<TeacherDto> {
  assertApiMode();
  if (!isInstituteUuid(teacherId)) {
    throw new Error("teacher_id must be a valid UUID");
  }
  const body = toUpdateBody(input);
  if (Object.keys(body).length === 0) {
    throw new Error("At least one field is required");
  }
  return client.patch<TeacherDto>(
    `/api/v1/teachers/${teacherId.trim()}`,
    body,
  );
}

export async function deleteTeacher(
  teacherId: string,
  client: AdminApiClient = getAdminApiClient(),
): Promise<void> {
  assertApiMode();
  if (!isInstituteUuid(teacherId)) {
    throw new Error("teacher_id must be a valid UUID");
  }
  await client.delete(`/api/v1/teachers/${teacherId.trim()}`);
}
