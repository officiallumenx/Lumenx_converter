import type { CalendarActivityMark } from "@/activity-workspace/hub/calendar";
import { sportsCommunicationRepository } from "@/lib/activity/sports-communication/repositories";
import { sportsRepository } from "@/lib/activity/sports/repositories";
import { SPORTS_ACTIVITY_TYPE_LABELS } from "@/lib/activity/sports/activities-types";
import type { SportType } from "@/lib/activity/sports/types";
import { supplementalCalendarEvents } from "./mock-supplements";
import type {
  SportsCalendarEvent,
  SportsCalendarEventCategory,
  SportsCalendarFilterOptions,
  SportsCalendarFilters,
} from "./types";

function skipArchivedStatus(status: string): boolean {
  return status === "archived";
}

export function aggregateSportsCalendarEvents(): SportsCalendarEvent[] {
  const events: SportsCalendarEvent[] = [];

  for (const a of sportsRepository.getActivitiesSnapshot()) {
    if (skipArchivedStatus(a.status)) continue;
    events.push({
      id: `cal-act-${a.id}`,
      title: a.title,
      date: a.date,
      startTime: a.startTime,
      endTime: a.endTime,
      category: "activity",
      sportType: a.sportType,
      teamId: a.linkedTeamIds[0],
      teamName: sportsRepository
        .listActiveTeamOptions()
        .find((t) => t.id === a.linkedTeamIds[0])?.name,
      coach: a.coordinators.coach,
      activityType: a.activityType,
      venue: a.venue,
      description: a.description,
      sourceModule: "activities",
      sourceId: a.id,
    });
  }

  for (const s of sportsRepository.getPracticeSessionsSnapshot()) {
    if (skipArchivedStatus(s.status)) continue;
    events.push({
      id: `cal-prac-${s.id}`,
      title: s.title,
      date: s.date,
      startTime: s.startTime,
      endTime: s.endTime,
      category: "practice",
      teamId: s.teamId,
      teamName: s.teamName,
      coach: s.coach,
      venue: s.venue,
      description: s.objectives,
      sourceModule: "practice",
      sourceId: s.id,
    });
  }

  for (const t of sportsRepository.getTournamentsSnapshot()) {
    if (skipArchivedStatus(t.status)) continue;
    events.push({
      id: `cal-tourn-${t.id}`,
      title: t.name,
      date: t.startDate,
      endTime: undefined,
      category: "tournament",
      sportType: t.sportType,
      tournamentId: t.id,
      tournamentName: t.name,
      venue: t.venue,
      description: t.description,
      sourceModule: "tournaments",
      sourceId: t.id,
      allDay: true,
    });

    for (const m of t.matches) {
      if (m.status === "cancelled") continue;
      events.push({
        id: `cal-match-${m.id}`,
        title: m.name,
        date: m.date,
        startTime: m.time,
        category: "match",
        sportType: t.sportType,
        teamId: m.teamIds[0],
        teamName: m.teamNames.join(" vs "),
        tournamentId: t.id,
        tournamentName: t.name,
        venue: m.venue,
        description: `${m.stage.replace("_", " ")} — ${t.name}`,
        sourceModule: "tournaments",
        sourceId: m.id,
      });
    }
  }

  for (const r of sportsRepository.getMatchResultsSnapshot()) {
    if (r.matchStatus === "cancelled") continue;
    const exists = events.some((e) => e.sourceId === r.tournamentMatchId && e.category === "match");
    if (exists) continue;
    events.push({
      id: `cal-result-${r.id}`,
      title: r.matchName,
      date: r.matchDate,
      category: "match",
      sportType: r.sportType,
      tournamentId: r.tournamentId,
      tournamentName: r.tournamentName,
      venue: r.venue,
      description: r.summary,
      sourceModule: "results",
      sourceId: r.id,
    });
  }

  for (const c of sportsCommunicationRepository.getAnnouncementsSnapshot()) {
    if (c.status === "archived" || c.status === "cancelled" || c.status === "draft") continue;
    const date = c.sentAt?.slice(0, 10) ?? c.scheduledDate;
    if (!date) continue;
    events.push({
      id: `cal-comm-${c.id}`,
      title: c.title,
      date,
      startTime: c.scheduledTime,
      category: "communication",
      description: c.body,
      sourceModule: "communication",
      sourceId: c.id,
      allDay: !c.scheduledTime,
    });
  }

  events.push(...supplementalCalendarEvents);

  return events.sort((a, b) => {
    const d = a.date.localeCompare(b.date);
    if (d !== 0) return d;
    return (a.startTime ?? "").localeCompare(b.startTime ?? "");
  });
}

export function applyCalendarFilters(
  events: SportsCalendarEvent[],
  filters?: SportsCalendarFilters,
): SportsCalendarEvent[] {
  let result = [...events];
  const f = filters ?? {};

  if (f.category && f.category !== "all") {
    result = result.filter((e) => e.category === f.category);
  }
  if (f.teamId && f.teamId !== "all") {
    result = result.filter((e) => e.teamId === f.teamId);
  }
  if (f.sportType && f.sportType !== "all") {
    result = result.filter((e) => e.sportType === f.sportType);
  }
  if (f.coach && f.coach !== "all") {
    result = result.filter((e) => e.coach === f.coach);
  }
  if (f.tournamentId && f.tournamentId !== "all") {
    result = result.filter((e) => e.tournamentId === f.tournamentId);
  }
  if (f.activityType && f.activityType !== "all") {
    result = result.filter((e) => e.activityType === f.activityType);
  }
  if (f.venue && f.venue !== "all") {
    result = result.filter((e) => e.venue === f.venue);
  }

  const q = f.query?.trim().toLowerCase();
  if (q) {
    result = result.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        (e.description?.toLowerCase().includes(q) ?? false) ||
        (e.teamName?.toLowerCase().includes(q) ?? false) ||
        (e.venue?.toLowerCase().includes(q) ?? false),
    );
  }

  return result;
}

export function buildCalendarFilterOptions(events: SportsCalendarEvent[]): SportsCalendarFilterOptions {
  const sports = new Set<SportType>();
  const coaches = new Set<string>();
  const tournaments = new Map<string, string>();
  const activityTypes = new Set<string>();
  const venues = new Set<string>();

  for (const e of events) {
    if (e.sportType) sports.add(e.sportType);
    if (e.coach) coaches.add(e.coach);
    if (e.tournamentId && e.tournamentName) tournaments.set(e.tournamentId, e.tournamentName);
    if (e.activityType) activityTypes.add(e.activityType);
    if (e.venue) venues.add(e.venue);
  }

  return {
    teams: sportsRepository.listActiveTeamOptions(),
    sports: [...sports].sort(),
    coaches: [...coaches].sort(),
    tournaments: [...tournaments.entries()].map(([id, name]) => ({ id, name })),
    activityTypes: [...activityTypes].sort(),
    venues: [...venues].sort(),
  };
}

export function eventsToCalendarMarks(
  events: SportsCalendarEvent[],
  todayIso: string,
): CalendarActivityMark[] {
  const counts = new Map<string, number>();
  for (const e of events) {
    counts.set(e.date, (counts.get(e.date) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({
      date,
      count,
      highlight: date === todayIso,
    }));
}

export function eventsForDate(events: SportsCalendarEvent[], iso: string): SportsCalendarEvent[] {
  return events.filter((e) => e.date === iso);
}

export function eventsInRange(
  events: SportsCalendarEvent[],
  startIso: string,
  endIso: string,
): SportsCalendarEvent[] {
  return events.filter((e) => e.date >= startIso && e.date <= endIso);
}

export function activityTypeLabel(type: string): string {
  return SPORTS_ACTIVITY_TYPE_LABELS[type as keyof typeof SPORTS_ACTIVITY_TYPE_LABELS] ?? type;
}

export function countByCategory(
  events: SportsCalendarEvent[],
): Record<SportsCalendarEventCategory, number> {
  const counts = {
    activity: 0,
    practice: 0,
    tournament: 0,
    match: 0,
    training_plan: 0,
    communication: 0,
    holiday: 0,
  } satisfies Record<SportsCalendarEventCategory, number>;
  for (const e of events) counts[e.category] += 1;
  return counts;
}
