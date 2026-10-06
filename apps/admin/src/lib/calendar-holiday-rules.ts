/** Admin checklist for recurring calendar holidays (Sundays, 2nd Saturdays, Good Friday, festivals). */

import { useSyncExternalStore } from "react";
import { createLocalStorageStore } from "@/lib/client-data-store";
import { ADMIN_TENANT_CHANGED_EVENT, readAdminDataScopeKey } from "@/lib/admin-tenant";
import {
  datesInRange,
  festivalHolidayLabel,
  isGoodFriday,
  isSecondSaturday,
  isSunday,
} from "@/lib/exam-calendar-utils";
import type { CalendarViewItem } from "@/components/calendar/calendar-view-helpers";

export type CalendarHolidayRuleId =
  | "sundays"
  | "secondSaturdays"
  | "goodFridays"
  | "festivals";

export type CalendarHolidayRules = Record<CalendarHolidayRuleId, boolean>;

export const DEFAULT_CALENDAR_HOLIDAY_RULES: CalendarHolidayRules = {
  sundays: true,
  secondSaturdays: true,
  goodFridays: true,
  festivals: true,
};

export const CALENDAR_HOLIDAY_RULE_OPTIONS: Array<{
  id: CalendarHolidayRuleId;
  label: string;
  hint: string;
}> = [
  { id: "sundays", label: "Sundays", hint: "Every Sunday is a holiday" },
  {
    id: "secondSaturdays",
    label: "Second Saturdays",
    hint: "The second Saturday of each month",
  },
  { id: "goodFridays", label: "Good Fridays", hint: "Good Friday each year" },
  {
    id: "festivals",
    label: "Festivals",
    hint: "Ugadi, Sankranti, Vinayaka Chaviti, Dasara, Diwali, plus national holidays",
  },
];

function storageKey(): string {
  return `lumenx.admin.calendarHolidayRules.v1.${readAdminDataScopeKey()}`;
}

function normalizeRules(value: CalendarHolidayRules): CalendarHolidayRules {
  return {
    sundays: value.sundays !== false,
    secondSaturdays: value.secondSaturdays !== false,
    goodFridays: value.goodFridays !== false,
    festivals: value.festivals !== false,
  };
}

const holidayRulesStore = createLocalStorageStore<CalendarHolidayRules>({
  storageKey,
  eventName: "lumenx-calendar-holiday-rules-changed",
  externalEvents: [ADMIN_TENANT_CHANGED_EVENT],
  seed: () => ({ ...DEFAULT_CALENDAR_HOLIDAY_RULES }),
  normalize: normalizeRules,
});

export function loadCalendarHolidayRules(): CalendarHolidayRules {
  return holidayRulesStore.load();
}

export function saveCalendarHolidayRules(next: CalendarHolidayRules): CalendarHolidayRules {
  return holidayRulesStore.set(normalizeRules(next));
}

export function useCalendarHolidayRules(): CalendarHolidayRules {
  return useSyncExternalStore(
    holidayRulesStore.subscribe,
    holidayRulesStore.load,
    () => DEFAULT_CALENDAR_HOLIDAY_RULES,
  );
}

export function ruleHolidayLabel(
  iso: string,
  rules: CalendarHolidayRules,
): string | null {
  if (rules.festivals) {
    const festival = festivalHolidayLabel(iso);
    if (festival) return festival;
  }
  if (rules.goodFridays && isGoodFriday(iso)) return "Good Friday";
  if (rules.secondSaturdays && isSecondSaturday(iso)) return "Second Saturday";
  if (rules.sundays && isSunday(iso)) return "Sunday";
  return null;
}

export function generateRuleHolidays(
  year: number,
  rules: CalendarHolidayRules,
  existing: CalendarViewItem[],
): CalendarViewItem[] {
  const existingDates = new Set(
    existing.filter((item) => item.kind === "holiday").map((item) => item.date),
  );
  const start = `${year}-01-01`;
  const end = `${year}-12-31`;
  const out: CalendarViewItem[] = [];
  for (const iso of datesInRange(start, end)) {
    if (existingDates.has(iso)) continue;
    const title = ruleHolidayLabel(iso, rules);
    if (!title) continue;
    out.push({
      id: `rule:${iso}:${title}`,
      title,
      date: iso,
      kind: "holiday",
      description: "Institute holiday from calendar rules",
      source: "rule",
    });
  }
  return out;
}
