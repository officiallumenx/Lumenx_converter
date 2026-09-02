import { allPermissions, permissionsFor } from "./module-routes.js";
import type { AccessPermission } from "./types.js";

export type SystemRoleSeed = {
  systemKey: string;
  name: string;
  scope: string;
  description: string;
  permissions: Record<string, AccessPermission>;
};

export const SYSTEM_ACCESS_ROLE_SEEDS: SystemRoleSeed[] = [
  {
    systemKey: "principal_root",
    name: "Principal · Root",
    scope: "Institute",
    description:
      "Institute-wide access. Attendance is View Only (cannot mark or run monitor actions).",
    permissions: {
      ...allPermissions("full"),
      "/student-attendance": "read",
      "/attendance": "read",
    },
  },
  {
    systemKey: "vice_principal",
    name: "Vice Principal",
    scope: "Institute",
    description: "Institute operations with full academic and service access.",
    permissions: {
      ...allPermissions("full"),
      "/student-attendance": "read",
      "/attendance": "read",
    },
  },
  {
    systemKey: "attendance_monitor",
    name: "Admin · Attendance Monitor",
    scope: "Institute",
    description:
      "Monitor attendance only — Insights / pending alerts. Cannot mark Student Attendance.",
    permissions: {
      ...permissionsFor(["/attendance", "/student-attendance", "/reports", "/alerts"]),
      "/student-attendance": "read",
      "/attendance": "full",
    },
  },
  {
    systemKey: "academic_coordinator",
    name: "Academic Coordinator",
    scope: "Assigned grades",
    description:
      "Academic operations, communication, and reporting. Attendance is View / Monitor Only.",
    permissions: {
      ...permissionsFor([
        "/students",
        "/teachers",
        "/classes",
        "/subjects",
        "/timetable",
        "/student-attendance",
        "/attendance",
        "/teacher-attendance",
        "/exams",
        "/marks",
        "/notifications",
        "/announcements",
        "/calendar",
        "/reports",
      ]),
      "/student-attendance": "read",
      "/attendance": "read",
    },
  },
  {
    systemKey: "attendance_coordinator",
    name: "Attendance Coordinator",
    scope: "Assigned classes",
    description:
      "Student Attendance only — mark via the shared Attendance Engine for assigned classes.",
    permissions: {
      ...permissionsFor(["/student-attendance", "/attendance"]),
      "/student-attendance": "full",
      "/attendance": "read",
    },
  },
  {
    systemKey: "financial",
    name: "Financial",
    scope: "Institute",
    description: "Fee administration and financial reporting.",
    permissions: permissionsFor(["/students", "/parents", "/fees", "/reports"]),
  },
  {
    systemKey: "books_fees",
    name: "Books & Fees",
    scope: "Institute",
    description: "Student fee and supporting record access.",
    permissions: permissionsFor(["/students", "/parents", "/fees"]),
  },
];
