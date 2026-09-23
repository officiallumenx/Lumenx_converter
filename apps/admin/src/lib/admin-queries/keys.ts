/**
 * Admin TanStack Query keys — institute-scoped.
 * Shape: ["admin", instituteId, entity, ...filters]
 */
import { ADMIN_QUERY_SCOPE } from "./constants";

export { ADMIN_QUERY_SCOPE };

export const adminQueryRoots = {
  students: "students",
  student: "student",
  teachers: "teachers",
  teacher: "teacher",
  photos: "photos",
  classes: "classes",
  classSection: "class-section",
  subjects: "subjects",
  subject: "subject",
  fees: "fees",
  attendance: "attendance",
  teacherAttendance: "teacher-attendance",
  timetable: "timetable",
  marks: "marks",
  exams: "exams",
  homework: "homework",
  parents: "parents",
  parent: "parent",
  transport: "transport",
  analytics: "analytics",
  documents: "documents",
  events: "events",
  announcements: "announcements",
  complaints: "complaints",
  notifications: "notifications",
  diary: "diary",
  leave: "leave",
  messages: "messages",
  calendar: "calendar",
  admissions: "admissions",
  careers: "careers",
  catalog: "catalog",
  home: "home",
  enrollments: "enrollments",
  academicYears: "academic-years",
  permissions: "permissions",
  accounts: "accounts",
  institute: "institute",
  storage: "storage",
  reports: "reports",
  alerts: "alerts",
  templates: "templates",
  subscription: "subscription",
  teacherPerformance: "teacher-performance",
} as const;

export type AdminQueryEntity =
  (typeof adminQueryRoots)[keyof typeof adminQueryRoots];

/** Soft-refresh: invalidate every Admin query. */
export const ADMIN_SOFT_REFRESH_ROOTS = [ADMIN_QUERY_SCOPE] as const;

/** Partial key for invalidateQueries — matches all filters for an entity. */
export function adminModulePrefix(
  instituteId: string,
  entity: AdminQueryEntity,
) {
  return [ADMIN_QUERY_SCOPE, instituteId, entity] as const;
}

export function adminInstitutePrefix(instituteId: string) {
  return [ADMIN_QUERY_SCOPE, instituteId] as const;
}

export function adminScopePrefix() {
  return [ADMIN_QUERY_SCOPE] as const;
}

export const adminQueryKeys = {
  students: (instituteId: string, filters: unknown = {}) =>
    [ADMIN_QUERY_SCOPE, instituteId, adminQueryRoots.students, filters] as const,
  student: (instituteId: string, studentId: string) =>
    [ADMIN_QUERY_SCOPE, instituteId, adminQueryRoots.student, studentId] as const,
  studentGuardians: (instituteId: string, studentId: string) =>
    [
      ADMIN_QUERY_SCOPE,
      instituteId,
      adminQueryRoots.student,
      studentId,
      "guardians",
    ] as const,
  teachers: (instituteId: string, filters: unknown = {}) =>
    [ADMIN_QUERY_SCOPE, instituteId, adminQueryRoots.teachers, filters] as const,
  teacher: (instituteId: string, teacherId: string) =>
    [ADMIN_QUERY_SCOPE, instituteId, adminQueryRoots.teacher, teacherId] as const,
  photosTeachers: (instituteId: string, q = "") =>
    [ADMIN_QUERY_SCOPE, instituteId, adminQueryRoots.photos, "teachers", q] as const,
  photosStudents: (
    instituteId: string,
    classId: string,
    sectionId: string,
    q = "",
  ) =>
    [
      ADMIN_QUERY_SCOPE,
      instituteId,
      adminQueryRoots.photos,
      "students",
      classId,
      sectionId,
      q,
    ] as const,
  photosSignedUrl: (kind: "student" | "teacher", id: string) =>
    [ADMIN_QUERY_SCOPE, adminQueryRoots.photos, "signed-url", kind, id] as const,
  classes: (instituteId: string) =>
    [ADMIN_QUERY_SCOPE, instituteId, adminQueryRoots.classes] as const,
  classSection: (instituteId: string, sectionId: string) =>
    [
      ADMIN_QUERY_SCOPE,
      instituteId,
      adminQueryRoots.classSection,
      sectionId,
    ] as const,
  subjects: (instituteId: string) =>
    [ADMIN_QUERY_SCOPE, instituteId, adminQueryRoots.subjects] as const,
  subject: (instituteId: string, subjectId: string) =>
    [ADMIN_QUERY_SCOPE, instituteId, adminQueryRoots.subject, subjectId] as const,
  fees: (instituteId: string, academicYearId = "_") =>
    [ADMIN_QUERY_SCOPE, instituteId, adminQueryRoots.fees, academicYearId] as const,
  attendance: (instituteId: string, scope: unknown) =>
    [ADMIN_QUERY_SCOPE, instituteId, adminQueryRoots.attendance, scope] as const,
  teacherAttendance: (instituteId: string, scope: unknown) =>
    [
      ADMIN_QUERY_SCOPE,
      instituteId,
      adminQueryRoots.teacherAttendance,
      scope,
    ] as const,
  timetable: (instituteId: string) =>
    [ADMIN_QUERY_SCOPE, instituteId, adminQueryRoots.timetable] as const,
  marks: (instituteId: string) =>
    [ADMIN_QUERY_SCOPE, instituteId, adminQueryRoots.marks] as const,
  exams: (instituteId: string) =>
    [ADMIN_QUERY_SCOPE, instituteId, adminQueryRoots.exams] as const,
  homework: (instituteId: string) =>
    [ADMIN_QUERY_SCOPE, instituteId, adminQueryRoots.homework] as const,
  parents: (instituteId: string) =>
    [ADMIN_QUERY_SCOPE, instituteId, adminQueryRoots.parents] as const,
  parent: (instituteId: string, parentId: string) =>
    [ADMIN_QUERY_SCOPE, instituteId, adminQueryRoots.parent, parentId] as const,
  transport: (instituteId: string, part: string) =>
    [ADMIN_QUERY_SCOPE, instituteId, adminQueryRoots.transport, part] as const,
  analytics: (instituteId: string) =>
    [ADMIN_QUERY_SCOPE, instituteId, adminQueryRoots.analytics] as const,
  documents: (instituteId: string, part = "hub") =>
    [ADMIN_QUERY_SCOPE, instituteId, adminQueryRoots.documents, part] as const,
  events: (instituteId: string) =>
    [ADMIN_QUERY_SCOPE, instituteId, adminQueryRoots.events] as const,
  announcements: (instituteId: string) =>
    [ADMIN_QUERY_SCOPE, instituteId, adminQueryRoots.announcements] as const,
  complaints: (instituteId: string) =>
    [ADMIN_QUERY_SCOPE, instituteId, adminQueryRoots.complaints] as const,
  notifications: (instituteId: string) =>
    [ADMIN_QUERY_SCOPE, instituteId, adminQueryRoots.notifications] as const,
  diary: (instituteId: string) =>
    [ADMIN_QUERY_SCOPE, instituteId, adminQueryRoots.diary] as const,
  leave: (instituteId: string) =>
    [ADMIN_QUERY_SCOPE, instituteId, adminQueryRoots.leave] as const,
  messages: (instituteId: string) =>
    [ADMIN_QUERY_SCOPE, instituteId, adminQueryRoots.messages] as const,
  calendar: (instituteId: string) =>
    [ADMIN_QUERY_SCOPE, instituteId, adminQueryRoots.calendar] as const,
  admissions: (instituteId: string, part = "list") =>
    [ADMIN_QUERY_SCOPE, instituteId, adminQueryRoots.admissions, part] as const,
  careers: (instituteId: string, part = "list") =>
    [ADMIN_QUERY_SCOPE, instituteId, adminQueryRoots.careers, part] as const,
  catalogClasses: (instituteId: string) =>
    [ADMIN_QUERY_SCOPE, instituteId, adminQueryRoots.catalog, "classes"] as const,
  catalogSubjects: (instituteId: string) =>
    [ADMIN_QUERY_SCOPE, instituteId, adminQueryRoots.catalog, "subjects"] as const,
  catalogYears: (instituteId: string) =>
    [ADMIN_QUERY_SCOPE, instituteId, adminQueryRoots.catalog, "years"] as const,
  homeSummary: (instituteId: string) =>
    [ADMIN_QUERY_SCOPE, instituteId, adminQueryRoots.home, "summary"] as const,
  homeWidgets: (instituteId: string) =>
    [ADMIN_QUERY_SCOPE, instituteId, adminQueryRoots.home, "widgets"] as const,
  enrollments: (instituteId: string, filters: unknown = {}) =>
    [ADMIN_QUERY_SCOPE, instituteId, adminQueryRoots.enrollments, filters] as const,
  academicYears: (instituteId: string) =>
    [ADMIN_QUERY_SCOPE, instituteId, adminQueryRoots.academicYears] as const,
  permissions: (instituteId: string) =>
    [ADMIN_QUERY_SCOPE, instituteId, adminQueryRoots.permissions] as const,
  accounts: (instituteId: string, filters: unknown = {}) =>
    [ADMIN_QUERY_SCOPE, instituteId, adminQueryRoots.accounts, filters] as const,
  instituteProfile: (instituteId: string) =>
    [ADMIN_QUERY_SCOPE, instituteId, adminQueryRoots.institute] as const,
  storage: (instituteId: string) =>
    [ADMIN_QUERY_SCOPE, instituteId, adminQueryRoots.storage] as const,
  reports: (instituteId: string) =>
    [ADMIN_QUERY_SCOPE, instituteId, adminQueryRoots.reports] as const,
  alerts: (instituteId: string) =>
    [ADMIN_QUERY_SCOPE, instituteId, adminQueryRoots.alerts] as const,
  templates: (instituteId: string) =>
    [ADMIN_QUERY_SCOPE, instituteId, adminQueryRoots.templates] as const,
  subscription: (instituteId: string) =>
    [ADMIN_QUERY_SCOPE, instituteId, adminQueryRoots.subscription] as const,
  teacherPerformance: (instituteId: string) =>
    [
      ADMIN_QUERY_SCOPE,
      instituteId,
      adminQueryRoots.teacherPerformance,
    ] as const,
};
