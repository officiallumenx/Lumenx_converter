import { isInstituteUuid } from "@/lib/institute-id";
import type { AdmissionsUser } from "./types";

/** Resolve the active institute UUID for admissions API calls. */
export function resolveAdmissionsInstituteId(
  user: AdmissionsUser | null | undefined,
): string | null {
  if (!user) return null;
  const candidate = user.instituteId ?? null;
  return isInstituteUuid(candidate) ? candidate : null;
}
