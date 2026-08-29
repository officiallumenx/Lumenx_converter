import type { SupabaseClient } from "@supabase/supabase-js";
import type { Actor } from "../../auth/types.js";
import {
  assertInstituteRoles,
  requireInstituteId,
} from "../../authorization/index.js";
import {
  findLicenseByInstituteId,
  findSubscriptionByInstituteId,
  listEntitlementsForLicense,
} from "../nexus/repository.js";
import { STUDENT_STAFF_READ_ROLES } from "../students/service.js";
import type { InstituteSubscriptionCurrentDto } from "./types.js";

const DEFAULT_MODULES: Record<string, boolean> = {
  students: true,
  teachers: true,
  parents: true,
  attendance: true,
  fees: true,
  analytics: true,
  reports: true,
  alerts: true,
};

function assertSubscriptionReader(actor: Actor, instituteId: string): void {
  requireInstituteId(actor, instituteId);
  if (actor.isPlatformOperator) return;
  assertInstituteRoles(actor, instituteId, [...STUDENT_STAFF_READ_ROLES]);
}

/**
 * Read current institute subscription for Admin modules page.
 * Uses nexus subscription/license tables when present; otherwise safe defaults
 * after institute access check (Stage 9 — not a billing writer API).
 */
export async function getCurrentSubscriptionForActor(
  admin: SupabaseClient,
  actor: Actor,
  instituteIdRaw: string,
): Promise<InstituteSubscriptionCurrentDto> {
  const instituteId = requireInstituteId(actor, instituteIdRaw);
  assertSubscriptionReader(actor, instituteId);

  try {
    const [sub, license] = await Promise.all([
      findSubscriptionByInstituteId(admin, instituteId),
      findLicenseByInstituteId(admin, instituteId),
    ]);

    let modules = { ...DEFAULT_MODULES };
    if (license) {
      const entitlements = await listEntitlementsForLicense(admin, license.id);
      const adminMods = entitlements.filter((e) => e.scope === "admin_module");
      if (adminMods.length > 0) {
        modules = {};
        for (const e of adminMods) {
          modules[e.target_id] = e.enabled;
        }
      }
    }

    return {
      plan: license?.plan ?? "core",
      status: sub?.lifecycle_status ?? "registered",
      modules,
      studentLimit: sub?.active_student_count ?? 0,
    };
  } catch {
    return {
      plan: "core",
      status: "registered",
      modules: { ...DEFAULT_MODULES },
      studentLimit: 0,
    };
  }
}
