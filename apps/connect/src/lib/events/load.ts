import { isApiAuthMode } from "@/auth/auth-mode";
import { ApiClientError } from "@/lib/api";
import { isInstituteUuid } from "@/lib/institute-id";
import { listCalendarEvents, listInstituteEvents } from "./api";
import { eventDtosToConnectItems, holidaysFromEventDtos } from "./map";
import type { ConnectEventItem, InstituteHolidayItem } from "./types";

export type EventsLoadStatus =
  | "idle"
  | "loading"
  | "ready"
  | "empty"
  | "error"
  | "unavailable"
  | "needs_institute"
  | "forbidden";

export async function loadConnectEvents(input: {
  instituteId: string | null;
}): Promise<
  | { status: "unavailable" | "needs_institute" }
  | { status: "loading" }
  | { status: "ready"; items: ConnectEventItem[] }
  | { status: "empty"; items: ConnectEventItem[] }
  | { status: "forbidden"; message: string }
  | { status: "error"; message: string }
> {
  if (!isApiAuthMode()) return { status: "unavailable" };
  if (!input.instituteId || !isInstituteUuid(input.instituteId)) {
    return { status: "needs_institute" };
  }

  try {
    const [calendar, events] = await Promise.all([
      listCalendarEvents({ instituteId: input.instituteId }),
      listInstituteEvents({ instituteId: input.instituteId, source: "events" }),
    ]);
    const items = eventDtosToConnectItems([...calendar, ...events]).filter(
      (item) => !item.cancelled,
    );
    return items.length === 0
      ? { status: "empty", items: [] }
      : { status: "ready", items };
  } catch (err) {
    const status =
      err instanceof ApiClientError
        ? err.status
        : err &&
            typeof err === "object" &&
            "status" in err &&
            typeof (err as { status: unknown }).status === "number"
          ? (err as { status: number }).status
          : null;
    const message = err instanceof Error ? err.message : "Failed to load events";
    if (status === 403) return { status: "forbidden", message };
    return { status: "error", message };
  }
}

export async function loadInstituteHolidays(input: {
  instituteId: string | null;
}): Promise<InstituteHolidayItem[]> {
  if (!isApiAuthMode() || !input.instituteId || !isInstituteUuid(input.instituteId)) {
    return [];
  }
  try {
    const calendar = await listCalendarEvents({ instituteId: input.instituteId });
    return holidaysFromEventDtos(calendar);
  } catch {
    return [];
  }
}

export function pickUpcomingEvents(
  items: ConnectEventItem[],
  limit = 3,
): ConnectEventItem[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return items
    .filter((item) => item.kind !== "holiday" && new Date(item.date) >= today)
    .slice(0, limit);
}
