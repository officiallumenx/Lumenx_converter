/**
 * Workspace architecture — ownership and import boundaries.
 * Does not change runtime behavior; documents and enforces monorepo structure.
 */

import { MODULE_REGISTRY, type OwnerApp } from "./modules";

export type WorkspaceAppId = OwnerApp;

/** Top-level apps and their intended responsibility. */
export const WORKSPACE_APPS = {
  admin: {
    id: "admin" as const,
    packageName: "@lumenx/app-admin",
    owns: "Institute administration UI and admin-local stores",
  },
  connect: {
    id: "connect" as const,
    packageName: "@lumenx/app-connect",
    owns: "Parent / teacher / student portals and public admissions/careers",
  },
  nexus: {
    id: "nexus" as const,
    packageName: "@lumenx/app-nexus",
    owns: "Platform / licensing shell",
  },
  transport: {
    id: "transport" as const,
    packageName: "@lumenx/app-transport",
    owns: "Driver transport client",
  },
} as const;

/**
 * Shared packages that apps may import.
 * Apps must not import other apps.
 */
export const SHARED_PACKAGE_ALLOWLIST = [
  "@lumenx/config",
  "@lumenx/types",
  "@lumenx/utils",
  "@lumenx/ui",
  "@lumenx/ui-admin",
  "@lumenx/auth",
  "@lumenx/database",
  "@lumenx/capacitor",
  "@lumenx/teacher-session",
  "@lumenx/notifications",
  ...MODULE_REGISTRY.map((m) => m.packageName),
] as const;

/** Connect feature portals — import via their public `index.ts` when possible. */
export const CONNECT_FEATURE_PORTALS = [
  "teacher-portal",
  "student-portal",
  "parent-portal",
  "admissions-portal",
  "careers-portal",
  "activity-workspace",
] as const;

export function modulesOwnedBy(app: OwnerApp) {
  return MODULE_REGISTRY.filter((m) => m.owner === app);
}
