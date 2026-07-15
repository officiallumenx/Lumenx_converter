import type { MatchResult, MatchResultInput } from "./match-results-types";
import { defaultMatchResultNotificationPrefs } from "./match-results-notifications";
import { isoDate } from "@/activity-workspace/hub/calendar";

export function cloneMatchResult(r: MatchResult): MatchResult {
  return {
    ...r,
    awards: { ...r.awards },
    statistics: { ...r.statistics },
    highlights: { ...r.highlights },
    attachments: r.attachments.map((a) => ({ ...a })),
    notifications: { ...r.notifications },
  };
}

export function createMatchResultFromInput(
  input: MatchResultInput,
  meta: {
    tournamentId: string;
    tournamentName: string;
    matchName: string;
    sportType: import("./types").SportType;
    matchDate: string;
    venue: string;
  },
  id?: string,
): MatchResult {
  const now = isoDate(new Date());
  return {
    id: id ?? `mres-${Date.now()}`,
    tournamentMatchId: input.tournamentMatchId,
    tournamentId: meta.tournamentId,
    tournamentName: meta.tournamentName,
    matchName: meta.matchName,
    sportType: meta.sportType,
    matchDate: meta.matchDate,
    venue: meta.venue,
    matchStatus: input.matchStatus,
    winnerId: input.winnerId,
    winnerName: input.winnerName,
    runnerUpId: input.runnerUpId,
    runnerUpName: input.runnerUpName,
    isDraw: input.isDraw,
    finalScore: input.finalScore.trim(),
    matchSummary: input.matchSummary.trim(),
    awards: { ...input.awards },
    statistics: { ...input.statistics },
    highlights: { ...input.highlights },
    attachments: input.attachments.map((a) => ({ ...a })),
    notifications: input.notifications ?? defaultMatchResultNotificationPrefs(),
    createdAt: now,
    updatedAt: now,
  };
}

export const matchResultsSeed: MatchResult[] = [
  {
    id: "mres-1",
    tournamentMatchId: "tmatch-1",
    tournamentId: "tourn-1",
    tournamentName: "Inter-House Football League 2025–26",
    matchName: "Emerald vs Sapphire — League",
    sportType: "football",
    matchDate: isoDate(new Date()),
    venue: "Main Ground",
    matchStatus: "completed",
    winnerId: "team-football",
    winnerName: "Senior Football Team",
    runnerUpId: "team-kabaddi",
    runnerUpName: "Kabaddi Team",
    isDraw: false,
    finalScore: "3 – 1",
    matchSummary:
      "Senior Football Team controlled possession in the second half to secure a comfortable league win.",
    awards: {
      mvp: "Arjun Mehta",
      bestPerformer: "Priya Nair",
      fairPlayAward: "Kabaddi Team",
      coachRemarks: "Strong team shape — maintain pressing intensity for semi-final.",
    },
    statistics: {
      goals: 4,
      fouls: 11,
      yellowCards: 2,
      redCards: 0,
      possessionPct: 58,
      extras: "2 penalties awarded",
    },
    highlights: {
      highestScorer: "Arjun Mehta (2 goals)",
      bestDefender: "Rohan Das",
      bestGoalkeeper: "Isha Kulkarni",
    },
    attachments: [
      {
        id: "matt-1",
        name: "match-photo-1.jpg",
        kind: "image",
        sizeLabel: "1.4 MB",
        uploadedAt: isoDate(new Date()),
      },
      {
        id: "matt-2",
        name: "match-report.pdf",
        kind: "document",
        sizeLabel: "320 KB",
        uploadedAt: isoDate(new Date()),
      },
    ],
    notifications: { notifyAudience: true, notifyParents: true, notifyTeachers: true },
    resultPublishedAt: isoDate(new Date()),
    createdAt: "2026-03-08",
    updatedAt: isoDate(new Date()),
  },
  {
    id: "mres-2",
    tournamentMatchId: "tmatch-4",
    tournamentId: "tourn-4",
    tournamentName: "Cricket Invitational (2024–25)",
    matchName: "Final — Invitational Cup",
    sportType: "cricket",
    matchDate: "2025-11-15",
    venue: "Main Ground",
    matchStatus: "completed",
    winnerId: "team-cricket",
    winnerName: "Cricket Team",
    runnerUpId: "team-football",
    runnerUpName: "Senior Football Team",
    isDraw: false,
    finalScore: "Cricket Team 156/4 (20) beat Senior Football Team 142/8 (20)",
    matchSummary: "Cricket Team chased successfully with two overs to spare in the invitational final.",
    awards: {
      mvp: "Sneha Patel",
      bestPerformer: "Harish Varma",
      coachRemarks: "Excellent death bowling in the final over.",
    },
    statistics: {
      runs: 298,
      extras: "14 wides, 3 no-balls",
    },
    highlights: {
      bestBatsman: "Sneha Patel (68*)",
      bestBowler: "Harish Varma (3/22)",
    },
    attachments: [],
    notifications: { notifyAudience: true, notifyParents: true, notifyTeachers: false },
    resultPublishedAt: "2025-11-15",
    createdAt: "2025-11-15",
    updatedAt: "2025-11-16",
  },
];
