import type { ActivityNotificationDispatch } from "@/activity-workspace/hub/notifications";
import { getActivityByIdFromStore } from "./activities-store";
import type { PracticeSession } from "./practice-sessions-types";
import type { SportsActivityNotificationPrefs } from "./activities-types";

export function defaultPracticeNotificationPrefs(): SportsActivityNotificationPrefs {
  return { notifyAudience: true, notifyParents: false, notifyTeachers: true };
}

export function buildPracticeNotificationDispatch(
  session: PracticeSession,
): ActivityNotificationDispatch {
  const parent = getActivityByIdFromStore(session.sportsActivityId);
  return {
    activityId: session.sportsActivityId,
    audience: parent?.audience ?? { type: "teams", teamIds: [session.teamId], teamLabels: [session.teamName] },
    title: `Practice session: ${session.title}`,
    body: `${session.title} on ${session.date} at ${session.startTime} — ${session.venue} (${session.teamName})`,
    category: session.status === "scheduled" ? "reminder" : "announcement",
    notifyParents: session.notifications.notifyParents,
    notifyTeachers: session.notifications.notifyTeachers,
  };
}

export function estimatePracticeNotificationRecipients(session: PracticeSession): number {
  let count = session.notifications.notifyAudience ? 18 : 0;
  if (session.notifications.notifyParents) count += Math.round(18 * 0.8);
  if (session.notifications.notifyTeachers) count += 2;
  return count;
}
