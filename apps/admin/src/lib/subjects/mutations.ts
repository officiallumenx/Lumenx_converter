/**
 * Subjects write API — create / update / delete. API auth mode only.
 */
import { getAdminApiClient } from "@/lib/admin-api";
import type { AdminApiClient } from "@/lib/api";
import { isApiAuthMode } from "@/auth/auth-mode";
import { isInstituteUuid } from "@/lib/active-institute";
import type { SubjectDto, SubjectStatus } from "./types";

function assertApiMode(): void {
  if (!isApiAuthMode()) {
    throw new Error("Subjects API is only available in API auth mode");
  }
}

export type CreateSubjectInput = {
  instituteId: string;
  name: string;
  code: string;
  category: string;
  periodsPerWeek: number;
  applicableClassCodes: string[];
  status?: SubjectStatus;
};

export type UpdateSubjectInput = {
  name?: string;
  code?: string;
  category?: string;
  periodsPerWeek?: number;
  applicableClassCodes?: string[];
  status?: SubjectStatus;
};

export async function createSubject(
  input: CreateSubjectInput,
  client: AdminApiClient = getAdminApiClient(),
): Promise<SubjectDto> {
  assertApiMode();
  if (!isInstituteUuid(input.instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }
  return client.post<SubjectDto>("/api/v1/subjects", {
    institute_id: input.instituteId.trim(),
    name: input.name.trim(),
    code: input.code.trim(),
    category: input.category.trim(),
    periods_per_week: input.periodsPerWeek,
    applicable_class_codes: input.applicableClassCodes,
    status: input.status,
  });
}

export async function updateSubject(
  subjectId: string,
  input: UpdateSubjectInput,
  client: AdminApiClient = getAdminApiClient(),
): Promise<SubjectDto> {
  assertApiMode();
  if (!isInstituteUuid(subjectId)) {
    throw new Error("subject_id must be a valid UUID");
  }
  const body: Record<string, unknown> = {};
  if (input.name !== undefined) body.name = input.name.trim();
  if (input.code !== undefined) body.code = input.code.trim();
  if (input.category !== undefined) body.category = input.category.trim();
  if (input.periodsPerWeek !== undefined) {
    body.periods_per_week = input.periodsPerWeek;
  }
  if (input.applicableClassCodes !== undefined) {
    body.applicable_class_codes = input.applicableClassCodes;
  }
  if (input.status !== undefined) body.status = input.status;
  if (Object.keys(body).length === 0) {
    throw new Error("At least one field is required");
  }
  return client.patch<SubjectDto>(`/api/v1/subjects/${subjectId.trim()}`, body);
}

export async function deleteSubject(
  subjectId: string,
  client: AdminApiClient = getAdminApiClient(),
): Promise<void> {
  assertApiMode();
  if (!isInstituteUuid(subjectId)) {
    throw new Error("subject_id must be a valid UUID");
  }
  await client.delete(`/api/v1/subjects/${subjectId.trim()}`);
}
