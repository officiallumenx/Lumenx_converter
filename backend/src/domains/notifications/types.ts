/** Shared notifications domain — inbox, emit, device tokens, templates. */

export type NotificationCategory =
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

export type NotificationPriority =
  | "normal"
  | "important"
  | "critical"
  | "success";

export type TemplateStatus = "draft" | "published" | "archived";

export type DeviceApp = "connect" | "admin" | "transport" | "nexus";
export type DevicePlatform = "android" | "ios" | "web";

export type NotificationRow = {
  id: string;
  institute_id: string;
  template_id: string | null;
  category: NotificationCategory;
  priority: NotificationPriority;
  title: string;
  body: string;
  payload: Record<string, unknown>;
  deep_link: string | null;
  dedupe_key: string | null;
  created_by_user_profile_id: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type RecipientRow = {
  id: string;
  institute_id: string;
  notification_id: string;
  user_profile_id: string;
  read_at: string | null;
  starred_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type TemplateRow = {
  id: string;
  institute_id: string | null;
  template_key: string;
  category: NotificationCategory;
  audience: string | null;
  title: string;
  body: string;
  priority: NotificationPriority;
  deep_link: string | null;
  status: TemplateStatus;
  version: string;
  allowed_variables: unknown;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type DeviceTokenRow = {
  id: string;
  user_profile_id: string;
  app: DeviceApp;
  platform: DevicePlatform;
  token: string;
  valid: boolean;
  last_seen_at: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

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
    category: NotificationCategory;
    priority: NotificationPriority;
    title: string;
    body: string;
    payload: Record<string, unknown>;
    deepLink: string | null;
    templateId: string | null;
    createdAt: string;
  };
};

export type TemplateDto = {
  id: string;
  instituteId: string | null;
  templateKey: string;
  category: NotificationCategory;
  audience: string | null;
  title: string;
  body: string;
  priority: NotificationPriority;
  deepLink: string | null;
  status: TemplateStatus;
  version: string;
  allowedVariables: unknown;
  createdAt: string;
  updatedAt: string;
};

export type DeviceTokenDto = {
  id: string;
  userProfileId: string;
  app: DeviceApp;
  platform: DevicePlatform;
  token: string;
  valid: boolean;
  lastSeenAt: string;
  createdAt: string;
  updatedAt: string;
};

/** Role-based broadcast audiences resolved from active institute memberships. */
export type NotificationAudience =
  | "everyone"
  | "students"
  | "parents"
  | "teachers";

export type EmitNotificationInput = {
  instituteId: string;
  templateId?: string | null;
  category: NotificationCategory;
  priority?: NotificationPriority;
  title: string;
  body: string;
  payload?: Record<string, unknown>;
  deepLink?: string | null;
  dedupeKey?: string | null;
  /** Explicit recipients XOR audience (server resolves memberships). */
  recipientUserIds?: string[];
  audience?: NotificationAudience;
};

export type UpdateRecipientInput = {
  read?: boolean;
  starred?: boolean;
};

export type ListInboxFilter = {
  instituteId: string;
  unreadOnly?: boolean;
};

export type ListTemplatesFilter = {
  instituteId?: string;
  status?: TemplateStatus;
  category?: NotificationCategory;
};

export type RegisterDeviceTokenInput = {
  app: DeviceApp;
  platform: DevicePlatform;
  token: string;
};
