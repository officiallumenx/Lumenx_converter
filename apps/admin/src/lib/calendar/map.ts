import type { EventDto } from "./types";
import type { CalendarListItem } from "./types";

function normalizeTime(time: string | null): string | undefined {
  if (!time) return undefined;
  const trimmed = time.trim();
  if (!trimmed) return undefined;
  return trimmed.length >= 5 ? trimmed.slice(0, 5) : trimmed;
}

function kindDisplay(dto: EventDto): string {
  if (dto.kind === "custom") {
    return dto.customKindLabel?.trim() || "custom";
  }
  return dto.kind;
}

/**
 * Presentation-only mapping. DTO identity fields are never used as authority.
 */
export function eventDtoToCalendarListItem(dto: EventDto): CalendarListItem {
  const endDate =
    dto.endsOn && dto.endsOn !== dto.startsOn ? dto.endsOn : undefined;
  const time = normalizeTime(dto.startTime);

  return {
    id: dto.id,
    title: dto.title?.trim() || "Untitled",
    date: dto.startsOn,
    endDate,
    time,
    kind: kindDisplay(dto),
  };
}

export function eventDtosToCalendarListItems(
  dtos: EventDto[],
): CalendarListItem[] {
  if (!Array.isArray(dtos)) {
    throw new TypeError("Calendar API response must be an array");
  }
  return dtos.map(eventDtoToCalendarListItem);
}
