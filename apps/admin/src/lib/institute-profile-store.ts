import type { DemoInstituteProfile, DemoProfileId } from "@lumenx/types";
import {
  admissionsInstituteIdForDemoProfile,
  normalizeInstituteProfile,
  publishSharedInstituteProfile,
  saveSharedInstituteProfile,
} from "@lumenx/utils";
import { getAdmissionsPortalWindow } from "@/lib/admissions-portal-window";

const STORAGE_KEY = "lumenx_institute_profile_overrides";

type ProfileOverrides = Partial<Record<DemoProfileId, DemoInstituteProfile>>;

function readOverrides(): ProfileOverrides {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as ProfileOverrides;
  } catch {
    return {};
  }
}

function writeOverrides(overrides: ProfileOverrides) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
  } catch {
    // Ignore quota / private mode.
  }
}

export { normalizeInstituteProfile };

export function readStoredInstituteProfile(
  profileId: DemoProfileId,
  seed: DemoInstituteProfile,
): DemoInstituteProfile {
  const stored = readOverrides()[profileId];
  return normalizeInstituteProfile(stored ?? seed);
}

/** Write Admin overrides only (used when applying inbound Admissions sync). */
export function writeInstituteProfileOverride(
  profileId: DemoProfileId,
  profile: DemoInstituteProfile,
) {
  const overrides = readOverrides();
  overrides[profileId] = normalizeInstituteProfile(profile);
  writeOverrides(overrides);
}

export function saveInstituteProfile(profileId: DemoProfileId, profile: DemoInstituteProfile) {
  const normalized = normalizeInstituteProfile(profile);
  writeInstituteProfileOverride(profileId, normalized);

  const admissionsId = admissionsInstituteIdForDemoProfile(profileId);
  publishSharedInstituteProfile(admissionsId, normalized, [
    getAdmissionsPortalWindow(),
    typeof window !== "undefined" ? window.opener : null,
  ]);
}

/** Publish current Admin profile into the shared bag without rewriting Admin overrides. */
export function syncInstituteProfileToAdmissions(
  profileId: DemoProfileId,
  profile: DemoInstituteProfile,
) {
  const admissionsId = admissionsInstituteIdForDemoProfile(profileId);
  saveSharedInstituteProfile(admissionsId, profile);
  return admissionsId;
}
