import type { DemoInstituteProfile } from "@lumenx/types";
import { normalizeInstituteProfile } from "./shared-institute-profile";

/** Key inside `institute_settings.settings` jsonb for the rich public profile. */
export const INSTITUTE_PUBLIC_PROFILE_KEY = "profile";

export type InstituteRegistrationProfileSeed = {
  instituteName: string;
  instituteType?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  website?: string;
  principalName?: string;
  principalEmail?: string;
  principalMobile?: string;
  logoPreview?: string;
};

export function extractPublicProfileFromSettings(
  settings: Record<string, unknown> | null | undefined,
): DemoInstituteProfile | null {
  const raw = settings?.[INSTITUTE_PUBLIC_PROFILE_KEY];
  if (!raw || typeof raw !== "object") return null;
  return normalizeInstituteProfile(raw as DemoInstituteProfile);
}

export function mergePublicProfileIntoSettings(
  existing: Record<string, unknown>,
  profile: DemoInstituteProfile,
): Record<string, unknown> {
  return {
    ...existing,
    [INSTITUTE_PUBLIC_PROFILE_KEY]: normalizeInstituteProfile(profile),
  };
}

export function emptyPublicProfile(input: { name?: string } = {}): DemoInstituteProfile {
  return normalizeInstituteProfile({
    name: input.name?.trim() || "Institute",
    founded: "",
    founder: "",
    principal: "",
    vision: "",
    mission: "",
    ranking: "",
    logo: "",
    profilePhoto: "",
    phone: "",
    email: "",
    address: "",
    history: [],
    awards: [],
    achievements: [],
    customFields: [],
  });
}

export function publicProfileFromRegistrationSeed(
  instituteName: string,
  payload: InstituteRegistrationProfileSeed,
): DemoInstituteProfile {
  const addressParts = [
    payload.address?.trim(),
    payload.city?.trim(),
    payload.state?.trim(),
    payload.pincode?.trim(),
  ].filter(Boolean);
  return normalizeInstituteProfile({
    name: instituteName.trim(),
    founded: "",
    founder: "",
    principal: payload.principalName?.trim() || "",
    vision: "",
    mission: "",
    ranking: "",
    logo: payload.logoPreview?.trim() || "",
    profilePhoto: "",
    phone: payload.principalMobile?.trim() || "",
    email: payload.principalEmail?.trim() || "",
    address: addressParts.join(", "),
    history: [],
    awards: [],
    achievements: [],
    customFields: [],
  });
}

export function instituteDtoToDemoProfile(
  institute: { name: string },
  settings: Record<string, unknown> | null | undefined,
): DemoInstituteProfile {
  return extractPublicProfileFromSettings(settings) ?? emptyPublicProfile({ name: institute.name });
}
