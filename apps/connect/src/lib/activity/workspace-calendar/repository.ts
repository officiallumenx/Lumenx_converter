import { sportsUnifiedCalendarRepository } from "@/lib/activity/sports-unified-calendar/repositories";
import type {
  WorkspaceCalendarEntry,
  WorkspaceCalendarFilters,
} from "./types";
import { WORKSPACE_CALENDAR_CATEGORY_COLORS } from "./types";

const MANUAL_REMINDERS: WorkspaceCalendarEntry[] = [
  {
    id: "rem-1",
    title: "Arrange medals & trophies",
    date: "2026-07-10",
    kind: "reminder",
    category: "reminder",
    description: "Collect from store room before sports day.",
    colorClass: WORKSPACE_CALENDAR_CATEGORY_COLORS.reminder,
  },
  {
    id: "rem-2",
    title: "Book buses for dance team",
    date: "2026-07-12",
    startTime: "10:00",
    kind: "reminder",
    category: "reminder",
    description: "Confirm vendor and share route with parents.",
    colorClass: WORKSPACE_CALENDAR_CATEGORY_COLORS.reminder,
  },
  {
    id: "rem-3",
    title: "Meet judges — skit round",
    date: "2026-07-15",
    startTime: "14:00",
    kind: "reminder",
    category: "meeting",
    description: "Block B conference room.",
    colorClass: WORKSPACE_CALENDAR_CATEGORY_COLORS.meeting,
  },
];

function mapSportsToWorkspace(
  events: Awaited<ReturnType<typeof sportsUnifiedCalendarRepository.listEvents>>,
): WorkspaceCalendarEntry[] {
  return events.map((e) => ({
    id: `linked-${e.id}`,
    title: e.title,
    date: e.date,
    startTime: e.startTime,
    endTime: e.endTime,
    kind: "linked" as const,
    category:
      e.category === "holiday"
        ? "holiday"
        : e.category === "tournament" || e.category === "match"
          ? "competition"
          : e.category === "practice"
            ? "practice"
            : "sports",
    description: e.description,
    venue: e.venue,
    sourceModule: e.sourceModule,
    sourceId: e.sourceId,
    colorClass:
      e.category === "holiday"
        ? WORKSPACE_CALENDAR_CATEGORY_COLORS.holiday
        : WORKSPACE_CALENDAR_CATEGORY_COLORS.sports,
  }));
}

function delay(ms = 100) {
  return new Promise((r) => setTimeout(r, ms));
}

export const workspaceCalendarRepository = {
  async listEntries(filters?: WorkspaceCalendarFilters): Promise<WorkspaceCalendarEntry[]> {
    await delay();
    const sports = await sportsUnifiedCalendarRepository.listEvents({});
    let entries: WorkspaceCalendarEntry[] = [
      ...mapSportsToWorkspace(sports),
      ...MANUAL_REMINDERS.map((e) => ({ ...e })),
    ];
    if (filters?.category && filters.category !== "all") {
      entries = entries.filter((e) => e.category === filters.category);
    }
    if (filters?.query?.trim()) {
      const q = filters.query.trim().toLowerCase();
      entries = entries.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          (e.description?.toLowerCase().includes(q) ?? false),
      );
    }
    return entries.sort((a, b) => a.date.localeCompare(b.date));
  },
};
