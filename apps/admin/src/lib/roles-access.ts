import { useSyncExternalStore } from "react";

import { adminNav } from "@/lib/admin-nav";
import { getInstituteClassSectionOptions } from "@/lib/exam-timetable-data";
import {
  attendanceAdminRoutePermissionsForRole,
  normalizeAttendanceSectionKeys,
} from "@lumenx/module-attendance";
import { normalizePhoneDigits } from "@lumenx/utils";
import { isApiAuthMode } from "@/auth/auth-mode";
import {
  getApiAccessRevision,
  getApiRolePermission,
  subscribeApiAccess,
} from "@/lib/access-roles/runtime-permissions";

export type AccessPermission = "full" | "read" | "none";

export type AccessModule = {
  route: string;
  label: string;
  group: string;
};

export type AccessRole = {
  id: string;
  name: string;
  scope: string;
  description?: string;
  permissions: Record<string, AccessPermission>;
  system?: boolean;
};

export type AccessAssignee = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  password: string;
  roleId: string;
  linkedPersonId?: string;
  linkedPersonType?: "teacher" | "staff";
  status: "active" | "suspended";
  createdAt: string;
  updatedAt: string;
  /**
   * Canonical Attendance section keys (`10::A`) this user may open in Student Attendance.
   * Required for Attendance Coordinator; ignored for institute-wide roles.
   */
  assignedSectionKeys?: string[];
};

export type RolesAccessState = {
  roles: AccessRole[];
  assignees: AccessAssignee[];
};

/** Roles → Attendance Module Access → Student Attendance (assigned classes only). */
export const ATTENDANCE_COORDINATOR_ROLE_ID = "ROL-ATT-COORD";
/** Admin · Monitor Only (Insights / Monitor — cannot mark). */
export const ATTENDANCE_ADMIN_ROLE_ID = "ROL-ATT-ADMIN";
/** Academic Coordinator — view/monitor attendance; never mark. */
export const ACADEMIC_COORDINATOR_ROLE_ID = "ROL-003";

/**
 * System attendance route caps — derived from `@lumenx/module-attendance` persona policy.
 * Do not invent a second matrix here.
 */
function buildAttendanceRoleRouteCaps(): Record<
  string,
  { "/student-attendance": AccessPermission; "/attendance": AccessPermission }
> {
  const roleIds = [
    "ROL-001",
    "ROL-002",
    ATTENDANCE_ADMIN_ROLE_ID,
    ACADEMIC_COORDINATOR_ROLE_ID,
    ATTENDANCE_COORDINATOR_ROLE_ID,
  ];
  const out: Record<
    string,
    { "/student-attendance": AccessPermission; "/attendance": AccessPermission }
  > = {};
  for (const roleId of roleIds) {
    // Vice Principal mirrors Admin · Monitor Only.
    const sourceId = roleId === "ROL-002" ? ATTENDANCE_ADMIN_ROLE_ID : roleId;
    const caps = attendanceAdminRoutePermissionsForRole(sourceId);
    if (!caps) continue;
    out[roleId] = {
      "/student-attendance": caps["/student-attendance"],
      "/attendance": caps["/attendance"],
    };
  }
  return out;
}

const ATTENDANCE_ROLE_ROUTE_CAPS = buildAttendanceRoleRouteCaps();

export const ACCESS_MODULES: readonly AccessModule[] = adminNav.flatMap((group) =>
  group.items
    .filter((item) => item.to !== "/")
    .map((item) => ({ route: item.to, label: item.label, group: group.label })),
);

const STORAGE_KEY = "lx_admin_roles_access_v1";
const listeners = new Set<() => void>();
let stateRevision = 0;

function permissionsFor(
  routes: readonly string[],
  fallback: AccessPermission = "none",
): Record<string, AccessPermission> {
  const selected = new Set(routes);
  return Object.fromEntries(
    ACCESS_MODULES.map((module) => [
      module.route,
      selected.has(module.route) ? "full" : fallback,
    ]),
  );
}

function allPermissions(permission: AccessPermission): Record<string, AccessPermission> {
  return Object.fromEntries(ACCESS_MODULES.map((module) => [module.route, permission]));
}

function defaultCoordinatorAssignedKeys(): string[] {
  try {
    const options = getInstituteClassSectionOptions();
    if (options.length > 0) {
      return normalizeAttendanceSectionKeys(
        options.slice(0, 3).map((o) => o.key),
      );
    }
  } catch {
    // Fall through to static demo keys.
  }
  return ["10::A", "10::B", "9::A"];
}

function seedAttendanceCoordinatorAssignee(): AccessAssignee {
  const now = "2026-07-01T08:00:00.000Z";
  return {
    id: "ADM-ATT-COORD-001",
    name: "Mr. Aditya Sharma",
    email: "coordinator@lumenx.edu",
    phone: "9876543213",
    password: "Admin@1234",
    roleId: ATTENDANCE_COORDINATOR_ROLE_ID,
    linkedPersonId: "T-ATT-COORD",
    linkedPersonType: "teacher",
    status: "active",
    createdAt: now,
    updatedAt: now,
    assignedSectionKeys: defaultCoordinatorAssignedKeys(),
  };
}

const INITIAL_STATE: RolesAccessState = {
  roles: [
    {
      id: "ROL-001",
      name: "Principal · Root",
      scope: "Institute",
      description:
        "Institute-wide access. Attendance is View Only (cannot mark or run monitor actions).",
      permissions: {
        ...allPermissions("full"),
        ...ATTENDANCE_ROLE_ROUTE_CAPS["ROL-001"],
      },
      system: true,
    },
    {
      id: "ROL-002",
      name: "Vice Principal",
      scope: "Institute",
      description: "Institute operations with full academic and service access.",
      permissions: {
        ...allPermissions("full"),
        ...ATTENDANCE_ROLE_ROUTE_CAPS[ATTENDANCE_ADMIN_ROLE_ID],
      },
    },
    {
      id: ATTENDANCE_ADMIN_ROLE_ID,
      name: "Admin · Attendance Monitor",
      scope: "Institute",
      description:
        "Monitor attendance only — Insights / pending alerts. Cannot mark Student Attendance.",
      permissions: {
        ...permissionsFor(["/attendance", "/student-attendance", "/reports", "/alerts"]),
        ...ATTENDANCE_ROLE_ROUTE_CAPS[ATTENDANCE_ADMIN_ROLE_ID],
      },
      system: true,
    },
    {
      id: ACADEMIC_COORDINATOR_ROLE_ID,
      name: "Academic Coordinator",
      scope: "Assigned grades",
      description:
        "Academic operations, communication, and reporting. Attendance is View / Monitor Only — marking requires Attendance Coordinator.",
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
        ...ATTENDANCE_ROLE_ROUTE_CAPS[ACADEMIC_COORDINATOR_ROLE_ID],
      },
    },
    {
      id: ATTENDANCE_COORDINATOR_ROLE_ID,
      name: "Attendance Coordinator",
      scope: "Assigned classes",
      description:
        "Student Attendance only — mark via the shared Attendance Engine for assigned classes.",
      permissions: {
        ...permissionsFor(["/student-attendance", "/attendance"]),
        ...ATTENDANCE_ROLE_ROUTE_CAPS[ATTENDANCE_COORDINATOR_ROLE_ID],
      },
      system: true,
    },
    {
      id: "ROL-004",
      name: "Financial",
      scope: "Institute",
      description: "Fee administration and financial reporting.",
      permissions: permissionsFor(["/students", "/parents", "/fees", "/reports"]),
    },
    {
      id: "ROL-005",
      name: "Books & Fees",
      scope: "Institute",
      description: "Student fee and supporting record access.",
      permissions: permissionsFor(["/students", "/parents", "/fees"]),
    },
  ],
  assignees: [seedAttendanceCoordinatorAssignee()],
};

let cachedState: RolesAccessState | null = null;

function normalizeState(value: RolesAccessState): RolesAccessState {
  const roleById = new Map(
    (value.roles ?? []).map((role) => [
      role.id,
      {
        ...role,
        permissions: Object.fromEntries(
          ACCESS_MODULES.map((module) => [
            module.route,
            role.permissions[module.route] ?? (role.system ? "full" : "none"),
          ]),
        ),
      },
    ]),
  );
  for (const role of INITIAL_STATE.roles) {
    if (!roleById.has(role.id)) roleById.set(role.id, role);
  }

  // Keep system attendance caps in sync (single policy — never drift locally).
  for (const [roleId, caps] of Object.entries(ATTENDANCE_ROLE_ROUTE_CAPS)) {
    const role = roleById.get(roleId);
    if (!role) continue;
    roleById.set(roleId, {
      ...role,
      permissions: { ...role.permissions, ...caps },
    });
  }

  let assignees: AccessAssignee[] = (value.assignees ?? []).map((assignee) => ({
    ...assignee,
    assignedSectionKeys: normalizeAttendanceSectionKeys(
      assignee.assignedSectionKeys ?? [],
    ),
  }));

  const hasCoordinatorAssignee = assignees.some(
    (assignee) =>
      assignee.roleId === ATTENDANCE_COORDINATOR_ROLE_ID ||
      assignee.email?.toLowerCase() === "coordinator@lumenx.edu",
  );
  if (!hasCoordinatorAssignee) {
    assignees = [...assignees, seedAttendanceCoordinatorAssignee()];
  }

  return {
    roles: [...roleById.values()],
    assignees,
  };
}

export function getRolesAccessState(): RolesAccessState {
  if (cachedState) return cachedState;
  if (typeof window === "undefined") return INITIAL_STATE;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    cachedState = raw
      ? normalizeState(JSON.parse(raw) as RolesAccessState)
      : INITIAL_STATE;
  } catch {
    cachedState = INITIAL_STATE;
  }
  return cachedState;
}

function saveState(next: RolesAccessState): void {
  cachedState = normalizeState(next);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cachedState));
  } catch {
    // Keep the current browser-session state if storage is unavailable.
  }
  stateRevision += 1;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useRolesAccess(): RolesAccessState {
  return useSyncExternalStore(subscribe, getRolesAccessState, () => INITIAL_STATE);
}

export function getRolesAccessRevision(): number {
  return stateRevision;
}

export function useRolesAccessRevision(): number {
  return useSyncExternalStore(subscribe, getRolesAccessRevision, () => 0);
}

export function useRolePermission(
  roleId: string | undefined,
  pathname: string,
): AccessPermission {
  useRolesAccessRevision();
  useSyncExternalStore(subscribeApiAccess, getApiAccessRevision, () => 0);
  return getRolePermission(roleId, pathname);
}

export function getRolePermission(
  roleId: string | undefined,
  pathname: string,
): AccessPermission {
  if (isApiAuthMode()) {
    return getApiRolePermission(pathname);
  }
  if (!roleId || pathname === "/") return "full";
  const role = getAccessRole(roleId);
  if (!role) return "full";
  const module = ACCESS_MODULES.filter(
    (item) => pathname === item.route || pathname.startsWith(`${item.route}/`),
  ).sort((a, b) => b.route.length - a.route.length)[0];
  if (!module) return "full";
  return role.permissions[module.route] ?? "none";
}

export function saveAccessRole(role: AccessRole): void {
  const state = getRolesAccessState();
  const exists = state.roles.some((item) => item.id === role.id);
  saveState({
    ...state,
    roles: exists
      ? state.roles.map((item) => (item.id === role.id ? role : item))
      : [...state.roles, role],
  });
}

export function deleteAccessRole(roleId: string): boolean {
  const state = getRolesAccessState();
  if (state.roles.some((role) => role.id === roleId && role.system)) return false;
  if (state.assignees.some((assignee) => assignee.roleId === roleId)) return false;
  saveState({ ...state, roles: state.roles.filter((role) => role.id !== roleId) });
  return true;
}

export function saveAccessAssignee(assignee: AccessAssignee): void {
  const state = getRolesAccessState();
  const email = assignee.email?.trim().toLowerCase();
  const phone = normalizePhone(assignee.phone ?? "");
  const duplicate = state.assignees.find(
    (item) =>
      item.id !== assignee.id &&
      ((assignee.linkedPersonId && item.linkedPersonId === assignee.linkedPersonId) ||
        (email && item.email?.toLowerCase() === email) ||
        (phone && normalizePhone(item.phone ?? "") === phone)),
  );
  if (duplicate) {
    throw new Error("That teacher, email, or mobile number is already assigned.");
  }

  const next: AccessAssignee = {
    ...assignee,
    email: email || undefined,
    assignedSectionKeys: normalizeAttendanceSectionKeys(
      assignee.assignedSectionKeys ?? [],
    ),
  };
  const exists = state.assignees.some((item) => item.id === assignee.id);
  saveState({
    ...state,
    assignees: exists
      ? state.assignees.map((item) => (item.id === assignee.id ? next : item))
      : [...state.assignees, next],
  });
}

export function setAccessAssigneeStatus(
  assigneeId: string,
  status: AccessAssignee["status"],
): void {
  const state = getRolesAccessState();
  saveState({
    ...state,
    assignees: state.assignees.map((item) =>
      item.id === assigneeId
        ? { ...item, status, updatedAt: new Date().toISOString() }
        : item,
    ),
  });
}

export function deleteAccessAssignee(assigneeId: string): void {
  const state = getRolesAccessState();
  saveState({
    ...state,
    assignees: state.assignees.filter((item) => item.id !== assigneeId),
  });
}

export function findAccessAssignee(identifier: string): AccessAssignee | null {
  const email = identifier.trim().toLowerCase();
  const phone = normalizePhone(identifier);
  return (
    getRolesAccessState().assignees.find(
      (item) =>
        item.email?.toLowerCase() === email ||
        Boolean(phone && normalizePhone(item.phone ?? "") === phone),
    ) ?? null
  );
}

export function getAccessRole(roleId?: string): AccessRole | null {
  if (!roleId) return null;
  return getRolesAccessState().roles.find((role) => role.id === roleId) ?? null;
}

export function normalizePhone(value: string): string {
  return normalizePhoneDigits(value);
}

export function createEmptyPermissions(): Record<string, AccessPermission> {
  return allPermissions("none");
}
