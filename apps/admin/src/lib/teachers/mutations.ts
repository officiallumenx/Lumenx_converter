/**
 * Teachers write API — create / update / delete. API auth mode only.
 */
import { getAdminApiClient } from "@/lib/admin-api";
import type { AdminApiClient } from "@/lib/api";
import { isApiAuthMode } from "@/auth/auth-mode";
import { isInstituteUuid } from "@/lib/active-institute";
import { normalizeDateOnlyInput } from "@/lib/date-only";
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
  /** Subject × section placement links created with the teacher. */
  assignments?: Array<{ sectionId: string; subjectId: string }>;
  /** Sections where this teacher is the class (homeroom) teacher. */
  classTeacherSectionIds?: string[];
};

export type CreateTeacherResult = TeacherDto & {
  assignmentIds?: string[];
  classTeacherSectionIds?: string[];
};

export type UpdateTeacherInput = Partial<
  Omit<CreateTeacherInput, "instituteId" | "userProfileId" | "assignments">
> & {
  /** When set, replaces class-teacher section links (pass [] to clear). */
  classTeacherSectionIds?: string[];
};

function normalizePhoneDigits(value: string | null | undefined): string | null {
  const digits = (value ?? "").replace(/\D/g, "");
  return digits.length >= 10 ? digits.slice(-10) : null;
}

function optionalTrimmed(
  value: string | null | undefined,
): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed ? trimmed : null;
}

function optionalStringArray(
  value: string[] | null | undefined,
): string[] | null {
  if (value == null) return null;
  const cleaned = value.map((item) => item.trim()).filter(Boolean);
  return cleaned.length > 0 ? cleaned : null;
}

function optionalDateField(
  value: string | null | undefined,
  field: string,
): string | null {
  if (value == null || !String(value).trim()) return null;
  const normalized = normalizeDateOnlyInput(value);
  if (!normalized) {
    throw new Error(`${field} must be YYYY-MM-DD (got "${String(value).trim()}")`);
  }
  return normalized;
}

function toCreateBody(input: CreateTeacherInput): Record<string, unknown> {
  const phone = normalizePhoneDigits(input.phone);
  if (!phone) {
    throw new Error("A valid 10-digit mobile number is required");
  }

  const email = optionalTrimmed(input.email);
  const body: Record<string, unknown> = {
    institute_id: input.instituteId.trim(),
    display_name: input.displayName.trim(),
    department: input.department.trim(),
    teaching_scope: input.teachingScope,
    portal_access_level: input.portalAccessLevel,
    phone,
  };

  if (input.status) body.status = input.status;
  if (email) body.email = email;
  const qualification = optionalTrimmed(input.qualification);
  if (qualification) body.qualification = qualification;

  const dateOfBirth = optionalDateField(input.dateOfBirth, "date_of_birth");
  if (dateOfBirth) body.date_of_birth = dateOfBirth;
  const joinedOn = optionalDateField(input.joinedOn, "joined_on");
  if (joinedOn) body.joined_on = joinedOn;

  const employeeId = optionalTrimmed(input.employeeId);
  if (employeeId) body.employee_id = employeeId;
  const legacyCode = optionalTrimmed(input.legacyCode);
  if (legacyCode) body.legacy_code = legacyCode;

  const subjects = optionalStringArray(input.subjects);
  if (subjects) body.subjects = subjects;
  const labels = optionalStringArray(input.assignedSectionLabels);
  if (labels) body.assigned_section_labels = labels;

  if (input.userProfileId) body.user_profile_id = input.userProfileId;

  if (input.assignments && input.assignments.length > 0) {
    body.assignments = input.assignments.map((item) => ({
      section_id: item.sectionId,
      subject_id: item.subjectId,
    }));
  }
  if (input.classTeacherSectionIds && input.classTeacherSectionIds.length > 0) {
    body.class_teacher_section_ids = input.classTeacherSectionIds;
  }
  return body;
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
  if (input.phone !== undefined) {
    const phone = normalizePhoneDigits(input.phone);
    body.phone = phone;
  }
  if (input.email !== undefined) body.email = optionalTrimmed(input.email);
  if (input.qualification !== undefined) {
    body.qualification = optionalTrimmed(input.qualification);
  }
  if (input.dateOfBirth !== undefined) {
    body.date_of_birth = optionalDateField(input.dateOfBirth, "date_of_birth");
  }
  if (input.joinedOn !== undefined) {
    body.joined_on = optionalDateField(input.joinedOn, "joined_on");
  }
  if (input.employeeId !== undefined) {
    body.employee_id = optionalTrimmed(input.employeeId);
  }
  if (input.legacyCode !== undefined) {
    body.legacy_code = optionalTrimmed(input.legacyCode);
  }
  if (input.subjects !== undefined) body.subjects = optionalStringArray(input.subjects);
  if (input.assignedSectionLabels !== undefined) {
    body.assigned_section_labels = optionalStringArray(input.assignedSectionLabels);
  }
  if (input.classTeacherSectionIds !== undefined) {
    body.class_teacher_section_ids = input.classTeacherSectionIds;
  }
  return body;
}

export async function createTeacher(
  input: CreateTeacherInput,
  client: AdminApiClient = getAdminApiClient(),
): Promise<CreateTeacherResult> {
  assertApiMode();
  if (!isInstituteUuid(input.instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }
  return client.post<CreateTeacherResult>("/api/v1/teachers", toCreateBody(input));
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

export type ResetTeacherCredentialsResult = {
  ok: true;
  pinCleared: boolean;
  email: string | null;
  delivery: "demo" | "email" | "pin_only";
  recoveryLink: string | null;
};

export async function resetTeacherCredentials(
  teacherId: string,
  client: AdminApiClient = getAdminApiClient(),
): Promise<ResetTeacherCredentialsResult> {
  assertApiMode();
  if (!isInstituteUuid(teacherId)) {
    throw new Error("teacher_id must be a valid UUID");
  }
  return client.post<ResetTeacherCredentialsResult>(
    `/api/v1/teachers/${teacherId.trim()}/reset-credentials`,
    {},
  );
}
