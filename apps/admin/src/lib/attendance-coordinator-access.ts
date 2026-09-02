/**
 * Admin attendance access — maps AuthUser → shared Attendance permissions.
 * All persona / mark / scope / route-cap rules live in `@lumenx/module-attendance`.
 * Do not re-implement Teacher / Class Teacher / Coordinator / Admin / Principal matrices here.
 *
 * Section keys always use the Attendance canonical form (`10::B`), never exam
 * `Grade 10::B` option keys.
 *
 * Academic Coordinator (ROL-003) ≠ Attendance Coordinator (ROL-ATT-COORD).
 */

import type { AuthUser } from "@/auth/types";
import { isApiAuthMode } from "@/auth/auth-mode";
import { getApiAccessState } from "@/lib/access-roles/runtime-permissions";
import {
  demoRoleIdForSystemKey,
  isAttendanceCoordinatorSystemKey,
} from "@/lib/access-roles/system-keys";
import {
  ATTENDANCE_COORDINATOR_ROLE_ID,
  findAccessAssignee,
  getAccessRole,
  type AccessAssignee,
} from "@/lib/roles-access";
import { loadClassDirectory, type ClassSection } from "@/lib/class-directory-store";
import { getInstituteClassSectionOptions } from "@/lib/exam-timetable-data";
import {
  attendanceActorFlagsForSection,
  attendancePermissionBanner,
  canonicalAttendanceClassId,
  canonicalAttendanceSectionKey,
  isAttendanceSectionAllowed,
  normalizeAttendanceSectionKey,
  resolveAttendancePermission,
  resolveAttendancePersonaFromAdminRoleId,
  type AttendanceActor,
  type AttendancePermissionDecision,
  type AttendancePersona,
} from "@lumenx/module-attendance";

export type AttendanceModuleAccess = AttendancePermissionDecision & {
  assignee: AccessAssignee | null;
  /** @deprecated use persona === "attendance_coordinator" */
  isAttendanceCoordinator: boolean;
  /**
   * Route-level mirror for Student Attendance workspace.
   * Always derived from persona.routeCaps — never invent a second matrix.
   */
  permission: "full" | "read" | "none";
};

/** Canonical attendance section key for a class directory row. */
export function sectionKeyForClassSection(row: ClassSection): string {
  return canonicalAttendanceSectionKey(
    row.timetableGrade || row.name,
    row.section,
  );
}

/** Canonical class id for attendance (display labels stay in UI). */
export function attendanceClassIdForSection(row: ClassSection): string {
  return canonicalAttendanceClassId(row.timetableGrade || row.name);
}

export function resolveClassSection(
  classId: string,
  sectionId: string,
): ClassSection | null {
  if (!classId || !sectionId) return null;
  const wantClass = canonicalAttendanceClassId(classId);
  return (
    loadClassDirectory().find((row) => {
      if (row.id !== sectionId) return false;
      const rowClass = canonicalAttendanceClassId(
        row.timetableGrade || row.levelId || row.name,
      );
      return (
        rowClass === wantClass ||
        row.timetableGrade === classId ||
        row.levelId === classId ||
        row.name === classId
      );
    }) ?? null
  );
}

/** Map Admin auth / Roles & Access → attendance persona (module lookup only). */
export function resolveAdminAttendancePersona(
  user: AuthUser | null | undefined,
  assignee: AccessAssignee | null,
): AttendancePersona {
  const roleId = user?.accessRoleId ?? assignee?.roleId;
  if (
    roleId === ATTENDANCE_COORDINATOR_ROLE_ID ||
    assignee?.roleId === ATTENDANCE_COORDINATOR_ROLE_ID
  ) {
    return "attendance_coordinator";
  }
  // Demo principal@ is stored as super_admin without always setting ROL-001
  if (user?.role === "super_admin" || user?.role === "principal") {
    return "principal";
  }
  return resolveAttendancePersonaFromAdminRoleId(roleId);
}

export function getAttendanceModuleAccess(
  user: AuthUser | null | undefined,
): AttendanceModuleAccess {
  if (!user) {
    const decision = resolveAttendancePermission({ persona: "principal" });
    return {
      ...decision,
      canMark: false,
      canMonitor: false,
      canView: false,
      assignee: null,
      isAttendanceCoordinator: false,
      permission: "none",
    };
  }

  if (isApiAuthMode()) {
    const api = getApiAccessState();
    const effectiveRoleId =
      user.accessRoleId ?? demoRoleIdForSystemKey(api.accessRoleSystemKey);
    const persona = isAttendanceCoordinatorSystemKey(api.accessRoleSystemKey)
      ? "attendance_coordinator"
      : resolveAdminAttendancePersona({ ...user, accessRoleId: effectiveRoleId }, null);
    const assignedSectionKeys =
      persona === "attendance_coordinator" ? [...api.assignedSectionKeys] : [];
    const decision = resolveAttendancePermission({
      persona,
      assignedSectionKeys,
    });
    return {
      ...decision,
      assignee: null,
      isAttendanceCoordinator: persona === "attendance_coordinator",
      permission: decision.routeCaps.studentAttendance,
    };
  }

  const assignee =
    findAccessAssignee(user.email) ??
    findAccessAssignee(user.phone ?? "") ??
    null;

  const persona = resolveAdminAttendancePersona(user, assignee);
  const assignedSectionKeys =
    persona === "attendance_coordinator"
      ? [...(assignee?.assignedSectionKeys ?? [])]
      : [];

  const decision = resolveAttendancePermission({
    persona,
    assignedSectionKeys,
  });

  return {
    ...decision,
    assignee,
    isAttendanceCoordinator: persona === "attendance_coordinator",
    permission: decision.routeCaps.studentAttendance,
  };
}

export function filterClassSectionsForAccess(
  sections: ClassSection[],
  access: AttendanceModuleAccess,
): ClassSection[] {
  if (access.scopeMode === "institute") return sections;
  if (
    access.scopeMode === "assigned_classes" ||
    access.scopeMode === "assigned_class"
  ) {
    if (access.assignedSectionKeys.length === 0) return [];
    const allowed = new Set(
      access.assignedSectionKeys.map(normalizeAttendanceSectionKey),
    );
    return sections.filter((row) =>
      allowed.has(sectionKeyForClassSection(row)),
    );
  }
  return sections;
}

export function isSectionKeyAllowed(
  sectionKey: string,
  access: AttendanceModuleAccess,
): boolean {
  return isAttendanceSectionAllowed(sectionKey, access);
}

export function buildAdminAttendanceActor(
  user: AuthUser,
  opts: { sectionKey: string },
): AttendanceActor {
  const access = getAttendanceModuleAccess(user);
  const isCoordinator = access.persona === "attendance_coordinator";
  const flags = attendanceActorFlagsForSection(access, opts.sectionKey, {
    isClassTeacherForSection: false,
    isAttendanceIncharge: isCoordinator,
    teachesSection: false,
  });
  return {
    teacherId: user.id,
    teacherName: user.name,
    subjects: [],
    ...flags,
  };
}

export function adminAttendanceAccessBanner(access: AttendanceModuleAccess): string | null {
  return attendancePermissionBanner(access);
}

export function getAccessRoleName(user: AuthUser | null | undefined): string | null {
  if (!user?.accessRoleId) return null;
  return getAccessRole(user.accessRoleId)?.name ?? null;
}

/** Class · section options with canonical Attendance keys (`10::B`) for coordinator assign. */
export function getAttendanceClassSectionOptions(): {
  key: string;
  grade: string;
  section: string;
  label: string;
}[] {
  return getInstituteClassSectionOptions().map((o) => ({
    key: canonicalAttendanceSectionKey(o.grade, o.section),
    grade: o.grade,
    section: o.section,
    label: o.label,
  }));
}
