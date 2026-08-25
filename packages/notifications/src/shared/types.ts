/**
 * Shared LumenX notification contract (Phase 1 foundation).
 * Complements — does not replace — AppNotification / SchoolAlert in @lumenx/types.
 */

/** Product priority set for the centralized notification system. */
export type LumenXNotificationPriority = "normal" | "important" | "critical" | "success";

/**
 * Functional module / category for future notification organization.
 * Matches the planned notifications/<category> folders.
 */
export type LumenXNotificationCategory =
  | "attendance"
  | "homework"
  | "fees"
  | "exams"
  | "events"
  | "transport"
  | "leave"
  | "announcements"
  | "messages"
  | "complaints"
  | "admissions"
  | "careers"
  | "certificates"
  | "documents"
  | "timetable"
  | "system"
  | "nexus";

/** Who the notification is for (app / role audience). */
export type LumenXNotificationAudience =
  | "parent"
  | "student"
  | "teacher"
  | "admin"
  | "driver"
  | "connect"
  | "nexus"
  | "institute";

/** Semantic display type (maps to existing AppNotification.type). */
export type LumenXNotificationType = "info" | "warning" | "positive";

/**
 * Minimal shared notification record.
 * Use adapters to convert to/from AppNotification for existing UIs.
 */
export type LumenXNotification = {
  id: string;
  category: LumenXNotificationCategory;
  type: LumenXNotificationType;
  title: string;
  message: string;
  /** Producing module / feature (e.g. "attendance.flow", "transport.bridge"). */
  source: string;
  audience: LumenXNotificationAudience;
  priority: LumenXNotificationPriority;
  /** ISO-8601 timestamp. */
  timestamp: string;
  /** In-app deep link (same meaning as AppNotification.href). */
  href?: string;
  /** Optional structured extras (studentId, tripId, templateId, …). */
  metadata?: Record<string, string | number | boolean | null>;
  unread?: boolean;
  starred?: boolean;
  templateId?: string;
};

export type CreateLumenXNotificationInput = {
  id?: string;
  category: LumenXNotificationCategory;
  type?: LumenXNotificationType;
  title: string;
  message: string;
  source: string;
  audience: LumenXNotificationAudience;
  priority?: LumenXNotificationPriority;
  timestamp?: string;
  href?: string;
  metadata?: LumenXNotification["metadata"];
  unread?: boolean;
  starred?: boolean;
  templateId?: string;
};

export const LUMENX_NOTIFICATION_CATEGORIES: readonly LumenXNotificationCategory[] = [
  "attendance",
  "homework",
  "fees",
  "exams",
  "events",
  "transport",
  "leave",
  "announcements",
  "messages",
  "complaints",
  "admissions",
  "careers",
  "certificates",
  "documents",
  "timetable",
  "system",
  "nexus",
] as const;
