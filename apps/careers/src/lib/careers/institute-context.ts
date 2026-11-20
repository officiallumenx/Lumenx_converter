import { isInstituteUuid } from "@/lib/institute-id";
import type { CareersUser } from "../types";

const BROWSE_INSTITUTE_KEY = "lumenx.careers.browseInstituteId";

/** Persist the institute a job seeker is browsing (no membership required). */
export function getBrowseInstituteId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(BROWSE_INSTITUTE_KEY)?.trim() ?? "";
    return isInstituteUuid(raw) ? raw : null;
  } catch {
    return null;
  }
}

export function setBrowseInstituteId(instituteId: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (!instituteId || !isInstituteUuid(instituteId)) {
      window.localStorage.removeItem(BROWSE_INSTITUTE_KEY);
      return;
    }
    window.localStorage.setItem(BROWSE_INSTITUTE_KEY, instituteId);
  } catch {
    // ignore quota / private mode
  }
}

/** Resolve the active institute UUID for careers API calls. */
export function resolveCareersInstituteId(user: CareersUser | null | undefined): string | null {
  if (!user) return getBrowseInstituteId();
  const candidate = user.activeInstituteId ?? user.organizationId ?? null;
  if (isInstituteUuid(candidate)) return candidate;
  return getBrowseInstituteId();
}
