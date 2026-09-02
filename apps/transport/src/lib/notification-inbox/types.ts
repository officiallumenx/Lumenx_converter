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

export type ListInboxParams = {
  instituteId: string;
};
