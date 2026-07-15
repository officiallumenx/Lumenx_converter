import type { ActivityNotificationDispatch } from "@/activity-workspace/hub/notifications";
import type { SportsActivity, SportsActivityNotificationPrefs } from "./activities-types";
import type { ActivityAudienceSelection } from "@/activity-workspace/hub/audience";

/** Extended notification targets for sports operational records. */
export type SportsNotificationRecipients = {
  audience: ActivityAudienceSelection;
  notifyParents: boolean;
  notifyTeachers: boolean;
};

export function buildSportsNotificationDispatch(
  activity: SportsActivity,
): ActivityNotificationDispatch & SportsNotificationRecipients {
  return {
    activityId: activity.id,
    audience: activity.audience,
    title: `Sports activity: ${activity.title}`,
    body: `${activity.title} on ${activity.date} at ${activity.startTime} — ${activity.venue}`,
    category: activity.status === "scheduled" ? "announcement" : "reminder",
    notifyParents: activity.notifications.notifyParents,
    notifyTeachers: activity.notifications.notifyTeachers,
  };
}

export function defaultNotificationPrefs(): SportsActivityNotificationPrefs {
  return { notifyAudience: true, notifyParents: false, notifyTeachers: false };
}

export function estimateNotificationRecipients(
  activity: SportsActivity,
  audienceCount = 24,
): number {
  let count = activity.notifications.notifyAudience ? audienceCount : 0;
  if (activity.notifications.notifyParents) count += Math.round(audienceCount * 0.8);
  if (activity.notifications.notifyTeachers) count += 3;
  return count;
}
