import { isApiAuthMode } from "@/auth/auth-mode";
import { ApiClientError } from "@/lib/api";
import { isInstituteUuid } from "@/lib/active-institute";
import { listStudents } from "@/lib/students/api";
import { studentDtosToListItems } from "@/lib/students/map";
import type { StudentListItem } from "@/lib/students/types";
import { getAttendanceRegister, listAttendanceRegisters } from "./api";
import {
  attendanceRegisterDtoToDetail,
  attendanceRegisterDtosToListItems,
} from "./map";
import type {
  AttendanceRegisterDetail,
  AttendanceRegisterListItem,
} from "./types";

export type AttendanceListStatus =
  | "demo"
  | "loading"
  | "ready"
  | "needs_institute"
  | "empty"
  | "forbidden"
  | "error";

export type AttendanceRegistersListState = {
  status: AttendanceListStatus;
  items: AttendanceRegisterListItem[];
  errorMessage: string | null;
};

export type AttendanceRegisterDetailState = {
  status: AttendanceListStatus;
  detail: AttendanceRegisterDetail | null;
  errorMessage: string | null;
};

async function mapApiError(
  err: unknown,
  errorLabel: string,
): Promise<{ status: AttendanceListStatus; errorMessage: string }> {
  const status =
    err instanceof ApiClientError
      ? err.status
      : err &&
          typeof err === "object" &&
          "status" in err &&
          typeof (err as { status: unknown }).status === "number"
        ? (err as { status: number }).status
        : null;
  const message = err instanceof Error ? err.message : `Failed to load ${errorLabel}`;
  if (status === 403) {
    return { status: "forbidden", errorMessage: message };
  }
  return { status: "error", errorMessage: message };
}

async function loadStudentsById(
  instituteId: string,
): Promise<Map<string, StudentListItem>> {
  const rows = studentDtosToListItems(await listStudents({ instituteId }));
  return new Map(rows.map((student) => [student.id, student]));
}

export async function loadAttendanceRegistersList(
  activeInstituteId: string | null,
  filters: {
    sectionId?: string;
    attendanceDate?: string;
  },
): Promise<AttendanceRegistersListState> {
  if (!isApiAuthMode()) {
    return { status: "demo", items: [], errorMessage: null };
  }

  if (!activeInstituteId || !isInstituteUuid(activeInstituteId)) {
    return { status: "needs_institute", items: [], errorMessage: null };
  }

  try {
    const rows = await listAttendanceRegisters({
      instituteId: activeInstituteId,
      sectionId: filters.sectionId,
      attendanceDate: filters.attendanceDate,
    });
    const items = attendanceRegisterDtosToListItems(rows);
    return {
      status: items.length === 0 ? "empty" : "ready",
      items,
      errorMessage: null,
    };
  } catch (err) {
    const mapped = await mapApiError(err, "attendance registers");
    return { status: mapped.status, items: [], errorMessage: mapped.errorMessage };
  }
}

export async function loadAttendanceRegisterDetail(
  activeInstituteId: string | null,
  registerId: string,
): Promise<AttendanceRegisterDetailState> {
  if (!isApiAuthMode()) {
    return { status: "demo", detail: null, errorMessage: null };
  }

  if (!activeInstituteId || !isInstituteUuid(activeInstituteId)) {
    return { status: "needs_institute", detail: null, errorMessage: null };
  }

  try {
    const [dto, studentsById] = await Promise.all([
      getAttendanceRegister(registerId),
      loadStudentsById(activeInstituteId),
    ]);
    const detail = attendanceRegisterDtoToDetail(dto, studentsById);
    return { status: "ready", detail, errorMessage: null };
  } catch (err) {
    const mapped = await mapApiError(err, "attendance register");
    return { status: mapped.status, detail: null, errorMessage: mapped.errorMessage };
  }
}
