export { teacherSessionStore, getTeacherPortalAccessLevel } from "./teacher-session-store";
export { useTeacherPortalAccess } from "./use-teacher-portal-access";
export type { TeacherPortalAccess } from "./use-teacher-portal-access";
export {
  TeacherAccessDeniedError,
  isTeacherAccessDenied,
  assertTeacherCanWrite,
  assertTeacherCanGrade,
} from "@/lib/teacher/portal-access-guard";
