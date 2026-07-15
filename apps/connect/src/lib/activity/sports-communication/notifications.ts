import type { ActivityNotificationDispatch } from "@/activity-workspace/hub/notifications";
import type {
  CommunicationNotificationPrefs,
  MessageType,
  SportsCommunicationAnnouncement,
} from "./types";
import { messageTypeToNotificationCategory } from "./types";

export function buildCommunicationNotificationDispatch(
  announcement: SportsCommunicationAnnouncement,
): ActivityNotificationDispatch {
  return {
    activityId: announcement.id,
    audience: announcement.audience,
    title: announcement.title,
    body: announcement.body,
    category: messageTypeToNotificationCategory(announcement.messageType),
    notifyParents: announcement.notifications.notifyParents,
    notifyTeachers: announcement.notifications.notifyTeachers,
  };
}

export function estimateCommunicationRecipients(
  announcement: SportsCommunicationAnnouncement,
  audienceCount = 24,
): number {
  const prefs = announcement.notifications;
  let count = 0;
  if (prefs.notifyAudience) count += audienceCount;
  if (prefs.notifyParents) count += Math.round(audienceCount * 0.85);
  if (prefs.notifyTeachers) count += 4;
  if (prefs.notifyCoaches) count += 6;
  return count;
}

export function recipientSummary(prefs: CommunicationNotificationPrefs): string {
  const parts: string[] = [];
  if (prefs.notifyAudience) parts.push("Audience");
  if (prefs.notifyParents) parts.push("Parents");
  if (prefs.notifyCoaches) parts.push("Coaches");
  if (prefs.notifyTeachers) parts.push("Teachers");
  return parts.length ? parts.join(", ") : "None";
}

export function isEmergencyMessage(messageType: MessageType): boolean {
  return messageType === "emergency" || messageType === "warning";
}
