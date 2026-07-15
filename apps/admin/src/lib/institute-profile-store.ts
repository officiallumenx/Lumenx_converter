import type {
  DemoInstituteCustomSection,
  DemoInstituteProfile,
  DemoInstituteSectionEntry,
  DemoInstituteSectionField,
  DemoProfileId,
} from "@lumenx/types";

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
  localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
}

function newEntryId() {
  return `entry-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function normalizeSectionField(raw: unknown): DemoInstituteSectionField {
  const field = raw as DemoInstituteSectionField & { label?: string; value?: string };
  return {
    id: field.id ?? `field-${Date.now().toString(36)}`,
    label: (field.label ?? "").trim(),
    value: (field.value ?? "").trim(),
  };
}

function normalizeSectionEntry(raw: unknown): DemoInstituteSectionEntry {
  const entry = raw as DemoInstituteSectionEntry & {
    heading?: string;
    subheading?: string;
    fields?: unknown[];
  };
  return {
    id: entry.id ?? newEntryId(),
    heading: (entry.heading ?? "").trim(),
    subheading: (entry.subheading ?? "").trim(),
    fields: Array.isArray(entry.fields) ? entry.fields.map(normalizeSectionField) : [],
  };
}

function normalizeCustomSection(raw: unknown): DemoInstituteCustomSection {
  const section = raw as DemoInstituteCustomSection & {
    title?: string;
    label?: string;
    description?: string;
    value?: string;
    entries?: unknown[];
  };

  if (Array.isArray(section.entries)) {
    return {
      id: section.id,
      title: (section.title ?? section.label ?? "").trim(),
      entries: section.entries.map(normalizeSectionEntry),
    };
  }

  const title = (section.title ?? section.label ?? "").trim();
  const legacyText = (section.description ?? section.value ?? "").trim();
  const entries: DemoInstituteSectionEntry[] = legacyText
    ? [
        {
          id: newEntryId(),
          heading: "",
          subheading: legacyText,
          fields: [],
        },
      ]
    : [];

  return { id: section.id, title, entries };
}

export function normalizeInstituteProfile(
  profile: DemoInstituteProfile,
): DemoInstituteProfile {
  const customFields = (profile.customFields ?? []).map(normalizeCustomSection);
  return { ...profile, customFields, profilePhoto: profile.profilePhoto ?? "" };
}

export function readStoredInstituteProfile(
  profileId: DemoProfileId,
  seed: DemoInstituteProfile,
): DemoInstituteProfile {
  const stored = readOverrides()[profileId];
  return normalizeInstituteProfile(stored ?? seed);
}

export function saveInstituteProfile(profileId: DemoProfileId, profile: DemoInstituteProfile) {
  const overrides = readOverrides();
  overrides[profileId] = normalizeInstituteProfile(profile);
  writeOverrides(overrides);
}
