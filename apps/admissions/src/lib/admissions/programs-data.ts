import type { AdmissionProgram } from "./types";
import { getInstituteById } from "./institutes-data";
import {
  getOpenPublishedOpenings,
  getOpeningById,
  openingToProgram,
} from "./openings-store";

const PROGRAM_TEMPLATES: Omit<AdmissionProgram, "instituteId" | "id">[] = [
  {
    name: "Pre Primary",
    slug: "pre-primary",
    description: "Play-based early learning for ages 3–5 with Montessori influences.",
    duration: "2 years",
    eligibility: "Age 3+ as of 1 Jun 2026",
    ageCriteria: "3–5 years",
    seatsAvailable: 40,
    grades: ["Nursery", "LKG", "UKG"],
    subjects: ["Language", "Numbers", "Art", "Motor skills"],
    facilities: ["Montessori room", "Outdoor play"],
    academicYear: "2026–27",
    applicationDeadline: "31 May 2026",
    faqIds: ["f3", "f7"],
  },
  {
    name: "Primary School",
    slug: "primary",
    description: "Foundational literacy, numeracy, and creative skills for Grades 1–5.",
    duration: "5 years",
    eligibility: "Completed UKG or equivalent",
    ageCriteria: "6–10 years",
    seatsAvailable: 60,
    grades: ["Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5"],
    subjects: ["English", "Mathematics", "Science", "Social", "Hindi"],
    facilities: ["Library", "Computer lab"],
    academicYear: "2026–27",
    applicationDeadline: "31 May 2026",
    faqIds: ["f4", "f9"],
  },
  {
    name: "Middle School",
    slug: "middle",
    description: "Interdisciplinary curriculum with STEM and language focus for Grades 6–8.",
    duration: "3 years",
    eligibility: "Grade 5 pass certificate",
    ageCriteria: "11–13 years",
    seatsAvailable: 45,
    grades: ["Grade 6", "Grade 7", "Grade 8"],
    subjects: ["Mathematics", "Science", "English", "Social", "Computer"],
    facilities: ["Science lab", "Language lab"],
    academicYear: "2026–27",
    applicationDeadline: "31 May 2026",
    faqIds: ["f9", "f11"],
  },
  {
    name: "High School",
    slug: "high-school",
    description: "Board-aligned program with career counselling for Grades 9–10.",
    duration: "2 years",
    eligibility: "Grade 8 pass with 60%+ aggregate",
    ageCriteria: "14–15 years",
    seatsAvailable: 50,
    grades: ["Grade 9", "Grade 10"],
    subjects: ["Mathematics", "Physics", "Chemistry", "Biology", "English"],
    facilities: ["Board exam prep", "Career counselling"],
    academicYear: "2026–27",
    applicationDeadline: "30 Jun 2026",
    faqIds: ["f9", "f10", "f11"],
  },
  {
    name: "Intermediate",
    slug: "intermediate",
    description: "MPC, BiPC, and Commerce streams for Grades 11–12.",
    duration: "2 years",
    eligibility: "Grade 10 board pass",
    ageCriteria: "16–17 years",
    seatsAvailable: 80,
    grades: ["Grade 11", "Grade 12"],
    subjects: ["MPC", "BiPC", "Commerce"],
    facilities: ["JEE foundation", "Lab access"],
    academicYear: "2026–27",
    applicationDeadline: "15 Jul 2026",
    faqIds: ["f9", "f10"],
  },
  {
    name: "Degree (Affiliated)",
    slug: "degree",
    description: "B.Sc Computer Science and B.Com through university affiliation.",
    duration: "3 years",
    eligibility: "Grade 12 pass — 65%+ for CS",
    ageCriteria: "17+ years",
    seatsAvailable: 120,
    grades: ["Year 1", "Year 2", "Year 3"],
    subjects: ["CS", "Commerce", "Electives"],
    facilities: ["University affiliation", "Internships"],
    academicYear: "2026–27",
    applicationDeadline: "1 Aug 2026",
    faqIds: ["f5", "f11"],
  },
];

/** Per-institute program catalog — Phase 11 multi-institute foundation */
export const ADMISSION_PROGRAMS_V2: AdmissionProgram[] = [
  ...buildProgramsForInstitute("ins-test1school", [0, 1, 2, 3, 4, 5]),
  ...buildProgramsForInstitute("ins-test1school", [0, 1, 2, 3, 4]),
  ...buildProgramsForInstitute("ins-test1school", [3, 4]),
  ...buildProgramsForInstitute("ins-test1school", [5]),
  makeEngineeringProgram("ins-test1school", "B.Tech Computer Science", "btech-cs", 120),
  makeEngineeringProgram("ins-test1school", "B.Tech Mechanical", "btech-mech", 90),
  makeEngineeringProgram("ins-test1school", "B.Tech Electrical", "btech-ee", 80),
  makeUniversityProgram("ins-test1school", "B.A. Humanities", "ba-hum", 200),
  makeUniversityProgram("ins-test1school", "B.Sc. Sciences", "bsc-sci", 180),
  makeUniversityProgram("ins-test1school", "B.Com", "bcom", 150),
];

function buildProgramsForInstitute(
  instituteId: string,
  templateIndexes: number[],
): AdmissionProgram[] {
  return templateIndexes.map((idx) => {
    const t = PROGRAM_TEMPLATES[idx]!;
    return {
      ...t,
      id: `prog-${instituteId.replace("ins-", "")}-${t.slug}`,
      instituteId,
      seatsAvailable: Math.max(15, Math.round(t.seatsAvailable * 0.55)),
    };
  });
}

function makeEngineeringProgram(
  instituteId: string,
  name: string,
  slug: string,
  seats: number,
): AdmissionProgram {
  return {
    id: `prog-${instituteId.replace("ins-", "")}-${slug}`,
    instituteId,
    name,
    slug,
    description: `${name} at a premier NIT with industry-aligned curriculum.`,
    duration: "4 years",
    eligibility: "JEE Main qualified",
    ageCriteria: "17–21 years",
    seatsAvailable: seats,
    grades: ["Year 1", "Year 2", "Year 3", "Year 4"],
    subjects: ["Core engineering", "Labs", "Projects"],
    facilities: ["Workshops", "Incubation", "Placements"],
    academicYear: "2026–27",
    applicationDeadline: "Jul 2026",
    faqIds: ["f11"],
  };
}

function makeUniversityProgram(
  instituteId: string,
  name: string,
  slug: string,
  seats: number,
): AdmissionProgram {
  return {
    id: `prog-${instituteId.replace("ins-", "")}-${slug}`,
    instituteId,
    name,
    slug,
    description: `${name} through CUET admissions at a central university.`,
    duration: "3 years",
    eligibility: "Grade 12 pass — CUET",
    ageCriteria: "17+ years",
    seatsAvailable: seats,
    grades: ["Year 1", "Year 2", "Year 3"],
    subjects: ["Major", "Minor", "Electives"],
    facilities: ["Residential campus", "Research"],
    academicYear: "2026–27",
    applicationDeadline: "Aug 2026",
    faqIds: ["f5", "f11"],
  };
}

export function getProgramsForInstitute(instituteId: string) {
  const catalog = ADMISSION_PROGRAMS_V2.filter((p) => p.instituteId === instituteId);
  const openings = getOpenPublishedOpenings(instituteId).map(openingToProgram);
  // Institute-published openings first, then catalog (dedupe by id)
  const seen = new Set(openings.map((p) => p.id));
  return [...openings, ...catalog.filter((p) => !seen.has(p.id))];
}

/** V1 demo IDs → Test1School V2 programs */
const LEGACY_PROGRAM_ID_MAP: Record<string, string> = {
  "prog-pre-primary": "prog-lumenx-academy-pre-primary",
  "prog-primary": "prog-lumenx-academy-primary",
  "prog-middle": "prog-lumenx-academy-middle",
  "prog-high": "prog-lumenx-academy-high-school",
  "prog-intermediate": "prog-lumenx-academy-intermediate",
  "prog-degree": "prog-lumenx-academy-degree",
};

export function resolveProgramId(id: string): string {
  return LEGACY_PROGRAM_ID_MAP[id] ?? id;
}

export function getProgramByIdV2(id: string) {
  const resolved = resolveProgramId(id);
  const fromOpening = getOpeningById(resolved);
  if (fromOpening && fromOpening.status === "open") {
    return openingToProgram(fromOpening);
  }
  // Closed/draft openings still resolve for existing applications
  if (fromOpening) return openingToProgram(fromOpening);
  return ADMISSION_PROGRAMS_V2.find((p) => p.id === resolved);
}

/** One entry per program slug — avoids duplicate-looking cards on home/featured sections */
export function getDistinctProgramsBySlug(programs = ADMISSION_PROGRAMS_V2): AdmissionProgram[] {
  const seen = new Set<string>();
  return programs.filter((p) => {
    if (seen.has(p.slug)) return false;
    seen.add(p.slug);
    return true;
  });
}

/** Featured mix: prefer variety across institutes and program types */
export function getFeaturedPrograms(limit = 4): AdmissionProgram[] {
  const picked: AdmissionProgram[] = [];
  const usedInstitutes = new Set<string>();
  const usedSlugs = new Set<string>();

  for (const p of ADMISSION_PROGRAMS_V2) {
    if (picked.length >= limit) break;
    if (usedSlugs.has(p.slug)) continue;
    if (usedInstitutes.has(p.instituteId) && picked.length < limit - 1) continue;
    picked.push(p);
    usedSlugs.add(p.slug);
    usedInstitutes.add(p.instituteId);
  }

  if (picked.length < limit) {
    for (const p of getDistinctProgramsBySlug()) {
      if (picked.length >= limit) break;
      if (!picked.some((x) => x.id === p.id)) picked.push(p);
    }
  }
  return picked;
}

export function getProgramsGroupedByInstitute(): {
  instituteId: string;
  instituteName: string;
  programs: AdmissionProgram[];
}[] {
  const byInstitute = new Map<string, AdmissionProgram[]>();
  for (const p of ADMISSION_PROGRAMS_V2) {
    const list = byInstitute.get(p.instituteId) ?? [];
    list.push(p);
    byInstitute.set(p.instituteId, list);
  }
  return [...byInstitute.entries()].map(([instituteId, programs]) => ({
    instituteId,
    instituteName: getInstituteById(instituteId)?.name ?? instituteId,
    programs,
  }));
}

export function getRelatedPrograms(programId: string, limit = 3) {
  const prog = getProgramByIdV2(programId);
  if (!prog) return [];
  return ADMISSION_PROGRAMS_V2.filter(
    (p) => p.instituteId === prog.instituteId && p.id !== programId,
  ).slice(0, limit);
}

