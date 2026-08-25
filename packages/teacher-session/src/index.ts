export type {
  TeacherAssignment,
  TeacherAssignmentType,
  TeacherActivePortal,
  TeacherPortalAccessLevel,
  TeacherSession,
} from "./types";

export {
  parseTeacherPortalAccess,
  teacherCanWrite,
  teacherCanGrade,
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

export {
  ADMIN_TEACHERS_STORAGE_KEY,
  TEACHER_PORTAL_ACCESS_OVERRIDES_KEY,
  resolveTeacherPortalAccess,
  mockTeacherAssignment,
} from "./mock-data";

export type { TeacherSessionRepository } from "./repository";
export {
  mockTeacherSessionRepository,
  teacherSessionRepository,
} from "./repository";
