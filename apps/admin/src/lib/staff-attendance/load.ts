import { isApiAuthMode } from "@/auth/auth-mode";
import { ApiClientError } from "@/lib/api";
import { isInstituteUuid } from "@/lib/active-institute";
import { listTeachers } from "@/lib/teachers/api";
import { teacherDtosToListItems } from "@/lib/teachers/map";
import type { TeacherListItem } from "@/lib/teachers/types";
import { listStaffAttendance } from "./api";
import {
  buildStaffAttendanceHistoryDays,
  buildStaffAttendanceOverview,
  defaultStaffAttendanceRangeFrom,
} from "./overview";
import { staffAttendanceDtosToDaySummary } from "./map";
import type { StaffAttendanceDaySummary, StaffAttendanceDto } from "./types";
import type {
  StaffAttendanceHistoryDay,
  StaffAttendanceOverviewRow,
} from "./overview";

export type StaffAttendanceLoadStatus =
  | "demo"
  | "loading"
  | "ready"
  | "needs_institute"
  | "empty"
  | "forbidden"
  | "error";

export type StaffAttendanceDayState = {
  status: StaffAttendanceLoadStatus;
  summary: StaffAttendanceDaySummary | null;
  errorMessage: string | null;
};

export type StaffAttendanceRangeState = {
  status: StaffAttendanceLoadStatus;
  overview: StaffAttendanceOverviewRow[];
  history: StaffAttendanceHistoryDay[];
  errorMessage: string | null;
};

type LoadRangeOpts = {
  from?: string;
  to?: string;
};

async function loadTeachersById(instituteId: string): Promise<Map<string, TeacherListItem>> {
  const rows = teacherDtosToListItems(await listTeachers({ instituteId }));
  return new Map(rows.map((teacher) => [teacher.id, teacher]));
}

export async function loadStaffAttendanceDay(
  activeInstituteId: string | null,
  date: string,
): Promise<StaffAttendanceDayState> {
  if (!isApiAuthMode()) {
    return { status: "demo", summary: null, errorMessage: null };
  }

  if (!activeInstituteId || !isInstituteUuid(activeInstituteId)) {
    return { status: "needs_institute", summary: null, errorMessage: null };
  }

  try {
    const [rows, teachersById] = await Promise.all([
      listStaffAttendance({ instituteId: activeInstituteId, date }),
      loadTeachersById(activeInstituteId),
    ]);
    const summary = staffAttendanceDtosToDaySummary(rows, teachersById, date);
    return {
      status: summary.marks.length === 0 ? "empty" : "ready",
      summary,
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
    const message =
      err instanceof Error ? err.message : "Failed to load staff attendance";

    if (status === 403) {
      return { status: "forbidden", summary: null, errorMessage: message };
    }
    return { status: "error", summary: null, errorMessage: message };
  }
}

function mapRangeLoadError(err: unknown): Pick<StaffAttendanceRangeState, "status" | "errorMessage"> {
  const status =
    err instanceof ApiClientError
      ? err.status
      : err &&
          typeof err === "object" &&
          "status" in err &&
          typeof (err as { status: unknown }).status === "number"
        ? (err as { status: number }).status
        : null;
  const message =
    err instanceof Error ? err.message : "Failed to load staff attendance";

  if (status === 403) {
    return { status: "forbidden", errorMessage: message };
  }
  return { status: "error", errorMessage: message };
}

function buildRangeState(
  rows: StaffAttendanceDto[],
  teachersById: Map<string, TeacherListItem>,
): StaffAttendanceRangeState {
  const overview = buildStaffAttendanceOverview(rows, teachersById);
  const history = buildStaffAttendanceHistoryDays(rows, teachersById);
  return {
    status: overview.length === 0 && history.length === 0 ? "empty" : "ready",
    overview,
    history,
    errorMessage: null,
  };
}

export async function loadStaffAttendanceSubmittedRange(
  activeInstituteId: string | null,
  opts: LoadRangeOpts = {},
): Promise<StaffAttendanceRangeState> {
  if (!isApiAuthMode()) {
    return { status: "demo", overview: [], history: [], errorMessage: null };
  }

  if (!activeInstituteId || !isInstituteUuid(activeInstituteId)) {
    return { status: "needs_institute", overview: [], history: [], errorMessage: null };
  }

  const from = opts.from ?? defaultStaffAttendanceRangeFrom();
  const to = opts.to ?? new Date().toISOString().slice(0, 10);

  try {
    const [rows, teachersById] = await Promise.all([
      listStaffAttendance({
        instituteId: activeInstituteId,
        dayStatus: "submitted",
        from,
        to,
      }),
      loadTeachersById(activeInstituteId),
    ]);
    return buildRangeState(rows, teachersById);
  } catch (err) {
    return {
      overview: [],
      history: [],
      ...mapRangeLoadError(err),
    };
  }
}
