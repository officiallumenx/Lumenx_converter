/** How a teacher is assigned within LumenX Connect. */
export type TeacherAssignmentType =
  | "subject_teacher"
  | "activity_coordinator"
  | "dual_role";

/** Active portal for dual-role teachers. */
export type TeacherActivePortal = "subject" | "activity";

/** Assignment resolved from the session source (mock today, backend later). */
export interface TeacherAssignment {
  teacherId: string;
  assignmentType: TeacherAssignmentType;
}

/** Full teacher session state used by Connect routing and portal guards. */
export interface TeacherSession {
  teacherId: string;
  assignmentType: TeacherAssignmentType;
  activePortal: TeacherActivePortal;
}
