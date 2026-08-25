/**
 * Projects Nexus licensing truth onto the institute directory (demo).
 * Licensing store remains the single write source of truth for plan/modules/billing.
 * Directory is a read projection for portfolio UIs — never a second entitlement SoT.
 */

import {
  pendingAmountInr,
  paymentStatusFor,
  type InstituteLicense,
} from "@/lib/institute-licensing-store";

let projecting = false;

function directoryPaymentStatus(
  lic: InstituteLicense,
): "paid" | "partial" | "pending" | "overdue" {
  const pending = pendingAmountInr(lic);
  if (pending <= 0) return "paid";
  const status = paymentStatusFor(lic);
  if (status === "overdue") return "overdue";
  if (lic.paidAmountInr > 0) return "partial";
  return "pending";
}

/**
 * Mirror every license onto matching directory rows.
 * Uses dynamic import to avoid a static cycle with institute-directory-store.
 */
export function projectLicensesToDirectory(
  licenses: Record<string, InstituteLicense>,
): void {
  if (typeof window === "undefined" || projecting) return;
  projecting = true;
  void import("@/lib/institute-directory-store")
    .then((dir) => {
      try {
        for (const lic of Object.values(licenses)) {
          dir.syncDirectoryFromLicense({
            instituteId: lic.instituteId,
            plan: lic.plan,
            billingCadence: lic.cadence,
            amountInr: lic.amountInr,
            paidAmountInr: lic.paidAmountInr,
            billingStartAt: lic.startAt,
            modules: lic.modules,
            paymentStatus: directoryPaymentStatus(lic),
          });
        }
      } finally {
        projecting = false;
      }
    })
    .catch(() => {
      projecting = false;
    });
}
