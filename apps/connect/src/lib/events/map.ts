import type { EventDto, ConnectEventItem, InstituteHolidayItem } from "./types";

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

export function mapBackendKindToConnectKind(
  dto: Pick<EventDto, "kind" | "customKindLabel">,
): ConnectEventItem["kind"] {
  if (dto.kind === "holiday") return "holiday";
  if (dto.kind === "exam") return "exam-holiday";
  if (dto.kind === "meeting") return "announcement";
  if (dto.kind === "function") return "event";
  const label = (dto.customKindLabel ?? "").toLowerCase();
  if (label.includes("sport")) return "sports";
  if (label.includes("workshop")) return "workshop";
  if (label.includes("seminar")) return "seminar";
  if (label.includes("celebration") || label.includes("fest")) return "celebration";
  return "event";
}

export function eventDtoToConnectItem(dto: EventDto): ConnectEventItem {
  const endDate =
    dto.endsOn && dto.endsOn !== dto.startsOn ? dto.endsOn : undefined;
  return {
    id: dto.id,
    title: dto.title,
    kind: mapBackendKindToConnectKind(dto),
    backendKind: dto.kind,
    date: dto.startsOn,
    endDate,
    time: normalizeTime(dto.startTime),
    venue: dto.location?.trim() || undefined,
    description: dto.description?.trim() || undefined,
    registrationRequired: dto.registrationRequired,
    rsvpCount: dto.rsvpCount,
    cancelled: dto.cancelled,
    source: dto.source,
  };
}

export function eventDtosToConnectItems(dtos: EventDto[]): ConnectEventItem[] {
  const byId = new Map<string, EventDto>();
  for (const dto of dtos) {
    byId.set(dto.id, dto);
  }
  return [...byId.values()]
    .map(eventDtoToConnectItem)
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function holidayDtoToInstituteHoliday(dto: EventDto): InstituteHolidayItem {
  return {
    id: dto.id,
    date: dto.startsOn,
    title: dto.title,
    purpose: dto.description?.trim() || "Institute holiday",
  };
}

export function expandHolidayRange(dto: EventDto): InstituteHolidayItem[] {
  if (!dto.endsOn || dto.endsOn === dto.startsOn) {
    return [holidayDtoToInstituteHoliday(dto)];
  }
  const items: InstituteHolidayItem[] = [];
  const start = new Date(`${dto.startsOn}T12:00:00`);
  const end = new Date(`${dto.endsOn}T12:00:00`);
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    items.push({
      id: `${dto.id}:${iso}`,
      date: iso,
      title: dto.title,
      purpose: dto.description?.trim() || "Institute holiday",
    });
  }
  return items;
}

export function holidaysFromEventDtos(dtos: EventDto[]): InstituteHolidayItem[] {
  const holidays = dtos.filter((d) => d.kind === "holiday" && !d.cancelled);
  return holidays.flatMap(expandHolidayRange).sort((a, b) => a.date.localeCompare(b.date));
}

export function portalTimetableToWeeklySchedule(input: {
  periods: Array<{
    dayLabel: string;
    time: string;
    subject: string;
    teacher: string;
  }>;
  weekdays: string[];
}): Record<string, Array<{ time: string; subject: string; teacher: string }>> {
  const schedule: Record<string, Array<{ time: string; subject: string; teacher: string }>> = {};
  for (const day of input.weekdays) {
    schedule[day] = [];
  }
  for (const period of input.periods) {
    if (!schedule[period.dayLabel]) schedule[period.dayLabel] = [];
    schedule[period.dayLabel]!.push({
      time: period.time,
      subject: period.subject,
      teacher: period.teacher,
    });
  }
  return schedule;
}
