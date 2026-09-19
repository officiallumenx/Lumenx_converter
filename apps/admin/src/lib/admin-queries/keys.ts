/**
 * Admin TanStack Query keys — institute-scoped.
 * Loaders (loadStudentsList etc.) remain the queryFn source of truth;
 * admin-resource-cache may still coalesce in-flight inside loaders.
 */

export const adminQueryRoots = {
  students: "admin-students",
  teachers: "admin-teachers",
  classes: "admin-classes",
  subjects: "admin-subjects",
  fees: "admin-fees",
  attendance: "admin-attendance",
  timetable: "admin-timetable",
  marks: "admin-marks",
  exams: "admin-exams",
  homework: "admin-homework",
  parents: "admin-parents",
  transport: "admin-transport",
  analytics: "admin-analytics",
  documents: "admin-documents",
  events: "admin-events",
  announcements: "admin-announcements",
  complaints: "admin-complaints",
  notifications: "admin-notifications",
  diary: "admin-diary",
  leave: "admin-leave",
  messages: "admin-messages",
  calendar: "admin-calendar",
  admissions: "admin-admissions",
  careers: "admin-careers",
  catalog: "admin-catalog",
} as const;

export const adminQueryKeys = {
  students: (instituteId: string, q = "") =>
    [adminQueryRoots.students, instituteId, q] as const,
  teachers: (instituteId: string, q = "") =>
    [adminQueryRoots.teachers, instituteId, q] as const,
  classes: (instituteId: string) => [adminQueryRoots.classes, instituteId] as const,
  subjects: (instituteId: string) => [adminQueryRoots.subjects, instituteId] as const,
  fees: (instituteId: string) => [adminQueryRoots.fees, instituteId] as const,
  attendance: (instituteId: string, scope: string) =>
    [adminQueryRoots.attendance, instituteId, scope] as const,
  timetable: (instituteId: string) => [adminQueryRoots.timetable, instituteId] as const,
  marks: (instituteId: string) => [adminQueryRoots.marks, instituteId] as const,
  exams: (instituteId: string) => [adminQueryRoots.exams, instituteId] as const,
  homework: (instituteId: string) => [adminQueryRoots.homework, instituteId] as const,
  parents: (instituteId: string) => [adminQueryRoots.parents, instituteId] as const,
  transport: (instituteId: string, part: string) =>
    [adminQueryRoots.transport, instituteId, part] as const,
  analytics: (instituteId: string) => [adminQueryRoots.analytics, instituteId] as const,
  documents: (instituteId: string) => [adminQueryRoots.documents, instituteId] as const,
  events: (instituteId: string) => [adminQueryRoots.events, instituteId] as const,
  announcements: (instituteId: string) =>
    [adminQueryRoots.announcements, instituteId] as const,
  complaints: (instituteId: string) => [adminQueryRoots.complaints, instituteId] as const,
  notifications: (instituteId: string) =>
    [adminQueryRoots.notifications, instituteId] as const,
  diary: (instituteId: string) => [adminQueryRoots.diary, instituteId] as const,
  leave: (instituteId: string) => [adminQueryRoots.leave, instituteId] as const,
  messages: (instituteId: string) => [adminQueryRoots.messages, instituteId] as const,
  calendar: (instituteId: string) => [adminQueryRoots.calendar, instituteId] as const,
  admissions: (instituteId: string) => [adminQueryRoots.admissions, instituteId] as const,
  careers: (instituteId: string) => [adminQueryRoots.careers, instituteId] as const,
  catalogClasses: (instituteId: string) =>
    [adminQueryRoots.catalog, "classes", instituteId] as const,
  catalogSubjects: (instituteId: string) =>
    [adminQueryRoots.catalog, "subjects", instituteId] as const,
  catalogYears: (instituteId: string) =>
    [adminQueryRoots.catalog, "years", instituteId] as const,
};

export const ADMIN_SOFT_REFRESH_ROOTS = Object.values(adminQueryRoots);
