import { addDays, isoDate } from "@/activity-workspace/hub/calendar";
import type { CalendarActivityMark } from "@/activity-workspace/hub/calendar";

export function startOfWeek(reference: Date): Date {
  const d = new Date(reference);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

export function buildWeekDays(reference: Date): { iso: string; label: string; dayNum: number }[] {
  const start = startOfWeek(reference);
  return Array.from({ length: 7 }, (_, i) => {
    const d = addDays(start, i);
    return {
      iso: isoDate(d),
      label: d.toLocaleDateString("en-IN", { weekday: "short" }),
      dayNum: d.getDate(),
    };
  });
}

export function shiftReferenceDate(reference: Date, view: "day" | "week" | "month" | "agenda", dir: -1 | 1): Date {
  if (view === "day") return addDays(reference, dir);
  if (view === "week") return addDays(reference, dir * 7);
  if (view === "month" || view === "agenda") {
    const d = new Date(reference);
    d.setMonth(d.getMonth() + dir);
    return d;
  }
  return reference;
}

export function formatPeriodLabel(reference: Date, view: "day" | "week" | "month" | "agenda"): string {
  if (view === "day") {
    return reference.toLocaleDateString("en-IN", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }
  if (view === "week") {
    const days = buildWeekDays(reference);
    const start = new Date(days[0].iso);
    const end = new Date(days[6].iso);
    return `${start.toLocaleDateString("en-IN", { day: "numeric", month: "short" })} – ${end.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`;
  }
  return reference.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

export function marksForMonth(
  marks: CalendarActivityMark[],
  reference: Date,
): CalendarActivityMark[] {
  const year = reference.getFullYear();
  const month = reference.getMonth();
  return marks.filter((m) => {
    const d = new Date(m.date);
    return d.getFullYear() === year && d.getMonth() === month;
  });
}

export function formatEventTime(event: { startTime?: string; endTime?: string; allDay?: boolean }): string {
  if (event.allDay) return "All day";
  if (event.startTime && event.endTime) return `${event.startTime} – ${event.endTime}`;
  if (event.startTime) return event.startTime;
  return "—";
}
