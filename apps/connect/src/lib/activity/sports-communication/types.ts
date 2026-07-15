import type { ActivityAudienceSelection } from "@/activity-workspace/hub/audience";
import type { ActivityNotificationCategory } from "@/activity-workspace/hub/notifications";

export type CommunicationStatus = "draft" | "scheduled" | "sent" | "cancelled" | "archived";

export type CommunicationCategory =
  | "team_announcement"
  | "practice_reminder"
  | "match_reminder"
  | "tournament_announcement"
  | "parent_notification"
  | "student_notification"
  | "coach_notification"
  | "emergency_notice"
  | "scheduled_announcement";

export type MessageType =
  | "information"
  | "reminder"
  | "warning"
  | "emergency"
  | "congratulations"
  | "general_announcement";

export type CommunicationHistoryTab = "all" | "sent" | "scheduled" | "cancelled";

export interface CommunicationNotificationPrefs {
  notifyAudience: boolean;
  notifyParents: boolean;
  notifyTeachers: boolean;
  notifyCoaches: boolean;
}

export interface SportsCommunicationAnnouncement {
  id: string;
  title: string;
  body: string;
  category: CommunicationCategory;
  messageType: MessageType;
  status: CommunicationStatus;
  audience: ActivityAudienceSelection;
  notifications: CommunicationNotificationPrefs;
  scheduledDate?: string;
  scheduledTime?: string;
  sentAt?: string;
  cancelledAt?: string;
  archivedAt?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CommunicationAnnouncementInput {
  title: string;
  body: string;
  category: CommunicationCategory;
  messageType: MessageType;
  audience: ActivityAudienceSelection;
  notifications: CommunicationNotificationPrefs;
  scheduledDate?: string;
  scheduledTime?: string;
  createdBy: string;
}

export interface CommunicationListFilters {
  query?: string;
  category?: CommunicationCategory | "all";
  messageType?: MessageType | "all";
  status?: CommunicationStatus | "all";
  historyTab?: CommunicationHistoryTab;
  sortBy?: "updatedAt" | "title" | "scheduledDate";
  sortDir?: "asc" | "desc";
}

export const COMMUNICATION_CATEGORY_LABELS: Record<CommunicationCategory, string> = {
  team_announcement: "Team Announcement",
  practice_reminder: "Practice Reminder",
  match_reminder: "Match Reminder",
  tournament_announcement: "Tournament Announcement",
  parent_notification: "Parent Notification",
  student_notification: "Student Notification",
  coach_notification: "Coach Notification",
  emergency_notice: "Emergency Notice",
  scheduled_announcement: "Scheduled Announcement",
};

export const MESSAGE_TYPE_LABELS: Record<MessageType, string> = {
  information: "Information",
  reminder: "Reminder",
  warning: "Warning",
  emergency: "Emergency",
  congratulations: "Congratulations",
  general_announcement: "General Announcement",
};

export const COMMUNICATION_STATUS_LABELS: Record<CommunicationStatus, string> = {
  draft: "Draft",
  scheduled: "Scheduled",
  sent: "Sent",
  cancelled: "Cancelled",
  archived: "Archived",
};

export const COMMUNICATION_HISTORY_TAB_LABELS: Record<CommunicationHistoryTab, string> = {
  all: "All Messages",
  sent: "Sent",
  scheduled: "Scheduled",
  cancelled: "Cancelled",
};

export function defaultCommunicationNotificationPrefs(): CommunicationNotificationPrefs {
  return {
    notifyAudience: true,
    notifyParents: false,
    notifyTeachers: false,
    notifyCoaches: false,
  };
}

export function messageTypeToNotificationCategory(
  messageType: MessageType,
): ActivityNotificationCategory {
  switch (messageType) {
    case "reminder":
      return "reminder";
    case "emergency":
    case "warning":
      return "urgent";
    case "congratulations":
      return "result";
    case "general_announcement":
    case "information":
    default:
      return "announcement";
  }
}

export type { ActivityAudienceSelection };
