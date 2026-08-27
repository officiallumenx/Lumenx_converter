import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "../../errors/app-error.js";
import type { Actor } from "../../auth/types.js";
import {
  assertInstituteAccess,
  requireInstituteId,
  requireTeacherIdentity,
  actorHasInstituteRole,
} from "../../authorization/index.js";
import {
  findAcademicYearById,
  findDiaryDayById,
  findSectionById,
  insertDiaryDay,
  listActiveTeacherAssignmentsForSections,
  listDiaryDays,
  listRowsForDay,
  listRowsForDayIds,
  replaceDiaryRows,
  softDeleteDiaryDay,
  updateDiaryDayFields,
} from "./repository.js";
import type {
  CreateDiaryDayInput,
  DiaryDayDto,
  DiaryDayRecord,
  DiaryDayRowDto,
  DiaryDayRowInput,
  DiaryDayRowRecord,
  ListDiaryFilter,
  UpdateDiaryDayInput,
} from "./types.js";

/** Governance: soft-delete only (Admin view-only for content). */
export const DIARY_STAFF_GOVERNANCE_ROLES = [
  "institute_admin",
  "principal",
  "vice_principal",
  "coordinator",
] as const;

/**
 * Full institute readers (all teachers' diary days, including unsubmitted).
 * Pure `teacher` excluded — teachers see own days only.
 */
export const DIARY_FULL_READ_ROLES = [
  "institute_admin",
  "principal",
  "vice_principal",
  "coordinator",
  "accountant",
  "admissions_officer",
  "it_admin",
  "staff",
] as const;

export function toRowDto(row: DiaryDayRowRecord): DiaryDayRowDto {
  return {
    id: row.id,
    sectionId: row.section_id,
    classLabel: row.class_label,
    description: row.description,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toDayDto(
  day: DiaryDayRecord,
  rows: DiaryDayRowRecord[],
): DiaryDayDto {
  return {
    id: day.id,
    instituteId: day.institute_id,
    academicYearId: day.academic_year_id,
    teacherId: day.teacher_id,
    diaryDate: day.diary_date,
    scope: day.scope,
    submittedAt: day.submitted_at,
    createdAt: day.created_at,
    updatedAt: day.updated_at,
    rows: rows.map(toRowDto),
  };
}

function isGovernanceWriter(actor: Actor, instituteId: string): boolean {
  if (actor.isPlatformOperator) return false;
  return DIARY_STAFF_GOVERNANCE_ROLES.some((role) =>
    actorHasInstituteRole(actor, instituteId, role),
  );
}

function isFullInstituteReader(actor: Actor, instituteId: string): boolean {
  if (actor.isPlatformOperator) return true;
  const membership = actor.memberships.find((m) => m.instituteId === instituteId);
  if (!membership) return false;
  return DIARY_FULL_READ_ROLES.some((role) => membership.roles.includes(role));
}

async function assertTeacherOwner(
  actor: Actor,
  day: DiaryDayRecord,
): Promise<void> {
  if (!actorHasInstituteRole(actor, day.institute_id, "teacher")) {
    throw AppError.forbidden("Insufficient institute role");
  }
  const identity = requireTeacherIdentity(actor, day.institute_id);
  if (identity.teacherId !== day.teacher_id) {
    throw AppError.forbidden("Cannot modify another teacher's diary");
  }
}

async function assertCanReadDiary(
  actor: Actor,
  day: DiaryDayRecord,
): Promise<void> {
  assertInstituteAccess(actor, day.institute_id);

  if (isFullInstituteReader(actor, day.institute_id)) return;

  if (actorHasInstituteRole(actor, day.institute_id, "teacher")) {
    const identity = requireTeacherIdentity(actor, day.institute_id);
    if (identity.teacherId === day.teacher_id) return;
    throw AppError.forbidden("Insufficient permissions");
  }

  // Learners/parents: no diary access (schema + product freeze).
  throw AppError.forbidden("Insufficient permissions");
}

function filterDaysForActor(
  actor: Actor,
  instituteId: string,
  rows: DiaryDayRecord[],
): DiaryDayRecord[] {
  if (isFullInstituteReader(actor, instituteId)) return rows;

  if (actorHasInstituteRole(actor, instituteId, "teacher")) {
    const identity = requireTeacherIdentity(actor, instituteId);
    return rows.filter((r) => r.teacher_id === identity.teacherId);
  }

  throw AppError.forbidden("Insufficient permissions");
}

async function validateAcademicYear(
  admin: SupabaseClient,
  instituteId: string,
  academicYearId: string | null | undefined,
): Promise<void> {
  if (academicYearId == null) return;
  const year = await findAcademicYearById(admin, academicYearId);
  if (!year || year.institute_id !== instituteId) {
    throw AppError.validation("Referenced resource is invalid", {
      academic_year_id: ["Academic year not found in this institute"],
    });
  }
}

async function validateAndNormalizeRows(
  admin: SupabaseClient,
  input: {
    instituteId: string;
    scope: "subject" | "activity";
    teacherId: string;
    rows: DiaryDayRowInput[];
  },
): Promise<DiaryDayRowInput[]> {
  if (input.rows.length === 0) return [];

  const assignments = await listActiveTeacherAssignmentsForSections(admin, {
    teacherId: input.teacherId,
    instituteId: input.instituteId,
  });
  const assignedSections = new Set(assignments.map((a) => a.section_id));

  const normalized: DiaryDayRowInput[] = [];
  const seenSections = new Set<string>();

  for (let i = 0; i < input.rows.length; i++) {
    const row = input.rows[i];
    const classLabel = row.classLabel.trim();
    const description = row.description.trim();
    if (!classLabel || !description) {
      throw AppError.validation("Diary row requires class_label and description", {
        rows: [`Row ${i} is incomplete`],
      });
    }

    const sectionId = row.sectionId ?? null;

    if (input.scope === "subject") {
      if (!sectionId) {
        throw AppError.validation("subject diary rows require section_id", {
          rows: [`Row ${i} missing section_id`],
        });
      }
      const section = await findSectionById(admin, sectionId);
      if (!section || section.institute_id !== input.instituteId) {
        throw AppError.validation("Referenced resource is invalid", {
          rows: [`Row ${i} section not found in this institute`],
        });
      }
      if (!assignedSections.has(sectionId)) {
        throw AppError.forbidden(
          "Teacher is not assigned to this section for diary entry",
        );
      }
      if (seenSections.has(sectionId)) {
        throw AppError.validation("Duplicate section_id in diary rows", {
          rows: ["Each section_id must be unique per day"],
        });
      }
      seenSections.add(sectionId);
    } else if (sectionId) {
      const section = await findSectionById(admin, sectionId);
      if (!section || section.institute_id !== input.instituteId) {
        throw AppError.validation("Referenced resource is invalid", {
          rows: [`Row ${i} section not found in this institute`],
        });
      }
    }

    normalized.push({
      sectionId,
      classLabel,
      description,
      sortOrder: row.sortOrder ?? i,
    });
  }

  return normalized;
}

function assertReadyToSubmit(rows: DiaryDayRowRecord[]): void {
  if (rows.length === 0) {
    throw AppError.validation("Cannot submit diary without rows", {
      rows: ["At least one row is required"],
    });
  }
  const ready = rows.some(
    (r) => r.class_label.trim().length > 0 && r.description.trim().length > 0,
  );
  if (!ready) {
    throw AppError.validation("Cannot submit incomplete diary rows", {
      rows: ["At least one complete row is required"],
    });
  }
}

export async function listDiaryDaysForActor(
  admin: SupabaseClient,
  actor: Actor,
  filter: ListDiaryFilter,
): Promise<DiaryDayDto[]> {
  const instituteId = requireInstituteId(actor, filter.instituteId);
  const days = await listDiaryDays(admin, { ...filter, instituteId });
  const visible = filterDaysForActor(actor, instituteId, days);
  const allRows = await listRowsForDayIds(
    admin,
    visible.map((d) => d.id),
  );
  const byDay = new Map<string, DiaryDayRowRecord[]>();
  for (const row of allRows) {
    const list = byDay.get(row.diary_day_id) ?? [];
    list.push(row);
    byDay.set(row.diary_day_id, list);
  }
  return visible.map((d) => {
    const rows = (byDay.get(d.id) ?? []).sort(
      (a, b) => a.sort_order - b.sort_order,
    );
    return toDayDto(d, rows);
  });
}

export async function getDiaryDayForActor(
  admin: SupabaseClient,
  actor: Actor,
  dayId: string,
): Promise<DiaryDayDto> {
  const day = await findDiaryDayById(admin, dayId);
  if (!day) throw AppError.notFound("Diary day not found");

  await assertCanReadDiary(actor, day);
  const rows = await listRowsForDay(admin, day.id);
  return toDayDto(day, rows);
}

export async function createDiaryDayForActor(
  admin: SupabaseClient,
  actor: Actor,
  input: CreateDiaryDayInput,
): Promise<DiaryDayDto> {
  const instituteId = requireInstituteId(actor, input.instituteId);

  if (!actorHasInstituteRole(actor, instituteId, "teacher")) {
    throw AppError.forbidden("Insufficient institute role");
  }

  const identity = requireTeacherIdentity(actor, instituteId);
  await validateAcademicYear(admin, instituteId, input.academicYearId);

  const rowInputs = await validateAndNormalizeRows(admin, {
    instituteId,
    scope: input.scope,
    teacherId: identity.teacherId,
    rows: input.rows ?? [],
  });

  const existingLive = await listDiaryDays(admin, {
    instituteId,
    teacherId: identity.teacherId,
    diaryDate: input.diaryDate,
    scope: input.scope,
  });
  if (existingLive.length > 0) {
    throw AppError.conflict(
      "A diary day already exists for this teacher, date, and scope",
    );
  }

  let day: DiaryDayRecord;
  try {
    day = await insertDiaryDay(admin, {
      ...input,
      instituteId,
      teacherId: identity.teacherId,
    });
  } catch (err) {
    if (err instanceof AppError && err.code === "CONFLICT") {
      throw AppError.conflict(
        "A diary day already exists for this teacher, date, and scope",
      );
    }
    throw err;
  }

  const rows = await replaceDiaryRows(admin, day, rowInputs);
  return toDayDto(day, rows);
}

export async function updateDiaryDayForActor(
  admin: SupabaseClient,
  actor: Actor,
  dayId: string,
  patch: UpdateDiaryDayInput,
): Promise<DiaryDayDto> {
  const existing = await findDiaryDayById(admin, dayId);
  if (!existing) throw AppError.notFound("Diary day not found");

  assertInstituteAccess(actor, existing.institute_id);
  await assertTeacherOwner(actor, existing);

  if (patch.academicYearId !== undefined) {
    await validateAcademicYear(
      admin,
      existing.institute_id,
      patch.academicYearId,
    );
  }

  let day = existing;
  if (patch.academicYearId !== undefined) {
    const updated = await updateDiaryDayFields(admin, dayId, {
      academic_year_id: patch.academicYearId,
    });
    if (!updated) throw AppError.notFound("Diary day not found");
    day = updated;
  }

  let rows = await listRowsForDay(admin, dayId);
  if (patch.rows !== undefined) {
    const normalized = await validateAndNormalizeRows(admin, {
      instituteId: existing.institute_id,
      scope: existing.scope,
      teacherId: existing.teacher_id,
      rows: patch.rows,
    });
    rows = await replaceDiaryRows(admin, day, normalized);
  }

  return toDayDto(day, rows);
}

export async function submitDiaryDayForActor(
  admin: SupabaseClient,
  actor: Actor,
  dayId: string,
): Promise<DiaryDayDto> {
  const existing = await findDiaryDayById(admin, dayId);
  if (!existing) throw AppError.notFound("Diary day not found");

  assertInstituteAccess(actor, existing.institute_id);
  await assertTeacherOwner(actor, existing);

  const rows = await listRowsForDay(admin, dayId);
  assertReadyToSubmit(rows);

  const submitted = await updateDiaryDayFields(admin, dayId, {
    submitted_at: new Date().toISOString(),
  });
  if (!submitted) {
    throw AppError.conflict("Diary day could not be submitted");
  }
  return toDayDto(submitted, rows);
}

export async function deleteDiaryDayForActor(
  admin: SupabaseClient,
  actor: Actor,
  dayId: string,
): Promise<void> {
  const existing = await findDiaryDayById(admin, dayId);
  if (!existing) throw AppError.notFound("Diary day not found");

  assertInstituteAccess(actor, existing.institute_id);

  if (isGovernanceWriter(actor, existing.institute_id)) {
    // staff governance soft-delete
  } else {
    await assertTeacherOwner(actor, existing);
  }

  const deleted = await softDeleteDiaryDay(admin, dayId);
  if (!deleted) {
    throw AppError.conflict("Diary day was already deleted");
  }
}
