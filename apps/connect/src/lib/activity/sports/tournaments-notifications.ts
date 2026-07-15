import type { ActivityNotificationDispatch } from "@/activity-workspace/hub/notifications";
import type { SportsTournament } from "./tournaments-types";
import { defaultNotificationPrefs } from "./activities-notifications";

export function buildTournamentNotificationDispatch(
  tournament: SportsTournament,
): ActivityNotificationDispatch {
  return {
    activityId: tournament.id,
    audience: tournament.audience,
    title: `Tournament: ${tournament.name}`,
    body: `${tournament.name} — ${tournament.startDate} to ${tournament.endDate} at ${tournament.venue}`,
    category: tournament.status === "scheduled" ? "announcement" : "reminder",
    notifyParents: tournament.notifications.notifyParents,
    notifyTeachers: tournament.notifications.notifyTeachers,
  };
}

export function defaultTournamentNotificationPrefs() {
  return defaultNotificationPrefs();
}

export function estimateTournamentNotificationRecipients(tournament: SportsTournament): number {
  let count = tournament.notifications.notifyAudience ? 32 : 0;
  if (tournament.notifications.notifyParents) count += Math.round(32 * 0.8);
  if (tournament.notifications.notifyTeachers) count += 4;
  return count;
}
