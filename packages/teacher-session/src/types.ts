/** How a teacher is assigned within LumenX Connect. */
export type TeacherAssignmentType =
  | "subject_teacher"
  | "activity_coordinator"
  | "dual_role";

/** Active portal for dual-role teachers. */
export type TeacherActivePortal = "subject" | "activity";

/**
 * Admin-controlled Connect write scope for a teacher account.
 * - faculty_grading: full teaching writes including marks
 * - faculty_only: teaching writes except grade entry / publish
 * - read_only: view only — no creates, edits, or submits
 */
export type TeacherPortalAccessLevel = "faculty_grading" | "faculty_only" | "read_only";

/** Assignment resolved from the session source (mock today, backend later). */
export interface TeacherAssignment {
  teacherId: string;
  assignmentType: TeacherAssignmentType;
  portalAccess: TeacherPortalAccessLevel;
}

/** Full teacher session state used by Connect routing and portal guards. */
export interface TeacherSession {
  teacherId: string;
  assignmentType: TeacherAssignmentType;
  activePortal: TeacherActivePortal;
  portalAccess: TeacherPortalAccessLevel;
}
