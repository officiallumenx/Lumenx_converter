import {
  bindRegisteredAdminTenant,
  clearRegisteredAdminTenant,
  readRegisteredAdminTenant,
} from "@/lib/admin-tenant";
import {
  findInstituteRegistrationByEmail,
  syncAdminReadOnlyFromSubscription,
} from "@lumenx/utils";
import { setAdminBoundNexusInstituteId } from "@lumenx/config";
import type { AuthUser } from "@/auth/types";
import { isApiAuthMode } from "@/auth/auth-mode";

function emailsMatch(a: string | undefined | null, b: string | undefined | null): boolean {
  const left = a?.trim().toLowerCase() ?? "";
  const right = b?.trim().toLowerCase() ?? "";
  return Boolean(left && right && left === right);
}

/**
 * Bind empty registered-tenant data after Nexus approval, or restore demo scope for demo users.
 * API mode uses memberships / activeInstituteId — never localStorage demo tenant as authority.
 */
export function syncAdminTenantForUser(user: AuthUser | null): void {
  if (isApiAuthMode()) return;
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

  const existing = readRegisteredAdminTenant();

  // Keep the registered institute bound when this operator is the institute principal,
  // even if the registration cookie/LS merge is briefly incomplete after cross-port sync.
  if (existing && emailsMatch(existing.principalEmail, user.email)) {
    setAdminBoundNexusInstituteId(existing.instituteId);
    syncAdminReadOnlyFromSubscription(existing.instituteId);
    return;
  }

  // Also keep binding when AuthUser already carries the registered institute id.
  if (
    existing &&
    user.instituteId &&
    (user.instituteId === existing.instituteId ||
      user.instituteId === `reg.${existing.instituteId}`)
  ) {
    setAdminBoundNexusInstituteId(existing.instituteId);
    syncAdminReadOnlyFromSubscription(existing.instituteId);
    return;
  }

  // Demo / non-registration sessions should not keep a previous registered blank tenant
  if (
    user.isVerified &&
    (!app || (app.status !== "pending" && app.status !== "rejected"))
  ) {
    if (existing) clearRegisteredAdminTenant();
  }
}
