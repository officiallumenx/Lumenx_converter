/** Exam records, timetables, and scheduling helpers. */

import { readDemoProfileId } from "@lumenx/types";
import { getLevelLabels } from "@/lib/academic-data";
import { assignSubjectsToDates } from "@/lib/exam-calendar-utils";
import { getSubjectCatalog } from "@/lib/subjects-data";

export type ExamStatus = "scheduled" | "in-progress" | "grading" | "published";

export type ExamRecord = {
  id: string;
  name: string;
  /** Banner title shown on printed timetable */
  header: string;
  grade: string;
  section: string;
  term: string;
  /** ISO date — first day of exam window */
  startDate: string;
  /** ISO date — last day; used to mark outdated */
  endDate: string;
  status: ExamStatus;
  progress: number;
  subjects: string[];
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

const TERM_LABEL = "Term 2 · 2025–26";

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
  if (!iso || iso === "TBD") return "TBD";
  try {
    return new Date(iso + "T12:00:00").toLocaleDateString("en-IN", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
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
  const levels = getLevelLabels();
  return [...levels, "All batches"];
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

export function autoGenerateExamSlots(input: CreateExamTimetableInput): ExamTimetableSlot[] {
  const subjects =
    input.subjectNames.length > 0
      ? input.subjectNames
      : getSubjectNameOptions().slice(0, 5);
  const grade =
    input.gradeScope === "All batches"
      ? getLevelLabels()[0] ?? "Grade 10"
      : input.gradeScope;
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

function buildInitialExams(): ExamRecord[] {
  const college = readDemoProfileId() === "inter_college";
  return [
    {
      id: "EX-MID",
      name: "Mid-term Examination",
      header: "Mid-Term Examination · Term 2",
      grade: college ? "All batches" : "All Grades",
      section: "All",
      term: TERM_LABEL,
      startDate: "2026-03-10",
      endDate: "2026-03-14",
      status: "scheduled",
      progress: 0,
      subjects: college
        ? ["Mathematics", "Physics", "Chemistry"]
        : ["Mathematics", "Physics", "Chemistry", "English"],
    },
    {
      id: "EX-UT3",
      name: "Unit Test 3",
      header: "Unit Test 3 · Term 2",
      grade: college ? "1st Year" : "Grade 10–12",
      section: "All",
      term: TERM_LABEL,
      startDate: "2026-06-15",
      endDate: "2026-06-17",
      status: "in-progress",
      progress: 64,
      subjects: ["Mathematics", "Physics"],
    },
    {
      id: "EX-PRE",
      name: "Pre-board Mock",
      header: "Pre-board Mock Examination",
      grade: college ? "2nd Year" : "Grade 12",
      section: "All",
      term: TERM_LABEL,
      startDate: "2025-11-20",
      endDate: "2025-11-22",
      status: "grading",
      progress: 82,
      subjects: ["All core"],
    },
    {
      id: "EX-FIN",
      name: "Term 1 Final",
      header: "Term 1 Final Examination",
      grade: college ? "All batches" : "All Grades",
      section: "All",
      term: "Term 1 · 2025–26",
      startDate: "2025-09-10",
      endDate: "2025-09-18",
      status: "published",
      progress: 100,
      subjects: ["All"],
    },
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
  return buildInitialExams();
}

export function getInitialExamTimetables(exams = getInitialExams()): ExamTimetable[] {
  return readDemoProfileId() === "inter_college"
    ? buildCollegeInitialTimetables(exams)
    : buildSchoolInitialTimetables(exams);
}

export function createExamRecord(input: {
  name: string;
  header: string;
  grade: string;
  section: string;
  startDate: string;
  endDate?: string;
  subjects: string[];
  term?: string;
}): ExamRecord {
  const subjects = input.subjects.length > 0 ? input.subjects : ["General"];
  const start = input.startDate || todayIso();
  const end = input.endDate || start;
  return {
    id: `EX-${Date.now()}`,
    name: input.name.trim(),
    header: input.header.trim() || input.name.trim(),
    grade: input.grade,
    section: input.section,
    term: input.term ?? TERM_LABEL,
    startDate: start,
    endDate: end,
    status: "scheduled",
    progress: 0,
    subjects,
  };
}

export function createExamTimetable(input: CreateExamTimetableInput): ExamTimetable {
  const { exam } = input;
  const slots = autoGenerateExamSlots(input);
  const gradeLabel =
    input.gradeScope === "All batches" ? "All batches" : input.gradeScope;
  return {
    id: `ETT-${Date.now()}`,
    examId: exam.id,
    examName: `${exam.name} · ${gradeLabel}`,
    header: input.header || exam.header,
    term: exam.term,
    grade: gradeLabel,
    section: input.section,
    startTime: input.startTime,
    endTime: input.endTime,
    status: "draft",
    slots,
    updatedAt: todayIso(),
  };
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
