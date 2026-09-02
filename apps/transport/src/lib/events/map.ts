import type { EventDto, SchoolCalendarItem } from "./types";

const KIND_LABEL: Record<EventDto["kind"], string> = {
  holiday: "Holiday",
  exam: "Exam",
  meeting: "Meeting",
  function: "Event",
  custom: "Event",
};

function normalizeTime(time: string | null): string | undefined {
  if (!time?.trim()) return undefined;
  const trimmed = time.trim();
  if (trimmed.length >= 5) {
    const [hourStr, minuteStr] = trimmed.slice(0, 5).split(":");
    const hour = Number.parseInt(hourStr ?? "0", 10);
    const minute = minuteStr ?? "00";
    const suffix = hour >= 12 ? "PM" : "AM";
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minute} ${suffix}`;
  }
  return trimmed;
}

export function eventDtoToCalendarItem(dto: EventDto): SchoolCalendarItem & { cancelled: boolean } {
  const endDate = dto.endsOn && dto.endsOn !== dto.startsOn ? dto.endsOn : undefined;
  const kindLabel =
    dto.kind === "custom" && dto.customKindLabel?.trim()
      ? dto.customKindLabel.trim()
      : KIND_LABEL[dto.kind];
  return {
    id: dto.id,
    title: dto.title,
    kind: dto.kind,
    kindLabel,
    date: dto.startsOn,
    endDate,
    time: normalizeTime(dto.startTime),
    venue: dto.location?.trim() || undefined,
    description: dto.description?.trim() || undefined,
    registrationRequired: dto.registrationRequired,
    rsvpCount: dto.rsvpCount,
    cancelled: dto.cancelled,
  };
}

export function eventDtosToCalendarItems(dtos: EventDto[]): Array<SchoolCalendarItem & { cancelled: boolean }> {
  const byId = new Map<string, EventDto>();
  for (const dto of dtos) byId.set(dto.id, dto);
  return [...byId.values()]
    .map(eventDtoToCalendarItem)
    .sort((a, b) => a.date.localeCompare(b.date));
}
