import { MODULE_IDS } from "@lumenx/config/module-ids";

export const MODULE_ID = MODULE_IDS.exams;
export const MIN_PLAN = "plus" as const;
export const OWNER_APP = "admin" as const;
export const MODULE_NAME = "Exams";

export type ExamClassScope = "all" | "selected";

export type LearnerExamSlot = {
  date: string;
  dayNumber: number;
  subject: string;
  startTime: string;
  endTime: string;
  room?: string;
};

/** Published exam schedule visible to students/parents for assigned classes. */
export type LearnerExamSchedule = {
  examId: string;
  examName: string;
  header: string;
  term: string;
  classScope: ExamClassScope;
  /** Class grades without sections (e.g. "Grade 10"). Empty when classScope is "all". */
  grades: string[];
  startDate: string;
  endDate: string;
  /** Daily paper window — from time */
  startTime: string;
  /** Daily paper window — to time */
  endTime: string;
  timetableStatus: "none" | "draft" | "published";
  slots: LearnerExamSlot[];
  updatedAt: string;
};

export function formatExamTimeRange(startTime?: string, endTime?: string): string {
  const from = (startTime ?? "").trim();
  const to = (endTime ?? "").trim();
  if (from && to) return `${from} – ${to}`;
  if (from) return `From ${from}`;
  if (to) return `Until ${to}`;
  return "Time TBD";
}

const STORAGE_KEY = "lumenx.learner-exam-schedules";

export function normalizeClassGrade(value: string): string {
  const raw = value.trim().toLowerCase();
  if (!raw) return "";
  const digits = raw.match(/\d+/);
  if (digits) return digits[0]!;
  return raw.replace(/^(grade|class|year)\s*/i, "").trim();
}

export function examVisibleToClass(
  schedule: Pick<LearnerExamSchedule, "classScope" | "grades">,
  learnerClass: string,
): boolean {
  if (schedule.classScope === "all") return true;
  const learner = normalizeClassGrade(learnerClass);
  if (!learner) return false;
  return schedule.grades.some((g) => {
    // Support "Grade 10::A" class·section keys from admin multi-select
    const gradePart = g.includes("::") ? g.split("::")[0]! : g;
    return normalizeClassGrade(gradePart) === learner;
  });
}

export function formatExamClassAudience(
  schedule: Pick<LearnerExamSchedule, "classScope" | "grades">,
  allLabel = "All classes",
): string {
  if (schedule.classScope === "all") return allLabel;
  if (schedule.grades.length === 0) return "No classes";
  return schedule.grades.join(", ");
}

export function loadLearnerExamSchedules(): LearnerExamSchedule[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as LearnerExamSchedule[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveLearnerExamSchedules(schedules: LearnerExamSchedule[]) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(schedules));
}

export function upsertLearnerExamSchedule(schedule: LearnerExamSchedule) {
  const list = loadLearnerExamSchedules().filter((s) => s.examId !== schedule.examId);
  list.push(schedule);
  list.sort((a, b) => b.startDate.localeCompare(a.startDate));
  saveLearnerExamSchedules(list);
  return list;
}

export function removeLearnerExamSchedule(examId: string) {
  const list = loadLearnerExamSchedules().filter((s) => s.examId !== examId);
  saveLearnerExamSchedules(list);
  return list;
}

export function listLearnerExamSchedulesForClass(learnerClass: string): LearnerExamSchedule[] {
  return loadLearnerExamSchedules().filter((s) => examVisibleToClass(s, learnerClass));
}
