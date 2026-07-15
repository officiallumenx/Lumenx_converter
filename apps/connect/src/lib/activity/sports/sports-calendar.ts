import type { CalendarActivityMark } from "@/activity-workspace/hub/calendar";
import { activitiesToCalendarMarks, listActivitiesFromStore } from "./activities-store";
import {
  listPracticeSessionsFromStore,
  practiceSessionsToCalendarMarks,
} from "./practice-sessions-store";

/** Merged Sports Calendar marks — activities + practice sessions (no frozen screen changes). */
export function buildSportsCalendarMarks(): CalendarActivityMark[] {
  const activityMarks = activitiesToCalendarMarks(listActivitiesFromStore());
  const sessionMarks = practiceSessionsToCalendarMarks(listPracticeSessionsFromStore());

  const counts = new Map<string, number>();
  for (const mark of [...activityMarks, ...sessionMarks]) {
    counts.set(mark.date, (counts.get(mark.date) ?? 0) + mark.count);
  }

  const today = new Date().toISOString().slice(0, 10);
  return [...counts.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({
      date,
      count,
      highlight: date === today,
    }));
}
