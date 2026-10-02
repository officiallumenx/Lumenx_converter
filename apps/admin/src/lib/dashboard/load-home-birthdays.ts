/**
 * Home "today's birthdays" — loads raw student/teacher DTOs and matches month+day.
 */
import { isApiAuthMode } from "@/auth/auth-mode";
import { isInstituteUuid } from "@/lib/active-institute";
import {
  listStudentsCached,
  listTeachersCached,
} from "@/lib/directory-lists-cache";
import {
  collectBirthdaysToday,
  localYmd,
  type BirthdayRow,
} from "./birthdays";

export type HomeBirthdaysState = {
  status: "ready" | "empty" | "error" | "needs_institute" | "demo";
  dayYmd: string;
  rows: BirthdayRow[];
  errorMessage: string | null;
  /** Soft warning when one directory failed but the other succeeded. */
  warningMessage: string | null;
};

function errorText(err: unknown, fallback: string): string {
  return err instanceof Error && err.message.trim() ? err.message : fallback;
}

export async function loadHomeBirthdaysToday(
  instituteId: string | null,
  onDate: Date = new Date(),
): Promise<HomeBirthdaysState> {
  const dayYmd = localYmd(onDate);

  if (!isApiAuthMode()) {
    return {
      status: "demo",
      dayYmd,
      rows: [],
      errorMessage: null,
      warningMessage: null,
    };
  }
  if (!instituteId || !isInstituteUuid(instituteId)) {
    return {
      status: "needs_institute",
      dayYmd,
      rows: [],
      errorMessage: null,
      warningMessage: null,
    };
  }

  const [studentsResult, teachersResult] = await Promise.allSettled([
    listStudentsCached(instituteId),
    listTeachersCached(instituteId),
  ]);

  if (
    studentsResult.status === "rejected" &&
    teachersResult.status === "rejected"
  ) {
    return {
      status: "error",
      dayYmd,
      rows: [],
      errorMessage: errorText(
        studentsResult.reason,
        "Failed to load birthdays",
      ),
      warningMessage: null,
    };
  }

  const students =
    studentsResult.status === "fulfilled" ? studentsResult.value : [];
  const teachers =
    teachersResult.status === "fulfilled" ? teachersResult.value : [];

  let warningMessage: string | null = null;
  if (teachersResult.status === "rejected") {
    warningMessage = errorText(
      teachersResult.reason,
      "Could not load teacher birthdays",
    );
  } else if (studentsResult.status === "rejected") {
    warningMessage = errorText(
      studentsResult.reason,
      "Could not load student birthdays",
    );
  }

  const rows = collectBirthdaysToday({
    students: students as unknown as Array<Record<string, unknown>>,
    teachers: teachers as unknown as Array<Record<string, unknown>>,
    onDate,
  });

  return {
    status: rows.length === 0 ? "empty" : "ready",
    dayYmd,
    rows,
    errorMessage: null,
    warningMessage,
  };
}
