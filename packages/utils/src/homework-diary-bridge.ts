/**
 * Teacher → Admin bridges for homework activity logs and submitted diary days.
 * Admin is view-only (no edit).
 */

export const HOMEWORK_LOGS_KEY = "lumenx.homework-activity-logs.v1";
export const DIARY_SUBMISSIONS_KEY = "lumenx.diary-submissions.v1";

export type HomeworkLogAction = "created" | "updated" | "published" | "deleted";

export type HomeworkActivityLog = {
  id: string;
  at: string;
  action: HomeworkLogAction;
  teacherId: string;
  teacherName: string;
  assignmentId: string;
  title: string;
  classLabel: string;
  subject?: string;
};

export type DiarySubmissionLog = {
  id: string;
  submittedAt: string;
  date: string;
  scope: string;
  teacherId: string;
  teacherName: string;
  rows: { className: string; description: string }[];
};

function readJson<T>(key: string): T[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as T[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeJson<T>(key: string, rows: T[]): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(rows.slice(0, 300)));
  } catch {
    // Ignore quota / private mode.
  }
}

export function loadHomeworkActivityLogs(): HomeworkActivityLog[] {
  return readJson<HomeworkActivityLog>(HOMEWORK_LOGS_KEY);
}

export function pushHomeworkActivityLog(
  input: Omit<HomeworkActivityLog, "id" | "at"> & { at?: string },
): HomeworkActivityLog {
  const row: HomeworkActivityLog = {
    id: `hwlog-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    at: input.at ?? new Date().toISOString(),
    action: input.action,
    teacherId: input.teacherId,
    teacherName: input.teacherName,
    assignmentId: input.assignmentId,
    title: input.title,
    classLabel: input.classLabel,
    subject: input.subject,
  };
  writeJson(HOMEWORK_LOGS_KEY, [row, ...loadHomeworkActivityLogs()]);
  return row;
}

export function loadDiarySubmissionLogs(): DiarySubmissionLog[] {
  return readJson<DiarySubmissionLog>(DIARY_SUBMISSIONS_KEY).map((row) => ({
    id: row?.id ?? `diary-${row?.scope ?? "unknown"}-${row?.date ?? "unknown"}`,
    submittedAt: row?.submittedAt ?? "",
    date: row?.date ?? "",
    scope: row?.scope ?? "",
    teacherId: row?.teacherId ?? "",
    teacherName: row?.teacherName ?? "",
    rows: Array.isArray(row?.rows) ? row.rows : [],
  }));
}

export function pushDiarySubmissionLog(
  input: Omit<DiarySubmissionLog, "id"> & { id?: string },
): DiarySubmissionLog {
  const row: DiarySubmissionLog = {
    id: input.id ?? `diary-${input.scope}-${input.date}`,
    submittedAt: input.submittedAt,
    date: input.date,
    scope: input.scope,
    teacherId: input.teacherId,
    teacherName: input.teacherName,
    rows: Array.isArray(input.rows) ? input.rows : [],
  };
  const without = loadDiarySubmissionLogs().filter((r) => r.id !== row.id);
  writeJson(DIARY_SUBMISSIONS_KEY, [row, ...without]);
  return row;
}

/** Seed demo logs once so Admin view-only pages are never empty on first open. */
export function ensureHomeworkDiaryDemoSeed(): void {
  if (typeof localStorage === "undefined") return;
  if (!localStorage.getItem(HOMEWORK_LOGS_KEY)) {
    writeJson(HOMEWORK_LOGS_KEY, [
      {
        id: "hwlog-demo-1",
        at: new Date(Date.now() - 3600_000).toISOString(),
        action: "published",
        teacherId: "t-mehta",
        teacherName: "A. Mehta",
        assignmentId: "asg-1",
        title: "Quadratic equations worksheet",
        classLabel: "10-A",
        subject: "Mathematics",
      },
      {
        id: "hwlog-demo-2",
        at: new Date(Date.now() - 7200_000).toISOString(),
        action: "updated",
        teacherId: "t-rao",
        teacherName: "S. Rao",
        assignmentId: "asg-2",
        title: "Chapter 4 reading notes",
        classLabel: "9-B",
        subject: "English",
      },
      {
        id: "hwlog-demo-3",
        at: new Date(Date.now() - 86_400_000).toISOString(),
        action: "created",
        teacherId: "t-mehta",
        teacherName: "A. Mehta",
        assignmentId: "asg-3",
        title: "Lab report draft",
        classLabel: "11-A",
        subject: "Physics",
      },
    ] satisfies HomeworkActivityLog[]);
  }
  if (!localStorage.getItem(DIARY_SUBMISSIONS_KEY)) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const date = yesterday.toISOString().slice(0, 10);
    writeJson(DIARY_SUBMISSIONS_KEY, [
      {
        id: `diary-teacher-${date}`,
        submittedAt: new Date(Date.now() - 20 * 3600_000).toISOString(),
        date,
        scope: "class-teacher",
        teacherId: "t-mehta",
        teacherName: "A. Mehta",
        rows: [
          { className: "10-A", description: "Completed unit test discussion; homework assigned." },
          { className: "10-B", description: "Revision of algebra identities; attendance full." },
        ],
      },
    ] satisfies DiarySubmissionLog[]);
  }
}
