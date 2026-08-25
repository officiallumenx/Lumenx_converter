import type { LeaveRequest, LeaveStatus } from "@lumenx/types";
import { toLocalIsoDate } from "@lumenx/utils";

export { toLocalIsoDate };

export const LEAVE_STATUS_LABELS: Record<LeaveStatus, string> = {
  pending: "Pending approval",
  approved: "Approved",
  rejected: "Rejected",
  dismissed: "Ignored",
};

export const LEAVE_STATUS_TONE: Record<
  LeaveStatus,
  "warning" | "success" | "destructive" | "muted"
> = {
  pending: "warning",
  approved: "success",
  rejected: "destructive",
  dismissed: "muted",
};

/** Earliest selectable leave date — at least one calendar day ahead. */
export function minLeaveDateIso(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 1);
  return toLocalIsoDate(d);
}

function isValidLeaveDate(isoDate: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return false;
  const selected = new Date(`${isoDate}T00:00:00`);
  const min = new Date(`${minLeaveDateIso()}T00:00:00`);
  return selected >= min;
}

export function isValidLeaveRange(startDate: string, endDate: string): boolean {
  if (!isValidLeaveDate(startDate)) return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(endDate)) return false;
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  const min = new Date(`${minLeaveDateIso()}T00:00:00`);
  return end >= start && end >= min;
}

/** All ISO dates from start through end inclusive. */
export function enumerateLeaveDates(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const cursor = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  while (cursor <= end) {
    dates.push(toLocalIsoDate(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

export function leaveDayCount(req: Pick<LeaveRequest, "leaveStartDate" | "leaveEndDate">): number {
  return enumerateLeaveDates(req.leaveStartDate, req.leaveEndDate).length;
}

function formatLeaveDate(isoDate: string): string {
  try {
    return new Date(`${isoDate}T00:00:00`).toLocaleDateString("en-IN", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return isoDate;
  }
}

function formatLeaveRange(startDate: string, endDate: string): string {
  if (startDate === endDate) return formatLeaveDate(startDate);
  return `${formatLeaveDate(startDate)} – ${formatLeaveDate(endDate)}`;
}

export function formatLeaveRequestDates(
  req: Pick<LeaveRequest, "leaveStartDate" | "leaveEndDate">,
): string {
  return formatLeaveRange(req.leaveStartDate, req.leaveEndDate);
}

export function classTag(className: string, section: string): string {
  return `${className}-${section}`;
}

export function sortLeaveRequests<T extends { leaveStartDate: string; appliedAt: string }>(
  rows: T[],
): T[] {
  return [...rows].sort((a, b) => b.leaveStartDate.localeCompare(a.leaveStartDate));
}

export function selectPendingLeaveRequests(requests: LeaveRequest[]): LeaveRequest[] {
  return requests.filter((r) => r.status === "pending");
}

export function isClosedLeaveStatus(status: LeaveStatus): boolean {
  return status === "dismissed" || status === "rejected";
}
