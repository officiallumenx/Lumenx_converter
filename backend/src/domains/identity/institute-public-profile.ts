import { z } from "zod";
import type { InstituteRegistrationPayload } from "../registrations/types.js";

export const INSTITUTE_PUBLIC_PROFILE_KEY = "profile";

const sectionFieldSchema = z.object({
  id: z.string().max(120),
  label: z.string().max(500),
  value: z.string().max(4000),
});

const sectionEntrySchema = z.object({
  id: z.string().max(120),
  heading: z.string().max(500),
  year: z.string().max(40),
  subheading: z.string().max(500),
  fields: z.array(sectionFieldSchema).max(40),
});

const customSectionSchema = z.object({
  id: z.string().max(120),
  title: z.string().max(200),
  entries: z.array(sectionEntrySchema).max(40),
});

const historySchema = z.object({
  year: z.string().max(40),
  event: z.string().max(2000),
});

const awardSchema = z.object({
  title: z.string().max(300),
  year: z.string().max(40),
  body: z.string().max(4000),
});

export const institutePublicProfileSchema = z.object({
  name: z.string().min(1).max(200),
  founded: z.string().max(40),
  founder: z.string().max(200),
  principal: z.string().max(200),
  vision: z.string().max(8000),
  mission: z.string().max(8000),
  ranking: z.string().max(200),
  logo: z.string().max(200_000),
  profilePhoto: z.string().max(200_000),
  phone: z.string().max(80),
  email: z.string().max(200),
  address: z.string().max(1000),
  history: z.array(historySchema).max(80),
  awards: z.array(awardSchema).max(80),
  achievements: z.array(z.string().max(500)).max(80),
  customFields: z.array(customSectionSchema).max(40),
});

export type InstitutePublicProfile = z.infer<typeof institutePublicProfileSchema>;

export function normalizeInstitutePublicProfile(raw: unknown): InstitutePublicProfile {
  const parsed = institutePublicProfileSchema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    throw new Error(first?.message ?? "Invalid institute profile");
  }
  return parsed.data;
}

export function extractPublicProfileFromSettings(
  settings: Record<string, unknown> | null | undefined,
): InstitutePublicProfile | null {
  const raw = settings?.[INSTITUTE_PUBLIC_PROFILE_KEY];
  if (!raw || typeof raw !== "object") return null;
  return normalizeInstitutePublicProfile(raw);
}

export function mergeInstituteSettingsJson(
  existing: Record<string, unknown>,
  incoming: Record<string, unknown>,
): Record<string, unknown> {
  const merged: Record<string, unknown> = { ...existing, ...incoming };
  if (incoming[INSTITUTE_PUBLIC_PROFILE_KEY] !== undefined) {
    merged[INSTITUTE_PUBLIC_PROFILE_KEY] = normalizeInstitutePublicProfile(
      incoming[INSTITUTE_PUBLIC_PROFILE_KEY],
    );
  }
  return merged;
}

export function emptyPublicProfile(name: string): InstitutePublicProfile {
  return normalizeInstitutePublicProfile({
    name: name.trim() || "Institute",
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

export function publicProfileFromRegistrationPayload(
  instituteName: string,
  payload: InstituteRegistrationPayload,
): InstitutePublicProfile {
  const addressParts = [
    payload.address?.trim(),
    payload.city?.trim(),
    payload.state?.trim(),
    payload.pincode?.trim(),
  ].filter(Boolean);
  return normalizeInstitutePublicProfile({
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
