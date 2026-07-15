/** Subject catalog — create subjects, assign qualified teachers, feed timetable. */

import { readDemoProfileId } from "@lumenx/types";
import { getDepartments, getLevelLabels, isCollegeMode } from "@/lib/academic-data";

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
    assignedTeacherIds: ["T-M1", "T-M2", "T-M3", "T-M4", "T-M5"],
    status: "active",
  },
  {
    id: "S-MTH-204",
    name: "Mathematics",
    code: "MTH 204",
    category: "Sciences",
    periodsPerWeek: 6,
    grades: ["Grade 11", "Grade 12"],
    assignedTeacherIds: ["T-M1", "T-M2", "T-M3", "T-M4", "T-M5"],
    status: "active",
  },
  {
    id: "S-PHY",
    name: "Physics",
    code: "PHY 201",
    category: "Sciences",
    periodsPerWeek: 5,
    grades: ["Grade 9", "Grade 10", "Grade 11", "Grade 12"],
    assignedTeacherIds: ["T-P1", "T-P2", "T-P3", "T-P4", "T-P5"],
    status: "active",
  },
  {
    id: "S-ENG",
    name: "English",
    code: "ENG 301",
    category: "Languages",
    periodsPerWeek: 5,
    grades: ["Grade 9", "Grade 10", "Grade 11", "Grade 12"],
    assignedTeacherIds: ["T-E1", "T-E2", "T-E3", "T-E4", "T-E5"],
    status: "active",
  },
  {
    id: "S-BIO",
    name: "Biology",
    code: "BIO 110",
    category: "Sciences",
    periodsPerWeek: 4,
    grades: ["Grade 9", "Grade 10", "Grade 11", "Grade 12"],
    assignedTeacherIds: ["T-B1", "T-B2", "T-B3", "T-B4", "T-B5"],
    status: "active",
  },
  {
    id: "S-CHEM",
    name: "Chemistry",
    code: "CHEM 220",
    category: "Sciences",
    periodsPerWeek: 4,
    grades: ["Grade 9", "Grade 10", "Grade 11", "Grade 12"],
    assignedTeacherIds: ["T-C1", "T-C2", "T-C3", "T-C4", "T-C5"],
    status: "active",
  },
  {
    id: "S-HIST",
    name: "History",
    code: "HIST 150",
    category: "Humanities",
    periodsPerWeek: 3,
    grades: ["Grade 9", "Grade 10", "Grade 11", "Grade 12"],
    assignedTeacherIds: ["T-H1", "T-H2", "T-H3", "T-H4", "T-H5"],
    status: "active",
  },
  {
    id: "S-PE",
    name: "Sports",
    code: "PE 100",
    category: "Physical Education",
    periodsPerWeek: 3,
    grades: ["Grade 9", "Grade 10", "Grade 11", "Grade 12"],
    assignedTeacherIds: ["T-PE1", "T-PE2", "T-PE3", "T-PE4", "T-PE5"],
    status: "active",
  },
  {
    id: "S-CSLAB",
    name: "Computer Lab",
    code: "CS LAB 401",
    category: "Technology",
    periodsPerWeek: 2,
    grades: ["Grade 9", "Grade 10", "Grade 11", "Grade 12"],
    assignedTeacherIds: ["T-CL1", "T-CL2", "T-CL3", "T-CL4", "T-CL5"],
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
    assignedTeacherIds: ["T-M1", "T-M2", "T-M3", "T-M4", "T-M5"],
    status: "active",
  },
  {
    id: "C-PHY",
    name: "Physics",
    code: "PHY 101",
    category: "Sciences",
    periodsPerWeek: 5,
    grades: ["1st Year", "2nd Year"],
    assignedTeacherIds: ["T-P1", "T-P2", "T-P3", "T-P4", "T-P5"],
    status: "active",
  },
  {
    id: "C-CHEM",
    name: "Chemistry",
    code: "CHEM 101",
    category: "Sciences",
    periodsPerWeek: 5,
    grades: ["1st Year", "2nd Year"],
    assignedTeacherIds: ["T-C1", "T-C2", "T-C3", "T-C4", "T-C5"],
    status: "active",
  },
  {
    id: "C-BIO",
    name: "Biology",
    code: "BIO 101",
    category: "Sciences",
    periodsPerWeek: 5,
    grades: ["1st Year", "2nd Year"],
    assignedTeacherIds: ["T-B1", "T-B2", "T-B3", "T-B4", "T-B5"],
    status: "active",
  },
  {
    id: "C-ENG",
    name: "English",
    code: "ENG 101",
    category: "Languages",
    periodsPerWeek: 4,
    grades: ["1st Year", "2nd Year"],
    assignedTeacherIds: ["T-E1", "T-E2", "T-E3", "T-E4", "T-E5"],
    status: "active",
  },
  {
    id: "C-CIV",
    name: "Civics",
    code: "CIV 101",
    category: "Humanities",
    periodsPerWeek: 3,
    grades: ["1st Year", "2nd Year"],
    assignedTeacherIds: ["T-H1", "T-H2", "T-H3", "T-H4", "T-H5"],
    status: "active",
  },
  {
    id: "C-ECO",
    name: "Economics",
    code: "ECO 101",
    category: "Commerce",
    periodsPerWeek: 4,
    grades: ["1st Year", "2nd Year"],
    assignedTeacherIds: ["T-H1", "T-H2", "T-H3", "T-H4", "T-H5"],
    status: "active",
  },
  {
    id: "C-COM",
    name: "Commerce",
    code: "COM 101",
    category: "Commerce",
    periodsPerWeek: 4,
    grades: ["1st Year", "2nd Year"],
    assignedTeacherIds: ["T-H2", "T-H3", "T-H4", "T-H5", "T-E2"],
    status: "active",
  },
  {
    id: "C-PE",
    name: "Physical Education",
    code: "PE 101",
    category: "Physical Education",
    periodsPerWeek: 2,
    grades: ["1st Year", "2nd Year"],
    assignedTeacherIds: ["T-PE1", "T-PE2", "T-PE3", "T-PE4", "T-PE5"],
    status: "active",
  },
];

function catalogForProfile(): SubjectCatalogItem[] {
  const source = readDemoProfileId() === "inter_college" ? COLLEGE_CATALOG : INITIAL_CATALOG;
  return source.map((s) => ({
    ...s,
    grades: [...s.grades],
    assignedTeacherIds: [...s.assignedTeacherIds],
  }));
}

let subjectCatalog: SubjectCatalogItem[] = catalogForProfile();
let instituteTeachers: InstituteTeacher[] = INITIAL_TEACHERS.map((t) => ({
  ...t,
  subjects: [...t.subjects],
}));

function syncTeacherSubjectsFromCatalog() {
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
  syncTeacherSubjectsFromCatalog();
}

export function getSubjectCatalog(): SubjectCatalogItem[] {
  return subjectCatalog.map((s) => ({
    ...s,
    grades: [...s.grades],
    assignedTeacherIds: [...s.assignedTeacherIds],
  }));
}

export function getInstituteTeachers(): InstituteTeacher[] {
  return instituteTeachers.map((t) => ({ ...t, subjects: [...t.subjects] }));
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
  if (updated) syncTeacherSubjectsFromCatalog();
  return updated;
}

export function deleteSubject(id: string): boolean {
  const before = subjectCatalog.length;
  subjectCatalog = subjectCatalog.filter((s) => s.id !== id);
  if (subjectCatalog.length === before) return false;
  syncTeacherSubjectsFromCatalog();
  return true;
}

export function getSubjectById(id: string) {
  const s = subjectCatalog.find((x) => x.id === id);
  if (!s) return null;
  return { ...s, grades: [...s.grades], assignedTeacherIds: [...s.assignedTeacherIds] };
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
  const assigned = subjectCatalog.find((s) => s.code === subjectCode || s.name === subjectName);
  if (assigned && assigned.assignedTeacherIds.length > 0) {
    return instituteTeachers.filter((t) => assigned.assignedTeacherIds.includes(t.id));
  }
  return instituteTeachers.filter((t) =>
    t.subjects.some(
      (s) =>
        s === subjectCode ||
        s === subjectName ||
        (subjectName != null && subjectName.toLowerCase().includes(s.toLowerCase())),
    ),
  );
}

export function teacherById(id: string) {
  return instituteTeachers.find((t) => t.id === id);
}
