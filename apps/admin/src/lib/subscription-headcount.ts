/**
 * Mirror Admin student headcount into subscription adjustments (legacy cookie path).
 * In API mode, subscription headcount is authoritative on the backend
 * (`subscriptions.active_student_count`) — do not overwrite from local directory.
 */

import { getAdminBoundNexusInstituteId } from "@lumenx/config";
import {
  getInstituteSubscription,
  startInstituteTrial,
  syncPostRenewalHeadcount,
  type BillingAdjustment,
} from "@lumenx/utils";
import { isApiAuthMode } from "@/auth/auth-mode";
import { readRegisteredAdminTenant } from "@/lib/admin-tenant";
import { loadStudentDirectory } from "@/lib/student-directory-store";

/** Count students that consume a subscription seat (exclude archived if present). */
export function countActiveStudentsForSubscription(): number {
  if (isApiAuthMode()) {
    // Local directory is empty in API mode; never report a fake zero as SoT.
    return 0;
  }
  const rows = loadStudentDirectory();
  return rows.filter((s) => {
    const status = (s as { status?: string }).status;
    if (status === "archived" || status === "graduated" || status === "withdrawn") {
      return false;
    }
    return true;
  }).length;
}

/** Prefer the registered Nexus institute id over the default demo binding. */
export function resolveHeadcountInstituteId(): string {
  const tenant = readRegisteredAdminTenant();
  if (tenant?.instituteId?.trim()) return tenant.instituteId.trim();
  return getAdminBoundNexusInstituteId();
}

/**
 * Call after individual create, bulk import, or admission convert.
 * Creates/updates ONE consolidated pending adjustment when charge applies.
 * No-op in API mode — backend subscription records own headcount.
 */
export function syncSubscriptionHeadcountAfterStudentChange(): BillingAdjustment | null {
  if (isApiAuthMode()) {
    return null;
  }
  const instituteId = resolveHeadcountInstituteId();
  const liveStudentCount = countActiveStudentsForSubscription();
  const tenant = readRegisteredAdminTenant();

  if (!getInstituteSubscription(instituteId)) {
    startInstituteTrial({
      instituteId,
      instituteName: tenant?.instituteName?.trim() || instituteId,
      activeStudentCount: liveStudentCount,
    });
    return null;
  }

  return syncPostRenewalHeadcount({ instituteId, liveStudentCount });
}
