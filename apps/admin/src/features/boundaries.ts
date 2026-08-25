/**
 * Admin feature boundaries — maps product areas to their source folders.
 * Import feature code from these roots (or existing @/components/@/lib paths).
 * This file is structural only; it does not re-export UI or change behavior.
 */

export const ADMIN_FEATURE_BOUNDARIES = {
  attendance: {
    components: "@/components/attendance",
    studentAttendance: "@/components/student-attendance",
    lib: [
      "@/lib/attendance-pending",
      "@/lib/attendance-report-demo",
      "@/lib/attendance-coordinator-access",
    ],
  },
  fees: {
    components: "@/components/fees",
    lib: ["@/lib/fees-students", "@/lib/institute-billing-store"],
  },
  transport: {
    components: "@/components/transport",
    lib: ["@/lib/transport-store"],
  },
  timetable: {
    components: "@/components/timetable",
    lib: ["@/lib/timetable-data"],
  },
  templates: {
    components: "@/components/templates",
    lib: ["@/lib/template-management"],
  },
  documents: {
    components: "@/components/documents",
    lib: ["@/lib/documents-data", "@/lib/documents-records-data"],
  },
  academicManagement: {
    components: "@/components/academic-management",
    lib: ["@/lib/academic-management-data", "@/lib/academic-data"],
  },
  auth: {
    root: "@/auth",
  },
} as const;

export type AdminFeatureId = keyof typeof ADMIN_FEATURE_BOUNDARIES;
