import type {
  DemoInstituteCustomSection,
  DemoInstituteProfile,
  DemoInstituteSectionEntry,
  DemoInstituteSectionField,
  DemoProfileId,
} from "@lumenx/types";

/** Shared across Admin + Admissions (per-origin localStorage + postMessage sync). */
export const SHARED_INSTITUTE_PROFILE_KEY = "lumenx.shared.instituteProfile.v1";
export const INSTITUTE_PROFILE_MESSAGE = "lumenx:institute-profile" as const;
export const INSTITUTE_PROFILE_READY = "lumenx:admissions-profile-ready" as const;
export const INSTITUTE_PROFILE_CHANGED_EVENT = "lumenx-shared-institute-profile";

export type SharedInstituteProfileBag = Record<string, DemoInstituteProfile>;

export type InstituteProfileSyncMessage = {
  type: typeof INSTITUTE_PROFILE_MESSAGE;
  admissionsInstituteId: string;
  profile: DemoInstituteProfile;
  updatedAt: number;
};

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
    year?: string;
    subheading?: string;
    fields?: unknown[];
  };
  const year = (entry.year ?? "").trim();
  const subheading = (entry.subheading ?? "").trim();
  // Older profiles stored a free-text note in subheading; keep it readable as a sub-matter.
  const fields = Array.isArray(entry.fields) ? entry.fields.map(normalizeSectionField) : [];
  if (!year && subheading && fields.length === 0) {
    return {
      id: entry.id ?? newEntryId(),
      heading: (entry.heading ?? "").trim(),
      year: "",
      subheading: "",
      fields: [{ id: `field-${Date.now().toString(36)}`, label: "", value: subheading }],
    };
  }
  return {
    id: entry.id ?? newEntryId(),
    heading: (entry.heading ?? "").trim(),
    year,
    subheading,
    fields,
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
          heading: legacyText,
          year: "",
          subheading: "",
          fields: [],
        },
      ]
    : [];

  return { id: section.id, title, entries };
}

export function normalizeInstituteProfile(profile: DemoInstituteProfile): DemoInstituteProfile {
  const customFields = (profile.customFields ?? []).map(normalizeCustomSection);
  return { ...profile, customFields, profilePhoto: profile.profilePhoto ?? "" };
}

/** Map Admin demo profile → Admissions catalog institute id. */
export function admissionsInstituteIdForDemoProfile(profileId: DemoProfileId): string {
  if (profileId === "single_institute") return "ins-lumenx-academy";
  if (profileId === "inter_college") return "ins-st-xavier-jc";
  return "ins-lumenx-academy";
}

/** Map Admin session institute id → Admissions catalog id. */
export function admissionsInstituteIdForAdminInstitute(adminInstituteId: string): string {
  if (adminInstituteId === "LX-INST-001") return "ins-lumenx-academy";
  return adminInstituteId || "ins-lumenx-academy";
}

function readBag(): SharedInstituteProfileBag {
  if (typeof localStorage === "undefined") return {};
  try {
    const raw = localStorage.getItem(SHARED_INSTITUTE_PROFILE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as SharedInstituteProfileBag;
  } catch {
    return {};
  }
}

function writeBag(bag: SharedInstituteProfileBag) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(SHARED_INSTITUTE_PROFILE_KEY, JSON.stringify(bag));
}

export function loadSharedInstituteProfile(
  admissionsInstituteId: string,
): DemoInstituteProfile | null {
  const stored = readBag()[admissionsInstituteId];
  return stored ? normalizeInstituteProfile(stored) : null;
}

export function saveSharedInstituteProfile(
  admissionsInstituteId: string,
  profile: DemoInstituteProfile,
): DemoInstituteProfile {
  const next = normalizeInstituteProfile(profile);
  const bag = readBag();
  bag[admissionsInstituteId] = next;
  writeBag(bag);
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(INSTITUTE_PROFILE_CHANGED_EVENT, {
        detail: { admissionsInstituteId, profile: next },
      }),
    );
  }
  return next;
}

/** Persist locally and notify peer windows (cross-port Admin ↔ Connect). */
export function publishSharedInstituteProfile(
  admissionsInstituteId: string,
  profile: DemoInstituteProfile,
  targets?: Array<Window | null | undefined>,
): DemoInstituteProfile {
  const next = saveSharedInstituteProfile(admissionsInstituteId, profile);
  const message: InstituteProfileSyncMessage = {
    type: INSTITUTE_PROFILE_MESSAGE,
    admissionsInstituteId,
    profile: next,
    updatedAt: Date.now(),
  };
  const windows =
    targets && targets.length > 0
      ? targets
      : typeof window !== "undefined"
        ? [window.opener]
        : [];
  for (const win of windows) {
    try {
      win?.postMessage(message, "*");
    } catch {
      /* ignore closed windows */
    }
  }
  return next;
}

export function isInstituteProfileSyncMessage(data: unknown): data is InstituteProfileSyncMessage {
  if (!data || typeof data !== "object") return false;
  const msg = data as InstituteProfileSyncMessage;
  return (
    msg.type === INSTITUTE_PROFILE_MESSAGE &&
    typeof msg.admissionsInstituteId === "string" &&
    Boolean(msg.profile) &&
    typeof msg.profile === "object"
  );
}

export function applyInstituteProfileSyncMessage(data: unknown): DemoInstituteProfile | null {
  if (!isInstituteProfileSyncMessage(data)) return null;
  return saveSharedInstituteProfile(data.admissionsInstituteId, data.profile);
}
