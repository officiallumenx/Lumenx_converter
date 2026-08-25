/**
 * Admin module display labels — single source for nav, catalog, and page titles.
 * Keep names short and consistent across mobile bottom nav and sidebar.
 */

export const ADMIN_MODULE_LABELS = {
  home: "Home",
  analytics: "Analytics",
  students: "Students",
  teachers: "Teachers",
  parents: "Parents",
  accounts: "Accounts",
  classes: "Classes",
  academics: "Academics",
  subjects: "Subjects",
  timetable: "Timetable",
  attendance: "Attendance",
  attendanceReports: "Attendance Reports",
  staffAttendance: "Staff Attendance",
  exams: "Exams",
  marks: "Marks",
  homework: "Homework",
  diary: "Diary",
  notifications: "Notifications",
  announcements: "Announcements",
  alerts: "Alerts",
  complaints: "Complaints",
  roles: "Roles",
  modules: "Modules",
  subscription: "Subscription",
  storage: "Storage",
  settings: "Settings",
  transport: "Transport",
  leave: "Leave",
  fees: "Fees",
  admissions: "Admissions",
  careers: "Careers",
  institute: "Institute",
  certificates: "Certificates",
  documents: "Documents",
  calendar: "Calendar",
  events: "Events",
  reports: "Reports",
  performance: "Performance",
} as const;

/** Primary route → label (used by sidebar, mobile nav, and titles). */
export const ADMIN_MODULE_LABEL_BY_ROUTE: Record<string, string> = {
  "/": ADMIN_MODULE_LABELS.home,
  "/analytics": ADMIN_MODULE_LABELS.analytics,
  "/students": ADMIN_MODULE_LABELS.students,
  "/teachers": ADMIN_MODULE_LABELS.teachers,
  "/parents": ADMIN_MODULE_LABELS.parents,
  "/accounts": ADMIN_MODULE_LABELS.accounts,
  "/classes": ADMIN_MODULE_LABELS.classes,
  "/academic-management": ADMIN_MODULE_LABELS.academics,
  "/subjects": ADMIN_MODULE_LABELS.subjects,
  "/timetable": ADMIN_MODULE_LABELS.timetable,
  "/student-attendance": ADMIN_MODULE_LABELS.attendance,
  "/attendance": ADMIN_MODULE_LABELS.attendanceReports,
  "/teacher-attendance": ADMIN_MODULE_LABELS.staffAttendance,
  "/exams": ADMIN_MODULE_LABELS.exams,
  "/marks": ADMIN_MODULE_LABELS.marks,
  "/homework": ADMIN_MODULE_LABELS.homework,
  "/diary": ADMIN_MODULE_LABELS.diary,
  "/notifications": ADMIN_MODULE_LABELS.notifications,
  "/announcements": ADMIN_MODULE_LABELS.announcements,
  "/alerts": ADMIN_MODULE_LABELS.alerts,
  "/complaints": ADMIN_MODULE_LABELS.complaints,
  "/permissions": ADMIN_MODULE_LABELS.roles,
  "/modules": ADMIN_MODULE_LABELS.modules,
  "/subscription": ADMIN_MODULE_LABELS.subscription,
  "/storage": ADMIN_MODULE_LABELS.storage,
  "/settings": ADMIN_MODULE_LABELS.settings,
  "/transport": ADMIN_MODULE_LABELS.transport,
  "/leave": ADMIN_MODULE_LABELS.leave,
  "/fees": ADMIN_MODULE_LABELS.fees,
  "/admissions": ADMIN_MODULE_LABELS.admissions,
  "/careers": ADMIN_MODULE_LABELS.careers,
  "/institute": ADMIN_MODULE_LABELS.institute,
  "/templates": ADMIN_MODULE_LABELS.certificates,
  "/documents": ADMIN_MODULE_LABELS.documents,
  "/calendar": ADMIN_MODULE_LABELS.calendar,
  "/events": ADMIN_MODULE_LABELS.events,
  "/reports": ADMIN_MODULE_LABELS.reports,
  "/teacher-performance": ADMIN_MODULE_LABELS.performance,
};

export function adminModuleLabelForRoute(route: string): string {
  if (route === "/") return ADMIN_MODULE_LABELS.home;
  const keys = Object.keys(ADMIN_MODULE_LABEL_BY_ROUTE)
    .filter((key) => key !== "/")
    .sort((a, b) => b.length - a.length);
  const match = keys.find((key) => route === key || route.startsWith(`${key}/`));
  return match ? ADMIN_MODULE_LABEL_BY_ROUTE[match]! : route;
}

export function adminPageTitle(route: string): string {
  return `${adminModuleLabelForRoute(route)} — LumenX Admin`;
}
