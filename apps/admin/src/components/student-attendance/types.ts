/**
 * Student Attendance workspace — selection state + summary model.
 * Marking is handled by the shared Attendance Engine (see StudentAttendanceMarkPanel).
 */

export type StudentAttendanceStatusFilter =
  | "all"
  | "present"
  | "absent"
  | "leave"
  | "unmarked";

export type StudentAttendanceClassOption = {
  id: string;
  label: string;
};

export type StudentAttendanceSectionOption = {
  id: string;
  label: string;
  classId: string;
};

/** Controlled UI state for the workspace (selection + filters only). */
export type StudentAttendanceWorkspaceState = {
  classId: string;
  sectionId: string;
  date: string;
  status: StudentAttendanceStatusFilter;
  search: string;
};

export type StudentAttendanceSummaryModel = {
  total: number;
  present: number;
  absent: number;
  leave: number;
  unmarked: number;
};

export const EMPTY_ATTENDANCE_SUMMARY: StudentAttendanceSummaryModel = {
  total: 0,
  present: 0,
  absent: 0,
  leave: 0,
  unmarked: 0,
};

export const STUDENT_ATTENDANCE_STATUS_OPTIONS: {
  value: StudentAttendanceStatusFilter;
  label: string;
}[] = [
  { value: "all", label: "All" },
  { value: "present", label: "Present" },
  { value: "absent", label: "Absent" },
  { value: "leave", label: "Leave" },
  { value: "unmarked", label: "Unmarked" },
];

export function todayIsoDate(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export function defaultStudentAttendanceWorkspaceState(
  partial?: Partial<StudentAttendanceWorkspaceState>,
): StudentAttendanceWorkspaceState {
  return {
    classId: "",
    sectionId: "",
    date: todayIsoDate(),
    status: "all",
    search: "",
    ...partial,
  };
}
