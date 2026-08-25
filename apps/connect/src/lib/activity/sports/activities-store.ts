import type { CalendarActivityMark } from "@/activity-workspace/hub/calendar";
import {
  cloneSportsActivity,
  createActivityFromInput,
  sportsActivitiesSeed,
} from "./activities-mock";
import type {
  SportsActivity,
  SportsActivityInput,
  SportsActivityListFilters,
} from "./activities-types";
import { SPORTS_ACTIVITY_STATUS_LABELS } from "./activities-types";
import { SPORT_TYPE_LABELS } from "./types";

let activitiesStore: SportsActivity[] = sportsActivitiesSeed.map(cloneSportsActivity);

function applyActivityFilters(
  items: SportsActivity[],
  filters?: SportsActivityListFilters,
): SportsActivity[] {
  let result = [...items];
  const f = filters ?? {};

  if (f.status && f.status !== "all") {
    result = result.filter((a) => a.status === f.status);
  }
  if (f.sportType && f.sportType !== "all") {
    result = result.filter((a) => a.sportType === f.sportType);
  }
  if (f.teamId && f.teamId !== "all") {
    result = result.filter((a) => a.linkedTeamIds.includes(f.teamId as string));
  }
  if (f.date && f.date !== "all") {
    result = result.filter((a) => a.date === f.date);
  }
  if (f.coordinator && f.coordinator !== "all") {
    result = result.filter(
      (a) =>
        a.coordinators.sportsCoordinator === f.coordinator ||
        a.coordinators.coach === f.coordinator,
    );
  }

  const q = f.query?.trim().toLowerCase();
  if (q) {
    result = result.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        a.venue.toLowerCase().includes(q) ||
        SPORT_TYPE_LABELS[a.sportType].toLowerCase().includes(q) ||
        a.coordinators.coach.toLowerCase().includes(q) ||
        a.coordinators.sportsCoordinator.toLowerCase().includes(q),
    );
  }

  const sortBy = f.sortBy ?? "date";
  const sortDir = f.sortDir ?? "desc";
  const dir = sortDir === "asc" ? 1 : -1;

  result.sort((a, b) => {
    switch (sortBy) {
      case "sport":
        return dir * SPORT_TYPE_LABELS[a.sportType].localeCompare(SPORT_TYPE_LABELS[b.sportType]);
      case "updatedAt":
        return dir * a.updatedAt.localeCompare(b.updatedAt);
      default:
        return dir * `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`);
    }
  });

  return result;
}

export function getActivitiesStoreSnapshot(): SportsActivity[] {
  return activitiesStore.map(cloneSportsActivity);
}

export function resetActivitiesStore() {
  activitiesStore = sportsActivitiesSeed.map(cloneSportsActivity);
}

export function listActivitiesFromStore(filters?: SportsActivityListFilters): SportsActivity[] {
  return applyActivityFilters(activitiesStore, filters);
}

export function getActivityByIdFromStore(id: string): SportsActivity | null {
  const found = activitiesStore.find((a) => a.id === id);
  return found ? cloneSportsActivity(found) : null;
}

export function createActivityInStore(input: SportsActivityInput): SportsActivity {
  const activity = createActivityFromInput(input);
  activitiesStore = [activity, ...activitiesStore];
  return cloneSportsActivity(activity);
}

export function updateActivityInStore(
  id: string,
  patch: Partial<SportsActivityInput> & { status?: SportsActivity["status"] },
): SportsActivity {
  const idx = activitiesStore.findIndex((a) => a.id === id);
  if (idx < 0) throw new Error("Sports activity not found");
  const prev = activitiesStore[idx];
  const updated = cloneSportsActivity({
    ...prev,
    ...patch,
    title: patch.title?.trim() ?? prev.title,
    description: patch.description?.trim() ?? prev.description,
    venue: patch.venue?.trim() ?? prev.venue,
    coordinators: patch.coordinators ? { ...patch.coordinators } : prev.coordinators,
    audience: patch.audience ?? prev.audience,
    attachments: patch.attachments ?? prev.attachments,
    linkedTeamIds: patch.linkedTeamIds ?? prev.linkedTeamIds,
    notifications: patch.notifications ?? prev.notifications,
    status: patch.status ?? prev.status,
    updatedAt: new Date().toISOString().slice(0, 10),
  });
  activitiesStore = activitiesStore.map((a) => (a.id === id ? updated : a));
  return cloneSportsActivity(updated);
}

export function duplicateActivityInStore(id: string): SportsActivity {
  const source = getActivityByIdFromStore(id);
  if (!source) throw new Error("Sports activity not found");
  const copy = createActivityFromInput(
    {
      title: `${source.title} (Copy)`,
      activityType: source.activityType,
      sportType: source.sportType,
      description: source.description,
      venue: source.venue,
      date: source.date,
      startTime: source.startTime,
      endTime: source.endTime,
      audience: source.audience,
      attachments: source.attachments,
      coordinators: source.coordinators,
      linkedTeamIds: source.linkedTeamIds,
      notifications: { ...source.notifications, notifyAudience: false },
    },
    `sact-${Date.now()}`,
  );
  activitiesStore = [copy, ...activitiesStore];
  return cloneSportsActivity(copy);
}

export function publishActivityInStore(id: string): SportsActivity {
  const idx = activitiesStore.findIndex((a) => a.id === id);
  if (idx < 0) throw new Error("Sports activity not found");
  const published = cloneSportsActivity({
    ...activitiesStore[idx],
    status: "scheduled",
    publishedAt: new Date().toISOString().slice(0, 10),
    updatedAt: new Date().toISOString().slice(0, 10),
  });
  activitiesStore = activitiesStore.map((a) => (a.id === id ? published : a));
  return cloneSportsActivity(published);
}

export function cancelActivityInStore(id: string): SportsActivity {
  return updateActivityInStore(id, { status: "cancelled" });
}

export function archiveActivityInStore(id: string): SportsActivity {
  const idx = activitiesStore.findIndex((a) => a.id === id);
  if (idx < 0) throw new Error("Sports activity not found");
  const archived = cloneSportsActivity({
    ...activitiesStore[idx],
    status: "archived",
    archivedAt: new Date().toISOString().slice(0, 10),
    updatedAt: new Date().toISOString().slice(0, 10),
  });
  activitiesStore = activitiesStore.map((a) => (a.id === id ? archived : a));
  return cloneSportsActivity(archived);
}

export function activitiesToCalendarMarks(activities: SportsActivity[]): CalendarActivityMark[] {
  const counts = new Map<string, number>();
  for (const a of activities) {
    if (a.status === "archived" || a.status === "cancelled") continue;
    counts.set(a.date, (counts.get(a.date) ?? 0) + 1);
  }
  const today = new Date().toISOString().slice(0, 10);
  return [...counts.entries()].map(([date, count]) => ({
    date,
    count,
    highlight: date === today,
  }));
}

export function listCoordinatorOptions(): string[] {
  const names = new Set<string>();
  activitiesStore.forEach((a) => {
    names.add(a.coordinators.sportsCoordinator);
    names.add(a.coordinators.coach);
  });
  return [...names].sort();
}

export { SPORTS_ACTIVITY_STATUS_LABELS };
