import type { ActivityNotificationDispatch } from "@/activity-workspace/hub/notifications";
import { SPORTS_PERFORMANCE_RATING_LABELS } from "./sports-attendance-types";
import type { CoachNoteRecord } from "./coach-notes-types";

export function buildFollowUpNotificationDispatch(
  note: CoachNoteRecord,
): ActivityNotificationDispatch {
  return {
    activityId: note.practiceSessionId,
    audience: {
      type: "individual_students",
      studentIds: [note.studentId],
    },
    title: `Coach follow-up: ${note.studentName}`,
    body: `${note.coach} flagged follow-up for ${note.practiceSessionTitle}. Rating: ${SPORTS_PERFORMANCE_RATING_LABELS[note.performanceRating]}. Goals: ${note.nextPracticeGoals || "See coach notes."}`,
    category: "reminder",
    notifyParents: true,
    notifyTeachers: false,
  };
}

export function estimateFollowUpRecipients(): number {
  return 2;
}
