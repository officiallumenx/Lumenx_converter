/**
 * Activity Hub — notification types shared across workspace modules.
 */
export type ActivityNotificationCategory =
  | "reminder"
  | "registration"
  | "result"
  | "announcement"
  | "urgent";

export interface ActivityNotification {
  id: string;
  title: string;
  body: string;
  category: ActivityNotificationCategory;
  timeAgo: string;
  unread: boolean;
  /** Source activity when notification is activity-scoped. */
  activityId?: string;
  categoryId?: import("../categories").ActivityCategoryId;
}

/** Mock notification dispatch descriptor — no backend. */
export interface ActivityNotificationDispatch {
  activityId: string;
  audience: import("../audience").ActivityAudienceSelection;
  title: string;
  body: string;
  category: ActivityNotificationCategory;
  /** Optional extended recipients for sports / institute broadcasts. */
  notifyParents?: boolean;
  notifyTeachers?: boolean;
}
