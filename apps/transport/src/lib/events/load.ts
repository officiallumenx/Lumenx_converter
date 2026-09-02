import { isApiAuthMode } from "@/lib/auth/auth-mode";
import { listCalendarEvents, listInstituteEvents } from "./api";
import { eventDtosToCalendarItems } from "./map";
import type { SchoolCalendarItem } from "./types";

export async function loadDriverSchoolCalendar(input: {
  instituteId: string | null | undefined;
}): Promise<{
  status: "unavailable" | "needs_institute" | "ready" | "empty" | "error";
  items: SchoolCalendarItem[];
  message?: string;
}> {
  if (!isApiAuthMode()) return { status: "unavailable", items: [] };
  if (!input.instituteId?.trim()) return { status: "needs_institute", items: [] };

  try {
    const instituteId = input.instituteId.trim();
    const [calendar, events] = await Promise.all([
      listCalendarEvents({ instituteId }),
      listInstituteEvents({ instituteId, source: "events" }),
    ]);
    const items = eventDtosToCalendarItems([...calendar, ...events])
      .filter((item) => !item.cancelled)
      .map(({ cancelled: _cancelled, ...item }) => item);
    return items.length === 0
      ? { status: "empty", items: [] }
      : { status: "ready", items };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load school calendar";
    return { status: "error", items: [], message };
  }
}

export function pickUpcomingCalendarItems(items: SchoolCalendarItem[], limit = 5) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return items
    .filter((item) => new Date(item.date) >= today)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, limit);
}

export type { SchoolCalendarItem } from "./types";
