import type { ActivityNotificationDispatch } from "@/activity-workspace/hub/notifications";
import { defaultNotificationPrefs } from "./activities-notifications";
import type { MatchResult } from "./match-results-types";

export function defaultMatchResultNotificationPrefs() {
  return { ...defaultNotificationPrefs(), notifyParents: true, notifyTeachers: true };
}

export function buildMatchResultNotificationDispatch(
  result: MatchResult,
): ActivityNotificationDispatch {
  const outcome = result.isDraw
    ? `Draw — ${result.finalScore}`
    : `${result.winnerName ?? "Winner"} beat ${result.runnerUpName ?? "opponent"} — ${result.finalScore}`;

  return {
    activityId: result.tournamentId,
    audience: {
      type: "teams",
      teamIds: [result.winnerId, result.runnerUpId].filter(Boolean) as string[],
      teamLabels: [result.winnerName, result.runnerUpName].filter(Boolean) as string[],
    },
    title: `Match result: ${result.matchName}`,
    body: `${result.tournamentName} — ${outcome}. ${result.matchSummary}`,
    category: "result",
    notifyParents: result.notifications.notifyParents,
    notifyTeachers: result.notifications.notifyTeachers,
  };
}

export function estimateMatchResultRecipients(result: MatchResult): number {
  let count = result.notifications.notifyAudience ? 28 : 0;
  if (result.notifications.notifyParents) count += Math.round(28 * 0.8);
  if (result.notifications.notifyTeachers) count += 4;
  return count;
}
