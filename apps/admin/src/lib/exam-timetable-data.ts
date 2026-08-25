/** Exam records, timetables, and scheduling helpers. */

import { readDemoProfileId } from "@lumenx/types";
import {
  upsertLearnerExamSchedule,
  removeLearnerExamSchedule,
  type ExamClassScope,
  type LearnerExamSchedule,
} from "@lumenx/module-exams";
import { formatDisplayDate as formatDisplayDateShared } from "@lumenx/utils";
import { getInstituteClasses, getLevelLabels, isCollegeMode } from "@/lib/academic-data";
import { assignSubjectsToDates } from "@/lib/exam-calendar-utils";
import { getSubjectCatalog } from "@/lib/subjects-data";

export type ExamStatus = "scheduled" | "in-progress" | "grading" | "published";

export type ExamRecord = {
  id: string;
  name: string;
  /** Banner title shown on printed timetable */
  header: string;
  /** Display label (All classes / selected grades joined) */
  grade: string;
  /** all = whole institute; selected = class · section keys in grades */
  classScope: ExamClassScope;
  /** Class · section keys (`Grade 10::A`) or legacy grade labels. Empty when classScope is "all". */
  grades: string[];
  section: string;
  term: string;
  /** ISO date — first day of exam window */
  startDate: string;
  /** ISO date — last day; used to mark outdated */
  endDate: string;
  /** Daily exam session start (HH:mm) */
  startTime: string;
  /** Daily exam session end (HH:mm) */
  endTime: string;
  status: ExamStatus;
  progress: number;
  subjects: string[];
  /** Total marks per paper (mandatory). Example: 100 */
  totalMarks: number;
  /** Optional internal component (e.g. 20). Not required. */
  internalMarks: number | null;
  /** Optional external / written component (e.g. 80). Not required. */
  externalMarks: number | null;
};

export type ExamTimetableSlot = {
  id: string;
  date: string;
  dayNumber: number;
  subject: string;
  grade: string;
  section: string;
  startTime: string;
  endTime: string;
  room: string;
  invigilator: string;
};

export type ExamTimetable = {
  id: string;
  examId: string;
  examName: string;
  header: string;
  term: string;
  grade: string;
  section: string;
  startTime: string;
  endTime: string;
  status: "draft" | "published";
  slots: ExamTimetableSlot[];
  updatedAt: string;
};

export type CreateExamTimetableInput = {
  exam: ExamRecord;
  gradeScope: string;
  startDate: string;
  endDate: string;
  subjectNames: string[];
  section: string;
  header: string;
  startTime: string;
  endTime: string;
  skipBlockedDays?: boolean;
};

const TERM_LABEL = "2025–26";

function slotId() {
  return `ETS-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso + "T12:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function formatDisplayDate(iso: string): string {
  return formatDisplayDateShared(iso);
}

/** Banner header built from exam name + start/end dates (e.g. "Unit Test · 10 Mar 2026 to 14 Mar 2026"). */
export function buildExamHeader(name: string, startDate: string, endDate: string): string {
  const title = name.trim();
  const from = startDate ? formatDisplayDate(startDate) : "";
  const to = endDate ? formatDisplayDate(endDate) : from;
  if (!from && !to) return title;
  const datePart =
    from && to && from !== to ? `${from} to ${to}` : from || to;
  if (title && datePart) return `${title} · ${datePart}`;
  return title || datePart;
}

/** Full weekday + date for exam timetable rows, e.g. "Monday · 10 Mar 2026". */
export function formatExamDateWithDay(iso: string): string {
  if (!iso || iso === "TBD") return "TBD";
  try {
    const d = new Date(iso + "T12:00:00");
    const weekday = d.toLocaleDateString("en-IN", { weekday: "long" });
    const rest = d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    return `${weekday} · ${rest}`;
  } catch {
    return iso;
  }
}

export function examDateLabel(exam: ExamRecord): string {
  if (!exam.startDate) return "TBD";
  if (exam.endDate && exam.endDate !== exam.startDate) {
    return `${formatDisplayDate(exam.startDate)} – ${formatDisplayDate(exam.endDate)}`;
  }
  return formatDisplayDate(exam.startDate);
}

export function examTimeLabel(exam: Pick<ExamRecord, "startTime" | "endTime">): string {
  const from = exam.startTime?.trim();
  const to = exam.endTime?.trim();
  if (from && to) return `${from} – ${to}`;
  if (from) return `From ${from}`;
  if (to) return `Until ${to}`;
  return "Time TBD";
}

/** Display marks scheme: "100" or "100 (Int 20 + Ext 80)". */
export function examMarksLabel(
  exam: Pick<ExamRecord, "totalMarks" | "internalMarks" | "externalMarks">,
): string {
  const total = exam.totalMarks > 0 ? exam.totalMarks : 0;
  const parts: string[] = [];
  if (exam.internalMarks != null && exam.internalMarks > 0) {
    parts.push(`Int ${exam.internalMarks}`);
  }
  if (exam.externalMarks != null && exam.externalMarks > 0) {
    parts.push(`Ext ${exam.externalMarks}`);
  }
  if (parts.length === 0) return String(total);
  return `${total} (${parts.join(" + ")})`;
}

/** Validate marks on create/edit. Total is required; internal/external optional. */
export function validateExamMarks(input: {
  totalMarks: number | null;
  internalMarks: number | null;
  externalMarks: number | null;
}): string | null {
  if (input.totalMarks == null || !Number.isFinite(input.totalMarks) || input.totalMarks <= 0) {
    return "Total marks are required and must be greater than 0.";
  }
  const total = Math.round(input.totalMarks);
  const internal = input.internalMarks;
  const external = input.externalMarks;
  if (internal != null && (internal < 0 || !Number.isFinite(internal))) {
    return "Internal marks must be 0 or more.";
  }
  if (external != null && (external < 0 || !Number.isFinite(external))) {
    return "External marks must be 0 or more.";
  }
  if (internal != null && internal > total) {
    return "Internal marks cannot exceed total marks.";
  }
  if (external != null && external > total) {
    return "External marks cannot exceed total marks.";
  }
  if (internal != null && external != null && Math.round(internal + external) !== total) {
    return `Internal + external must equal total marks (${total}).`;
  }
  return null;
}

/** Published or past end date — read-only, deletable only. */
export function isExamOutdated(exam: ExamRecord, asOf = todayIso()): boolean {
  if (exam.status === "published") return true;
  if (exam.endDate && exam.endDate < asOf) return true;
  return false;
}

export function isExamActive(exam: ExamRecord): boolean {
  return !isExamOutdated(exam);
}

export function getGradeScopeOptions(): string[] {
  return getInstituteClassGradeOptions();
}

/** Unique institute classes (grades/batches) without sections. */
export function getInstituteClassGradeOptions(): string[] {
  const fromGroups = [...new Set(getInstituteClasses().map((c) => c.grade))];
  if (fromGroups.length > 0) {
    return fromGroups.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }
  return getLevelLabels();
}

/** One selectable class · section unit from institute setup. */
export type ClassSectionOption = {
  /** Stable key: `grade::section` */
  key: string;
  grade: string;
  section: string;
  /** e.g. "Grade 10 · Sec A" */
  label: string;
};

export function classSectionOptionKey(grade: string, section: string): string {
  return `${grade}::${section}`;
}

export function formatClassSectionOptionLabel(grade: string, section: string): string {
  return `${grade} · Sec ${section}`;
}

/** All class · section pairs in the institute (multi-select audience). */
export function getInstituteClassSectionOptions(): ClassSectionOption[] {
  const classes = getInstituteClasses();
  if (classes.length === 0) {
    return getLevelLabels().map((grade) => ({
      key: classSectionOptionKey(grade, "A"),
      grade,
      section: "A",
      label: formatClassSectionOptionLabel(grade, "A"),
    }));
  }
  return [...classes]
    .map((c) => ({
      key: classSectionOptionKey(c.grade, c.section),
      grade: c.grade,
      section: c.section,
      label: formatClassSectionOptionLabel(c.grade, c.section),
    }))
    .sort((a, b) => {
      const g = a.grade.localeCompare(b.grade, undefined, { numeric: true });
      return g !== 0 ? g : a.section.localeCompare(b.section);
    });
}

export function labelsForClassSectionKeys(keys: string[]): string[] {
  const options = getInstituteClassSectionOptions();
  const byRaw = new Map(options.map((o) => [o.key, o.label]));
  // Also index by canonical Attendance keys (`10::B`) so history/config labels resolve.
  const byCanonical = new Map(
    options.map((o) => {
      const left = o.grade.replace(/^(?:grade|class|std|standard|year)\s+/i, "").trim();
      const key = `${left}::${o.section.trim().toUpperCase()}`;
      return [key, o.label] as const;
    }),
  );
  return keys.map((k) => {
    const raw = byRaw.get(k);
    if (raw) return raw;
    const normalized = k.includes("::")
      ? `${k.split("::")[0]!.replace(/^(?:grade|class|std|standard|year)\s+/i, "").trim()}::${(k.split("::")[1] ?? "").trim().toUpperCase()}`
      : k;
    return byCanonical.get(normalized) ?? byRaw.get(normalized) ?? k.replace("::", " · Sec ");
  });
}

export function gradesFromClassSectionKeys(keys: string[]): string[] {
  return [...new Set(keys.map((k) => k.split("::")[0]!).filter(Boolean))];
}

export function sectionsFromClassSectionKeys(keys: string[]): string[] {
  return [...new Set(keys.map((k) => k.split("::")[1]!).filter(Boolean))];
}

export function formatExamClassLabel(exam: Pick<ExamRecord, "classScope" | "grades" | "grade">): string {
  if (exam.classScope === "all") {
    return isCollegeMode() ? "All batches" : "All classes";
  }
  if (exam.grades.length > 0) {
    // Prefer class·section labels when keys are stored that way
    if (exam.grades.some((g) => g.includes("::"))) {
      return labelsForClassSectionKeys(exam.grades).join(", ");
    }
    return exam.grades.join(", ");
  }
  return exam.grade || "No classes";
}

export function examClassDisplayLabel(
  classScope: ExamClassScope,
  grades: string[],
): string {
  if (classScope === "all") {
    return isCollegeMode() ? "All batches" : "All classes";
  }
  if (grades.length === 0) return "No classes";
  if (grades.some((g) => g.includes("::"))) {
    return labelsForClassSectionKeys(grades).join(", ");
  }
  return grades.join(", ");
}

export function getSubjectNameOptions(): string[] {
  return getSubjectCatalog()
    .filter((s) => s.status === "active")
    .map((s) => s.name);
}

export function examTimetableRange(slots: ExamTimetableSlot[]): string {
  if (slots.length === 0) return "No papers scheduled";
  const dates = [...slots].map((s) => s.date).sort();
  const first = formatExamDateWithDay(dates[0]!);
  const last = formatExamDateWithDay(dates[dates.length - 1]!);
  return first === last ? first : `${first} – ${last}`;
}

/**
 * Keep paper dates in place; reassign subjects by new order (drag up/down).
 * Day numbers become 1..n in date order.
 */
export function reorderExamSlotsBySubjectOrder(
  slots: ExamTimetableSlot[],
  orderedSubjects: string[],
): ExamTimetableSlot[] {
  const byDate = [...slots].sort((a, b) => a.date.localeCompare(b.date));
  const dates = byDate.map((s) => s.date);
  const len = Math.min(byDate.length, orderedSubjects.length);
  return byDate.map((slot, i) => ({
    ...slot,
    subject: i < len ? orderedSubjects[i]! : slot.subject,
    date: dates[i]!,
    dayNumber: i + 1,
  }));
}

/** Move an item in a list (for drag-and-drop subject reorder). */
export function moveListItem<T>(list: T[], fromIndex: number, toIndex: number): T[] {
  if (
    fromIndex === toIndex ||
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= list.length ||
    toIndex >= list.length
  ) {
    return list;
  }
  const next = [...list];
  const [item] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, item!);
  return next;
}

export function autoGenerateExamSlots(input: CreateExamTimetableInput): ExamTimetableSlot[] {
  const subjects =
    input.subjectNames.length > 0
      ? input.subjectNames
      : getSubjectNameOptions().slice(0, 5);
  const grade =
    input.gradeScope === "All batches" || input.gradeScope === "All classes"
      ? getLevelLabels()[0] ?? "Grade 10"
      : input.gradeScope.split(",")[0]?.trim() || input.gradeScope;
  const endDate = input.endDate || input.startDate;

  const assignments =
    input.skipBlockedDays !== false
      ? assignSubjectsToDates(input.startDate, endDate, subjects)
      : subjects.map((subject, i) => ({
          date: addDays(input.startDate, i),
          subject,
          paperNumber: i + 1,
        }));

  return assignments.map((a, i) => ({
    id: slotId(),
    date: a.date,
    dayNumber: a.paperNumber,
    subject: a.subject,
    grade,
    section: input.section,
    startTime: input.startTime || "09:00",
    endTime: input.endTime || "12:00",
    room: "",
    invigilator: "",
  }));
}

function withAudience(
  exam: Omit<ExamRecord, "classScope" | "grades" | "startTime" | "endTime" | "totalMarks" | "internalMarks" | "externalMarks"> &
    Partial<
      Pick<
        ExamRecord,
        "classScope" | "grades" | "startTime" | "endTime" | "totalMarks" | "internalMarks" | "externalMarks"
      >
    >,
): ExamRecord {
  const classScope = exam.classScope ?? (exam.grade.startsWith("All") ? "all" : "selected");
  const grades =
    exam.grades ??
    (classScope === "all"
      ? []
      : exam.grade
          .split(/[,–—]/)
          .map((g) => g.trim())
          .filter(Boolean));
  const totalMarks =
    exam.totalMarks != null && exam.totalMarks > 0 ? Math.round(exam.totalMarks) : 100;
  return {
    ...exam,
    classScope,
    grades,
    grade: examClassDisplayLabel(classScope, grades),
    section: exam.section || "All",
    startTime: exam.startTime || "09:00",
    endTime: exam.endTime || "12:00",
    totalMarks,
    internalMarks:
      exam.internalMarks != null && Number.isFinite(exam.internalMarks)
        ? Math.round(exam.internalMarks)
        : null,
    externalMarks:
      exam.externalMarks != null && Number.isFinite(exam.externalMarks)
        ? Math.round(exam.externalMarks)
        : null,
  };
}

function buildInitialExams(): ExamRecord[] {
  const college = readDemoProfileId() === "inter_college";
  return [
    withAudience({
      id: "EX-MID",
      name: "Mid-term Examination",
      header: "Mid-Term Examination",
      grade: college ? "All batches" : "All Grades",
      classScope: "all",
      grades: [],
      section: "All",
      term: TERM_LABEL,
      startDate: "2026-03-10",
      endDate: "2026-03-14",
      status: "scheduled",
      progress: 0,
      subjects: college
        ? ["Mathematics", "Physics", "Chemistry"]
        : ["Mathematics", "Physics", "Chemistry", "English"],
      totalMarks: 80,
      internalMarks: null,
      externalMarks: null,
    }),
    withAudience({
      id: "EX-UT3",
      name: "Unit Test 3",
      header: "Unit Test 3",
      grade: college ? "1st Year" : "Grade 10–12",
      classScope: "selected",
      grades: college ? ["1st Year"] : ["Grade 10", "Grade 11", "Grade 12"],
      section: "All",
      term: TERM_LABEL,
      startDate: "2026-06-15",
      endDate: "2026-06-17",
      status: "in-progress",
      progress: 64,
      subjects: ["Mathematics", "Physics"],
      totalMarks: 50,
      internalMarks: null,
      externalMarks: null,
    }),
    withAudience({
      id: "EX-PRE",
      name: "Pre-board Mock",
      header: "Pre-board Mock Examination",
      grade: college ? "2nd Year" : "Grade 12",
      classScope: "selected",
      grades: college ? ["2nd Year"] : ["Grade 12"],
      section: "All",
      term: TERM_LABEL,
      startDate: "2025-11-20",
      endDate: "2025-11-22",
      status: "grading",
      progress: 82,
      subjects: ["All core"],
      totalMarks: 100,
      internalMarks: 20,
      externalMarks: 80,
    }),
    withAudience({
      id: "EX-FIN",
      name: "Term 1 Final",
      header: "Term 1 Final Examination",
      grade: college ? "All batches" : "All Grades",
      classScope: "all",
      grades: [],
      section: "All",
      term: "2025–26",
      startDate: "2025-09-10",
      endDate: "2025-09-18",
      status: "published",
      progress: 100,
      subjects: ["All"],
      totalMarks: 100,
      internalMarks: 20,
      externalMarks: 80,
    }),
  ];
}

function buildSchoolInitialTimetables(exams: ExamRecord[]): ExamTimetable[] {
  const mid = exams.find((e) => e.id === "EX-MID")!;
  const ut = exams.find((e) => e.id === "EX-UT3");
  const start = "2026-03-10";
  const slots: ExamTimetableSlot[] = [
    {
      id: "ETS-1",
      date: start,
      dayNumber: 1,
      subject: "Mathematics",
      grade: "Grade 10",
      section: "All",
      startTime: "09:00",
      endTime: "12:00",
      room: "Hall A",
      invigilator: "Sarah Jenkins",
    },
    {
      id: "ETS-2",
      date: addDays(start, 1),
      dayNumber: 2,
      subject: "Physics",
      grade: "Grade 10",
      section: "All",
      startTime: "09:00",
      endTime: "12:00",
      room: "Hall A",
      invigilator: "David Koal",
    },
    {
      id: "ETS-3",
      date: addDays(start, 2),
      dayNumber: 3,
      subject: "Chemistry",
      grade: "Grade 10",
      section: "All",
      startTime: "09:00",
      endTime: "12:00",
      room: "Hall B",
      invigilator: "Priya Iyer",
    },
    {
      id: "ETS-4",
      date: addDays(start, 3),
      dayNumber: 4,
      subject: "English",
      grade: "Grade 10",
      section: "All",
      startTime: "09:00",
      endTime: "11:30",
      room: "Hall A",
      invigilator: "Hana Suzuki",
    },
  ];
  const list: ExamTimetable[] = [
    {
      id: "ETT-MID-10",
      examId: mid.id,
      examName: `${mid.name} · Grade 10`,
      header: mid.header,
      term: mid.term,
      grade: "Grade 10",
      section: "All",
      startTime: "09:00",
      endTime: "12:00",
      status: "published",
      slots,
      updatedAt: "2026-02-01",
    },
  ];
  if (ut && isExamActive(ut)) {
    list.push({
      id: "ETT-UT3-DRAFT",
      examId: ut.id,
      examName: `${ut.name} · Grade 11`,
      header: ut.header,
      term: ut.term,
      grade: "Grade 11",
      section: "All",
      startTime: "09:00",
      endTime: "12:00",
      status: "draft",
      slots: autoGenerateExamSlots({
        exam: ut,
        gradeScope: "Grade 11",
        startDate: "2026-06-15",
        endDate: "2026-06-17",
        subjectNames: ["Mathematics", "Biology"],
        section: "All",
        header: ut.header,
        startTime: "09:00",
        endTime: "12:00",
      }),
      updatedAt: "2026-03-15",
    });
  }
  return list;
}

function buildCollegeInitialTimetables(exams: ExamRecord[]): ExamTimetable[] {
  const mid = exams.find((e) => e.id === "EX-MID")!;
  const start = "2026-03-18";
  const grade = "MPC · 1st Year";
  return [
    {
      id: "ETT-MPC-MID",
      examId: mid.id,
      examName: `${mid.name} · MPC FY`,
      header: mid.header,
      term: mid.term,
      grade: "MPC · 1st Year",
      section: "All",
      startTime: "09:00",
      endTime: "12:00",
      status: "published",
      slots: [
        {
          id: "ETS-C1",
          date: start,
          dayNumber: 1,
          subject: "Mathematics",
          grade,
          section: "All",
          startTime: "09:00",
          endTime: "12:00",
          room: "Block A-101",
          invigilator: "Prof. Meera Nair",
        },
        {
          id: "ETS-C2",
          date: addDays(start, 1),
          dayNumber: 2,
          subject: "Physics",
          grade,
          section: "All",
          startTime: "09:00",
          endTime: "12:00",
          room: "Block A-102",
          invigilator: "Prof. Raj Mehta",
        },
        {
          id: "ETS-C3",
          date: addDays(start, 2),
          dayNumber: 3,
          subject: "Chemistry",
          grade,
          section: "All",
          startTime: "09:00",
          endTime: "12:00",
          room: "Lab-1",
          invigilator: "Prof. David Koal",
        },
      ],
      updatedAt: "2026-02-10",
    },
  ];
}

export function getInitialExams(): ExamRecord[] {
  const exams = buildInitialExams();
  for (const exam of exams) {
    if (!isExamOutdated(exam)) {
      syncExamToLearnerSchedules(exam, null);
    }
  }
  return exams;
}

export function getInitialExamTimetables(exams = getInitialExams()): ExamTimetable[] {
  const list =
    readDemoProfileId() === "inter_college"
      ? buildCollegeInitialTimetables(exams)
      : buildSchoolInitialTimetables(exams);
  for (const tt of list) {
    const exam = exams.find((e) => e.id === tt.examId);
    if (exam && !isExamOutdated(exam)) {
      syncExamToLearnerSchedules(exam, tt);
    }
  }
  return list;
}

export function createExamRecord(input: {
  name: string;
  header: string;
  classScope: ExamClassScope;
  grades: string[];
  startDate: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  subjects: string[];
  term?: string;
  totalMarks: number;
  internalMarks?: number | null;
  externalMarks?: number | null;
}): ExamRecord {
  const subjects = input.subjects.length > 0 ? input.subjects : ["General"];
  const start = input.startDate || todayIso();
  const end = input.endDate || start;
  const grades = input.classScope === "all" ? [] : [...input.grades];
  const sectionParts = sectionsFromClassSectionKeys(grades);
  const section =
    input.classScope === "all"
      ? "All"
      : sectionParts.length === 0
        ? "All"
        : sectionParts.length === 1
          ? sectionParts[0]!
          : sectionParts.join(", ");
  const exam = withAudience({
    id: `EX-${Date.now()}`,
    name: input.name.trim(),
    header: input.header.trim() || input.name.trim(),
    grade: examClassDisplayLabel(input.classScope, grades),
    classScope: input.classScope,
    grades,
    section,
    term: input.term ?? TERM_LABEL,
    startDate: start,
    endDate: end,
    startTime: input.startTime || "09:00",
    endTime: input.endTime || "12:00",
    status: "scheduled",
    progress: 0,
    subjects,
    totalMarks: input.totalMarks,
    internalMarks: input.internalMarks ?? null,
    externalMarks: input.externalMarks ?? null,
  });
  syncExamToLearnerSchedules(exam, null);
  return exam;
}

export function createExamTimetable(input: CreateExamTimetableInput): ExamTimetable {
  const { exam } = input;
  const slots = autoGenerateExamSlots(input);
  const gradeLabel =
    input.gradeScope === "All batches" || input.gradeScope === "All classes"
      ? input.gradeScope
      : input.gradeScope;
  const timetable: ExamTimetable = {
    id: `ETT-${Date.now()}`,
    examId: exam.id,
    examName: `${exam.name} · ${gradeLabel}`,
    header: input.header || exam.header,
    term: exam.term,
    grade: gradeLabel,
    section: input.section || "All",
    startTime: input.startTime,
    endTime: input.endTime,
    status: "draft",
    slots,
    updatedAt: todayIso(),
  };
  syncExamToLearnerSchedules(exam, timetable);
  return timetable;
}

/** Push exam (+ optional timetable) so Connect students/parents can see assigned schedules.
 * Full paper slots are shared only after the timetable is published. */
export function syncExamToLearnerSchedules(
  exam: ExamRecord,
  timetable: ExamTimetable | null,
): LearnerExamSchedule {
  const isPublished = timetable?.status === "published";
  const schedule: LearnerExamSchedule = {
    examId: exam.id,
    examName: exam.name,
    header: timetable?.header || exam.header,
    term: exam.term,
    classScope: exam.classScope,
    grades: exam.classScope === "all" ? [] : [...exam.grades],
    startDate: exam.startDate,
    endDate: exam.endDate,
    startTime: timetable?.startTime || exam.startTime || "09:00",
    endTime: timetable?.endTime || exam.endTime || "12:00",
    timetableStatus: !timetable ? "none" : isPublished ? "published" : "draft",
    // Learners see paper-by-paper timetable only after admin publishes
    slots: isPublished
      ? timetable.slots.map((s) => ({
          date: s.date,
          dayNumber: s.dayNumber,
          subject: s.subject,
          startTime: s.startTime,
          endTime: s.endTime,
          room: s.room || undefined,
        }))
      : [],
    updatedAt: todayIso(),
  };
  upsertLearnerExamSchedule(schedule);
  return schedule;
}

export function unpublishExamFromLearners(examId: string) {
  removeLearnerExamSchedule(examId);
}

export type ExamTimetableSlotInput = Omit<ExamTimetableSlot, "id">;

export function addSlotToTimetable(
  timetable: ExamTimetable,
  slot: ExamTimetableSlotInput,
): ExamTimetable {
  return {
    ...timetable,
    slots: [...timetable.slots, { ...slot, id: slotId() }],
    updatedAt: todayIso(),
  };
}

export function removeSlotFromTimetable(timetable: ExamTimetable, slotId: string): ExamTimetable {
  return {
    ...timetable,
    slots: timetable.slots.filter((s) => s.id !== slotId),
    updatedAt: todayIso(),
  };
}

export function isTimetableOutdated(
  timetable: ExamTimetable,
  exams: ExamRecord[],
): boolean {
  const exam = exams.find((e) => e.id === timetable.examId);
  return exam ? isExamOutdated(exam) : false;
}
