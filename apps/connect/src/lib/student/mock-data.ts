/** Student-portal demo data for Phase 2 modules */
import { buildAttendanceDays as buildStudentAttendanceDays } from "@/lib/attendance/calendar";

export { buildStudentAttendanceDays };

export type AchievementCategory = "academic" | "sports" | "discipline" | "cultural";

export const achievementCategoryMap: Record<string, AchievementCategory> = {
  "ach-1": "discipline",
  "ach-2": "academic",
  "ach-3": "academic",
  "ach-4": "discipline",
  "ach-5": "academic",
  "ach-6": "sports",
  "ach-7": "academic",
  "ach-8": "cultural",
  "ach-9": "cultural",
  "ach-10": "sports",
};

export const ACHIEVEMENT_FILTER_LABELS: Record<AchievementCategory | "all", string> = {
  all: "All",
  academic: "Academic",
  sports: "Sports",
  discipline: "Discipline",
  cultural: "Cultural",
};

export const studentCompetitions = [
  {
    id: "comp-1",
    title: "Inter-School Mathematics Olympiad",
    category: "academic" as const,
    date: "20 Jan 2025",
    result: "Gold Medal",
    rank: "District 1st",
    venue: "District Education Board",
  },
  {
    id: "comp-2",
    title: "Annual Athletics Meet — 100m Sprint",
    category: "sports" as const,
    date: "10 Dec 2024",
    result: "Silver Medal",
    rank: "2nd",
    venue: "Main Ground",
  },
  {
    id: "comp-3",
    title: "Science Fair — Working Model",
    category: "academic" as const,
    date: "5 Nov 2024",
    result: "Participation Certificate",
    rank: "Finalist",
    venue: "Activity Hall",
  },
  {
    id: "comp-4",
    title: "Cultural Day — Group Dance",
    category: "cultural" as const,
    date: "28 Aug 2024",
    result: "Best Performance",
    rank: "1st",
    venue: "Auditorium",
  },
];

export type ExamHistoryEntry = {
  id: string;
  title: string;
  term: string;
  subject: string;
  date: string;
  maxMarks: number;
  obtained: number;
  grade: string;
  status: "completed" | "upcoming";
  room?: string;
  duration?: string;
};

export const examHistory: ExamHistoryEntry[] = [
  {
    id: "eh-1",
    title: "Unit Test 1",
    term: "Term 1 (2024-25)",
    subject: "Mathematics",
    date: "15 Jul 2024",
    maxMarks: 50,
    obtained: 44,
    grade: "A",
    status: "completed",
  },
  {
    id: "eh-2",
    title: "Unit Test 1",
    term: "Term 1 (2024-25)",
    subject: "Physics",
    date: "17 Jul 2024",
    maxMarks: 50,
    obtained: 38,
    grade: "B+",
    status: "completed",
  },
  {
    id: "eh-3",
    title: "Unit Test 1",
    term: "Term 1 (2024-25)",
    subject: "Chemistry",
    date: "19 Jul 2024",
    maxMarks: 50,
    obtained: 32,
    grade: "B",
    status: "completed",
  },
  {
    id: "eh-4",
    title: "Mid-Term",
    term: "Term 1 (2024-25)",
    subject: "Mathematics",
    date: "18 Nov 2024",
    maxMarks: 100,
    obtained: 88,
    grade: "A",
    status: "completed",
  },
  {
    id: "eh-5",
    title: "Mid-Term",
    term: "Term 1 (2024-25)",
    subject: "English",
    date: "25 Nov 2024",
    maxMarks: 100,
    obtained: 91,
    grade: "A+",
    status: "completed",
  },
  {
    id: "eh-6",
    title: "Mid-Term",
    term: "Mid-Term (2024-25)",
    subject: "Mathematics",
    date: "Mon 18 Nov",
    maxMarks: 100,
    obtained: 0,
    grade: "—",
    status: "upcoming",
    room: "Hall 2",
    duration: "2h",
  },
  {
    id: "eh-7",
    title: "Mid-Term",
    term: "Mid-Term (2024-25)",
    subject: "Physics",
    date: "Wed 20 Nov",
    maxMarks: 100,
    obtained: 0,
    grade: "—",
    status: "upcoming",
    room: "Hall 1",
    duration: "2h",
  },
];

export const academicTermSummaries = [
  {
    id: "2024-t1",
    label: "Term 1 (2024-25)",
    year: "2024-25",
    avgScore: 82,
    rank: 7,
    classSize: 42,
    attendance: 94,
    reportCardId: "rc-hy",
  },
  {
    id: "2024-ut1",
    label: "Unit Test 1 (2024-25)",
    year: "2024-25",
    avgScore: 86,
    rank: 5,
    classSize: 42,
    attendance: 93,
    reportCardId: "rc-u1",
  },
];

export type StudentCertificateRecord = {
  id: string;
  title: string;
  category: "academic" | "sports" | "cultural" | "technical";
  issuedOn: string;
  issuer: string;
  refNo: string;
  description: string;
};

export const studentCertificateRecords: StudentCertificateRecord[] = [
  {
    id: "cert-1",
    title: "Term 1 Academic Excellence",
    category: "academic",
    issuedOn: "15 Apr 2025",
    issuer: "Principal",
    refNo: "LXA/CERT/2025/0142",
    description: "Awarded for scoring above 80% aggregate in Term 1 examinations.",
  },
  {
    id: "cert-2",
    title: "Inter-School Mathematics Olympiad",
    category: "academic",
    issuedOn: "20 Jan 2025",
    issuer: "District Education Board",
    refNo: "DEB/OLY/2025/0088",
    description: "Gold medal — District level mathematics olympiad.",
  },
  {
    id: "cert-3",
    title: "Annual Sports Meet — 100m Sprint",
    category: "sports",
    issuedOn: "10 Dec 2024",
    issuer: "Sports Department",
    refNo: "LXA/SPT/2024/0311",
    description: "Silver medal in under-16 boys 100m sprint.",
  },
  {
    id: "cert-4",
    title: "Science Fair Participation",
    category: "technical",
    issuedOn: "5 Nov 2024",
    issuer: "Science Club",
    refNo: "LXA/SCI/2024/0199",
    description: "Working model on renewable energy — finalist.",
  },
  {
    id: "cert-5",
    title: "Cultural Day — Group Dance",
    category: "cultural",
    issuedOn: "28 Aug 2024",
    issuer: "Cultural Committee",
    refNo: "LXA/CUL/2024/0044",
    description: "Best group performance — classical fusion dance.",
  },
];

export type AttendanceDayStatus = import("@/lib/attendance/types").AttendanceDayStatus;

export const STUDENT_ATTENDANCE_DEFAULTS = {
  /** Prefer `new Date()` at call sites — kept for older imports. */
  get year() {
    return new Date().getFullYear();
  },
  get month() {
    return new Date().getMonth();
  },
  /** @deprecated Calendar seed removed — Registers are the only SoT. */
  seed: 0,
};

/** @deprecated Prefer buildLearnerMonthAttendanceSummary from Registers. */
export const studentAttendanceSummary = {
  monthLabel: "",
  year: STUDENT_ATTENDANCE_DEFAULTS.year,
  month: STUDENT_ATTENDANCE_DEFAULTS.month,
  attendancePct: 0,
  classAvgPct: 0,
  present: 0,
  absent: 0,
  leave: 0,
  workingDays: 0,
};

/** @deprecated Prefer computeLearnerMonthAttendanceDelta from Registers. */
export const studentAttendanceMonthDelta = 0;

/** @deprecated Prefer buildLearnerAttendanceTrend from Registers. */
export const studentAttendanceTrend: { week: string; pct: number }[] = [];

/** @deprecated Prefer buildLearnerAttendanceLog from Registers. */
export const studentAttendanceLog: {
  date: string;
  status: "present" | "absent" | "leave";
  note: string;
}[] = [];
