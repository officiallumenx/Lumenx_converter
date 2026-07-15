export type {
  TeacherAssignment,
  TeacherAssignmentType,
  TeacherActivePortal,
  TeacherSession,
} from "./types";

export {
  teacherCanAccessActivityPortal,
  teacherCanAccessSubjectPortal,
  teacherCanAccessActivityWorkspace,
  teacherCanAccessSubjectWorkspace,
  resolveActivePortal,
  resolveActiveWorkspace,
  isActivityPortalActive,
  isActivityWorkspaceActive,
  isSubjectPortalActive,
  isSubjectWorkspaceActive,
} from "./portal-access";

export type { TeacherSessionRepository } from "./repository";
export {
  mockTeacherSessionRepository,
  teacherSessionRepository,
} from "./repository";
