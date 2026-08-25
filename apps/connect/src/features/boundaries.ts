/**
 * Connect feature portals — structural map for import organization.
 * Prefer `@/teacher-portal`, `@/student-portal`, etc. public barrels over deep paths.
 */

export const CONNECT_FEATURE_BOUNDARIES = {
  teacherPortal: {
    publicApi: "@/teacher-portal",
    data: "@/lib/teacher",
  },
  studentPortal: {
    publicApi: "@/student-portal",
    data: "@/lib/student",
  },
  parentPortal: {
    publicApi: "@/parent-portal",
    data: "@/lib/parent-portal-data",
  },
  admissionsPortal: {
    publicApi: "@/admissions-portal",
    data: "@/lib/admissions",
  },
  careersPortal: {
    publicApi: "@/careers-portal",
    data: "@/lib/careers",
  },
  activityWorkspace: {
    publicApi: "@/activity-workspace",
    data: "@/lib/activity",
  },
} as const;

export type ConnectFeatureId = keyof typeof CONNECT_FEATURE_BOUNDARIES;
