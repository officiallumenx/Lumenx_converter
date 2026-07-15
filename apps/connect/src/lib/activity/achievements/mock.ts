import type {
  ActivityAchievement,
  ActivityAchievementInput,
  AchievementSourceRef,
} from "./types";
import { defaultAchievementNotificationPrefs } from "./notifications";

export function cloneAchievement(a: ActivityAchievement): ActivityAchievement {
  return {
    ...a,
    source: { ...a.source },
    notifications: { ...a.notifications },
  };
}

export function createAchievementFromInput(
  input: ActivityAchievementInput,
  source: AchievementSourceRef,
  id?: string,
): ActivityAchievement {
  const now = new Date().toISOString().slice(0, 10);
  return {
    id: id ?? `ach-${Date.now()}`,
    title: input.title.trim(),
    achievementType: input.achievementType,
    level: input.level,
    source,
    studentId: input.studentId,
    studentName: input.studentName,
    studentClassLabel: input.studentClassLabel,
    teamId: input.teamId,
    teamName: input.teamName,
    date: input.date,
    description: input.description.trim(),
    notifications: input.notifications ?? defaultAchievementNotificationPrefs(),
    createdAt: now,
    updatedAt: now,
  };
}

export const achievementsSeed: ActivityAchievement[] = [
  {
    id: "ach-1",
    title: "Inter-House Football MVP",
    achievementType: "mvp",
    level: "school",
    source: {
      module: "sports",
      recordId: "mres-1",
      recordLabel: "Emerald vs Sapphire — League (Inter-House Football League 2025–26)",
      recordKind: "match_result",
    },
    studentId: "stu-1",
    studentName: "Arjun Mehta",
    studentClassLabel: "9-A",
    teamId: "team-football",
    teamName: "Senior Football Team",
    date: new Date().toISOString().slice(0, 10),
    description:
      "Outstanding performance as highest scorer in the inter-house football league match.",
    notifications: { notifyStudent: true, notifyParents: true, notifyTeachers: true },
    awardedAt: new Date().toISOString().slice(0, 10),
    createdAt: "2026-03-08",
    updatedAt: new Date().toISOString().slice(0, 10),
  },
  {
    id: "ach-2",
    title: "League Match Winner",
    achievementType: "winner",
    level: "school",
    source: {
      module: "sports",
      recordId: "mres-1",
      recordLabel: "Emerald vs Sapphire — League (Inter-House Football League 2025–26)",
      recordKind: "match_result",
    },
    studentId: "stu-2",
    studentName: "Priya Nair",
    studentClassLabel: "9-A",
    teamId: "team-football",
    teamName: "Senior Football Team",
    date: new Date().toISOString().slice(0, 10),
    description: "Member of the winning team in the inter-house football league fixture.",
    notifications: { notifyStudent: true, notifyParents: true, notifyTeachers: false },
    awardedAt: "2026-03-08",
    createdAt: "2026-03-08",
    updatedAt: "2026-03-08",
  },
  {
    id: "ach-3",
    title: "Cricket Invitational Best Performer",
    achievementType: "best_performer",
    level: "inter_school",
    source: {
      module: "sports",
      recordId: "mres-2",
      recordLabel: "Final — Invitational Cup (Cricket Invitational 2024–25)",
      recordKind: "match_result",
    },
    studentId: "stu-4",
    studentName: "Sneha Patel",
    studentClassLabel: "10-A",
    teamId: "team-cricket",
    teamName: "Cricket Team",
    date: "2025-11-15",
    description: "Top batting performance in the invitational cup final.",
    notifications: { notifyStudent: true, notifyParents: true, notifyTeachers: true },
    awardedAt: "2025-11-15",
    createdAt: "2025-11-15",
    updatedAt: "2025-11-16",
  },
  {
    id: "ach-4",
    title: "Fair Play Recognition",
    achievementType: "fair_play",
    level: "school",
    source: {
      module: "sports",
      recordId: "mres-1",
      recordLabel: "Emerald vs Sapphire — League (Inter-House Football League 2025–26)",
      recordKind: "match_result",
    },
    studentId: "stu-3",
    studentName: "Rohan Das",
    studentClassLabel: "9-B",
    teamId: "team-kabaddi",
    teamName: "Kabaddi Team",
    date: new Date().toISOString().slice(0, 10),
    description: "Recognized for exemplary sportsmanship during the league match.",
    notifications: { notifyStudent: true, notifyParents: true, notifyTeachers: false },
    createdAt: "2026-03-09",
    updatedAt: "2026-03-09",
  },
];
