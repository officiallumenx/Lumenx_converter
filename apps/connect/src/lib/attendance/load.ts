import { isApiAuthMode } from "@/auth/auth-mode";
import { ApiClientError } from "@/lib/api";
import { isInstituteUuid } from "@/lib/institute-id";
import { getLearnerAttendancePortal, getTeacherAttendancePortal } from "./api";
import type { PortalLearnerAttendanceDto, PortalTeacherAttendanceDto } from "./types";

export type AttendanceLoadStatus =
  | "demo"
  | "loading"
  | "ready"
  | "needs_institute"
  | "empty"
  | "forbidden"
  | "error";

export async function loadLearnerAttendancePortal(input: {
  instituteId: string | null;
  studentId: string | null;
  fromDate?: string;
  toDate?: string;
}): Promise<{
  status: AttendanceLoadStatus;
  portal: PortalLearnerAttendanceDto | null;
  errorMessage: string | null;
}> {
  if (!isApiAuthMode()) {
    return { status: "demo", portal: null, errorMessage: null };
  }
  if (!input.instituteId || !isInstituteUuid(input.instituteId)) {
    return { status: "needs_institute", portal: null, errorMessage: null };
  }
  if (!input.studentId || !isInstituteUuid(input.studentId)) {
    return { status: "demo", portal: null, errorMessage: null };
  }

  try {
    const portal = await getLearnerAttendancePortal({
      instituteId: input.instituteId,
      studentId: input.studentId,
      fromDate: input.fromDate,
      toDate: input.toDate,
    });
    const hasMarkedDays = portal.days.some((d) => d.status !== "unknown");
    return {
      status: hasMarkedDays ? "ready" : "empty",
      portal,
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
      err instanceof Error ? err.message : "Failed to load attendance history";
    if (status === 403) {
      return { status: "forbidden", portal: null, errorMessage: message };
    }
    return { status: "error", portal: null, errorMessage: message };
  }
}

export async function loadTeacherAttendancePortal(input: {
  instituteId: string | null;
  sectionId: string | null;
  attendanceDate: string;
}): Promise<{
  status: AttendanceLoadStatus;
  portal: PortalTeacherAttendanceDto | null;
  errorMessage: string | null;
}> {
  if (!isApiAuthMode()) {
    return { status: "demo", portal: null, errorMessage: null };
  }
  if (!input.instituteId || !isInstituteUuid(input.instituteId)) {
    return { status: "needs_institute", portal: null, errorMessage: null };
  }
  if (!input.sectionId || !isInstituteUuid(input.sectionId)) {
    return { status: "empty", portal: null, errorMessage: null };
  }

  try {
    const portal = await getTeacherAttendancePortal({
      instituteId: input.instituteId,
      sectionId: input.sectionId,
      attendanceDate: input.attendanceDate,
    });
    return {
      status: portal.slots.length === 0 ? "empty" : "ready",
      portal,
      errorMessage: null,
    };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to load attendance slots";
    const status =
      err instanceof ApiClientError
        ? err.status
        : err &&
            typeof err === "object" &&
            "status" in err &&
            typeof (err as { status: unknown }).status === "number"
          ? (err as { status: number }).status
          : null;
    if (status === 403) {
      return { status: "forbidden", portal: null, errorMessage: message };
    }
    return { status: "error", portal: null, errorMessage: message };
  }
}
