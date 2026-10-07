import type { SupabaseClient } from "@supabase/supabase-js";
import type { Actor } from "../../auth/types.js";
import { AppError } from "../../errors/app-error.js";
import { findDriverByUserProfileId } from "../transport/repository.js";
import type { DeviceApp } from "./types.js";

const STAFF_DEVICE_ROLES = new Set([
  "institute_admin",
  "principal",
  "vice_principal",
  "coordinator",
  "teacher",
  "accountant",
  "admissions_officer",
  "it_admin",
  "staff",
]);

function hasStaffRole(actor: Actor): boolean {
  if (actor.isPlatformOperator) return true;
  if (actor.staff.length > 0) return true;
  return actor.memberships.some((m) =>
    m.roles.some((r) => STAFF_DEVICE_ROLES.has(r)),
  );
}

/**
 * Prevents clients from registering an FCM token under an app they should not use.
 * Allowlist is already enforced by Zod; this adds role / binding checks.
 */
export async function assertActorMayRegisterDeviceApp(
  admin: SupabaseClient,
  actor: Actor,
  app: DeviceApp,
): Promise<void> {
  switch (app) {
    case "connect":
    case "careers":
    case "admissions":
      return;
    case "nexus":
      if (!actor.isPlatformOperator) {
        throw AppError.forbidden("Nexus device tokens require a platform operator");
      }
      return;
    case "admin":
      if (!hasStaffRole(actor)) {
        throw AppError.forbidden("Admin device tokens require staff permissions");
      }
      return;
    case "transport": {
      if (hasStaffRole(actor)) return;
      for (const m of actor.memberships) {
        const driver = await findDriverByUserProfileId(
          admin,
          actor.userId,
          m.instituteId,
        );
        if (driver && !driver.deleted_at) return;
      }
      throw AppError.forbidden(
        "Transport device tokens require a driver profile or staff permissions",
      );
    }
    default: {
      const _exhaustive: never = app;
      throw AppError.validation(`Unsupported app: ${String(_exhaustive)}`);
    }
  }
}
