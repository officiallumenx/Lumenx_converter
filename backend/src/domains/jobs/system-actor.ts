/**
 * Synthetic platform-operator actor for background workers.
 * Used only for authorization bypasses (list/evaluate); notification
 * creators should prefer a real institute membership user id when available.
 */
import type { Actor } from "../../auth/types.js";

export const SYSTEM_WORKER_USER_ID =
  "00000000-0000-4000-8000-000000000001";

export function createSystemWorkerActor(): Actor {
  return {
    userId: SYSTEM_WORKER_USER_ID,
    profileId: SYSTEM_WORKER_USER_ID,
    displayName: "LumenX System Worker",
    email: null,
    profileStatus: "active",
    memberships: [],
    isPlatformOperator: true,
    platformRoleCode: "nexus_root",
    teachers: [],
    students: [],
    parents: [],
    staff: [],
  };
}
