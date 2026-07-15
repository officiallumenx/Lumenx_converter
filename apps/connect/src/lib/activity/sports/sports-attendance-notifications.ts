import type { ActivityNotificationDispatch } from "@/activity-workspace/hub/notifications";
import { getPracticeSessionByIdFromStore } from "./practice-sessions-store";
import type { SportsAttendanceRecord } from "./sports-attendance-types";

export function buildAttendanceCompletionDispatch(
  sessionId: string,
  records: SportsAttendanceRecord[],
): ActivityNotificationDispatch {
  const session = getPracticeSessionByIdFromStore(sessionId);
  const present = records.filter((r) => r.status === "present" || r.status === "late").length;
  const total = records.length;
  const pct = total > 0 ? Math.round((present / total) * 100) : 0;

  return {
    activityId: session?.sportsActivityId ?? sessionId,
    audience: {
      type: "teams",
      teamIds: session ? [session.teamId] : [],
      teamLabels: session ? [session.teamName] : [],
    },
    title: `Attendance recorded: ${session?.title ?? "Practice session"}`,
    body: `${session?.title ?? "Session"} on ${session?.date ?? "—"} — ${present}/${total} present (${pct}%).`,
    category: "announcement",
    notifyParents: true,
    notifyTeachers: false,
  };
}

export function estimateAttendanceNotificationRecipients(recordCount: number): number {
  return recordCount + Math.round(recordCount * 0.8);
}
