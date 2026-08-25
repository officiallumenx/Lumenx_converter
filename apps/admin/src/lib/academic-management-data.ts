/** Mock data for Academic Management — UI only, no API. */

import { todayLocalIso } from "@lumenx/utils";

export type AcademicYearStatus = "active" | "completed" | "upcoming" | "archived";

export type AcademicYear = {
  id: string;
  label: string;
  startDate: string;
  endDate: string;
  status: AcademicYearStatus;
};

/** Tracks last activation for the 7-day previous-year rollback window (mock UI). */
export type AcademicYearActivationMeta = {
  activatedYearId: string;
  previousYearId: string | null;
  /** ISO date YYYY-MM-DD when the new year was activated */
  activatedOn: string;
};

export const ACTIVATION_GRACE_DAYS = 7;

export function todayIsoDate(now = new Date()): string {
  return todayLocalIso(now);
}

export function hasAcademicYearStarted(startDate: string, today = todayIsoDate()): boolean {
  return startDate <= today;
}

export function daysBetweenIso(fromIso: string, toIso: string): number {
  const from = new Date(`${fromIso}T00:00:00`);
  const to = new Date(`${toIso}T00:00:00`);
  return Math.floor((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Activate rules (UI only):
 * - Past completed years: never (except previous year within 7 days of a new activation)
 * - Upcoming: only on/after start date
 * - Active / archived: never
 */
export function canActivateAcademicYear(
  year: AcademicYear,
  meta: AcademicYearActivationMeta | null,
  today = todayIsoDate(),
): { allowed: boolean; reason?: string } {
  if (year.status === "active") {
    return { allowed: false, reason: "Already active" };
  }
  if (year.status === "archived") {
    return { allowed: false, reason: "Archived years cannot be activated" };
  }
  if (year.status === "upcoming") {
    if (!hasAcademicYearStarted(year.startDate, today)) {
      return {
        allowed: false,
        reason: `Activate available from ${year.startDate}`,
      };
    }
    return { allowed: true };
  }
  // completed
  if (
    meta &&
    meta.previousYearId === year.id &&
    daysBetweenIso(meta.activatedOn, today) <= ACTIVATION_GRACE_DAYS
  ) {
    const daysLeft = ACTIVATION_GRACE_DAYS - daysBetweenIso(meta.activatedOn, today);
    return {
      allowed: true,
      reason: `Previous year rollback · ${daysLeft} day${daysLeft === 1 ? "" : "s"} left`,
    };
  }
  return { allowed: false, reason: "Past years cannot be activated" };
}

export type PromotionWorkflow = "before_result" | "after_result";

export type AcademicStructureOption = {
  id: string;
  label: string;
  from: string;
  to: string;
  selected?: boolean;
};

export type StudentStatusType = {
  id: string;
  key: string;
  label: string;
  description: string;
  optional?: boolean;
  enabled: boolean;
};

export type PromotionCandidate = {
  id: string;
  name: string;
  admissionNo: string;
  currentClass: string;
  section: string;
  nextClass: string;
  resultStatus: "pending" | "published" | "held";
  eligible: boolean;
};

export type GraduationCandidate = {
  id: string;
  name: string;
  admissionNo: string;
  class: string;
  section: string;
  exitYear: string;
  retainUntil: string;
  status: "ready" | "graduated" | "archived";
};

export type StatusAssignmentRow = {
  id: string;
  name: string;
  admissionNo: string;
  class: string;
  section: string;
  status: string;
};

export const INITIAL_ACADEMIC_YEARS: AcademicYear[] = [
  {
    id: "ay-2022-23",
    label: "2022-2023",
    startDate: "2022-04-01",
    endDate: "2023-03-31",
    status: "completed",
  },
  {
    id: "ay-2023-24",
    label: "2023-2024",
    startDate: "2023-04-01",
    endDate: "2024-03-31",
    status: "completed",
  },
  {
    id: "ay-2024-25",
    label: "2024-2025",
    startDate: "2024-04-01",
    endDate: "2025-03-31",
    status: "completed",
  },
  {
    id: "ay-2025-26",
    label: "2025-2026",
    startDate: "2025-04-01",
    endDate: "2026-03-31",
    status: "completed",
  },
  {
    id: "ay-2026-27",
    label: "2026-2027",
    startDate: "2026-04-01",
    endDate: "2027-03-31",
    status: "active",
  },
  {
    id: "ay-2027-28",
    label: "2027-2028",
    startDate: "2027-04-01",
    endDate: "2028-03-31",
    status: "upcoming",
  },
];

const ACADEMIC_YEARS_KEY = "lumenx.admin.academic-years.v1";

export function loadAcademicYears(): AcademicYear[] {
  try {
    const raw = localStorage.getItem(ACADEMIC_YEARS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AcademicYear[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    /* seed */
  }
  return INITIAL_ACADEMIC_YEARS.map((y) => ({ ...y }));
}

export function saveAcademicYears(years: AcademicYear[]): void {
  try {
    localStorage.setItem(ACADEMIC_YEARS_KEY, JSON.stringify(years));
  } catch {
    /* ignore */
  }
}

/** Past 5 years + active session — used for year pickers (view / promotion). */
export const ACADEMIC_YEAR_VIEW_OPTIONS = [
  { id: "ay-2022-23", label: "2022-2023" },
  { id: "ay-2023-24", label: "2023-2024" },
  { id: "ay-2024-25", label: "2024-2025" },
  { id: "ay-2025-26", label: "2025-2026" },
  { id: "ay-2026-27", label: "2026-2027" },
] as const;

export const INITIAL_PROMOTION_WORKFLOW: PromotionWorkflow = "after_result";

export const ACADEMIC_STRUCTURE_OPTIONS: AcademicStructureOption[] = [
  { id: "struct-n-10", label: "Nursery → 10th", from: "Nursery", to: "10th", selected: true },
  { id: "struct-n-12", label: "Nursery → 12th", from: "Nursery", to: "12th" },
  { id: "struct-6-10", label: "6th → 10th", from: "6th", to: "10th" },
];

export const STUDENT_STATUS_TYPES: StudentStatusType[] = [
  {
    id: "st-active",
    key: "active",
    label: "Active",
    description: "Currently enrolled and attending classes",
    enabled: true,
  },
  {
    id: "st-graduated",
    key: "graduated",
    label: "Graduated",
    description: "Completed final class and passed out",
    enabled: true,
  },
  {
    id: "st-transferred",
    key: "transferred",
    label: "Transferred",
    description: "Moved to another institute",
    enabled: true,
  },
  {
    id: "st-dropped",
    key: "dropped_out",
    label: "Dropped Out",
    description: "Left the institute without completing",
    enabled: true,
  },
  {
    id: "st-repeating",
    key: "repeating",
    label: "Repeating",
    description: "Retained in the same class for another year",
    enabled: true,
  },
  {
    id: "st-inactive",
    key: "inactive",
    label: "Inactive",
    description: "Temporarily not attending",
    enabled: true,
  },
];

export const PROMOTION_CANDIDATES: PromotionCandidate[] = [
  {
    id: "pc-01",
    name: "Aarav Sharma",
    admissionNo: "ADM-2401",
    currentClass: "4th",
    section: "A",
    nextClass: "5th",
    resultStatus: "published",
    eligible: true,
  },
  {
    id: "pc-02",
    name: "Diya Patel",
    admissionNo: "ADM-2402",
    currentClass: "4th",
    section: "A",
    nextClass: "5th",
    resultStatus: "published",
    eligible: true,
  },
  {
    id: "pc-03",
    name: "Kabir Reddy",
    admissionNo: "ADM-2410",
    currentClass: "9th",
    section: "B",
    nextClass: "10th",
    resultStatus: "pending",
    eligible: false,
  },
  {
    id: "pc-04",
    name: "Meera Iyer",
    admissionNo: "ADM-2415",
    currentClass: "7th",
    section: "C",
    nextClass: "8th",
    resultStatus: "published",
    eligible: true,
  },
  {
    id: "pc-05",
    name: "Rohan Gupta",
    admissionNo: "ADM-2420",
    currentClass: "5th",
    section: "A",
    nextClass: "6th",
    resultStatus: "held",
    eligible: false,
  },
];

/** Promotion workflow — Step 1 selectors (mock). Includes past 5 years + upcoming. */
export const PROMOTION_YEAR_OPTIONS = [
  { id: "ay-2022-23", label: "2022-2023" },
  { id: "ay-2023-24", label: "2023-2024" },
  { id: "ay-2024-25", label: "2024-2025" },
  { id: "ay-2025-26", label: "2025-2026" },
  { id: "ay-2026-27", label: "2026-2027" },
  { id: "ay-2027-28", label: "2027-2028" },
] as const;

export const PROMOTION_CLASS_OPTIONS = [
  "4th",
  "5th",
  "7th",
  "9th",
  "10th",
] as const;

/** Classes eligible for bulk promotion (excludes final / 10th). */
export const PROMOTION_NON_FINAL_CLASSES = PROMOTION_CLASS_OPTIONS.filter(
  (c) => c !== "10th",
);

export const PROMOTION_SECTION_OPTIONS = ["A", "B", "C"] as const;

export type PromotionScopeMode = "single" | "multi" | "institute_except_final";

export const PROMOTION_SCOPE_OPTIONS: {
  id: PromotionScopeMode;
  label: string;
  hint: string;
}[] = [
  {
    id: "single",
    label: "Class & section",
    hint: "One class and one section",
  },
  {
    id: "multi",
    label: "Multi class",
    hint: "Select one or more classes (all sections)",
  },
  {
    id: "institute_except_final",
    label: "Total institute except 10th",
    hint: "All promote-eligible classes · excludes final class",
  },
];

export type PromotionFilterKey =
  | "failed"
  | "pendingFees"
  | "pendingLibrary"
  | "attendanceShortage"
  | "pendingDocuments"
  | "manualHold";

export type PromotionFilterDef = {
  key: PromotionFilterKey;
  label: string;
  /** Institutes may disable filters later — mock toggle catalogue. */
  enabled: boolean;
};

export const PROMOTION_FILTER_DEFS: PromotionFilterDef[] = [
  { key: "failed", label: "Failed Students", enabled: true },
  { key: "pendingFees", label: "Pending Fees", enabled: true },
  { key: "pendingLibrary", label: "Pending Library Books", enabled: true },
  { key: "attendanceShortage", label: "Attendance Shortage", enabled: true },
  { key: "pendingDocuments", label: "Pending Documents", enabled: true },
  { key: "manualHold", label: "Manual Hold", enabled: true },
];

export type PromotionReviewAction =
  | "promote_anyway"
  | "repeat"
  | "hold"
  | "transfer"
  | "dropout"
  | "graduate";

export type PromotionStudentFlags = Record<PromotionFilterKey, boolean>;

export type PromotionRosterStudent = {
  id: string;
  rollNo: string;
  name: string;
  academicYearId: string;
  currentClass: string;
  section: string;
  promoteTo: string;
  isFinalClass: boolean;
  flags: PromotionStudentFlags;
};

export const PROMOTION_ROSTER: PromotionRosterStudent[] = [
  {
    id: "pr-01",
    rollNo: "04",
    name: "Aarav Sharma",
    academicYearId: "ay-2026-27",
    currentClass: "4th",
    section: "A",
    promoteTo: "5th",
    isFinalClass: false,
    flags: {
      failed: false,
      pendingFees: false,
      pendingLibrary: false,
      attendanceShortage: false,
      pendingDocuments: false,
      manualHold: false,
    },
  },
  {
    id: "pr-02",
    rollNo: "07",
    name: "Diya Patel",
    academicYearId: "ay-2026-27",
    currentClass: "4th",
    section: "A",
    promoteTo: "5th",
    isFinalClass: false,
    flags: {
      failed: false,
      pendingFees: true,
      pendingLibrary: false,
      attendanceShortage: false,
      pendingDocuments: false,
      manualHold: false,
    },
  },
  {
    id: "pr-03",
    rollNo: "12",
    name: "Ishaan Verma",
    academicYearId: "ay-2026-27",
    currentClass: "4th",
    section: "A",
    promoteTo: "5th",
    isFinalClass: false,
    flags: {
      failed: true,
      pendingFees: false,
      pendingLibrary: false,
      attendanceShortage: false,
      pendingDocuments: false,
      manualHold: false,
    },
  },
  {
    id: "pr-04",
    rollNo: "15",
    name: "Kiara Bose",
    academicYearId: "ay-2026-27",
    currentClass: "4th",
    section: "A",
    promoteTo: "5th",
    isFinalClass: false,
    flags: {
      failed: false,
      pendingFees: false,
      pendingLibrary: true,
      attendanceShortage: true,
      pendingDocuments: false,
      manualHold: false,
    },
  },
  {
    id: "pr-05",
    rollNo: "02",
    name: "Meera Iyer",
    academicYearId: "ay-2026-27",
    currentClass: "4th",
    section: "B",
    promoteTo: "5th",
    isFinalClass: false,
    flags: {
      failed: false,
      pendingFees: false,
      pendingLibrary: false,
      attendanceShortage: false,
      pendingDocuments: false,
      manualHold: false,
    },
  },
  {
    id: "pr-06",
    rollNo: "09",
    name: "Rohan Gupta",
    academicYearId: "ay-2026-27",
    currentClass: "4th",
    section: "B",
    promoteTo: "5th",
    isFinalClass: false,
    flags: {
      failed: false,
      pendingFees: false,
      pendingLibrary: false,
      attendanceShortage: false,
      pendingDocuments: true,
      manualHold: false,
    },
  },
  {
    id: "pr-07",
    rollNo: "01",
    name: "Ananya Krishnan",
    academicYearId: "ay-2026-27",
    currentClass: "10th",
    section: "A",
    promoteTo: "Graduate",
    isFinalClass: true,
    flags: {
      failed: false,
      pendingFees: false,
      pendingLibrary: false,
      attendanceShortage: false,
      pendingDocuments: false,
      manualHold: false,
    },
  },
  {
    id: "pr-08",
    rollNo: "06",
    name: "Vivaan Mehta",
    academicYearId: "ay-2026-27",
    currentClass: "10th",
    section: "A",
    promoteTo: "Graduate",
    isFinalClass: true,
    flags: {
      failed: false,
      pendingFees: true,
      pendingLibrary: false,
      attendanceShortage: false,
      pendingDocuments: false,
      manualHold: true,
    },
  },
  {
    id: "pr-09",
    rollNo: "03",
    name: "Kabir Reddy",
    academicYearId: "ay-2025-26",
    currentClass: "9th",
    section: "B",
    promoteTo: "10th",
    isFinalClass: false,
    flags: {
      failed: false,
      pendingFees: false,
      pendingLibrary: false,
      attendanceShortage: false,
      pendingDocuments: false,
      manualHold: false,
    },
  },
  {
    id: "pr-10",
    rollNo: "11",
    name: "Pooja Singh",
    academicYearId: "ay-2025-26",
    currentClass: "9th",
    section: "B",
    promoteTo: "10th",
    isFinalClass: false,
    flags: {
      failed: true,
      pendingFees: false,
      pendingLibrary: false,
      attendanceShortage: false,
      pendingDocuments: false,
      manualHold: false,
    },
  },
  {
    id: "pr-11",
    rollNo: "04",
    name: "Aarav Sharma",
    academicYearId: "ay-2024-25",
    currentClass: "7th",
    section: "A",
    promoteTo: "8th",
    isFinalClass: false,
    flags: {
      failed: false,
      pendingFees: false,
      pendingLibrary: false,
      attendanceShortage: false,
      pendingDocuments: false,
      manualHold: false,
    },
  },
  {
    id: "pr-12",
    rollNo: "07",
    name: "Diya Patel",
    academicYearId: "ay-2024-25",
    currentClass: "7th",
    section: "A",
    promoteTo: "8th",
    isFinalClass: false,
    flags: {
      failed: false,
      pendingFees: true,
      pendingLibrary: false,
      attendanceShortage: false,
      pendingDocuments: false,
      manualHold: false,
    },
  },
  {
    id: "pr-13",
    rollNo: "04",
    name: "Aarav Sharma",
    academicYearId: "ay-2023-24",
    currentClass: "4th",
    section: "A",
    promoteTo: "5th",
    isFinalClass: false,
    flags: {
      failed: false,
      pendingFees: false,
      pendingLibrary: false,
      attendanceShortage: false,
      pendingDocuments: false,
      manualHold: false,
    },
  },
  {
    id: "pr-14",
    rollNo: "08",
    name: "Ishaan Verma",
    academicYearId: "ay-2022-23",
    currentClass: "4th",
    section: "A",
    promoteTo: "5th",
    isFinalClass: false,
    flags: {
      failed: false,
      pendingFees: false,
      pendingLibrary: false,
      attendanceShortage: false,
      pendingDocuments: false,
      manualHold: false,
    },
  },
  // Extra 2026-27 rows for multi-class / institute-except-10th demos
  {
    id: "pr-15",
    rollNo: "01",
    name: "Vihaan Kapoor",
    academicYearId: "ay-2026-27",
    currentClass: "5th",
    section: "A",
    promoteTo: "6th",
    isFinalClass: false,
    flags: {
      failed: false,
      pendingFees: false,
      pendingLibrary: false,
      attendanceShortage: false,
      pendingDocuments: false,
      manualHold: false,
    },
  },
  {
    id: "pr-16",
    rollNo: "03",
    name: "Anaya Joshi",
    academicYearId: "ay-2026-27",
    currentClass: "5th",
    section: "B",
    promoteTo: "6th",
    isFinalClass: false,
    flags: {
      failed: false,
      pendingFees: true,
      pendingLibrary: false,
      attendanceShortage: false,
      pendingDocuments: false,
      manualHold: false,
    },
  },
  {
    id: "pr-17",
    rollNo: "02",
    name: "Reyansh Mehta",
    academicYearId: "ay-2026-27",
    currentClass: "7th",
    section: "A",
    promoteTo: "8th",
    isFinalClass: false,
    flags: {
      failed: false,
      pendingFees: false,
      pendingLibrary: false,
      attendanceShortage: true,
      pendingDocuments: false,
      manualHold: false,
    },
  },
  {
    id: "pr-18",
    rollNo: "05",
    name: "Sara Nair",
    academicYearId: "ay-2026-27",
    currentClass: "7th",
    section: "C",
    promoteTo: "8th",
    isFinalClass: false,
    flags: {
      failed: false,
      pendingFees: false,
      pendingLibrary: false,
      attendanceShortage: false,
      pendingDocuments: false,
      manualHold: false,
    },
  },
  {
    id: "pr-19",
    rollNo: "01",
    name: "Arjun Desai",
    academicYearId: "ay-2026-27",
    currentClass: "9th",
    section: "A",
    promoteTo: "10th",
    isFinalClass: false,
    flags: {
      failed: false,
      pendingFees: false,
      pendingLibrary: false,
      attendanceShortage: false,
      pendingDocuments: false,
      manualHold: false,
    },
  },
  {
    id: "pr-20",
    rollNo: "04",
    name: "Myra Singh",
    academicYearId: "ay-2026-27",
    currentClass: "9th",
    section: "B",
    promoteTo: "10th",
    isFinalClass: false,
    flags: {
      failed: true,
      pendingFees: false,
      pendingLibrary: false,
      attendanceShortage: false,
      pendingDocuments: false,
      manualHold: false,
    },
  },
];

/** Demo side-effects after promote (teachers + timetable roll forward). */
export function mockPromotionSideEffects(input: {
  studentCount: number;
  classes: string[];
  academicYearLabel: string;
}): {
  studentsPromoted: number;
  academicYearLabel: string;
  classesTouched: string[];
  teachersUpdated: number;
  timetablesUpdated: number;
} {
  const classesTouched = [...new Set(input.classes)].sort();
  return {
    studentsPromoted: input.studentCount,
    academicYearLabel: input.academicYearLabel,
    classesTouched,
    teachersUpdated: Math.max(1, classesTouched.length * 2),
    timetablesUpdated: Math.max(1, classesTouched.length),
  };
}

export function promotionFilterLabel(key: PromotionFilterKey): string {
  return PROMOTION_FILTER_DEFS.find((f) => f.key === key)?.label ?? key;
}

export function matchingPromotionReasons(
  student: PromotionRosterStudent,
  activeFilters: PromotionFilterKey[],
): string[] {
  return activeFilters
    .filter((key) => student.flags[key])
    .map((key) => promotionFilterLabel(key));
}

export function matchPromotionRoster(params: {
  yearId: string;
  scope: PromotionScopeMode;
  currentClass: string;
  section: string;
  multiClasses: string[];
}): PromotionRosterStudent[] {
  const { yearId, scope, currentClass, section, multiClasses } = params;

  return PROMOTION_ROSTER.filter((s) => {
    if (s.academicYearId !== yearId) return false;

    if (scope === "single") {
      return s.currentClass === currentClass && s.section === section;
    }

    if (scope === "multi") {
      if (multiClasses.length === 0) return false;
      return multiClasses.includes(s.currentClass);
    }

    // institute_except_final — all non-10th classes, all sections
    return !s.isFinalClass && s.currentClass !== "10th";
  }).map((s) => ({ ...s, flags: { ...s.flags } }));
}

export function promotionScopeSummaryLabel(params: {
  scope: PromotionScopeMode;
  currentClass: string;
  section: string;
  multiClasses: string[];
}): string {
  if (params.scope === "single") {
    return `${params.currentClass}-${params.section}`;
  }
  if (params.scope === "multi") {
    if (params.multiClasses.length === 0) return "No classes selected";
    return params.multiClasses.join(", ") + " · all sections";
  }
  return "Institute except 10th · all sections";
}

/** Mock class/section records for viewing a selected academic year (past 5 years). */
export type AcademicYearRecordStatus = "Active" | "Transferred" | "Dropped Out";

export type AcademicYearRecordStudent = {
  id: string;
  academicYearId: string;
  name: string;
  rollNo: string;
  classLabel: string;
  section: string;
  status: AcademicYearRecordStatus;
};

export const ACADEMIC_YEAR_RECORD_STATUS_OPTIONS: Array<"all" | AcademicYearRecordStatus> = [
  "all",
  "Active",
  "Transferred",
  "Dropped Out",
];

export const ACADEMIC_YEAR_RECORDS: AcademicYearRecordStudent[] = [
  // 2022-2023
  { id: "yr-2201", academicYearId: "ay-2022-23", name: "Aarav Sharma", rollNo: "04", classLabel: "5th", section: "A", status: "Active" },
  { id: "yr-2202", academicYearId: "ay-2022-23", name: "Diya Patel", rollNo: "07", classLabel: "5th", section: "A", status: "Active" },
  { id: "yr-2203", academicYearId: "ay-2022-23", name: "Kiara Bose", rollNo: "01", classLabel: "8th", section: "B", status: "Transferred" },
  // 2023-2024
  { id: "yr-2301", academicYearId: "ay-2023-24", name: "Aarav Sharma", rollNo: "04", classLabel: "6th", section: "A", status: "Active" },
  { id: "yr-2302", academicYearId: "ay-2023-24", name: "Diya Patel", rollNo: "07", classLabel: "6th", section: "A", status: "Active" },
  { id: "yr-2303", academicYearId: "ay-2023-24", name: "Meera Iyer", rollNo: "02", classLabel: "5th", section: "C", status: "Active" },
  { id: "yr-2304", academicYearId: "ay-2023-24", name: "Devansh Rao", rollNo: "14", classLabel: "7th", section: "B", status: "Dropped Out" },
  // 2024-2025
  { id: "yr-2401", academicYearId: "ay-2024-25", name: "Aarav Sharma", rollNo: "04", classLabel: "7th", section: "A", status: "Active" },
  { id: "yr-2402", academicYearId: "ay-2024-25", name: "Diya Patel", rollNo: "07", classLabel: "7th", section: "A", status: "Active" },
  { id: "yr-2403", academicYearId: "ay-2024-25", name: "Ishaan Verma", rollNo: "12", classLabel: "7th", section: "A", status: "Active" },
  { id: "yr-2404", academicYearId: "ay-2024-25", name: "Tara Menon", rollNo: "10", classLabel: "8th", section: "B", status: "Dropped Out" },
  // 2025-2026
  { id: "yr-2501", academicYearId: "ay-2025-26", name: "Aarav Sharma", rollNo: "04", classLabel: "8th", section: "A", status: "Active" },
  { id: "yr-2502", academicYearId: "ay-2025-26", name: "Kabir Reddy", rollNo: "03", classLabel: "9th", section: "B", status: "Transferred" },
  { id: "yr-2503", academicYearId: "ay-2025-26", name: "Pooja Singh", rollNo: "11", classLabel: "9th", section: "B", status: "Active" },
  { id: "yr-2504", academicYearId: "ay-2025-26", name: "Ananya Krishnan", rollNo: "01", classLabel: "10th", section: "A", status: "Active" },
  // 2026-2027 (active)
  { id: "yr-2601", academicYearId: "ay-2026-27", name: "Aarav Sharma", rollNo: "04", classLabel: "4th", section: "A", status: "Active" },
  { id: "yr-2602", academicYearId: "ay-2026-27", name: "Diya Patel", rollNo: "07", classLabel: "4th", section: "A", status: "Active" },
  { id: "yr-2603", academicYearId: "ay-2026-27", name: "Ishaan Verma", rollNo: "12", classLabel: "4th", section: "A", status: "Active" },
  { id: "yr-2604", academicYearId: "ay-2026-27", name: "Vivaan Mehta", rollNo: "06", classLabel: "10th", section: "A", status: "Active" },
  { id: "yr-2605", academicYearId: "ay-2026-27", name: "Myra Shah", rollNo: "04", classLabel: "10th", section: "C", status: "Active" },
  { id: "yr-2606", academicYearId: "ay-2026-27", name: "Nikhil Jain", rollNo: "16", classLabel: "5th", section: "C", status: "Transferred" },
  { id: "yr-2607", academicYearId: "ay-2026-27", name: "Tara Menon", rollNo: "10", classLabel: "7th", section: "B", status: "Dropped Out" },
];

export function getRecordsForAcademicYear(academicYearId: string): AcademicYearRecordStudent[] {
  return ACADEMIC_YEAR_RECORDS.filter((r) => r.academicYearId === academicYearId);
}

export function getClassesStudiedByStudent(name: string): string {
  const rows = ACADEMIC_YEAR_RECORDS.filter((r) => r.name === name);
  if (rows.length === 0) return "—";
  return rows
    .map((r) => {
      const year =
        ACADEMIC_YEAR_VIEW_OPTIONS.find((y) => y.id === r.academicYearId)?.label ??
        r.academicYearId;
      return `${r.classLabel}-${r.section} (${year})`;
    })
    .join("; ");
}

export function yearRecordStatusTone(
  status: AcademicYearRecordStatus,
): "success" | "info" | "danger" | "neutral" {
  if (status === "Active") return "success";
  if (status === "Transferred") return "info";
  if (status === "Dropped Out") return "danger";
  return "neutral";
}

export const GRADUATION_CANDIDATES: GraduationCandidate[] = [
  {
    id: "gc-01",
    name: "Ananya Krishnan",
    admissionNo: "ADM-1801",
    class: "10th",
    section: "A",
    exitYear: "2025-2026",
    retainUntil: "2030-2031",
    status: "ready",
  },
  {
    id: "gc-02",
    name: "Vivaan Mehta",
    admissionNo: "ADM-1808",
    class: "10th",
    section: "B",
    exitYear: "2025-2026",
    retainUntil: "2030-2031",
    status: "ready",
  },
  {
    id: "gc-03",
    name: "Saanvi Nair",
    admissionNo: "ADM-1712",
    class: "12th",
    section: "A",
    exitYear: "2024-2025",
    retainUntil: "2029-2030",
    status: "graduated",
  },
  {
    id: "gc-04",
    name: "Arjun Das",
    admissionNo: "ADM-1605",
    class: "10th",
    section: "C",
    exitYear: "2020-2021",
    retainUntil: "2025-2026",
    status: "archived",
  },
];

export const STATUS_ASSIGNMENT_ROWS: StatusAssignmentRow[] = [
  {
    id: "sa-01",
    name: "Ishaan Verma",
    admissionNo: "ADM-2501",
    class: "6th",
    section: "A",
    status: "Active",
  },
  {
    id: "sa-02",
    name: "Pooja Singh",
    admissionNo: "ADM-2311",
    class: "8th",
    section: "B",
    status: "Repeating",
  },
  {
    id: "sa-03",
    name: "Devansh Rao",
    admissionNo: "ADM-2210",
    class: "9th",
    section: "A",
    status: "Transferred",
  },
  {
    id: "sa-04",
    name: "Kiara Bose",
    admissionNo: "ADM-2104",
    class: "10th",
    section: "B",
    status: "Graduated",
  },
  {
    id: "sa-05",
    name: "Nikhil Jain",
    admissionNo: "ADM-2409",
    class: "5th",
    section: "C",
    status: "Inactive",
  },
];

/** Highest class from selected institute structure (Nursery → 10th). */
export const HIGHEST_CONFIGURED_CLASS = "10th";

/** Graduation list status — plan: failed, passed, or dropped out. */
export type GraduationResult = "passed" | "failed" | "dropped_out";

export type GraduationFinalStudent = {
  id: string;
  name: string;
  rollNo: string;
  class: string;
  section: string;
  academicYearId: string;
  result: GraduationResult;
  /** ISO timestamp recorded when graduation is confirmed. */
  graduatedAt?: string;
};

/** Present (active) academic year for graduation status updates. */
export const PRESENT_GRADUATION_YEAR_ID = "ay-2026-27";

export const GRADUATION_YEAR_OPTIONS = [
  { id: "ay-2024-25", label: "2024-2025" },
  { id: "ay-2025-26", label: "2025-2026" },
  { id: "ay-2026-27", label: "2026-2027" },
] as const;

export const GRADUATION_STATUS_FILTER_OPTIONS: Array<"all" | GraduationResult> = [
  "all",
  "passed",
  "failed",
  "dropped_out",
];

export const GRADUATION_RESULT_OPTIONS: GraduationResult[] = [
  "passed",
  "failed",
  "dropped_out",
];

export const GRADUATION_FINAL_CLASS_STUDENTS: GraduationFinalStudent[] = [
  // Present year 2026-27
  {
    id: "gf-01",
    name: "Ananya Krishnan",
    rollNo: "01",
    class: "10th",
    section: "A",
    academicYearId: "ay-2026-27",
    result: "passed",
  },
  {
    id: "gf-02",
    name: "Vivaan Mehta",
    rollNo: "06",
    class: "10th",
    section: "A",
    academicYearId: "ay-2026-27",
    result: "passed",
  },
  {
    id: "gf-03",
    name: "Riya Kapoor",
    rollNo: "09",
    class: "10th",
    section: "A",
    academicYearId: "ay-2026-27",
    result: "failed",
  },
  {
    id: "gf-04",
    name: "Arjun Das",
    rollNo: "03",
    class: "10th",
    section: "B",
    academicYearId: "ay-2026-27",
    result: "passed",
  },
  {
    id: "gf-05",
    name: "Sneha Reddy",
    rollNo: "12",
    class: "10th",
    section: "B",
    academicYearId: "ay-2026-27",
    result: "failed",
  },
  {
    id: "gf-06",
    name: "Kabir Malhotra",
    rollNo: "15",
    class: "10th",
    section: "C",
    academicYearId: "ay-2026-27",
    result: "dropped_out",
  },
  {
    id: "gf-07",
    name: "Myra Shah",
    rollNo: "04",
    class: "10th",
    section: "C",
    academicYearId: "ay-2026-27",
    result: "passed",
  },
  {
    id: "gf-08",
    name: "Neha Joshi",
    rollNo: "08",
    class: "10th",
    section: "B",
    academicYearId: "ay-2026-27",
    result: "dropped_out",
  },
  // Prior years (view / graduate archive)
  {
    id: "gf-09",
    name: "Dev Patel",
    rollNo: "02",
    class: "10th",
    section: "A",
    academicYearId: "ay-2025-26",
    result: "passed",
  },
  {
    id: "gf-10",
    name: "Isha Nair",
    rollNo: "07",
    class: "10th",
    section: "B",
    academicYearId: "ay-2025-26",
    result: "failed",
  },
  {
    id: "gf-11",
    name: "Rohan Gupta",
    rollNo: "05",
    class: "10th",
    section: "A",
    academicYearId: "ay-2024-25",
    result: "passed",
  },
  {
    id: "gf-12",
    name: "Tara Menon",
    rollNo: "11",
    class: "10th",
    section: "C",
    academicYearId: "ay-2024-25",
    result: "dropped_out",
  },
];

export type StudentLifecycleStatus =
  | "Active"
  | "Graduated"
  | "Transferred"
  | "Dropped Out"
  | "Repeating"
  | "Inactive";

export type StatusDirectoryStudent = {
  id: string;
  name: string;
  rollNo: string;
  admissionNo: string;
  class: string;
  section: string;
  status: StudentLifecycleStatus;
};

export const STATUS_DIRECTORY_STUDENTS: StatusDirectoryStudent[] = [
  {
    id: "sd-01",
    name: "Ishaan Verma",
    rollNo: "08",
    admissionNo: "ADM-2501",
    class: "6th",
    section: "A",
    status: "Active",
  },
  {
    id: "sd-02",
    name: "Aarav Sharma",
    rollNo: "04",
    admissionNo: "ADM-2401",
    class: "4th",
    section: "A",
    status: "Active",
  },
  {
    id: "sd-03",
    name: "Diya Patel",
    rollNo: "07",
    admissionNo: "ADM-2402",
    class: "4th",
    section: "A",
    status: "Active",
  },
  {
    id: "sd-04",
    name: "Meera Iyer",
    rollNo: "02",
    admissionNo: "ADM-2415",
    class: "7th",
    section: "C",
    status: "Active",
  },
  {
    id: "sd-05",
    name: "Pooja Singh",
    rollNo: "11",
    admissionNo: "ADM-2311",
    class: "8th",
    section: "B",
    status: "Repeating",
  },
  {
    id: "sd-06",
    name: "Rohan Gupta",
    rollNo: "05",
    admissionNo: "ADM-2420",
    class: "5th",
    section: "A",
    status: "Repeating",
  },
  {
    id: "sd-07",
    name: "Devansh Rao",
    rollNo: "14",
    admissionNo: "ADM-2210",
    class: "9th",
    section: "A",
    status: "Transferred",
  },
  {
    id: "sd-08",
    name: "Kiara Bose",
    rollNo: "01",
    admissionNo: "ADM-2104",
    class: "10th",
    section: "B",
    status: "Graduated",
  },
  {
    id: "sd-09",
    name: "Saanvi Nair",
    rollNo: "03",
    admissionNo: "ADM-1712",
    class: "12th",
    section: "A",
    status: "Graduated",
  },
  {
    id: "sd-10",
    name: "Nikhil Jain",
    rollNo: "16",
    admissionNo: "ADM-2409",
    class: "5th",
    section: "C",
    status: "Inactive",
  },
  {
    id: "sd-11",
    name: "Tara Menon",
    rollNo: "10",
    admissionNo: "ADM-2305",
    class: "7th",
    section: "B",
    status: "Dropped Out",
  },
  {
    id: "sd-12",
    name: "Arjun Das",
    rollNo: "02",
    admissionNo: "ADM-1605",
    class: "10th",
    section: "C",
    status: "Graduated",
  },
  {
    id: "sd-13",
    name: "Ananya Krishnan",
    rollNo: "01",
    admissionNo: "ADM-1801",
    class: "10th",
    section: "A",
    status: "Graduated",
  },
];

export const STUDENT_STATUS_FILTER_OPTIONS: Array<"All" | StudentLifecycleStatus> = [
  "All",
  "Active",
  "Graduated",
  "Transferred",
  "Dropped Out",
  "Repeating",
  "Inactive",
];

export function studentStatusBadgeTone(
  status: StudentLifecycleStatus,
): "success" | "info" | "warning" | "danger" | "neutral" {
  if (status === "Active") return "success"; // green
  if (status === "Graduated") return "info"; // blue
  if (status === "Repeating") return "warning"; // orange
  if (status === "Dropped Out" || status === "Transferred") return "danger"; // red
  return "neutral"; // grey — Inactive
}

export function graduationResultTone(
  result: GraduationResult,
): "success" | "info" | "warning" | "danger" | "neutral" {
  if (result === "passed") return "success";
  if (result === "failed") return "danger";
  return "warning"; // dropped_out
}

export function graduationResultLabel(result: GraduationResult): string {
  if (result === "passed") return "Passed";
  if (result === "failed") return "Failed";
  return "Dropped Out";
}

export function newAcademicYearId() {
  return `ay-${Date.now().toString(36)}`;
}
