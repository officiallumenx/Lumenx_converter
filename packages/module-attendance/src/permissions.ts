/**
 * Attendance permissions — single source of truth.
 * Never duplicate persona / scope / mark-vs-view / route-cap matrices in Admin or Connect.
 *
 * Teacher                 → Own classes only (mark) — Connect
 * Class Teacher           → Assigned class (mark) — Connect
 * Attendance Coordinator  → Assigned classes (mark + monitor) — Admin ROL-ATT-COORD
 * Academic Coordinator    → Institute view/monitor (no mark) — Admin ROL-003
 * Admin                   → Institute monitor only (no mark)
 * Principal               → Institute view only
 *
 * Persona ≠ Taken By. Actor flags must be factual; ownership runs only in
 * `resolveMarkableSlots` from configuration.
 */

import {
  normalizeAttendanceSectionKey,
  normalizeAttendanceSectionKeys,
} from "./identity";

export type AttendancePersona =
  | "teacher"
  | "class_teacher"
  | "attendance_coordinator"
  | "academic_coordinator"
  | "admin"
  | "principal";

export type AttendanceScopeMode =
  | "own_classes"
  | "assigned_class"
  | "assigned_classes"
  | "institute";

export type AttendanceRoutePermission = "full" | "read" | "none";

/** Admin route caps that must stay in lockstep with persona policy. */
export type AttendancePersonaRouteCaps = {
  /** `/student-attendance` — mark sheet workspace */
  studentAttendance: AttendanceRoutePermission;
  /** `/attendance` — Insights / Monitor / Reports */
  attendanceInsights: AttendanceRoutePermission;
};

export type AttendancePermissionDecision = {
  persona: AttendancePersona;
  /** May call saveSlotAttendance for in-scope sections. */
  canMark: boolean;
  /** May use Monitor / pending alerts / coordinator ops. */
  canMonitor: boolean;
  /** May open attendance screens (read). */
  canView: boolean;
  scopeMode: AttendanceScopeMode;
  /**
   * Allow-list for assigned_class / assigned_classes.
   * Empty for own_classes / institute (caller supplies taught keys / all).
   */
  assignedSectionKeys: string[];
  label: string;
  description: string;
  /** Route caps derived from the same persona policy (Admin nav / Roles & Access). */
  routeCaps: AttendancePersonaRouteCaps;
};

type PersonaPolicy = Omit<AttendancePermissionDecision, "assignedSectionKeys">;

const PERSONA_POLICY: Record<AttendancePersona, PersonaPolicy> = {
  teacher: {
    persona: "teacher",
    canMark: true,
    canMonitor: false,
    canView: true,
    scopeMode: "own_classes",
    label: "Teacher",
    description: "Mark attendance for own classes only.",
    routeCaps: { studentAttendance: "full", attendanceInsights: "none" },
  },
  class_teacher: {
    persona: "class_teacher",
    canMark: true,
    canMonitor: false,
    canView: true,
    scopeMode: "assigned_class",
    label: "Class Teacher",
    description: "Mark attendance for the assigned class only.",
    routeCaps: { studentAttendance: "full", attendanceInsights: "none" },
  },
  attendance_coordinator: {
    persona: "attendance_coordinator",
    canMark: true,
    canMonitor: true,
    canView: true,
    scopeMode: "assigned_classes",
    label: "Attendance Coordinator",
    description: "Mark attendance for assigned classes only.",
    routeCaps: { studentAttendance: "full", attendanceInsights: "full" },
  },
  academic_coordinator: {
    persona: "academic_coordinator",
    canMark: false,
    canMonitor: true,
    canView: true,
    scopeMode: "institute",
    label: "Academic Coordinator",
    description:
      "View and monitor attendance — cannot mark (not the Attendance Coordinator role).",
    routeCaps: { studentAttendance: "read", attendanceInsights: "read" },
  },
  admin: {
    persona: "admin",
    canMark: false,
    canMonitor: true,
    canView: true,
    scopeMode: "institute",
    label: "Admin",
    description: "Monitor attendance only — cannot mark.",
    routeCaps: { studentAttendance: "read", attendanceInsights: "full" },
  },
  principal: {
    persona: "principal",
    canMark: false,
    canMonitor: false,
    canView: true,
    scopeMode: "institute",
    label: "Principal",
    description: "View attendance only — cannot mark or run monitor actions.",
    routeCaps: { studentAttendance: "read", attendanceInsights: "read" },
  },
};

/**
 * Admin Roles & Access role id → Attendance persona.
 * Academic Coordinator (ROL-003) is NOT Attendance Coordinator (ROL-ATT-COORD).
 */
export const ADMIN_ROLE_TO_ATTENDANCE_PERSONA: Record<string, AttendancePersona> = {
  "ROL-001": "principal",
  "ROL-002": "admin",
  "ROL-ATT-ADMIN": "admin",
  "ROL-003": "academic_coordinator",
  "ROL-ATT-COORD": "attendance_coordinator",
};

export const ATTENDANCE_PERSONA_OPTIONS: {
  value: AttendancePersona;
  label: string;
  description: string;
}[] = (Object.keys(PERSONA_POLICY) as AttendancePersona[]).map((value) => ({
  value,
  label: PERSONA_POLICY[value].label,
  description: PERSONA_POLICY[value].description,
}));

/** Route caps for a persona — Roles & Access / nav must use these, not a second matrix. */
export function attendanceRouteCapsForPersona(
  persona: AttendancePersona,
): AttendancePersonaRouteCaps {
  return { ...PERSONA_POLICY[persona].routeCaps };
}

/** Build Admin `/student-attendance` + `/attendance` permission map for a role id. */
export function attendanceAdminRoutePermissionsForRole(
  roleId: string,
): { "/student-attendance": AttendanceRoutePermission; "/attendance": AttendanceRoutePermission } | null {
  const persona = ADMIN_ROLE_TO_ATTENDANCE_PERSONA[roleId];
  if (!persona) return null;
  const caps = attendanceRouteCapsForPersona(persona);
  return {
    "/student-attendance": caps.studentAttendance,
    "/attendance": caps.attendanceInsights,
  };
}

/**
 * Resolve attendance capabilities for a persona.
 * Apps must call this instead of inventing local permission matrices.
 */
export function resolveAttendancePermission(input: {
  persona: AttendancePersona;
  assignedSectionKeys?: readonly string[];
}): AttendancePermissionDecision {
  const policy = PERSONA_POLICY[input.persona];
  const keys =
    policy.scopeMode === "assigned_class" || policy.scopeMode === "assigned_classes"
      ? normalizeAttendanceSectionKeys(input.assignedSectionKeys ?? [])
      : [];
  return {
    ...policy,
    routeCaps: { ...policy.routeCaps },
    assignedSectionKeys: keys,
  };
}

/**
 * Map Admin accessRoleId → persona (single lookup).
 * Unknown roles default to admin (monitor-only) — never to attendance_coordinator.
 */
export function resolveAttendancePersonaFromAdminRoleId(
  roleId: string | null | undefined,
): AttendancePersona {
  if (!roleId) return "admin";
  return ADMIN_ROLE_TO_ATTENDANCE_PERSONA[roleId] ?? "admin";
}

/**
 * Whether a section key is in scope for this permission decision.
 * - own_classes → must appear in `taughtSectionKeys`
 * - assigned_class / assigned_classes → must appear in decision.assignedSectionKeys
 * - institute → always true when canView
 */
export function isAttendanceSectionAllowed(
  sectionKey: string,
  decision: AttendancePermissionDecision,
  opts?: {
    taughtSectionKeys?: readonly string[];
  },
): boolean {
  if (!decision.canView) return false;
  const want = normalizeAttendanceSectionKey(sectionKey);
  if (!want) return false;

  switch (decision.scopeMode) {
    case "institute":
      return true;
    case "own_classes":
      return (opts?.taughtSectionKeys ?? []).some(
        (k) => normalizeAttendanceSectionKey(k) === want,
      );
    case "assigned_class":
    case "assigned_classes":
      return decision.assignedSectionKeys.some(
        (k) => normalizeAttendanceSectionKey(k) === want,
      );
    default:
      return false;
  }
}

/** Filter section keys by the single permission decision. */
export function filterAttendanceSectionKeys(
  sectionKeys: readonly string[],
  decision: AttendancePermissionDecision,
  opts?: { taughtSectionKeys?: readonly string[] },
): string[] {
  return sectionKeys.filter((key) =>
    isAttendanceSectionAllowed(key, decision, opts),
  );
}

export type AttendanceActorFacts = {
  /** Factual: class teacher of this section. */
  isClassTeacherForSection: boolean;
  /** Factual: designated attendance coordinator / incharge. */
  isAttendanceIncharge: boolean;
  /** Factual: teaches this section (any subject). */
  teachesSection: boolean;
};

/**
 * Combine permission scope with factual assignment flags for the engine actor.
 * Does NOT spoof Taken By roles from persona — configuration owner decides markability.
 */
export function attendanceActorFlagsForSection(
  decision: AttendancePermissionDecision,
  sectionKey: string,
  opts: {
    taughtSectionKeys?: readonly string[];
  } & AttendanceActorFacts,
): AttendanceActorFacts {
  const inScope = isAttendanceSectionAllowed(sectionKey, decision, {
    taughtSectionKeys: opts.taughtSectionKeys,
  });
  if (!decision.canMark || !inScope) {
    return {
      isClassTeacherForSection: false,
      isAttendanceIncharge: false,
      teachesSection: false,
    };
  }

  return {
    isClassTeacherForSection: Boolean(opts.isClassTeacherForSection),
    isAttendanceIncharge: Boolean(opts.isAttendanceIncharge),
    teachesSection: Boolean(opts.teachesSection),
  };
}

export function attendancePermissionBanner(
  decision: AttendancePermissionDecision,
): string | null {
  if (!decision.canView) {
    return "You do not have access to attendance.";
  }
  if (decision.persona === "principal") {
    return "Principal · View Only — attendance marking and monitor actions are disabled.";
  }
  if (decision.persona === "admin") {
    return "Admin · Monitor Only — use Insights / Monitor; marking is disabled.";
  }
  if (decision.persona === "academic_coordinator") {
    return "Academic Coordinator · View / Monitor Only — marking requires the Attendance Coordinator role.";
  }
  if (
    decision.persona === "attendance_coordinator" &&
    decision.assignedSectionKeys.length === 0
  ) {
    return "No classes are assigned to this Attendance Coordinator.";
  }
  return null;
}

/** Stable matrix for permission reports / verification. */
export function listAttendancePermissionMatrix(): AttendancePermissionDecision[] {
  return (Object.keys(PERSONA_POLICY) as AttendancePersona[]).map((persona) =>
    resolveAttendancePermission({ persona }),
  );
}
