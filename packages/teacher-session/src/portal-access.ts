import type {
  TeacherActivePortal,
  TeacherAssignmentType,
  TeacherPortalAccessLevel,
  TeacherSession,
} from "./types";

/** Parse Admin portal-access labels (and snake/kebab variants) into a typed level. */
export function parseTeacherPortalAccess(value: unknown): TeacherPortalAccessLevel | null {
  if (typeof value !== "string") return null;
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[+]/g, " ")
    .replace(/[\s_]+/g, "-");
  if (
    normalized === "faculty-grading" ||
    normalized === "faculty_grading"
  ) {
    return "faculty_grading";
  }
  if (normalized === "faculty-only" || normalized === "faculty_only") {
    return "faculty_only";
  }
  if (normalized === "read-only" || normalized === "readonly" || normalized === "read_only") {
    return "read_only";
  }
  return null;
}

export function teacherCanWrite(level: TeacherPortalAccessLevel): boolean {
  return level !== "read_only";
}

export function teacherCanGrade(level: TeacherPortalAccessLevel): boolean {
  return level === "faculty_grading";
}

export function teacherCanAccessActivityWorkspace(type: TeacherAssignmentType): boolean {
  return type === "activity_coordinator" || type === "dual_role";
}

/** @deprecated Use teacherCanAccessActivityWorkspace */
export const teacherCanAccessActivityPortal = teacherCanAccessActivityWorkspace;

export function teacherCanAccessSubjectWorkspace(type: TeacherAssignmentType): boolean {
  return type === "subject_teacher" || type === "dual_role";
}

/** @deprecated Use teacherCanAccessSubjectWorkspace */
export const teacherCanAccessSubjectPortal = teacherCanAccessSubjectWorkspace;

/** Clamp preferred workspace to what the assignment type allows. */
export function resolveActiveWorkspace(
  assignmentType: TeacherAssignmentType,
  preferred: TeacherActivePortal = "subject",
): TeacherActivePortal {
  if (assignmentType === "subject_teacher") return "subject";
  if (assignmentType === "activity_coordinator") return "activity";
  return preferred === "activity" ? "activity" : "subject";
}

/** @deprecated Use resolveActiveWorkspace */
export const resolveActivePortal = resolveActiveWorkspace;

export function isActivityWorkspaceActive(session: TeacherSession): boolean {
  if (session.assignmentType === "activity_coordinator") return true;
  if (session.assignmentType === "dual_role") return session.activePortal === "activity";
  return false;
}

/** @deprecated Use isActivityWorkspaceActive */
export const isActivityPortalActive = isActivityWorkspaceActive;

export function isSubjectWorkspaceActive(session: TeacherSession): boolean {
  if (session.assignmentType === "subject_teacher") return true;
  if (session.assignmentType === "dual_role") return session.activePortal === "subject";
  return false;
}

/** @deprecated Use isSubjectWorkspaceActive */
export const isSubjectPortalActive = isSubjectWorkspaceActive;
