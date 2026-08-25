/**
 * Admin mutation gates: platform read-only + role "read" permission.
 * Used by AuthGate / AdminChrome click-capture so writes are blocked without redesigning every screen.
 */
import { isPlatformReadOnly, loadPlatformReadOnlyState } from "@lumenx/utils";
import { getRolePermission } from "@/lib/roles-access";

export function isAdminPlatformReadOnly(): boolean {
  return isPlatformReadOnly(loadPlatformReadOnlyState());
}

/** Route-level write access for the signed-in role (false when permission is "read"). */
export function canRoleMutateRoute(accessRoleId: string | undefined, pathname: string): boolean {
  if (!accessRoleId) return true;
  return getRolePermission(accessRoleId, pathname) !== "read";
}

export function canAdminMutate(accessRoleId: string | undefined, pathname: string): boolean {
  if (isAdminPlatformReadOnly()) return false;
  return canRoleMutateRoute(accessRoleId, pathname);
}

export function adminWriteBlockReason(
  accessRoleId: string | undefined,
  pathname: string,
): string | null {
  if (isAdminPlatformReadOnly()) {
    return "View only — platform is read-only. Writes are disabled.";
  }
  if (!canRoleMutateRoute(accessRoleId, pathname)) {
    return "View only — this role has Read access. Writes are disabled.";
  }
  return null;
}

const WRITE_LABEL =
  /\b(save|create|add|new|delete|remove|publish|submit|send|approve|reject|onboard|provision|schedule|export|import|upload|edit|restore|purge|pay|confirm|update|assign|unassign|promote|graduate|hold|suspend|reactivate|bulk|generate|issue|mark all|done)\b/i;

/** True when a click target looks like a write control (not pure navigation). */
export function isLikelyAdminWriteControl(el: Element): boolean {
  if (el.closest("[data-admin-allow-readonly]")) return false;
  if (
    el.closest(
      "nav, aside, header, [data-admin-nav], .mobile-nav-bar, [role='navigation']",
    )
  ) {
    return false;
  }
  const control = el.closest(
    "button, [role='button'], input[type='submit'], a[download], [data-admin-write]",
  );
  if (!control) return false;
  if (control.getAttribute("data-admin-allow-readonly") != null) return false;
  if (control instanceof HTMLAnchorElement && control.getAttribute("download") != null) return true;
  if (control instanceof HTMLInputElement && control.type === "submit") return true;
  if (control instanceof HTMLButtonElement) {
    if (control.type === "submit") return true;
    if (control.disabled) return false;
  }
  const label = (control.textContent ?? "") + " " + (control.getAttribute("aria-label") ?? "");
  return WRITE_LABEL.test(label);
}
