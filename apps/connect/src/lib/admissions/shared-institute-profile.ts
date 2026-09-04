/**
 * Admin ↔ Admissions shared institute profile helpers for Connect.
 * Prefer shared store; seed from Admin demo catalog when empty (mapped institutes only).
 */
import { getDemoProfile, type DemoInstituteProfile, type DemoProfileId } from "@lumenx/types";
import {
  admissionsInstituteIdForDemoProfile,
  INSTITUTE_PROFILE_CHANGED_EVENT,
  loadSharedInstituteProfile,
  normalizeInstituteProfile,
  publishSharedInstituteProfile,
  saveSharedInstituteProfile,
} from "@lumenx/utils";

const SEED_BY_ADMISSIONS_ID: Record<string, DemoProfileId> = {
  "ins-test1school": "multi_institute",
};

function seedForAdmissionsInstitute(admissionsInstituteId: string): DemoInstituteProfile | null {
  const demoId = SEED_BY_ADMISSIONS_ID[admissionsInstituteId];
  if (!demoId) return null;
  return normalizeInstituteProfile(getDemoProfile(demoId).admin.instituteProfile);
}

/** Returns Admin-style profile when shared/synced; null for catalog-only institutes. */
export function getAdmissionsInstituteProfile(
  admissionsInstituteId: string,
): DemoInstituteProfile | null {
  const shared = loadSharedInstituteProfile(admissionsInstituteId);
  if (shared) return shared;
  const seeded = seedForAdmissionsInstitute(admissionsInstituteId);
  if (!seeded) return null;
  return saveSharedInstituteProfile(admissionsInstituteId, seeded);
}

export function saveAdmissionsInstituteProfile(
  admissionsInstituteId: string,
  profile: DemoInstituteProfile,
): DemoInstituteProfile {
  return publishSharedInstituteProfile(admissionsInstituteId, profile);
}

export function ensureSharedProfileFromAdmin(
  admissionsInstituteId: string,
  profile: DemoInstituteProfile,
): DemoInstituteProfile {
  return saveSharedInstituteProfile(admissionsInstituteId, profile);
}

export function subscribeSharedInstituteProfile(
  admissionsInstituteId: string,
  onChange: (profile: DemoInstituteProfile) => void,
): () => void {
  const handler = (event: Event) => {
    const detail = (
      event as CustomEvent<{ admissionsInstituteId: string; profile: DemoInstituteProfile }>
    ).detail;
    if (detail?.admissionsInstituteId === admissionsInstituteId) {
      onChange(detail.profile);
    }
  };
  window.addEventListener(INSTITUTE_PROFILE_CHANGED_EVENT, handler);
  return () => window.removeEventListener(INSTITUTE_PROFILE_CHANGED_EVENT, handler);
}

export { admissionsInstituteIdForDemoProfile };

