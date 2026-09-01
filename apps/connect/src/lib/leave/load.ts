import { isApiAuthMode } from "@/auth/auth-mode";
import { ApiClientError } from "@/lib/api";
import { isInstituteUuid } from "@/lib/institute-id";
import { listStudents } from "@/lib/students/api";
import type { StudentDto } from "@/lib/students/types";
import { getLeaveDecision, listLeaveRequests } from "./api";
import {
  leaveDtosToConnectRequests,
  leaveDtosToTeacherLeaveRequests,
} from "./map";
import type {
  ConnectLeaveRequest,
  LeaveDecisionDto,
  LeaveRequestDto,
  StudentNameLookup,
} from "./types";
import type { TeacherLeaveRequest } from "@/lib/teacher/types";

export type LeaveLoadStatus =
  | "demo"
  | "loading"
  | "ready"
  | "needs_institute"
  | "empty"
  | "forbidden"
  | "error";

function mapError(err: unknown, label: string): { status: LeaveLoadStatus; message: string } {
  const status =
    err instanceof ApiClientError
      ? err.status
      : err &&
          typeof err === "object" &&
          "status" in err &&
          typeof (err as { status: unknown }).status === "number"
        ? (err as { status: number }).status
        : null;
  const message = err instanceof Error ? err.message : `Failed to load ${label}`;
  if (status === 403) return { status: "forbidden", message };
  return { status: "error", message };
}

function buildStudentLookup(students: StudentDto[]): StudentNameLookup {
  return new Map(
    students.map((s) => [
      s.id,
      {
        name: s.displayName?.trim() || `${s.firstName} ${s.surname}`.trim(),
        className: s.classLabel?.trim() || "Class",
        section: s.sectionLabel?.trim() || "—",
      },
    ]),
  );
}

async function loadDecisions(
  dtos: LeaveRequestDto[],
): Promise<Map<string, LeaveDecisionDto | null>> {
  const decided = dtos.filter((d) => d.status !== "pending" && d.status !== "cancelled");
  const entries = await Promise.all(
    decided.map(async (row) => {
      try {
        const decision = await getLeaveDecision(row.id);
        return [row.id, decision] as const;
      } catch {
        return [row.id, null] as const;
      }
    }),
  );
  return new Map(entries);
}

export async function loadParentLeaveRequests(input: {
  instituteId: string | null;
  studentId?: string | null;
}): Promise<{
  status: LeaveLoadStatus;
  items: ConnectLeaveRequest[];
  students: StudentDto[];
  errorMessage: string | null;
}> {
  if (!isApiAuthMode()) {
    return { status: "demo", items: [], students: [], errorMessage: null };
  }
  if (!input.instituteId || !isInstituteUuid(input.instituteId)) {
    return { status: "needs_institute", items: [], students: [], errorMessage: null };
  }

  try {
    const [students, dtos] = await Promise.all([
      listStudents({ instituteId: input.instituteId }),
      listLeaveRequests({
        instituteId: input.instituteId,
        subjectKind: "student",
        studentId: input.studentId ?? undefined,
      }),
    ]);
    const lookup = buildStudentLookup(students);
    const decisions = await loadDecisions(dtos);
    const items = leaveDtosToConnectRequests(dtos, lookup, decisions);
    return {
      status: items.length === 0 ? "empty" : "ready",
      items,
      students,
      errorMessage: null,
    };
  } catch (err) {
    const mapped = mapError(err, "leave requests");
    return {
      status: mapped.status,
      items: [],
      students: [],
      errorMessage: mapped.message,
    };
  }
}

export async function loadTeacherLeavePortal(input: {
  instituteId: string | null;
  teacherId: string | null;
}): Promise<{
  status: LeaveLoadStatus;
  studentRequests: ConnectLeaveRequest[];
  ownRequests: TeacherLeaveRequest[];
  errorMessage: string | null;
}> {
  if (!isApiAuthMode()) {
    return {
      status: "demo",
      studentRequests: [],
      ownRequests: [],
      errorMessage: null,
    };
  }
  if (!input.instituteId || !isInstituteUuid(input.instituteId)) {
    return {
      status: "needs_institute",
      studentRequests: [],
      ownRequests: [],
      errorMessage: null,
    };
  }

  try {
    const [students, studentDtos, teacherDtos] = await Promise.all([
      listStudents({ instituteId: input.instituteId }),
      listLeaveRequests({
        instituteId: input.instituteId,
        subjectKind: "student",
      }),
      listLeaveRequests({
        instituteId: input.instituteId,
        subjectKind: "teacher",
        teacherId: input.teacherId ?? undefined,
      }),
    ]);
    const lookup = buildStudentLookup(students);
    const studentDecisions = await loadDecisions(studentDtos);
    const teacherDecisions = await loadDecisions(teacherDtos);
    const studentRequests = leaveDtosToConnectRequests(
      studentDtos,
      lookup,
      studentDecisions,
    );
    const ownRequests = leaveDtosToTeacherLeaveRequests(teacherDtos, teacherDecisions);
    const hasRows = studentRequests.length > 0 || ownRequests.length > 0;
    return {
      status: hasRows ? "ready" : "empty",
      studentRequests,
      ownRequests,
      errorMessage: null,
    };
  } catch (err) {
    const mapped = mapError(err, "leave requests");
    return {
      status: mapped.status,
      studentRequests: [],
      ownRequests: [],
      errorMessage: mapped.message,
    };
  }
}
