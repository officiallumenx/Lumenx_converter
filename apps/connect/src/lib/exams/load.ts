import { isApiAuthMode } from "@/auth/auth-mode";
import { ApiClientError } from "@/lib/api";
import { isInstituteUuid } from "@/lib/institute-id";
import type { LearnerExamSchedule } from "@lumenx/module-exams";
import { listSubjects } from "@/lib/teacher-classes/api";
import { examDtosToLearnerSchedules } from "@/lib/marks/map";
import { listExams } from "./api";

export type ExamsLoadStatus =
  | "demo"
  | "loading"
  | "ready"
  | "needs_institute"
  | "empty"
  | "forbidden"
  | "error";

export async function loadLearnerExamSchedules(input: {
  instituteId: string | null;
  classGrade?: string;
}): Promise<{
  status: ExamsLoadStatus;
  schedules: LearnerExamSchedule[];
  errorMessage: string | null;
}> {
  if (!isApiAuthMode()) {
    return { status: "demo", schedules: [], errorMessage: null };
  }
  if (!input.instituteId || !isInstituteUuid(input.instituteId)) {
    return { status: "needs_institute", schedules: [], errorMessage: null };
  }

  try {
    const [exams, subjects] = await Promise.all([
      listExams({ instituteId: input.instituteId, scheduleStatus: "published" }),
      listSubjects(input.instituteId),
    ]);
    const subjectLabels = new Map(
      subjects.map((s) => [s.id, s.name?.trim() || s.code?.trim() || s.id]),
    );
    const schedules = examDtosToLearnerSchedules(exams, subjectLabels, input.classGrade);
    return {
      status: schedules.length === 0 ? "empty" : "ready",
      schedules,
      errorMessage: null,
    };
  } catch (err) {
    const status =
      err instanceof ApiClientError
        ? err.status
        : err &&
            typeof err === "object" &&
            "status" in err &&
            typeof (err as { status: unknown }).status === "number"
          ? (err as { status: number }).status
          : null;
    const message = err instanceof Error ? err.message : "Failed to load exam schedules";
    if (status === 403) {
      return { status: "forbidden", schedules: [], errorMessage: message };
    }
    return { status: "error", schedules: [], errorMessage: message };
  }
}
