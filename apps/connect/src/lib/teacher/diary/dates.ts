/** Local calendar YYYY-MM-DD (not UTC). */
import { addLocalDays, todayLocalIso, toLocalIsoDate } from "@lumenx/utils";

export { addLocalDays, toLocalIsoDate };

export function todayIso(): string {
  return todayLocalIso();
}

export function yesterdayIso(): string {
  return addLocalDays(todayIso(), -1);
}

/** Editable window: today and yesterday only. */
export function isEditableDiaryDate(iso: string): boolean {
  return iso === todayIso() || iso === yesterdayIso();
}

export function formatDiaryDayLabel(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y!, m! - 1, d!);
  return dt.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}
