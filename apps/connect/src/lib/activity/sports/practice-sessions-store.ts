import type { CalendarActivityMark } from "@/activity-workspace/hub/calendar";
import { getActivityByIdFromStore } from "./activities-store";
import {
  clonePracticeSession,
  createPracticeSessionFromInput,
  practiceSessionsSeed,
} from "./practice-sessions-mock";
import type {
  PracticeSession,
  PracticeSessionInput,
  PracticeSessionListFilters,
} from "./practice-sessions-types";

let sessionsStore: PracticeSession[] = practiceSessionsSeed.map(clonePracticeSession);

function resolveParentActivity(activityId: string) {
  const parent = getActivityByIdFromStore(activityId);
  if (!parent) {
    throw new Error("Parent sports activity not found — practice sessions require an existing activity.");
  }
  return parent;
}

function resolveTeamName(teamId: string, teamOptions: { id: string; name: string }[]): string {
  return teamOptions.find((t) => t.id === teamId)?.name ?? "Unknown team";
}

function applySessionFilters(
  items: PracticeSession[],
  filters?: PracticeSessionListFilters,
): PracticeSession[] {
  let result = [...items];
  const f = filters ?? {};

  if (f.status && f.status !== "all") {
    result = result.filter((s) => s.status === f.status);
  }
  if (f.sportsActivityId && f.sportsActivityId !== "all") {
    result = result.filter((s) => s.sportsActivityId === f.sportsActivityId);
  }
  if (f.teamId && f.teamId !== "all") {
    result = result.filter((s) => s.teamId === f.teamId);
  }
  if (f.coach && f.coach !== "all") {
    result = result.filter((s) => s.coach === f.coach);
  }
  if (f.date && f.date !== "all") {
    result = result.filter((s) => s.date === f.date);
  }

  const q = f.query?.trim().toLowerCase();
  if (q) {
    result = result.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.sportsActivityTitle.toLowerCase().includes(q) ||
        s.teamName.toLowerCase().includes(q) ||
        s.coach.toLowerCase().includes(q) ||
        s.venue.toLowerCase().includes(q) ||
        s.objectives.toLowerCase().includes(q),
    );
  }

  const sortBy = f.sortBy ?? "date";
  const sortDir = f.sortDir ?? "desc";
  const dir = sortDir === "asc" ? 1 : -1;

  result.sort((a, b) => {
    if (sortBy === "updatedAt") {
      return dir * a.updatedAt.localeCompare(b.updatedAt);
    }
    return dir * `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`);
  });

  return result;
}

export function resetPracticeSessionsStore() {
  sessionsStore = practiceSessionsSeed.map(clonePracticeSession);
}

export function listPracticeSessionsFromStore(
  filters?: PracticeSessionListFilters,
): PracticeSession[] {
  return applySessionFilters(sessionsStore, filters);
}

export function getPracticeSessionByIdFromStore(id: string): PracticeSession | null {
  const found = sessionsStore.find((s) => s.id === id);
  return found ? clonePracticeSession(found) : null;
}

export function createPracticeSessionInStore(
  input: PracticeSessionInput,
  teamOptions: { id: string; name: string }[],
): PracticeSession {
  const parent = resolveParentActivity(input.sportsActivityId);
  const session = createPracticeSessionFromInput(input, {
    activityTitle: parent.title,
    teamName: resolveTeamName(input.teamId, teamOptions),
  });
  sessionsStore = [session, ...sessionsStore];
  return clonePracticeSession(session);
}

export function updatePracticeSessionInStore(
  id: string,
  patch: Partial<PracticeSessionInput> & { status?: PracticeSession["status"] },
  teamOptions: { id: string; name: string }[],
): PracticeSession {
  const idx = sessionsStore.findIndex((s) => s.id === id);
  if (idx < 0) throw new Error("Practice session not found");

  const prev = sessionsStore[idx];
  const activityId = patch.sportsActivityId ?? prev.sportsActivityId;
  const parent = resolveParentActivity(activityId);
  const teamId = patch.teamId ?? prev.teamId;

  const updated = clonePracticeSession({
    ...prev,
    ...patch,
    title: patch.title?.trim() ?? prev.title,
    sportsActivityId: activityId,
    sportsActivityTitle: parent.title,
    teamId,
    teamName: resolveTeamName(teamId, teamOptions),
    coach: patch.coach?.trim() ?? prev.coach,
    assistantCoach: patch.assistantCoach?.trim() || prev.assistantCoach,
    venue: patch.venue?.trim() ?? prev.venue,
    objectives: patch.objectives?.trim() ?? prev.objectives,
    equipmentRequired: patch.equipmentRequired?.trim() ?? prev.equipmentRequired,
    notes: patch.notes?.trim() ?? prev.notes,
    notifications: patch.notifications ?? prev.notifications,
    status: patch.status ?? prev.status,
    updatedAt: new Date().toISOString().slice(0, 10),
  });

  sessionsStore = sessionsStore.map((s) => (s.id === id ? updated : s));
  return clonePracticeSession(updated);
}

export function duplicatePracticeSessionInStore(
  id: string,
  teamOptions: { id: string; name: string }[],
): PracticeSession {
  const source = getPracticeSessionByIdFromStore(id);
  if (!source) throw new Error("Practice session not found");
  return createPracticeSessionInStore(
    {
      title: `${source.title} (Copy)`,
      sportsActivityId: source.sportsActivityId,
      teamId: source.teamId,
      coach: source.coach,
      assistantCoach: source.assistantCoach,
      venue: source.venue,
      date: source.date,
      startTime: source.startTime,
      endTime: source.endTime,
      objectives: source.objectives,
      equipmentRequired: source.equipmentRequired,
      notes: source.notes,
      notifications: { ...source.notifications, notifyAudience: false },
    },
    teamOptions,
  );
}

export function cancelPracticeSessionInStore(id: string): PracticeSession {
  const idx = sessionsStore.findIndex((s) => s.id === id);
  if (idx < 0) throw new Error("Practice session not found");
  const updated = clonePracticeSession({
    ...sessionsStore[idx],
    status: "cancelled",
    updatedAt: new Date().toISOString().slice(0, 10),
  });
  sessionsStore = sessionsStore.map((s) => (s.id === id ? updated : s));
  return clonePracticeSession(updated);
}

export function archivePracticeSessionInStore(id: string): PracticeSession {
  const idx = sessionsStore.findIndex((s) => s.id === id);
  if (idx < 0) throw new Error("Practice session not found");
  const archived = clonePracticeSession({
    ...sessionsStore[idx],
    status: "archived",
    archivedAt: new Date().toISOString().slice(0, 10),
    updatedAt: new Date().toISOString().slice(0, 10),
  });
  sessionsStore = sessionsStore.map((s) => (s.id === id ? archived : s));
  return clonePracticeSession(archived);
}

export function practiceSessionsToCalendarMarks(
  sessions: PracticeSession[],
): CalendarActivityMark[] {
  const counts = new Map<string, number>();
  for (const s of sessions) {
    if (s.status === "archived" || s.status === "cancelled") continue;
    counts.set(s.date, (counts.get(s.date) ?? 0) + 1);
  }
  const today = new Date().toISOString().slice(0, 10);
  return [...counts.entries()].map(([date, count]) => ({
    date,
    count,
    highlight: date === today,
  }));
}

export function listPracticeCoachOptions(): string[] {
  const names = new Set<string>();
  sessionsStore.forEach((s) => {
    names.add(s.coach);
    if (s.assistantCoach) names.add(s.assistantCoach);
  });
  return [...names].sort();
}
