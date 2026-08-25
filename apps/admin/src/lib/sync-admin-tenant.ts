import {
  bindRegisteredAdminTenant,
  clearRegisteredAdminTenant,
  readRegisteredAdminTenant,
} from "@/lib/admin-tenant";
import {
  findInstituteRegistrationByEmail,
  syncAdminReadOnlyFromSubscription,
} from "@lumenx/utils";
import type { AuthUser } from "@/auth/types";

/**
 * Bind empty registered-tenant data after Nexus approval, or restore demo scope for demo users.
 */
export function syncAdminTenantForUser(user: AuthUser | null): void {
  if (!user?.email) return;
  const app = findInstituteRegistrationByEmail(user.email);
  if (app?.status === "approved" && app.approvedInstituteId) {
    bindRegisteredAdminTenant({
      instituteId: app.approvedInstituteId,
      instituteName: app.payload.instituteName,
      payload: app.payload,
    });
    syncAdminReadOnlyFromSubscription(app.approvedInstituteId);
    return;
  }

  // Demo / non-registration sessions should not keep a previous registered blank tenant
  if (
    user.isVerified &&
    (!app || (app.status !== "pending" && app.status !== "rejected"))
  ) {
    if (readRegisteredAdminTenant()) clearRegisteredAdminTenant();
  }
}
