/**
 * Shared localStorage key registry for cross-app boundaries.
 * Values are frozen — changing a key is a data migration, not a rename-only edit.
 */

export const ADMIN_STORAGE_KEYS = {
  session: "lx_admin_session_v1",
  remember: "lx_admin_remember",
  demoRegistered: "lx_admin_demo_registered_v1",
  teachers: "lumenx.admin.teachers.v2",
} as const;

/** Shared Admin ↔ Nexus institute self-registration applications (demo). */
export const INSTITUTE_REGISTRATION_STORAGE_KEY =
  "lumenx.platform.instituteRegistrations.v1";
export const INSTITUTE_REGISTRATION_CHANGED_EVENT =
  "lumenx-institute-registrations-changed";

/** Unified subscription lifecycle + renewals (Admin ↔ Nexus). */
export const SUBSCRIPTION_STORAGE_KEY = "lumenx.platform.subscriptions.v1";
export const SUBSCRIPTION_CHANGED_EVENT = "lumenx-subscriptions-changed";
