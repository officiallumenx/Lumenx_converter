/**
 * Merge Attendance Notification Inbox into Connect Parent / Student notification feeds.
 * Parent child routing uses canonical attendance student ids (`stu:…`), not portal ids (C1).
 */

import type { AppNotification } from "@lumenx/types";
import {
  ATTENDANCE_INBOX_CHANGED_EVENT,
  ensureDailyAttendanceSummariesFlushed,
  listAttendanceNotificationInbox,
  type AttendanceNotificationInboxItem,
} from "@lumenx/module-attendance";
import { toAttendanceStudentId } from "@/lib/attendance/section-key";

function formatInboxTime(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "Today";
    return d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "Today";
  }
}

/** Convert one inbox row into an AppNotification (Attendance category). */
export function attendanceInboxItemToAppNotification(
  item: AttendanceNotificationInboxItem,
): AppNotification {
  return {
    id: item.id,
    title: item.title,
    desc: item.body.split("\n")[0] ?? item.body,
    detail: item.body,
    time: formatInboxTime(item.createdAt),
    type: item.trigger === "percentage_warning" && item.recipient === "student" ? "info" : "warning",
    category: "attendance",
    unread: item.unread,
    priority: item.priority === "normal" ? "normal" : "high",
    createdAt: item.createdAt,
    href: item.href ?? "/attendance",
    templateId: item.templateId,
  };
}

export function listAttendanceInboxForLearner(input: {
  recipient: "parent" | "student";
  /** Canonical `stu:…` id */
  attendanceStudentId: string;
}): AttendanceNotificationInboxItem[] {
  ensureDailyAttendanceSummariesFlushed();
  const target = input.attendanceStudentId.trim();
  return listAttendanceNotificationInbox(input.recipient).filter(
    (n) => n.studentId === target,
  );
}

/**
 * Attendance rows for the Parent / Student notification page, scoped to the active learner.
 */
export function attendanceNotificationsForLearner(input: {
  recipient: "parent" | "student";
  attendanceStudentId: string;
  limit?: number;
}): AppNotification[] {
  const rows = listAttendanceInboxForLearner(input).map(attendanceInboxItemToAppNotification);
  return input.limit ? rows.slice(0, input.limit) : rows;
}

/**
 * Merge portal snapshot notifications with Attendance inbox.
 * Replaces mock static attendance rows so /notifications Attendance = inbox SoT.
 */
export function mergePortalNotificationsWithAttendanceInbox(input: {
  recipient: "parent" | "student";
  portalNotifications: AppNotification[];
  attendanceStudentId: string;
}): AppNotification[] {
  const fromInbox = attendanceNotificationsForLearner({
    recipient: input.recipient,
    attendanceStudentId: input.attendanceStudentId,
  });
  const inboxIds = new Set(fromInbox.map((n) => n.id));
  const other = input.portalNotifications.filter(
    (n) => n.category !== "attendance" && !inboxIds.has(n.id),
  );
  return [...fromInbox, ...other].map((n) =>
    n.category === "attendance" ? { ...n, href: n.href?.trim() || "/attendance" } : n,
  );
}

export function resolveParentChildAttendanceStudentId(child: {
  id: string;
  className: string;
  section: string;
  rollNo: string;
}): string {
  return toAttendanceStudentId({
    id: child.id,
    classLabel: child.className,
    section: child.section,
    rollNo: child.rollNo,
  });
}

export function resolveStudentProfileAttendanceStudentId(profile: {
  id: string;
  class: string;
  section: string;
  rollNo: string;
}): string {
  return toAttendanceStudentId({
    id: profile.id,
    classLabel: profile.class,
    section: profile.section,
    rollNo: profile.rollNo,
  });
}

/** Subscribe to same-tab + cross-tab attendance inbox changes. */
export function subscribeAttendanceInbox(listener: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const onCustom = () => listener();
  const onStorage = (e: StorageEvent) => {
    if (
      e.key === null ||
      e.key === "lumenx.attendance-notification-inbox.v1" ||
      e.key === "lumenx.attendance-notification-summary-queue.v1"
    ) {
      listener();
    }
  };
  window.addEventListener(ATTENDANCE_INBOX_CHANGED_EVENT, onCustom);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(ATTENDANCE_INBOX_CHANGED_EVENT, onCustom);
    window.removeEventListener("storage", onStorage);
  };
}
