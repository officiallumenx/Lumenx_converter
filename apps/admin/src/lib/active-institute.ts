/**
 * Canonical UUID active institute preference (API auth mode).
 * Always validate against `/api/v1/me` memberships before use.
 */

export const ACTIVE_INSTITUTE_STORAGE_KEY = "lumenx.admin.activeInstituteId.v1";
export const ACTIVE_INSTITUTE_CHANGED_EVENT = "lumenx-admin-active-institute-changed";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isInstituteUuid(value: string): boolean {
  return UUID_RE.test(value.trim());
}

export type InstituteMembershipRef = {
  instituteId: string;
  status: string;
};

export type ResolveActiveInstituteResult = {
  instituteId: string | null;
  /** Why this selection was chosen */
  reason:
    | "stored"
    | "single"
    | "cleared_invalid"
    | "none"
    | "needs_selection";
};

function emitChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(ACTIVE_INSTITUTE_CHANGED_EVENT));
}

export function readStoredActiveInstituteId(): string | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(ACTIVE_INSTITUTE_STORAGE_KEY)?.trim();
    if (!raw || !isInstituteUuid(raw)) return null;
    return raw;
  } catch {
    return null;
  }
}

export function writeStoredActiveInstituteId(instituteId: string | null): void {
  if (typeof localStorage === "undefined") return;
  try {
    if (!instituteId) {
      localStorage.removeItem(ACTIVE_INSTITUTE_STORAGE_KEY);
    } else {
      if (!isInstituteUuid(instituteId)) {
        throw new Error("Active institute must be a UUID");
      }
      localStorage.setItem(ACTIVE_INSTITUTE_STORAGE_KEY, instituteId);
    }
    emitChanged();
  } catch {
    // ignore quota / private mode
  }
}

export function clearStoredActiveInstituteId(): void {
  writeStoredActiveInstituteId(null);
}

/** Memberships that may be selected as the active institute. */
export function accessibleInstituteIds(
  memberships: InstituteMembershipRef[],
): string[] {
  return memberships
    .filter((m) => m.status === "active" && isInstituteUuid(m.instituteId))
    .map((m) => m.instituteId);
}

/**
 * Resolve active institute from memberships + optional stored preference.
 * Never trusts a stored ID that is not in the accessible set.
 * Platform operators may pass `allowInstituteIds` (e.g. all active institutes
 * from GET /institutes) instead of membership-scoped IDs.
 */
export function resolveActiveInstitute(
  memberships: InstituteMembershipRef[],
  storedId: string | null = readStoredActiveInstituteId(),
  opts?: { allowInstituteIds?: string[] },
): ResolveActiveInstituteResult {
  const accessible =
    opts?.allowInstituteIds !== undefined
      ? opts.allowInstituteIds.filter((id) => isInstituteUuid(id))
      : accessibleInstituteIds(memberships);

  if (accessible.length === 0) {
    if (storedId) clearStoredActiveInstituteId();
    return { instituteId: null, reason: "none" };
  }

  if (storedId && accessible.includes(storedId)) {
    return { instituteId: storedId, reason: "stored" };
  }

  if (storedId && !accessible.includes(storedId)) {
    clearStoredActiveInstituteId();
    if (accessible.length === 1) {
      writeStoredActiveInstituteId(accessible[0]!);
      return { instituteId: accessible[0]!, reason: "single" };
    }
    return { instituteId: null, reason: "cleared_invalid" };
  }

  if (accessible.length === 1) {
    writeStoredActiveInstituteId(accessible[0]!);
    return { instituteId: accessible[0]!, reason: "single" };
  }

  return { instituteId: null, reason: "needs_selection" };
}

export function selectActiveInstitute(
  instituteId: string,
  memberships: InstituteMembershipRef[],
  opts?: { allowInstituteIds?: string[] },
): void {
  const accessible =
    opts?.allowInstituteIds !== undefined
      ? opts.allowInstituteIds.filter((id) => isInstituteUuid(id))
      : accessibleInstituteIds(memberships);
  if (!accessible.includes(instituteId)) {
    throw new Error("Selected institute is not available for this account");
  }
  writeStoredActiveInstituteId(instituteId);
}
