import type { NotificationCategory } from "@lumenx/types";

/** Mirrors backend InboxItemDto — keep in sync with domains/notifications/types.ts. */

export type BackendNotificationCategory =
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

export type BackendNotificationPriority =
  | "normal"
  | "important"
  | "critical"
  | "success";

export type InboxItemDto = {
  id: string;
  instituteId: string;
  notificationId: string;
  userProfileId: string;
  readAt: string | null;
  starredAt: string | null;
  createdAt: string;
  updatedAt: string;
  notification: {
    id: string;
    category: BackendNotificationCategory;
    priority: BackendNotificationPriority;
    title: string;
    body: string;
    payload: Record<string, unknown>;
    deepLink: string | null;
    templateId: string | null;
    createdAt: string;
  };
};

/**
 * Presentation-only row consumed by the Notification Center inbox.
 * Never used as tenant/auth authority.
 */
export type NotificationInboxListItem = {
  id: string;
  title: string;
  desc: string;
  detail: string;
  time: string;
  type: "info" | "warning" | "positive";
  category: NotificationCategory;
  unread: boolean;
  priority?: "low" | "normal" | "high";
  createdAt: string;
  href?: string;
  templateId?: string;
  /** Raw notification payload — used for alert presentation detection in API mode. */
  payload?: Record<string, unknown>;
};

export type ListInboxParams = {
  instituteId: string;
};
