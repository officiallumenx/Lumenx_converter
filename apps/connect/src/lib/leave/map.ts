import type { TeacherLeaveRequest } from "@/lib/teacher/types";
import type {
  ConnectLeaveRequest,
  LeaveDecisionDto,
  LeaveRequestDto,
  StudentNameLookup,
} from "./types";

function formatAppliedAt(iso: string): string {
  try {
    return new Date(iso).toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso.slice(0, 10);
  }
}

function studentLabel(
  studentId: string | null,
  lookup: StudentNameLookup,
): { childName: string; className: string; section: string } {
  if (!studentId) {
    return { childName: "Student", className: "Class", section: "—" };
  }
  const row = lookup.get(studentId);
  if (!row) {
    return {
      childName: `Student ${studentId.slice(0, 8)}`,
      className: "Class",
      section: "—",
    };
  }
  return {
    childName: row.name,
    className: row.className,
    section: row.section,
  };
}

export function leaveDtoToConnectRequest(
  dto: LeaveRequestDto,
  lookup: StudentNameLookup,
  decision?: LeaveDecisionDto | null,
): ConnectLeaveRequest {
  const labels = studentLabel(dto.studentId, lookup);
  const note = decision?.note?.trim();
  return {
    id: dto.id,
    childId: dto.studentId ?? "",
    childName: labels.childName,
    className: labels.className,
    section: labels.section,
    leaveStartDate: dto.startDate,
    leaveEndDate: dto.endDate,
    description: dto.reason,
    status: dto.status,
    appliedAt: formatAppliedAt(dto.createdAt),
    updatedAt: formatAppliedAt(dto.updatedAt),
    teacherNote: note || undefined,
  };
}

export function leaveDtosToConnectRequests(
  dtos: LeaveRequestDto[],
  lookup: StudentNameLookup,
  decisions?: Map<string, LeaveDecisionDto | null>,
): ConnectLeaveRequest[] {
  return dtos
    .filter((d) => d.subjectKind === "student")
    .map((dto) =>
      leaveDtoToConnectRequest(dto, lookup, decisions?.get(dto.id) ?? null),
    );
}

export function leaveDtoToTeacherLeaveRequest(
  dto: LeaveRequestDto,
  decision?: LeaveDecisionDto | null,
): TeacherLeaveRequest {
  const approver =
    dto.intendedApproverRole === "principal" ? "principal" : "admin";
  const leaveType =
    dto.leaveType === "sick" ||
    dto.leaveType === "casual" ||
    dto.leaveType === "emergency" ||
    dto.leaveType === "permission"
      ? dto.leaveType
      : "casual";

  return {
    id: dto.id,
    teacherId: dto.teacherId ?? "",
    teacherName: "",
    type: leaveType,
    to: approver,
    fromDate: dto.startDate,
    toDate: dto.endDate,
    reason: dto.reason,
    status:
      dto.status === "cancelled"
        ? "rejected"
        : (dto.status as TeacherLeaveRequest["status"]),
    submittedAt: formatAppliedAt(dto.createdAt),
    reviewedNote: decision?.note?.trim() || undefined,
  };
}

export function leaveDtosToTeacherLeaveRequests(
  dtos: LeaveRequestDto[],
  decisions?: Map<string, LeaveDecisionDto | null>,
): TeacherLeaveRequest[] {
  return dtos
    .filter((d) => d.subjectKind === "teacher")
    .map((dto) =>
      leaveDtoToTeacherLeaveRequest(dto, decisions?.get(dto.id) ?? null),
    );
}

/** Map API ignored status for LeaveRequest badge compatibility. */
export function toLeaveBadgeStatus(
  status: ConnectLeaveRequest["status"],
): "pending" | "approved" | "rejected" | "ignored" {
  if (status === "cancelled") return "rejected";
  if (status === "ignored") return "ignored";
  if (status === "approved") return "approved";
  if (status === "rejected") return "rejected";
  return "pending";
}
