/**
 * Home dashboard secondary widgets — composed from existing institute-scoped APIs.
 * No demo KPI/fake rows. Partial slice failures stay on that widget only.
 */
import { isApiAuthMode } from "@/auth/auth-mode";
import { ApiClientError } from "@/lib/api";
import { isInstituteUuid } from "@/lib/active-institute";
import { listStudents } from "@/lib/students/api";
import { listTeachers } from "@/lib/teachers/api";
import { listDiaryDays } from "@/lib/diary/api";
import { listAttendanceRegisters } from "@/lib/attendance/api";
import { listMarkEntries } from "@/lib/marks/api";
import {
  collectBirthdaysToday,
  localYmd,
  type BirthdayRow,
} from "./birthdays";
import type { DashboardLoadStatus } from "./load";

export type DiaryWidgetRow = {
  id: string;
  teacherId: string;
  diaryDate: string;
  scope: string;
  submittedAt: string | null;
  rowCount: number;
};

export type AttendanceDraftRow = {
  id: string;
  sectionId: string;
  slotLabel: string;
  attendanceDate: string;
};

export type MarksPendingRow = {
  id: string;
  teacherId: string;
  examId: string;
  subjectId: string;
  sectionId: string;
  submittedAt: string | null;
};

export type WidgetSlice<T> = {
  status: "ready" | "error" | "empty";
  rows: T;
  errorMessage: string | null;
};

export type DashboardWidgetsState = {
  status: DashboardLoadStatus;
  birthdays: WidgetSlice<BirthdayRow[]>;
  diary: WidgetSlice<DiaryWidgetRow[]> & { todaySubmittedCount: number };
  attendanceDrafts: WidgetSlice<AttendanceDraftRow[]>;
  marksPending: WidgetSlice<MarksPendingRow[]>;
  errorMessage: string | null;
};

const emptyBirthdays = (): WidgetSlice<BirthdayRow[]> => ({
  status: "empty",
  rows: [],
  errorMessage: null,
});

const emptyDiary = (): WidgetSlice<DiaryWidgetRow[]> & { todaySubmittedCount: number } => ({
  status: "empty",
  rows: [],
  todaySubmittedCount: 0,
  errorMessage: null,
});

const emptyAttendance = (): WidgetSlice<AttendanceDraftRow[]> => ({
  status: "empty",
  rows: [],
  errorMessage: null,
});

const emptyMarks = (): WidgetSlice<MarksPendingRow[]> => ({
  status: "empty",
  rows: [],
  errorMessage: null,
});

function emptyWidgets(status: DashboardLoadStatus, errorMessage: string | null = null): DashboardWidgetsState {
  return {
    status,
    birthdays: emptyBirthdays(),
    diary: emptyDiary(),
    attendanceDrafts: emptyAttendance(),
    marksPending: emptyMarks(),
    errorMessage,
  };
}

function apiErrorMessage(err: unknown, fallback: string): { message: string; forbidden: boolean } {
  const status =
    err instanceof ApiClientError
      ? err.status
      : err &&
          typeof err === "object" &&
          "status" in err &&
          typeof (err as { status: unknown }).status === "number"
        ? (err as { status: number }).status
        : null;
  const message = err instanceof Error ? err.message : fallback;
  return { message, forbidden: status === 403 };
}

type SliceResult<T> = WidgetSlice<T> & { forbidden?: boolean };
type DiarySliceResult = WidgetSlice<DiaryWidgetRow[]> & {
  todaySubmittedCount: number;
  forbidden?: boolean;
};

function daysAgoYmd(days: number, from: Date = new Date()): string {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate() - days);
  return localYmd(d);
}

async function loadBirthdaysSlice(
  instituteId: string,
  onDate: Date,
): Promise<SliceResult<BirthdayRow[]>> {
  try {
    const [students, teachers] = await Promise.all([
      listStudents({ instituteId }),
      listTeachers({ instituteId }),
    ]);
    const rows = collectBirthdaysToday({ students, teachers, onDate });
    return {
      status: rows.length === 0 ? "empty" : "ready",
      rows,
      errorMessage: null,
    };
  } catch (err) {
    const { message, forbidden } = apiErrorMessage(err, "Failed to load birthdays");
    return { status: "error", rows: [], errorMessage: message, forbidden };
  }
}

async function loadDiarySlice(
  instituteId: string,
  today: string,
  onDate: Date,
): Promise<DiarySliceResult> {
  try {
    const days = await listDiaryDays({
      instituteId,
      submitted: true,
      dateFrom: daysAgoYmd(6, onDate),
      dateTo: today,
    });
    const sorted = [...days].sort((a, b) => {
      const aKey = a.submittedAt ?? a.diaryDate;
      const bKey = b.submittedAt ?? b.diaryDate;
      return bKey.localeCompare(aKey);
    });
    const rows: DiaryWidgetRow[] = sorted.slice(0, 8).map((d) => ({
      id: d.id,
      teacherId: d.teacherId,
      diaryDate: d.diaryDate,
      scope: d.scope,
      submittedAt: d.submittedAt,
      rowCount: d.rows?.length ?? 0,
    }));
    const todaySubmittedCount = days.filter((d) => d.diaryDate === today).length;
    return {
      status: rows.length === 0 ? "empty" : "ready",
      rows,
      todaySubmittedCount,
      errorMessage: null,
    };
  } catch (err) {
    const { message, forbidden } = apiErrorMessage(err, "Failed to load diary");
    return {
      status: "error",
      rows: [],
      todaySubmittedCount: 0,
      errorMessage: message,
      forbidden,
    };
  }
}

async function loadAttendanceDraftsSlice(
  instituteId: string,
  today: string,
): Promise<SliceResult<AttendanceDraftRow[]>> {
  try {
    const registers = await listAttendanceRegisters({
      instituteId,
      attendanceDate: today,
      status: "draft",
    });
    const rows: AttendanceDraftRow[] = registers.map((r) => ({
      id: r.id,
      sectionId: r.sectionId,
      slotLabel: r.slotLabel,
      attendanceDate: r.attendanceDate,
    }));
    return {
      status: rows.length === 0 ? "empty" : "ready",
      rows,
      errorMessage: null,
    };
  } catch (err) {
    const { message, forbidden } = apiErrorMessage(err, "Failed to load attendance drafts");
    return { status: "error", rows: [], errorMessage: message, forbidden };
  }
}

async function loadMarksPendingSlice(
  instituteId: string,
): Promise<SliceResult<MarksPendingRow[]>> {
  try {
    const entries = await listMarkEntries({
      instituteId,
      status: "submitted",
    });
    const rows: MarksPendingRow[] = entries.map((e) => ({
      id: e.id,
      teacherId: e.teacherId,
      examId: e.examId,
      subjectId: e.subjectId,
      sectionId: e.sectionId,
      submittedAt: e.submittedAt,
    }));
    return {
      status: rows.length === 0 ? "empty" : "ready",
      rows,
      errorMessage: null,
    };
  } catch (err) {
    const { message, forbidden } = apiErrorMessage(err, "Failed to load marks pending publish");
    return { status: "error", rows: [], errorMessage: message, forbidden };
  }
}

/**
 * Loads secondary home widgets from existing list APIs.
 * Does not invent missing-section matrices or WhatsApp wish state.
 */
export async function loadDashboardWidgets(
  activeInstituteId: string | null,
  onDate: Date = new Date(),
): Promise<DashboardWidgetsState> {
  if (!isApiAuthMode()) {
    return emptyWidgets("demo");
  }
  if (!activeInstituteId || !isInstituteUuid(activeInstituteId)) {
    return emptyWidgets("needs_institute");
  }

  const today = localYmd(onDate);
  const [birthdays, diary, attendanceDrafts, marksPending] = await Promise.all([
    loadBirthdaysSlice(activeInstituteId, onDate),
    loadDiarySlice(activeInstituteId, today, onDate),
    loadAttendanceDraftsSlice(activeInstituteId, today),
    loadMarksPendingSlice(activeInstituteId),
  ]);

  const anyForbidden =
    Boolean(birthdays.forbidden) ||
    Boolean(diary.forbidden) ||
    Boolean(attendanceDrafts.forbidden) ||
    Boolean(marksPending.forbidden);

  // Prefer slice-level errors; overall ready so widgets that succeeded still render.
  const allFailed =
    birthdays.status === "error" &&
    diary.status === "error" &&
    attendanceDrafts.status === "error" &&
    marksPending.status === "error";

  const strip = <T extends { forbidden?: boolean }>(slice: T): Omit<T, "forbidden"> => {
    const { forbidden: _f, ...rest } = slice;
    return rest;
  };

  if (allFailed) {
    const first =
      birthdays.errorMessage ??
      diary.errorMessage ??
      attendanceDrafts.errorMessage ??
      marksPending.errorMessage;
    return {
      status: anyForbidden ? "forbidden" : "error",
      birthdays: strip(birthdays),
      diary: strip(diary),
      attendanceDrafts: strip(attendanceDrafts),
      marksPending: strip(marksPending),
      errorMessage: first,
    };
  }

  return {
    status: "ready",
    birthdays: strip(birthdays),
    diary: strip(diary),
    attendanceDrafts: strip(attendanceDrafts),
    marksPending: strip(marksPending),
    errorMessage: null,
  };
}
