import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "../errors/app-error.js";
import type { Actor, LinkedTeacher } from "../auth/types.js";
import { findActiveTeacherAssignment } from "../domains/session/repository.js";
import { assertInstituteAccess } from "./tenant.js";

/** Resolve linked teacher rows for an institute (may be empty). */
export function resolveTeachersForInstitute(
  actor: Actor,
  instituteId: string,
): LinkedTeacher[] {
  assertInstituteAccess(actor, instituteId);
  return actor.teachers.filter((t) => t.instituteId === instituteId);
}

/**
 * Prefer a single active teacher identity for the institute.
 * Throws when the actor has no teacher link there.
 */
export function requireTeacherIdentity(
  actor: Actor,
  instituteId: string,
): LinkedTeacher {
  const teachers = resolveTeachersForInstitute(actor, instituteId).filter(
    (t) => t.status === "active",
  );
  if (teachers.length === 0) {
    throw AppError.forbidden("No teacher identity for this institute");
  }
  return teachers[0];
}

/**
 * Enforce active teacher_assignment for section × subject (write path).
 * Does not change RLS helpers; Hono-only authorization.
 */
export async function assertTeacherAssigned(
  admin: SupabaseClient,
  input: {
    teacherId: string;
    instituteId: string;
    sectionId: string;
    subjectId: string;
    academicYearId?: string;
  },
): Promise<{ assignmentId: string }> {
  const row = await findActiveTeacherAssignment(admin, input);
  if (!row) {
    throw AppError.forbidden("Teacher is not assigned to this section/subject");
  }
  return { assignmentId: row.id };
}
