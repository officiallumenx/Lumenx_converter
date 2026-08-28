import type { EventDto, EventAudienceScope, EventReminder, EventsListItem } from "./types";

function normalizeTime(time: string | null): string | undefined {
  if (!time) return undefined;
  const trimmed = time.trim();
  if (!trimmed) return undefined;
  return trimmed.length >= 5 ? trimmed.slice(0, 5) : trimmed;
}

/**
 * Presentation-only "when" string aligned with calendar-events-store formatEventWhen.
 */
export function formatEventWhenFromDto(
  dto: Pick<EventDto, "startsOn" | "endsOn" | "startTime" | "endTime">,
): string {
  const date = dto.startsOn;
  const time = normalizeTime(dto.startTime);
  const endDate =
    dto.endsOn && dto.endsOn !== dto.startsOn ? dto.endsOn : undefined;

  const start = new Date(`${date}T${time || "00:00"}`);
  if (Number.isNaN(start.getTime())) return date;
  const datePart = start.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
  });
  const endPart =
    endDate && endDate !== date
      ? ` – ${new Date(`${endDate}T00:00`).toLocaleString(undefined, { month: "short", day: "numeric" })}`
      : "";
  if (!time) return `${datePart}${endPart} · All day`;
  const timePart = start.toLocaleString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${datePart}${endPart} · ${timePart}`;
}

const AUDIENCE_SCOPE_LABELS: Record<EventAudienceScope, string> = {
  all: "All",
  students: "Students",
  parents: "Parents",
  teachers: "Teachers",
  classes: "Classes",
};

function audienceDisplay(dto: EventDto): string {
  const label = dto.audienceLabel?.trim();
  if (label) return label;
  return AUDIENCE_SCOPE_LABELS[dto.audienceScope] ?? "All";
}

const REMINDER_LABELS: Record<EventReminder, string> = {
  none: "No reminder",
  one_day: "1 day before",
  one_hour: "1 hour before",
  one_week_one_day: "1 week + 1 day",
};

function reminderDisplay(reminder: EventReminder): string {
  return REMINDER_LABELS[reminder] ?? reminder;
}

function typeDisplay(dto: EventDto): string {
  if (dto.kind === "custom") {
    return dto.customKindLabel?.trim() || "custom";
  }
  return dto.kind;
}

/**
 * Presentation-only mapping. DTO identity fields are never used as authority.
 */
export function eventDtoToListItem(dto: EventDto): EventsListItem {
  const location = dto.location?.trim();
  return {
    id: dto.id,
    title: dto.title?.trim() || "Untitled event",
    date: formatEventWhenFromDto(dto),
    type: typeDisplay(dto),
    audience: audienceDisplay(dto),
    location: location || "TBD",
    description: dto.description?.trim() || undefined,
    reminder: reminderDisplay(dto.reminder),
    rsvp: typeof dto.rsvpCount === "number" ? dto.rsvpCount : undefined,
    published: Boolean(dto.published),
  };
}

export function eventDtosToListItems(dtos: EventDto[]): EventsListItem[] {
  if (!Array.isArray(dtos)) {
    throw new TypeError("Events API response must be an array");
  }
  return dtos.map(eventDtoToListItem);
}
