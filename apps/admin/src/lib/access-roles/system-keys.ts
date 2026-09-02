/** Maps backend institute_access_role.system_key → demo Roles & Access ids / behavior. */

export const ACCESS_ROLE_SYSTEM_KEYS = {
  principalRoot: "principal_root",
  vicePrincipal: "vice_principal",
  attendanceMonitor: "attendance_monitor",
  academicCoordinator: "academic_coordinator",
  attendanceCoordinator: "attendance_coordinator",
  financial: "financial",
  booksFees: "books_fees",
} as const;

/** Demo localStorage role ids — used by @lumenx/module-attendance persona lookup. */
export const DEMO_ROLE_ID_BY_SYSTEM_KEY: Record<string, string> = {
  [ACCESS_ROLE_SYSTEM_KEYS.principalRoot]: "ROL-001",
  [ACCESS_ROLE_SYSTEM_KEYS.vicePrincipal]: "ROL-002",
  [ACCESS_ROLE_SYSTEM_KEYS.attendanceMonitor]: "ROL-ATT-ADMIN",
  [ACCESS_ROLE_SYSTEM_KEYS.academicCoordinator]: "ROL-003",
  [ACCESS_ROLE_SYSTEM_KEYS.attendanceCoordinator]: "ROL-ATT-COORD",
};

export function isAttendanceCoordinatorSystemKey(
  systemKey: string | null | undefined,
): boolean {
  return systemKey === ACCESS_ROLE_SYSTEM_KEYS.attendanceCoordinator;
}

export function isAttendanceCoordinatorRole(role: {
  systemKey?: string | null;
}): boolean {
  return isAttendanceCoordinatorSystemKey(role.systemKey);
}

export function demoRoleIdForSystemKey(
  systemKey: string | null | undefined,
): string | undefined {
  if (!systemKey) return undefined;
  return DEMO_ROLE_ID_BY_SYSTEM_KEY[systemKey];
}
