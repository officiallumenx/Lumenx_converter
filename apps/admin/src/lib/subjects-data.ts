/** Subject catalog — create subjects, assign qualified teachers, feed timetable. */

import { ADMIN_STORAGE_KEYS } from "@lumenx/config";
import { readDemoProfileId, type TeacherRole } from "@lumenx/types";
import { getDepartments, getLevelLabels, isCollegeMode } from "@/lib/academic-data";
import {
  isRegisteredAdminTenant,
  readAdminDataScopeKey,
} from "@/lib/admin-tenant";

export const GRADES = ["Grade 9", "Grade 10", "Grade 11", "Grade 12"] as const;

export function getGrades(): readonly string[] {
  return getLevelLabels();
}

export type SubjectCatalogItem = {
  id: string;
  name: string;
  code: string;
  category: string;
  periodsPerWeek: number;
  grades: string[];
  assignedTeacherIds: string[];
  status: "active" | "draft";
};

export type InstituteTeacher = {
  id: string;
  name: string;
  subjects: string[];
  experienceYears: number;
  qualification: string;
  department: string;
};

export type TimetableSubject = { id: string; name: string; code: string; periodsPerWeek: number };
export type InstituteSubjectOption = {
  name: string;
  code: string;
  category: string;
};

export const SUBJECT_CATEGORIES = [
  "Sciences",
  "Languages",
  "Humanities",
  "Commerce",
  "Arts",
  "Physical Education",
  "Technology",
  "Other",
] as const;

const SCHOOL_SUBJECT_OPTIONS: InstituteSubjectOption[] = [
  { name: "Mathematics", code: "MTH 101", category: "Sciences" },
  { name: "Mathematics", code: "MTH 204", category: "Sciences" },
  { name: "Physics", code: "PHY 201", category: "Sciences" },
  { name: "Chemistry", code: "CHEM 220", category: "Sciences" },
  { name: "Biology", code: "BIO 110", category: "Sciences" },
  { name: "English", code: "ENG 301", category: "Languages" },
  { name: "History", code: "HIST 150", category: "Humanities" },
  { name: "Geography", code: "GEO 160", category: "Humanities" },
  { name: "Economics", code: "ECO 210", category: "Commerce" },
  { name: "Commerce", code: "COM 210", category: "Commerce" },
  { name: "Computer Science", code: "CS 401", category: "Technology" },
  { name: "Computer Lab", code: "CS LAB 401", category: "Technology" },
  { name: "Sports", code: "PE 100", category: "Physical Education" },
  { name: "Physical Education", code: "PE 100", category: "Physical Education" },
  { name: "Art", code: "ART 100", category: "Arts" },
  { name: "Music", code: "MUS 100", category: "Arts" },
];

const COLLEGE_SUBJECT_OPTIONS: InstituteSubjectOption[] = [
  { name: "Mathematics", code: "MATH 101", category: "Sciences" },
  { name: "Physics", code: "PHY 101", category: "Sciences" },
  { name: "Chemistry", code: "CHEM 101", category: "Sciences" },
  { name: "Biology", code: "BIO 101", category: "Sciences" },
  { name: "English", code: "ENG 101", category: "Languages" },
  { name: "Civics", code: "CIV 101", category: "Humanities" },
  { name: "Economics", code: "ECO 101", category: "Commerce" },
  { name: "Commerce", code: "COM 101", category: "Commerce" },
  { name: "Computer Science", code: "CS 101", category: "Technology" },
  { name: "Physical Education", code: "PE 101", category: "Physical Education" },
];

export function getInstituteSubjectOptions(): InstituteSubjectOption[] {
  const source = isCollegeMode() ? COLLEGE_SUBJECT_OPTIONS : SCHOOL_SUBJECT_OPTIONS;
  return source.map((option) => ({ ...option }));
}

const INITIAL_TEACHERS: InstituteTeacher[] = [
  {
    id: "T-M1",
    name: "Sarah Jenkins",
    subjects: ["Mathematics", "MTH 101", "MTH 204"],
    experienceYears: 14,
    qualification: "M.Sc Mathematics",
    department: "Mathematics",
  },
  {
    id: "T-M2",
    name: "Raj Mehta",
    subjects: ["Mathematics", "MTH 101", "MTH 204"],
    experienceYears: 10,
    qualification: "M.Sc Mathematics",
    department: "Mathematics",
  },
  {
    id: "T-M3",
    name: "Lena Ortiz",
    subjects: ["Mathematics", "MTH 101"],
    experienceYears: 6,
    qualification: "B.Ed Mathematics",
    department: "Mathematics",
  },
  {
    id: "T-M4",
    name: "Aiden Brooks",
    subjects: ["Mathematics", "MTH 101"],
    experienceYears: 3,
    qualification: "B.Sc Mathematics",
    department: "Mathematics",
  },
  {
    id: "T-M5",
    name: "Meera Nair",
    subjects: ["Mathematics", "MTH 101", "MTH 204"],
    experienceYears: 9,
    qualification: "M.Sc Mathematics · B.Ed",
    department: "Mathematics",
  },
  {
    id: "T-P1",
    name: "David Koal",
    subjects: ["Physics", "PHY 201"],
    experienceYears: 12,
    qualification: "M.Sc Physics",
    department: "Physics",
  },
  {
    id: "T-P2",
    name: "Nina Volkov",
    subjects: ["Physics", "PHY 201"],
    experienceYears: 8,
    qualification: "M.Sc Physics",
    department: "Physics",
  },
  {
    id: "T-P3",
    name: "James Chen",
    subjects: ["Physics", "PHY 201"],
    experienceYears: 5,
    qualification: "B.Ed Physics",
    department: "Physics",
  },
  {
    id: "T-P4",
    name: "Ella Wright",
    subjects: ["Physics", "PHY 201"],
    experienceYears: 2,
    qualification: "B.Sc Physics",
    department: "Physics",
  },
  {
    id: "T-P5",
    name: "Vikram Desai",
    subjects: ["Physics", "PHY 201"],
    experienceYears: 6,
    qualification: "M.Sc Physics · B.Ed",
    department: "Physics",
  },
  {
    id: "T-E1",
    name: "Marcus Whitfield",
    subjects: ["English", "ENG 301"],
    experienceYears: 15,
    qualification: "M.A English Literature",
    department: "English",
  },
  {
    id: "T-E2",
    name: "Sofia Alvarez",
    subjects: ["English", "ENG 301"],
    experienceYears: 11,
    qualification: "M.A English",
    department: "English",
  },
  {
    id: "T-E3",
    name: "Tom Hughes",
    subjects: ["English", "ENG 301"],
    experienceYears: 7,
    qualification: "B.Ed English",
    department: "English",
  },
  {
    id: "T-E4",
    name: "Yuki Tanaka",
    subjects: ["English", "ENG 301"],
    experienceYears: 4,
    qualification: "B.A English",
    department: "English",
  },
  {
    id: "T-E5",
    name: "Daniel Okafor",
    subjects: ["English", "ENG 301"],
    experienceYears: 8,
    qualification: "M.A English · TESOL",
    department: "English",
  },
  {
    id: "T-B1",
    name: "Priya Iyer",
    subjects: ["Biology", "BIO 110"],
    experienceYears: 11,
    qualification: "M.Sc Biology",
    department: "Biology",
  },
  {
    id: "T-B2",
    name: "Carlos Mendez",
    subjects: ["Biology", "BIO 110"],
    experienceYears: 7,
    qualification: "M.Sc Biology",
    department: "Biology",
  },
  {
    id: "T-B3",
    name: "Amy Laurent",
    subjects: ["Biology", "BIO 110"],
    experienceYears: 4,
    qualification: "B.Ed Biology",
    department: "Biology",
  },
  {
    id: "T-B4",
    name: "Noah Park",
    subjects: ["Biology", "BIO 110"],
    experienceYears: 2,
    qualification: "B.Sc Biology",
    department: "Biology",
  },
  {
    id: "T-B5",
    name: "Fatima Al-Rashid",
    subjects: ["Biology", "BIO 110"],
    experienceYears: 9,
    qualification: "M.Sc Biology · B.Ed",
    department: "Biology",
  },
  {
    id: "T-C1",
    name: "Hana Suzuki",
    subjects: ["Chemistry", "CHEM 220"],
    experienceYears: 10,
    qualification: "M.Sc Chemistry",
    department: "Chemistry",
  },
  {
    id: "T-C2",
    name: "Ibrahim Hale",
    subjects: ["Chemistry", "CHEM 220"],
    experienceYears: 7,
    qualification: "M.Sc Chemistry",
    department: "Chemistry",
  },
  {
    id: "T-C3",
    name: "Grace Miller",
    subjects: ["Chemistry", "CHEM 220"],
    experienceYears: 5,
    qualification: "B.Ed Chemistry",
    department: "Chemistry",
  },
  {
    id: "T-C4",
    name: "Leo Santos",
    subjects: ["Chemistry", "CHEM 220"],
    experienceYears: 3,
    qualification: "B.Sc Chemistry",
    department: "Chemistry",
  },
  {
    id: "T-C5",
    name: "Ananya Sharma",
    subjects: ["Chemistry", "CHEM 220"],
    experienceYears: 6,
    qualification: "M.Sc Chemistry",
    department: "Chemistry",
  },
  {
    id: "T-H1",
    name: "Omar Faris",
    subjects: ["History", "HIST 150"],
    experienceYears: 12,
    qualification: "M.A History",
    department: "History",
  },
  {
    id: "T-H2",
    name: "Claire Dubois",
    subjects: ["History", "HIST 150"],
    experienceYears: 8,
    qualification: "M.A History",
    department: "History",
  },
  {
    id: "T-H3",
    name: "Ben Okonkwo",
    subjects: ["History", "HIST 150"],
    experienceYears: 5,
    qualification: "B.Ed History",
    department: "History",
  },
  {
    id: "T-H4",
    name: "Zara Khan",
    subjects: ["History", "HIST 150"],
    experienceYears: 3,
    qualification: "B.A History",
    department: "History",
  },
  {
    id: "T-H5",
    name: "Robert Langley",
    subjects: ["History", "HIST 150"],
    experienceYears: 11,
    qualification: "M.A History · B.Ed",
    department: "History",
  },
  /* Sports — 5 faculty */
  {
    id: "T-PE1",
    name: "Coach Arjun Patel",
    subjects: ["Sports", "PE 100"],
    experienceYears: 13,
    qualification: "M.P.Ed · Athletics Coach",
    department: "Physical Education",
  },
  {
    id: "T-PE2",
    name: "Coach Elena Morales",
    subjects: ["Sports", "PE 100"],
    experienceYears: 10,
    qualification: "B.P.Ed · Basketball",
    department: "Physical Education",
  },
  {
    id: "T-PE3",
    name: "Coach Tyler Reed",
    subjects: ["Sports", "PE 100"],
    experienceYears: 7,
    qualification: "B.P.Ed · Football",
    department: "Physical Education",
  },
  {
    id: "T-PE4",
    name: "Coach Priya Singh",
    subjects: ["Sports", "PE 100"],
    experienceYears: 5,
    qualification: "B.P.Ed · Yoga & Fitness",
    department: "Physical Education",
  },
  {
    id: "T-PE5",
    name: "Coach Miguel Torres",
    subjects: ["Sports", "PE 100"],
    experienceYears: 4,
    qualification: "Diploma Sports Science",
    department: "Physical Education",
  },
  /* Computer Lab — 5 faculty */
  {
    id: "T-CL1",
    name: "Dr. Anita Verma",
    subjects: ["Computer Lab", "CS LAB 401"],
    experienceYears: 12,
    qualification: "M.Tech Computer Science",
    department: "Computer Science",
  },
  {
    id: "T-CL2",
    name: "Rohan Kapoor",
    subjects: ["Computer Lab", "CS LAB 401"],
    experienceYears: 9,
    qualification: "M.Sc IT · B.Ed",
    department: "Computer Science",
  },
  {
    id: "T-CL3",
    name: "Jessica Wu",
    subjects: ["Computer Lab", "CS LAB 401"],
    experienceYears: 6,
    qualification: "B.Tech CSE",
    department: "Computer Science",
  },
  {
    id: "T-CL4",
    name: "Samuel Osei",
    subjects: ["Computer Lab", "CS LAB 401"],
    experienceYears: 4,
    qualification: "B.Sc Computer Science",
    department: "Computer Science",
  },
  {
    id: "T-CL5",
    name: "Keiko Yamamoto",
    subjects: ["Computer Lab", "CS LAB 401"],
    experienceYears: 3,
    qualification: "Diploma IT · Lab Instructor",
    department: "Computer Science",
  },
];

const INITIAL_CATALOG: SubjectCatalogItem[] = [
  {
    id: "S-MTH-101",
    name: "Mathematics",
    code: "MTH 101",
    category: "Sciences",
    periodsPerWeek: 6,
    grades: ["Grade 9", "Grade 10"],
    assignedTeacherIds: ["T-001"],
    status: "active",
  },
  {
    id: "S-MTH-204",
    name: "Mathematics",
    code: "MTH 204",
    category: "Sciences",
    periodsPerWeek: 6,
    grades: ["Grade 11", "Grade 12"],
    assignedTeacherIds: ["T-001"],
    status: "active",
  },
  {
    id: "S-PHY",
    name: "Physics",
    code: "PHY 201",
    category: "Sciences",
    periodsPerWeek: 5,
    grades: ["Grade 9", "Grade 10", "Grade 11", "Grade 12"],
    assignedTeacherIds: ["T-002"],
    status: "active",
  },
  {
    id: "S-ENG",
    name: "English",
    code: "ENG 301",
    category: "Languages",
    periodsPerWeek: 5,
    grades: ["Grade 9", "Grade 10", "Grade 11", "Grade 12"],
    assignedTeacherIds: ["T-004"],
    status: "active",
  },
  {
    id: "S-BIO",
    name: "Biology",
    code: "BIO 110",
    category: "Sciences",
    periodsPerWeek: 4,
    grades: ["Grade 9", "Grade 10", "Grade 11", "Grade 12"],
    assignedTeacherIds: ["T-009"],
    status: "active",
  },
  {
    id: "S-CHEM",
    name: "Chemistry",
    code: "CHEM 220",
    category: "Sciences",
    periodsPerWeek: 4,
    grades: ["Grade 9", "Grade 10", "Grade 11", "Grade 12"],
    assignedTeacherIds: ["T-005"],
    status: "active",
  },
  {
    id: "S-HIST",
    name: "History",
    code: "HIST 150",
    category: "Humanities",
    periodsPerWeek: 3,
    grades: ["Grade 9", "Grade 10", "Grade 11", "Grade 12"],
    assignedTeacherIds: ["T-010"],
    status: "active",
  },
  {
    id: "S-PE",
    name: "Sports",
    code: "PE 100",
    category: "Physical Education",
    periodsPerWeek: 3,
    grades: ["Grade 9", "Grade 10", "Grade 11", "Grade 12"],
    assignedTeacherIds: ["T-007"],
    status: "active",
  },
  {
    id: "S-CSLAB",
    name: "Computer Lab",
    code: "CS LAB 401",
    category: "Technology",
    periodsPerWeek: 2,
    grades: ["Grade 9", "Grade 10", "Grade 11", "Grade 12"],
    assignedTeacherIds: ["T-008"],
    status: "active",
  },
];

const COLLEGE_CATALOG: SubjectCatalogItem[] = [
  {
    id: "C-MATH",
    name: "Mathematics",
    code: "MATH 101",
    category: "Sciences",
    periodsPerWeek: 6,
    grades: ["1st Year", "2nd Year"],
    assignedTeacherIds: ["T-001"],
    status: "active",
  },
  {
    id: "C-PHY",
    name: "Physics",
    code: "PHY 101",
    category: "Sciences",
    periodsPerWeek: 5,
    grades: ["1st Year", "2nd Year"],
    assignedTeacherIds: ["T-002"],
    status: "active",
  },
  {
    id: "C-CHEM",
    name: "Chemistry",
    code: "CHEM 101",
    category: "Sciences",
    periodsPerWeek: 5,
    grades: ["1st Year", "2nd Year"],
    assignedTeacherIds: ["T-005"],
    status: "active",
  },
  {
    id: "C-BIO",
    name: "Biology",
    code: "BIO 101",
    category: "Sciences",
    periodsPerWeek: 5,
    grades: ["1st Year", "2nd Year"],
    assignedTeacherIds: [],
    status: "active",
  },
  {
    id: "C-ENG",
    name: "English",
    code: "ENG 101",
    category: "Languages",
    periodsPerWeek: 4,
    grades: ["1st Year", "2nd Year"],
    assignedTeacherIds: ["T-004"],
    status: "active",
  },
  {
    id: "C-CIV",
    name: "Civics",
    code: "CIV 101",
    category: "Humanities",
    periodsPerWeek: 3,
    grades: ["1st Year", "2nd Year"],
    assignedTeacherIds: [],
    status: "active",
  },
  {
    id: "C-ECO",
    name: "Economics",
    code: "ECO 101",
    category: "Commerce",
    periodsPerWeek: 4,
    grades: ["1st Year", "2nd Year"],
    assignedTeacherIds: [],
    status: "active",
  },
  {
    id: "C-COM",
    name: "Commerce",
    code: "COM 101",
    category: "Commerce",
    periodsPerWeek: 4,
    grades: ["1st Year", "2nd Year"],
    assignedTeacherIds: [],
    status: "active",
  },
  {
    id: "C-PE",
    name: "Physical Education",
    code: "PE 101",
    category: "Physical Education",
    periodsPerWeek: 2,
    grades: ["1st Year", "2nd Year"],
    assignedTeacherIds: ["T-007"],
    status: "active",
  },
];

function catalogForProfile(): SubjectCatalogItem[] {
  const scopeKey = readAdminDataScopeKey();
  try {
    const raw = localStorage.getItem(`lumenx.admin.subjects.v2.${scopeKey}`);
    if (raw) {
      const parsed = (JSON.parse(raw) as SubjectCatalogItem[]).map((subject) => ({
        ...subject,
        grades: [...(subject.grades ?? [])],
        assignedTeacherIds: [...(subject.assignedTeacherIds ?? [])],
      }));
      if (isRegisteredAdminTenant()) return parsed;
      return ensureSpecialistSubjectTeachers(parsed);
    }
  } catch {
    // Fall back to profile seed data.
  }
  if (isRegisteredAdminTenant()) return [];
  const source = readDemoProfileId() === "inter_college" ? COLLEGE_CATALOG : INITIAL_CATALOG;
  return source.map((s) => ({
    ...s,
    grades: [...s.grades],
    assignedTeacherIds: [...s.assignedTeacherIds],
  }));
}

/** Ensure Sports / Computer Lab / etc. always have at least one assignable teacher. */
function ensureSpecialistSubjectTeachers(catalog: SubjectCatalogItem[]): SubjectCatalogItem[] {
  const defaults: Record<string, string[]> = {
    "PE 100": ["T-007"],
    "CS LAB 401": ["T-008"],
    "BIO 110": ["T-009"],
    "HIST 150": ["T-010"],
    "PE 101": ["T-007"],
  };
  let changed = false;
  const next = catalog.map((subject) => {
    if (subject.assignedTeacherIds.length > 0) return subject;
    const ids = defaults[subject.code];
    if (!ids) return subject;
    changed = true;
    return { ...subject, assignedTeacherIds: [...ids] };
  });
  if (changed) {
    try {
      localStorage.setItem(
        `lumenx.admin.subjects.v2.${readAdminDataScopeKey()}`,
        JSON.stringify(next),
      );
    } catch {
      // Ignore persistence failures in prototype mode.
    }
  }
  return next;
}

function persistSubjectCatalog(): void {
  subjectCatalogRevision += 1;
  instituteTeachersCache = null;
  try {
    localStorage.setItem(
      `lumenx.admin.subjects.v2.${readAdminDataScopeKey()}`,
      JSON.stringify(subjectCatalog),
    );
  } catch {
    // Keep in-memory subject management usable when storage is unavailable.
  }
}

let subjectCatalog: SubjectCatalogItem[] = catalogForProfile();
let instituteTeachers: InstituteTeacher[] = INITIAL_TEACHERS.map((t) => ({
  ...t,
  subjects: [...t.subjects],
}));
let subjectCatalogRevision = 0;
let adminTeachersStorageRaw: string | null = null;
let adminTeachersCache: AdminTeacherDirectoryRecord[] | null = null;
let adminTeachersRevision = 0;
let instituteTeachersCacheKey = "";
let instituteTeachersCache: InstituteTeacher[] | null = null;

function syncTeacherSubjectsFromCatalog() {
  subjectCatalogRevision += 1;
  instituteTeachersCache = null;
  instituteTeachers = instituteTeachers.map((teacher) => {
    const tags = new Set<string>();
    for (const sub of subjectCatalog) {
      if (!sub.assignedTeacherIds.includes(teacher.id)) continue;
      tags.add(sub.name);
      tags.add(sub.code);
    }
    return { ...teacher, subjects: [...tags] };
  });
}

syncTeacherSubjectsFromCatalog();

export function reloadSubjectCatalogForProfile(): void {
  subjectCatalog = catalogForProfile();
  subjectCatalogRevision += 1;
  instituteTeachersCache = null;
  adminTeachersStorageRaw = null;
  adminTeachersCache = null;
  adminTeachersRevision += 1;
  syncTeacherSubjectsFromCatalog();
}

export function getSubjectCatalog(): SubjectCatalogItem[] {
  return subjectCatalog.map((s) => ({
    ...s,
    grades: [...s.grades],
    assignedTeacherIds: [...s.assignedTeacherIds],
  }));
}

type AdminTeacherDirectoryRecord = {
  id: string;
  name: string;
  role?: TeacherRole;
  dept: string;
  qualification: string;
};

const ADMIN_TEACHERS_STORAGE_KEY_BASE = ADMIN_STORAGE_KEYS.teachers;
function adminTeachersStorageKey(): string {
  return `${ADMIN_TEACHERS_STORAGE_KEY_BASE}.${readAdminDataScopeKey()}`;
}
const ADMIN_TEACHER_FALLBACK: AdminTeacherDirectoryRecord[] = [
  {
    id: "T-001",
    name: "Sarah Jenkins",
    role: "subject-teacher",
    dept: "Mathematics",
    qualification: "M.Sc Mathematics · B.Ed",
  },
  {
    id: "T-002",
    name: "David Koal",
    role: "subject-teacher",
    dept: "Physics",
    qualification: "Ph.D Physics",
  },
  {
    id: "T-003",
    name: "Priya Iyer",
    role: "activity-coordinator",
    dept: "Biology",
    qualification: "M.Sc Biology · B.Ed",
  },
  {
    id: "T-004",
    name: "Marcus Whitfield",
    role: "subject-teacher",
    dept: "English",
    qualification: "M.A English Literature",
  },
  {
    id: "T-005",
    name: "Hana Suzuki",
    role: "subject-teacher",
    dept: "Chemistry",
    qualification: "M.Sc Chemistry",
  },
  {
    id: "T-006",
    name: "Omar Faris",
    role: "activity-coordinator",
    dept: "History",
    qualification: "M.A History",
  },
  {
    id: "T-007",
    name: "Coach Arjun Patel",
    role: "subject-teacher",
    dept: "Physical Education",
    qualification: "M.P.Ed · Athletics Coach",
  },
  {
    id: "T-008",
    name: "Dr. Anita Verma",
    role: "subject-teacher",
    dept: "Computer Science",
    qualification: "M.Tech Computer Science",
  },
  {
    id: "T-009",
    name: "Priya Iyer",
    role: "subject-teacher",
    dept: "Biology",
    qualification: "M.Sc Biology · B.Ed",
  },
  {
    id: "T-010",
    name: "Omar Faris",
    role: "subject-teacher",
    dept: "History",
    qualification: "M.A History · B.Ed",
  },
];

function readAdminTeachers(): AdminTeacherDirectoryRecord[] {
  const storageKey = adminTeachersStorageKey();
  const raw = localStorage.getItem(storageKey);
  if (raw === adminTeachersStorageRaw && adminTeachersCache) {
    return adminTeachersCache.map((teacher) => ({ ...teacher }));
  }

  let stored: AdminTeacherDirectoryRecord[] = [];
  try {
    if (raw) stored = JSON.parse(raw) as AdminTeacherDirectoryRecord[];
  } catch {
    // Use the Admin teacher seed when browser storage is unavailable.
  }
  let normalized: AdminTeacherDirectoryRecord[] = [];
  if (isRegisteredAdminTenant()) {
    normalized = stored.map((teacher) => ({ ...teacher }));
  } else if (stored.length === 0) {
    normalized = ADMIN_TEACHER_FALLBACK.map((teacher) => ({ ...teacher }));
  } else {
    // Keep specialist demo teachers available even when an older directory was saved.
    const byId = new Map(stored.map((teacher) => [teacher.id, teacher]));
    for (const fallback of ADMIN_TEACHER_FALLBACK) {
      if (!byId.has(fallback.id)) byId.set(fallback.id, fallback);
    }
    normalized = [...byId.values()];
  }

  const fallbackRaw = JSON.stringify(
    isRegisteredAdminTenant() ? [] : ADMIN_TEACHER_FALLBACK,
  );
  const nextRaw = raw ?? fallbackRaw;
  if (nextRaw !== adminTeachersStorageRaw) {
    adminTeachersRevision += 1;
    instituteTeachersCache = null;
  }
  adminTeachersStorageRaw = nextRaw;
  adminTeachersCache = normalized;
  return normalized.map((teacher) => ({ ...teacher }));
}

function experienceYearsForAdminTeacher(name: string, dept: string): number {
  const seed = INITIAL_TEACHERS.find(
    (teacher) => teacher.name === name || (teacher.department === dept && teacher.name === name),
  );
  if (seed) return seed.experienceYears;
  const byDept = INITIAL_TEACHERS.find((teacher) => teacher.department === dept);
  return byDept?.experienceYears ?? 5;
}

export function getInstituteTeachers(): InstituteTeacher[] {
  const cacheKey = `${subjectCatalogRevision}:${adminTeachersRevision}`;
  if (cacheKey === instituteTeachersCacheKey && instituteTeachersCache) {
    return instituteTeachersCache.map((teacher) => ({
      ...teacher,
      subjects: [...teacher.subjects],
    }));
  }

  const next = readAdminTeachers()
    .filter((teacher) => teacher.role !== "activity-coordinator")
    .map((teacher) => {
      const assigned = subjectCatalog.filter((subject) =>
        subject.assignedTeacherIds.includes(teacher.id),
      );
      return {
        id: teacher.id,
        name: teacher.name,
        subjects: assigned.flatMap((subject) => [subject.name, subject.code]),
        experienceYears: experienceYearsForAdminTeacher(teacher.name, teacher.dept),
        qualification: teacher.qualification,
        department: teacher.dept,
      };
    });
  instituteTeachersCache = next;
  instituteTeachersCacheKey = cacheKey;
  return next.map((teacher) => ({ ...teacher, subjects: [...teacher.subjects] }));
}

export function getAssignedSubjectIdsForTeacher(teacherId: string): string[] {
  return subjectCatalog
    .filter((subject) => subject.assignedTeacherIds.includes(teacherId))
    .map((subject) => subject.id);
}

export function assignSubjectsToTeacher(
  teacherId: string,
  subjectIds: string[],
): SubjectCatalogItem[] {
  const selected = new Set(subjectIds);
  subjectCatalog = subjectCatalog.map((subject) => {
    const teacherIds = new Set(subject.assignedTeacherIds);
    if (selected.has(subject.id)) teacherIds.add(teacherId);
    else teacherIds.delete(teacherId);
    return { ...subject, assignedTeacherIds: [...teacherIds] };
  });
  syncTeacherSubjectsFromCatalog();
  persistSubjectCatalog();
  return getSubjectCatalog();
}

export function getAssignedSubjectNamesForTeacher(teacherId: string): string[] {
  return subjectCatalog
    .filter((subject) => subject.assignedTeacherIds.includes(teacherId))
    .map((subject) => subject.name);
}

export function getSubjectsByGrade(): Record<string, TimetableSubject[]> {
  const out: Record<string, TimetableSubject[]> = {};
  const yearSubjects = (yearLabel: string): TimetableSubject[] =>
    subjectCatalog
      .filter((s) => s.status === "active" && s.grades.includes(yearLabel))
      .map((s) => ({ id: s.id, name: s.name, code: s.code, periodsPerWeek: s.periodsPerWeek }));

  for (const year of getLevelLabels()) {
    const subs = yearSubjects(year);
    out[year] = subs;
    if (isCollegeMode()) {
      for (const dept of getDepartments()) {
        out[`${dept.code} · ${year}`] = subs;
      }
    }
  }
  return out;
}

export function addSubject(input: {
  name: string;
  code: string;
  category: string;
  periodsPerWeek: number;
  grades: string[];
  status?: SubjectCatalogItem["status"];
}): SubjectCatalogItem {
  const item: SubjectCatalogItem = {
    id: `S-${Date.now()}`,
    name: input.name.trim(),
    code: input.code.trim().toUpperCase(),
    category: input.category,
    periodsPerWeek: input.periodsPerWeek,
    grades: [...input.grades],
    assignedTeacherIds: [],
    status: input.status ?? "active",
  };
  subjectCatalog = [...subjectCatalog, item];
  persistSubjectCatalog();
  return item;
}

export function updateSubject(
  id: string,
  patch: Partial<Omit<SubjectCatalogItem, "id">>,
): SubjectCatalogItem | null {
  let updated: SubjectCatalogItem | null = null;
  subjectCatalog = subjectCatalog.map((s) => {
    if (s.id !== id) return s;
    updated = {
      ...s,
      ...patch,
      name: patch.name !== undefined ? patch.name.trim() : s.name,
      code: patch.code !== undefined ? patch.code.trim().toUpperCase() : s.code,
      grades: patch.grades ? [...patch.grades] : s.grades,
      assignedTeacherIds: patch.assignedTeacherIds
        ? [...patch.assignedTeacherIds]
        : s.assignedTeacherIds,
    };
    return updated;
  });
  if (updated) {
    syncTeacherSubjectsFromCatalog();
    persistSubjectCatalog();
  }
  return updated;
}

export function deleteSubject(id: string): boolean {
  const before = subjectCatalog.length;
  subjectCatalog = subjectCatalog.filter((s) => s.id !== id);
  if (subjectCatalog.length === before) return false;
  syncTeacherSubjectsFromCatalog();
  persistSubjectCatalog();
  return true;
}

export function getSubjectById(id: string) {
  const s = subjectCatalog.find((x) => x.id === id);
  if (!s) return null;
  return { ...s, grades: [...(s.grades ?? [])], assignedTeacherIds: [...(s.assignedTeacherIds ?? [])] };
}

export function assignTeachersToSubject(
  subjectId: string,
  teacherIds: string[],
): SubjectCatalogItem | null {
  return updateSubject(subjectId, { assignedTeacherIds: teacherIds });
}

export function teachersForSubjectCode(
  subjectCode: string,
  subjectName?: string,
): InstituteTeacher[] {
  const adminTeachers = getInstituteTeachers();
  const assigned = subjectCatalog.find((s) => s.code === subjectCode || s.name === subjectName);

  const matchesTags = (teacher: InstituteTeacher) =>
    teacher.subjects.some(
      (s) =>
        s === subjectCode ||
        s === subjectName ||
        (subjectName != null &&
          (subjectName.toLowerCase().includes(s.toLowerCase()) ||
            s.toLowerCase().includes(subjectName.toLowerCase()))),
    );

  if (assigned && assigned.assignedTeacherIds.length > 0) {
    const matched = assigned.assignedTeacherIds
      .map((id) => adminTeachers.find((t) => t.id === id) ?? teacherById(id))
      .filter((t): t is InstituteTeacher => t != null);
    if (matched.length > 0) return matched;
  }

  const bySubjectTag = adminTeachers.filter(matchesTags);
  if (bySubjectTag.length > 0) return bySubjectTag;

  // Seed faculty fallback — remap to Admin IDs by name when possible.
  const seed = instituteTeachers.filter(matchesTags);
  if (seed.length === 0) {
    // Last resort: any admin teacher in a matching department/category.
    const deptHint = subjectName ?? subjectCode;
    const byDept = adminTeachers.filter((t) =>
      t.department.toLowerCase().includes(deptHint.toLowerCase().split(" ")[0] ?? ""),
    );
    return byDept.length > 0 ? byDept : adminTeachers.slice(0, 1);
  }

  return seed.map((teacher) => {
    const adminMatch = adminTeachers.find((a) => a.name === teacher.name);
    return adminMatch ?? teacher;
  });
}

export function teacherById(id: string) {
  return (
    getInstituteTeachers().find((t) => t.id === id) ??
    instituteTeachers.find((t) => t.id === id) ??
    ADMIN_TEACHER_FALLBACK.filter((t) => t.role !== "activity-coordinator")
      .map((teacher) => ({
        id: teacher.id,
        name: teacher.name,
        subjects: subjectCatalog
          .filter((subject) => subject.assignedTeacherIds.includes(teacher.id))
          .flatMap((subject) => [subject.name, subject.code]),
        experienceYears: experienceYearsForAdminTeacher(teacher.name, teacher.dept),
        qualification: teacher.qualification,
        department: teacher.dept,
      }))
      .find((t) => t.id === id)
  );
}
