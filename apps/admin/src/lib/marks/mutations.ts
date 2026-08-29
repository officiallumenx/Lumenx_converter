/**
 * Marks write API — entry CRUD + submit / publish / return / reject. API auth mode only.
 */
import { getAdminApiClient } from "@/lib/admin-api";
import type { AdminApiClient } from "@/lib/api";
import { isApiAuthMode } from "@/auth/auth-mode";
import { isInstituteUuid } from "@/lib/active-institute";
import type { MarkEntryDto } from "./types";

function assertApiMode(): void {
  if (!isApiAuthMode()) {
    throw new Error("Marks API is only available in API auth mode");
  }
}

export type MarkScoreInput = {
  enrollmentId: string;
  marks: number | null;
};

export type CreateMarkEntryInput = {
  instituteId: string;
  academicYearId: string;
  classId: string;
  sectionId: string;
  examId: string;
  subjectId: string;
  teacherId?: string;
  maxMarks: number;
  scores?: MarkScoreInput[];
};

export type UpdateMarkEntryInput = {
  maxMarks?: number;
  scores?: MarkScoreInput[];
  adminNote?: string | null;
};

export async function createMarkEntry(
  input: CreateMarkEntryInput,
  client: AdminApiClient = getAdminApiClient(),
): Promise<MarkEntryDto> {
  assertApiMode();
  if (!isInstituteUuid(input.instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }
  if (!isInstituteUuid(input.academicYearId)) {
    throw new Error("academic_year_id must be a valid UUID");
  }
  if (!isInstituteUuid(input.classId)) {
    throw new Error("class_id must be a valid UUID");
  }
  if (!isInstituteUuid(input.sectionId)) {
    throw new Error("section_id must be a valid UUID");
  }
  if (!isInstituteUuid(input.examId)) {
    throw new Error("exam_id must be a valid UUID");
  }
  if (!isInstituteUuid(input.subjectId)) {
    throw new Error("subject_id must be a valid UUID");
  }
  return client.post<MarkEntryDto>("/api/v1/marks/entries", {
    institute_id: input.instituteId.trim(),
    academic_year_id: input.academicYearId.trim(),
    class_id: input.classId.trim(),
    section_id: input.sectionId.trim(),
    exam_id: input.examId.trim(),
    subject_id: input.subjectId.trim(),
    teacher_id: input.teacherId?.trim(),
    max_marks: input.maxMarks,
    scores: input.scores?.map((s) => ({
      enrollment_id: s.enrollmentId.trim(),
      marks: s.marks,
    })),
  });
}

export async function updateMarkEntry(
  entryId: string,
  input: UpdateMarkEntryInput,
  client: AdminApiClient = getAdminApiClient(),
): Promise<MarkEntryDto> {
  assertApiMode();
  if (!isInstituteUuid(entryId)) {
    throw new Error("entry_id must be a valid UUID");
  }
  const body: Record<string, unknown> = {};
  if (input.maxMarks !== undefined) body.max_marks = input.maxMarks;
  if (input.adminNote !== undefined) body.admin_note = input.adminNote;
  if (input.scores !== undefined) {
    body.scores = input.scores.map((s) => ({
      enrollment_id: s.enrollmentId.trim(),
      marks: s.marks,
    }));
  }
  if (Object.keys(body).length === 0) {
    throw new Error("At least one field is required");
  }
  return client.patch<MarkEntryDto>(
    `/api/v1/marks/entries/${entryId.trim()}`,
    body,
  );
}

export async function submitMarkEntry(
  entryId: string,
  client: AdminApiClient = getAdminApiClient(),
): Promise<MarkEntryDto> {
  assertApiMode();
  if (!isInstituteUuid(entryId)) {
    throw new Error("entry_id must be a valid UUID");
  }
  return client.post<MarkEntryDto>(
    `/api/v1/marks/entries/${entryId.trim()}/submit`,
  );
}

export async function publishMarkEntry(
  entryId: string,
  client: AdminApiClient = getAdminApiClient(),
): Promise<MarkEntryDto> {
  assertApiMode();
  if (!isInstituteUuid(entryId)) {
    throw new Error("entry_id must be a valid UUID");
  }
  return client.post<MarkEntryDto>(
    `/api/v1/marks/entries/${entryId.trim()}/publish`,
  );
}

export async function returnMarkEntry(
  entryId: string,
  input: { adminNote?: string | null } = {},
  client: AdminApiClient = getAdminApiClient(),
): Promise<MarkEntryDto> {
  assertApiMode();
  if (!isInstituteUuid(entryId)) {
    throw new Error("entry_id must be a valid UUID");
  }
  return client.post<MarkEntryDto>(
    `/api/v1/marks/entries/${entryId.trim()}/return`,
    { admin_note: input.adminNote },
  );
}

export async function rejectMarkEntry(
  entryId: string,
  input: { adminNote?: string | null } = {},
  client: AdminApiClient = getAdminApiClient(),
): Promise<MarkEntryDto> {
  assertApiMode();
  if (!isInstituteUuid(entryId)) {
    throw new Error("entry_id must be a valid UUID");
  }
  return client.post<MarkEntryDto>(
    `/api/v1/marks/entries/${entryId.trim()}/reject`,
    { admin_note: input.adminNote },
  );
}

export async function deleteMarkEntry(
  entryId: string,
  client: AdminApiClient = getAdminApiClient(),
): Promise<void> {
  assertApiMode();
  if (!isInstituteUuid(entryId)) {
    throw new Error("entry_id must be a valid UUID");
  }
  await client.delete(`/api/v1/marks/entries/${entryId.trim()}`);
}
