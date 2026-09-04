import type { InstituteKind } from "@lumenx/types";
import { ADMISSIONS_STORAGE_KEYS, createBrowserAuthStorage } from "@lumenx/auth";
import type { InstituteSettingsOverride } from "./types";

export interface AdmissionInstituteProfile {
  id: string;
  name: string;
  code: string;
  kind: InstituteKind;
  city: string;
  state: string;
  country: string;
  tagline: string;
  heroStat: string;
  rating: number;
  programsCount: number;
  seatsOpen: number;
  imageGradient: string;
  highlights: string[];
  achievements: string[];
  facilities: { title: string; desc: string }[];
  contact: { phone: string; email: string; address: string };
  admissionDates: { label: string; date: string }[];
  about: string;
  established: string;
  accreditation: string;
}

export const ADMISSION_INSTITUTES: AdmissionInstituteProfile[] = [
  {
    id: "ins-test1school",
    name: "Test1School",
    code: "T1S",
    kind: "school",
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
    tagline: "Where curiosity meets excellence",
    heroStat: "98% pass rate",
    rating: 4.8,
    programsCount: 6,
    seatsOpen: 315,
    imageGradient: "from-primary/30 to-chart-5/20",
    highlights: ["STEM labs", "1:18 ratio", "Connect portal", "Sports complex"],
    achievements: ["NAAC A+", "12 national olympiad medals", "100% Grade 12 placements"],
    facilities: [
      { title: "STEM Labs", desc: "Robotics, coding & science labs." },
      { title: "Sports Complex", desc: "Pool, cricket ground, indoor courts." },
    ],
    contact: {
      phone: "+91 80 4521 8800",
      email: "office@test1school.edu",
      address: "12 Knowledge Park, Sector 4, Bengaluru 560001",
    },
    admissionDates: [
      { label: "Applications open", date: "1 Mar 2026" },
      { label: "Deadline", date: "31 May 2026" },
    ],
    about:
      "Test1School is the single demo institute for LumenX — holistic K-12 education with integrated digital learning through LumenX Connect.",
    established: "1987",
    accreditation: "CBSE · NAAC A+",
  },
];

export const INSTITUTE_KIND_LABEL: Record<InstituteKind, string> = {
  school: "School",
  junior_college: "Junior College",
  degree_college: "Degree College",
  engineering: "Engineering",
  university: "University",
};

function readCustomInstitutes(): AdmissionInstituteProfile[] {
  try {
    const raw = createBrowserAuthStorage().getItem(ADMISSIONS_STORAGE_KEYS.customInstitutes);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as AdmissionInstituteProfile[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeCustomInstitutes(items: AdmissionInstituteProfile[]) {
  createBrowserAuthStorage().setItem(
    ADMISSIONS_STORAGE_KEYS.customInstitutes,
    JSON.stringify(items),
  );
}

/** Catalog + institutes registered from Admissions signup. */
export function listAllInstitutes(): AdmissionInstituteProfile[] {
  const custom = readCustomInstitutes();
  const byId = new Map<string, AdmissionInstituteProfile>();
  for (const i of ADMISSION_INSTITUTES) byId.set(i.id, i);
  for (const i of custom) byId.set(i.id, i);
  return [...byId.values()];
}

export type RegisterCustomInstituteInput = {
  id: string;
  name: string;
  code?: string;
  city?: string;
  state?: string;
  kind?: InstituteKind;
  syllabus?: string;
  address?: string;
  phone?: string;
  email?: string;
};

/** Persist a new school so it appears in Browse institutes (demo localStorage). */
export function registerCustomInstitute(
  input: RegisterCustomInstituteInput,
): AdmissionInstituteProfile {
  const existing = listAllInstitutes().find((i) => i.id === input.id);
  if (existing) return existing;

  const addressLine =
    input.address?.trim() ||
    [input.city?.trim(), input.state?.trim()].filter(Boolean).join(", ") ||
    "";

  const profile: AdmissionInstituteProfile = {
    id: input.id,
    name: input.name.trim(),
    code: (input.code?.trim() || input.name.trim().slice(0, 6).toUpperCase() || "CUSTOM").slice(
      0,
      12,
    ),
    kind: input.kind ?? "school",
    city: input.city?.trim() || "—",
    state: input.state?.trim() || "—",
    country: "India",
    tagline: input.syllabus
      ? `${input.syllabus} · Now accepting applications on LumenX Admissions`
      : "Now accepting applications on LumenX Admissions",
    heroStat: "New on LumenX",
    rating: 0,
    programsCount: 0,
    seatsOpen: 0,
    imageGradient: "from-primary/25 to-muted",
    highlights: [
      "Online applications",
      "Admissions portal",
      ...(input.syllabus ? [`Syllabus: ${input.syllabus}`] : []),
    ],
    achievements: [],
    facilities: [],
    contact: {
      phone: input.phone?.trim() || "",
      email: input.email?.trim() || "",
      address: addressLine,
    },
    admissionDates: [{ label: "Applications", date: "Open now" }],
    about: `${input.name.trim()} is registered on LumenX Admissions. Update your institute profile for a richer public page.`,
    established: String(new Date().getFullYear()),
    accreditation: input.syllabus?.trim() || "—",
  };

  writeCustomInstitutes([profile, ...readCustomInstitutes()]);
  return profile;
}

export function getLocationFilters() {
  const all = listAllInstitutes();
  return {
    states: [...new Set(all.map((i) => i.state).filter((s) => s && s !== "—"))].sort(),
    cities: [...new Set(all.map((i) => i.city).filter((c) => c && c !== "—"))].sort(),
  };
}

/** @deprecated Prefer getLocationFilters() so custom institutes are included. */
export const LOCATIONS = {
  get states() {
    return getLocationFilters().states;
  },
  get cities() {
    return getLocationFilters().cities;
  },
};

function readSettingsOverrides(): InstituteSettingsOverride[] {
  try {
    const raw = createBrowserAuthStorage().getItem(ADMISSIONS_STORAGE_KEYS.instituteSettings);
    if (!raw) return [];
    return JSON.parse(raw) as InstituteSettingsOverride[];
  } catch {
    return [];
  }
}

export function getInstituteById(id: string) {
  const base = listAllInstitutes().find((i) => i.id === id);
  if (!base) return undefined;
  const override = readSettingsOverrides().find((s) => s.instituteId === id);
  if (!override) return base;
  return {
    ...base,
    tagline: override.tagline ?? base.tagline,
    about: override.about ?? base.about,
    contact: {
      phone: override.contact?.phone ?? base.contact.phone,
      email: override.contact?.email ?? base.contact.email,
      address: override.contact?.address ?? base.contact.address,
    },
    admissionDates: override.admissionDates ?? base.admissionDates,
  };
}

export function filterInstitutes(opts: {
  q?: string;
  state?: string;
  city?: string;
  kind?: InstituteKind | "all";
}) {
  return listAllInstitutes().filter((i) => {
    if (opts.state && opts.state !== "all" && i.state !== opts.state) return false;
    if (opts.city && opts.city !== "all" && i.city !== opts.city) return false;
    if (opts.kind && opts.kind !== "all" && i.kind !== opts.kind) return false;
    if (opts.q) {
      const hay = `${i.name} ${i.code} ${i.city} ${i.state} ${i.tagline}`.toLowerCase();
      if (!hay.includes(opts.q.toLowerCase())) return false;
    }
    return true;
  });
}

const SCROLL_KEY = "admissions-institutes-scroll";

export function saveInstitutesScroll(top: number) {
  try {
    sessionStorage.setItem(SCROLL_KEY, String(top));
  } catch {
    void 0;
  }
}

export function readInstitutesScroll(): number {
  try {
    const v = sessionStorage.getItem(SCROLL_KEY);
    return v ? Number(v) : 0;
  } catch {
    return 0;
  }
}

export const SELECTED_INSTITUTE_KEY = "admissions-selected-institute";

export function getSelectedInstituteId(): string | null {
  try {
    return sessionStorage.getItem(SELECTED_INSTITUTE_KEY);
  } catch {
    return null;
  }
}

export function setSelectedInstituteId(id: string) {
  try {
    sessionStorage.setItem(SELECTED_INSTITUTE_KEY, id);
  } catch {
    void 0;
  }
}

