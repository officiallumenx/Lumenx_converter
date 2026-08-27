import type { LeaveListItem, LeaveRequestDto } from "./types";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function parseDateOnly(iso: string): Date | null {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  return new Date(t);
}

/**
 * Inclusive day span between two YYYY-MM-DD dates.
 * Malformed inputs return 0 rather than NaN.
 */
export function daysBetween(startIso: string, endIso: string): number {
  const start = parseDateOnly(startIso);
  const end = parseDateOnly(endIso);
  if (!start || !end) return 0;
  const diff = Math.round((end.getTime() - start.getTime()) / MS_PER_DAY);
  if (!Number.isFinite(diff) || diff < 0) return 0;
  return diff + 1;
}

function toAppliedDate(iso: string): string {
  const d = parseDateOnly(iso);
  if (!d) return "—";
  return d.toISOString().slice(0, 10);
}

function shortId(id: string | null): string {
  if (!id) return "";
  return id.slice(0, 8);
}

function approverLabel(role: LeaveRequestDto["intendedApproverRole"]): string {
  if (role === "institute_admin") return "Institute admin";
  if (role === "principal") return "Principal";
  return "—";
}

/**
 * Presentation-only mapping. DTO identity fields are never used as authority;
 * they are shown as short prefixes to preserve privacy.
 */
export function leaveDtoToListItem(dto: LeaveRequestDto): LeaveListItem {
  const subjectKind = dto.subjectKind === "student" ? "student" : "teacher";

  const name =
    subjectKind === "student"
      ? dto.studentId
        ? `Student ${shortId(dto.studentId)}`
        : `User ${shortId(dto.requestedByUserId)}`
      : dto.teacherId
        ? `Teacher ${shortId(dto.teacherId)}`
        : `User ${shortId(dto.requestedByUserId)}`;

  const classLabel = dto.sectionId
    ? `Sec ${shortId(dto.sectionId)}`
    : dto.classId
      ? `Cls ${shortId(dto.classId)}`
      : "—";

  return {
    id: dto.id,
    subjectKind,
    name,
    className: subjectKind === "student" ? classLabel : "—",
    dept: "—",
    from: dto.startDate || "—",
    to: dto.endDate || "—",
    days: daysBetween(dto.startDate, dto.endDate),
    reason: dto.reason ?? "",
    status: dto.status,
    applied: toAppliedDate(dto.createdAt),
    type: dto.leaveType,
    toRole: subjectKind === "teacher" ? approverLabel(dto.intendedApproverRole) : "—",
  };
}

export function leaveDtosToListItems(dtos: LeaveRequestDto[]): LeaveListItem[] {
  return dtos.map(leaveDtoToListItem);
}
