import type { AccessPermission } from "./types";
import { fetchMyAccessPermissions } from "./api";
import { isApiAuthMode } from "@/auth/auth-mode";

type RuntimeAccessState = {
  instituteId: string | null;
  accessRoleId: string | null;
  accessRoleName: string | null;
  accessRoleSystemKey: string | null;
  permissions: Record<string, AccessPermission>;
  assignedSectionKeys: string[];
  instituteWide: boolean;
};

const listeners = new Set<() => void>();
let state: RuntimeAccessState = {
  instituteId: null,
  accessRoleId: null,
  accessRoleName: null,
  accessRoleSystemKey: null,
  permissions: {},
  assignedSectionKeys: [],
  instituteWide: false,
};
let revision = 0;

function emit(): void {
  revision += 1;
  listeners.forEach((l) => l());
}

export function getApiAccessRevision(): number {
  return revision;
}

export function subscribeApiAccess(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getApiAccessState(): RuntimeAccessState {
  return state;
}

export function clearApiAccessState(): void {
  state = {
    instituteId: null,
    accessRoleId: null,
    accessRoleName: null,
    accessRoleSystemKey: null,
    permissions: {},
    assignedSectionKeys: [],
    instituteWide: false,
  };
  emit();
}

export async function syncApiAccessPermissions(instituteId: string | null): Promise<void> {
  if (!isApiAuthMode() || !instituteId) {
    clearApiAccessState();
    return;
  }
  try {
    const data = await fetchMyAccessPermissions(instituteId);
    state = {
      instituteId,
      accessRoleId: data.accessRoleId,
      accessRoleName: data.accessRoleName,
      accessRoleSystemKey: data.accessRoleSystemKey,
      permissions: data.permissions,
      assignedSectionKeys: data.assignedSectionKeys,
      instituteWide: data.instituteWide,
    };
    emit();
  } catch {
    // Fail closed for custom roles; institute-wide admins still get full via backend.
    state = {
      instituteId,
      accessRoleId: null,
      accessRoleName: null,
      accessRoleSystemKey: null,
      permissions: {},
      assignedSectionKeys: [],
      instituteWide: false,
    };
    emit();
  }
}

export function getApiRolePermission(pathname: string): AccessPermission {
  if (pathname === "/") return "full";
  if (state.instituteWide) return "full";
  const modules = Object.keys(state.permissions);
  const module = modules
    .filter((route) => pathname === route || pathname.startsWith(`${route}/`))
    .sort((a, b) => b.length - a.length)[0];
  if (!module) {
    // Unknown route — allow home/settings-ish paths for institute-wide already handled.
    return state.accessRoleId ? "none" : "full";
  }
  return state.permissions[module] ?? "none";
}
