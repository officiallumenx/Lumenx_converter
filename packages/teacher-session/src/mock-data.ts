import type { TeacherAssignment, TeacherAssignmentType } from "./types";

/**
 * Mock assignment lookup — no backend.
 * Demo teacher (T-1042) defaults to dual_role so the existing Subject Teacher
 * portal remains the default login experience until Settings role switch is built.
 */
const ASSIGNMENT_BY_TEACHER_ID: Record<string, TeacherAssignmentType> = {
  "T-1042": "dual_role",
};

const DEFAULT_ASSIGNMENT: TeacherAssignmentType = "dual_role";

export function mockTeacherAssignment(teacherId: string): TeacherAssignment {
  return {
    teacherId,
    assignmentType: ASSIGNMENT_BY_TEACHER_ID[teacherId] ?? DEFAULT_ASSIGNMENT,
  };
}
