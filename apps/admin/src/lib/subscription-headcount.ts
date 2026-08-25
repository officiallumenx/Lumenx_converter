/**
 * Mirror Admin student directory headcount into subscription + post-renewal adjustments.
 * Safe during trial (no charge). Never rewrites renewal snapshots.
 */

import { getAdminBoundNexusInstituteId } from "@lumenx/config";
import {
  syncPostRenewalHeadcount,
  type BillingAdjustment,
} from "@lumenx/utils";
import { loadStudentDirectory } from "@/lib/student-directory-store";

/** Count students that consume a subscription seat (exclude archived if present). */
export function countActiveStudentsForSubscription(): number {
  const rows = loadStudentDirectory();
  return rows.filter((s) => {
    const status = (s as { status?: string }).status;
    if (status === "archived" || status === "graduated" || status === "withdrawn") {
      return false;
    }
    return true;
  }).length;
}

/**
 * Call after individual create, bulk import, or admission convert.
 * Creates/updates ONE consolidated pending adjustment when charge applies.
 */
export function syncSubscriptionHeadcountAfterStudentChange(): BillingAdjustment | null {
  const instituteId = getAdminBoundNexusInstituteId();
  const liveStudentCount = countActiveStudentsForSubscription();
  return syncPostRenewalHeadcount({ instituteId, liveStudentCount });
}
