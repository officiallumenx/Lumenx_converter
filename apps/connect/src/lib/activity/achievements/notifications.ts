import type { ActivityNotificationDispatch } from "@/activity-workspace/hub/notifications";
import type { ActivityAchievement } from "./types";

export function defaultAchievementNotificationPrefs() {
  return {
    notifyStudent: true,
    notifyParents: true,
    notifyTeachers: false,
  };
}

export function buildAchievementNotificationDispatch(
  achievement: ActivityAchievement,
): ActivityNotificationDispatch {
  return {
    activityId: achievement.source.recordId,
    audience: {
      type: "individual_students",
      studentIds: [achievement.studentId],
      studentLabels: [achievement.studentName],
    },
    title: `Achievement: ${achievement.title}`,
    body: `${achievement.studentName} — ${achievement.description}`,
    category: "announcement",
    notifyParents: achievement.notifications.notifyParents,
    notifyTeachers: achievement.notifications.notifyTeachers,
  };
}

export function estimateAchievementRecipients(achievement: ActivityAchievement): number {
  let count = achievement.notifications.notifyStudent ? 1 : 0;
  if (achievement.notifications.notifyParents) count += 2;
  if (achievement.notifications.notifyTeachers) count += 3;
  return count;
}
