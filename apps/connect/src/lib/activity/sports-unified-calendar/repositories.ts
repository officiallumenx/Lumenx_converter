import type { CalendarActivityMark } from "@/activity-workspace/hub/calendar";
import { isoDate } from "@/activity-workspace/hub/calendar";
import {
  aggregateSportsCalendarEvents,
  applyCalendarFilters,
  buildCalendarFilterOptions,
  eventsToCalendarMarks,
} from "./aggregate";
import type {
  SportsCalendarEvent,
  SportsCalendarFilterOptions,
  SportsCalendarFilters,
} from "./types";

const delay = (ms = 180) => new Promise((r) => setTimeout(r, ms));

export const sportsUnifiedCalendarRepository = {
  async listEvents(filters?: SportsCalendarFilters): Promise<SportsCalendarEvent[]> {
    await delay();
    return applyCalendarFilters(aggregateSportsCalendarEvents(), filters);
  },
  getEventsSnapshot(filters?: SportsCalendarFilters): SportsCalendarEvent[] {
    return applyCalendarFilters(aggregateSportsCalendarEvents(), filters);
  },
  async getFilterOptions(): Promise<SportsCalendarFilterOptions> {
    await delay(80);
    return buildCalendarFilterOptions(aggregateSportsCalendarEvents());
  },
  async getCalendarMarks(filters?: SportsCalendarFilters): Promise<CalendarActivityMark[]> {
    await delay(60);
    const events = applyCalendarFilters(aggregateSportsCalendarEvents(), filters);
    return eventsToCalendarMarks(events, isoDate(new Date()));
  },
  reset() {
    /* Read-only aggregate — no mutable store. */
  },
};
