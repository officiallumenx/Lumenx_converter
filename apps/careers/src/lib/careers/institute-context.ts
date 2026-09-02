import { isInstituteUuid } from "@/lib/institute-id";
import type { CareersUser } from "../types";

/** Resolve the active institute UUID for careers API calls. */
export function resolveCareersInstituteId(user: CareersUser | null | undefined): string | null {
  if (!user) return null;
  const candidate = user.activeInstituteId ?? user.organizationId ?? null;
  return isInstituteUuid(candidate) ? candidate : null;
}
