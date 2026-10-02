/**
 * Home "today's birthdays" — loads raw student/teacher DTOs and matches month+day.
 */
import { isApiAuthMode } from "@/auth/auth-mode";
import { isInstituteUuid } from "@/lib/active-institute";
import { listStudents } from "@/lib/students/api";
import { listTeachers } from "@/lib/teachers/api";
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
};

export async function loadHomeBirthdaysToday(
  instituteId: string | null,
  onDate: Date = new Date(),
): Promise<HomeBirthdaysState> {
  const dayYmd = localYmd(onDate);

  if (!isApiAuthMode()) {
    return { status: "demo", dayYmd, rows: [], errorMessage: null };
  }
  if (!instituteId || !isInstituteUuid(instituteId)) {
    return { status: "needs_institute", dayYmd, rows: [], errorMessage: null };
  }

  try {
    const [students, teachers] = await Promise.all([
      listStudents({ instituteId }).catch(() => []),
      listTeachers({ instituteId }).catch(() => []),
    ]);

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
    };
  } catch (err) {
    return {
      status: "error",
      dayYmd,
      rows: [],
      errorMessage: err instanceof Error ? err.message : "Failed to load birthdays",
    };
  }
}
