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
    id: "ins-lumenx-academy",
    name: "LumenX Academy",
    code: "LXA-HYD",
    kind: "school",
    city: "Hyderabad",
    state: "Telangana",
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
      phone: "+91 40 4455 8800",
      email: "admissions@lumenx.edu",
      address: "Green Park Campus, Hyderabad 500032",
    },
    admissionDates: [
      { label: "Applications open", date: "1 Mar 2026" },
      { label: "Deadline", date: "31 May 2026" },
    ],
    about:
      "LumenX Academy is a premier K-12 institution offering holistic education with integrated digital learning through LumenX Connect.",
    established: "1998",
    accreditation: "CBSE · NAAC A+",
  },
  {
    id: "ins-delhi-riverside",
    name: "Delhi Public School Riverside",
    code: "DPS-RV",
    kind: "school",
    city: "New Delhi",
    state: "Delhi",
    country: "India",
    tagline: "Learning without boundaries",
    heroStat: "Top 10 Delhi schools",
    rating: 4.6,
    programsCount: 5,
    seatsOpen: 180,
    imageGradient: "from-blue-500/20 to-cyan-500/10",
    highlights: ["IB pathway", "Arts academy", "Global exchange", "Smart classrooms"],
    achievements: ["CBSE national toppers 2025", "Green campus award"],
    facilities: [
      { title: "Arts Academy", desc: "Music, dance, and visual arts." },
      { title: "Smart Classrooms", desc: "Interactive boards in every room." },
    ],
    contact: {
      phone: "+91 11 4400 2200",
      email: "admissions@dpsriverside.edu",
      address: "Riverside Enclave, New Delhi 110021",
    },
    admissionDates: [
      { label: "Early bird", date: "15 Apr 2026" },
      { label: "Regular", date: "30 Jun 2026" },
    ],
    about:
      "DPS Riverside combines rigorous academics with creative expression and global exposure programs.",
    established: "2005",
    accreditation: "CBSE",
  },
  {
    id: "ins-st-xavier-jc",
    name: "St. Xavier's Junior College",
    code: "SX-JC-MUM",
    kind: "junior_college",
    city: "Mumbai",
    state: "Maharashtra",
    country: "India",
    tagline: "Science & commerce excellence",
    heroStat: "95% science cutoff",
    rating: 4.7,
    programsCount: 4,
    seatsOpen: 420,
    imageGradient: "from-amber-500/20 to-orange-500/10",
    highlights: ["MPC & BiPC", "JEE foundation", "Counselling cell", "Hostel"],
    achievements: ["State rank holders", "IIT selections every year"],
    facilities: [
      { title: "Science Labs", desc: "Physics, chemistry, biology labs." },
      { title: "Hostel", desc: "Safe residential campus." },
    ],
    contact: {
      phone: "+91 22 2200 3300",
      email: "admissions@stxaviersjc.edu",
      address: "Fort, Mumbai 400001",
    },
    admissionDates: [{ label: "Merit list", date: "10 Jun 2026" }],
    about:
      "St. Xavier's JC prepares students for competitive exams with strong faculty and structured mentoring.",
    established: "1963",
    accreditation: "Maharashtra State Board",
  },
  {
    id: "ins-fergusson",
    name: "Fergusson College (Autonomous)",
    code: "FC-PUN",
    kind: "degree_college",
    city: "Pune",
    state: "Maharashtra",
    country: "India",
    tagline: "Heritage meets innovation",
    heroStat: "Autonomous since 2016",
    rating: 4.5,
    programsCount: 8,
    seatsOpen: 650,
    imageGradient: "from-emerald-500/20 to-teal-500/10",
    highlights: ["Autonomous", "Research labs", "Placement cell", "Heritage campus"],
    achievements: ["SPPU gold medalists", "Strong alumni network"],
    facilities: [
      { title: "Research Labs", desc: "UG research opportunities." },
      { title: "Library", desc: "Century-old library with digital access." },
    ],
    contact: {
      phone: "+91 20 6600 4400",
      email: "admissions@fergusson.edu",
      address: "FC Road, Pune 411004",
    },
    admissionDates: [{ label: "UG admissions", date: "1 Jul 2026" }],
    about:
      "Fergusson College offers undergraduate programs with a balance of tradition and modern pedagogy.",
    established: "1885",
    accreditation: "SPPU · NAAC A",
  },
  {
    id: "ins-vnit",
    name: "VNIT Nagpur",
    code: "VNIT-NGP",
    kind: "engineering",
    city: "Nagpur",
    state: "Maharashtra",
    country: "India",
    tagline: "Engineering the future",
    heroStat: "NIRF top 50",
    rating: 4.4,
    programsCount: 6,
    seatsOpen: 890,
    imageGradient: "from-violet-500/20 to-purple-500/10",
    highlights: ["B.Tech", "M.Tech", "Incubation center", "Campus placements"],
    achievements: ["90%+ placement rate", "Strong industry ties"],
    facilities: [
      { title: "Incubation Center", desc: "Startup support for students." },
      { title: "Workshops", desc: "Mechanical & electrical workshops." },
    ],
    contact: {
      phone: "+91 712 2800 5500",
      email: "admissions@vnit.ac.in",
      address: "South Ambazari Road, Nagpur 440010",
    },
    admissionDates: [{ label: "JEE counselling", date: "Jul 2026" }],
    about:
      "Visvesvaraya National Institute of Technology is a premier engineering institute with national recognition.",
    established: "1960",
    accreditation: "AICTE · NBA",
  },
  {
    id: "ins-bhu",
    name: "Banaras Hindu University",
    code: "BHU-MAIN",
    kind: "university",
    city: "Varanasi",
    state: "Uttar Pradesh",
    country: "India",
    tagline: "Knowledge for nation building",
    heroStat: "Central university",
    rating: 4.6,
    programsCount: 12,
    seatsOpen: 1200,
    imageGradient: "from-rose-500/20 to-pink-500/10",
    highlights: ["Multi-faculty", "Residential", "Research", "Cultural heritage"],
    achievements: ["Institute of Eminence", "Global rankings"],
    facilities: [
      { title: "Residential Campus", desc: "Large green campus with hostels." },
      { title: "Faculties", desc: "Arts, science, law, medicine & more." },
    ],
    contact: {
      phone: "+91 542 6700 6600",
      email: "admissions@bhu.ac.in",
      address: "Varanasi 221005",
    },
    admissionDates: [{ label: "CUET admissions", date: "Aug 2026" }],
    about:
      "BHU is one of India's largest residential universities offering diverse undergraduate and postgraduate programs.",
    established: "1916",
    accreditation: "UGC · IoE",
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
