/** Configurable school day / period timings for timetables. */

export const ALL_WEEKDAY_NAMES = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

export type TimetablePeriodDef = {
  id: string;
  label: string;
  start: string;
  end: string;
  isBreak: boolean;
};

export type DayScheduleEntry = {
  name: string;
  active: boolean;
  /** Teaching periods on this day (supports half-days). */
  periods: number;
};

export type LunchBreakConfig = {
  enabled: boolean;
  afterPeriod: number;
  durationMins: number;
};

export type TimetableScheduleConfig = {
  startTime: string;
  periodDurationMins: number;
  lunchBreak: LunchBreakConfig;
  days: DayScheduleEntry[];
  periodRows: TimetablePeriodDef[];
};

/** Form-friendly input before period rows are computed. */
export type ScheduleInput = {
  startTime: string;
  periodDurationMins: number;
  defaultPeriodsPerDay: number;
  lunchEnabled: boolean;
  lunchAfterPeriod: number;
  lunchDurationMins: number;
  days: DayScheduleEntry[];
};

export function defaultScheduleInput(): ScheduleInput {
  return {
    startTime: "08:00",
    periodDurationMins: 60,
    defaultPeriodsPerDay: 7,
    lunchEnabled: true,
    lunchAfterPeriod: 4,
    lunchDurationMins: 45,
    days: ALL_WEEKDAY_NAMES.slice(0, 6).map((name) => ({
      name,
      active: true,
      periods: 7,
    })),
  };
}

function parseTime(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

function formatTime(mins: number): string {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function buildScheduleConfig(input: ScheduleInput): TimetableScheduleConfig {
  const activeDays = input.days.filter((d) => d.active);
  const maxPeriods = Math.max(
    input.defaultPeriodsPerDay,
    ...activeDays.map((d) => d.periods),
    1,
  );

  const periodRows: TimetablePeriodDef[] = [];
  let cursor = parseTime(input.startTime);
  let teachingNum = 0;

  for (let i = 1; i <= maxPeriods; i++) {
    teachingNum = i;
    const start = formatTime(cursor);
    cursor += input.periodDurationMins;
    const end = formatTime(cursor);
    periodRows.push({
      id: `P${i}`,
      label: `P${i} · ${start}`,
      start,
      end,
      isBreak: false,
    });

    if (input.lunchEnabled && i === input.lunchAfterPeriod) {
      const breakStart = formatTime(cursor);
      cursor += input.lunchDurationMins;
      periodRows.push({
        id: "BRK",
        label: "LUNCH",
        start: breakStart,
        end: formatTime(cursor),
        isBreak: true,
      });
    }
  }

  return {
    startTime: input.startTime,
    periodDurationMins: input.periodDurationMins,
    lunchBreak: {
      enabled: input.lunchEnabled,
      afterPeriod: input.lunchAfterPeriod,
      durationMins: input.lunchDurationMins,
    },
    days: input.days,
    periodRows,
  };
}

export const DEFAULT_SCHEDULE = buildScheduleConfig(defaultScheduleInput());

export function scheduleInputFromConfig(config: TimetableScheduleConfig): ScheduleInput {
  const active = config.days.filter((d) => d.active);
  const defaultPeriods = active[0]?.periods ?? 7;
  return {
    startTime: config.startTime,
    periodDurationMins: config.periodDurationMins,
    defaultPeriodsPerDay: defaultPeriods,
    lunchEnabled: config.lunchBreak.enabled,
    lunchAfterPeriod: config.lunchBreak.afterPeriod,
    lunchDurationMins: config.lunchBreak.durationMins,
    days: config.days.map((d) => ({ ...d })),
  };
}

export function getActiveDays(schedule: TimetableScheduleConfig): DayScheduleEntry[] {
  return schedule.days.filter((d) => d.active);
}

export function emptyGridForSchedule(schedule: TimetableScheduleConfig = DEFAULT_SCHEDULE) {
  const active = getActiveDays(schedule);
  return active.map(() => schedule.periodRows.map(() => null));
}

export function teachingPeriodIndex(schedule: TimetableScheduleConfig, periodRowIdx: number): number {
  let n = 0;
  for (let i = 0; i <= periodRowIdx; i++) {
    if (!schedule.periodRows[i]?.isBreak) n++;
  }
  return n;
}

export function isTeachingRow(schedule: TimetableScheduleConfig, periodRowIdx: number): boolean {
  return !schedule.periodRows[periodRowIdx]?.isBreak;
}

/** Whether this day uses this teaching period row (half-day support). */
export function isSlotApplicable(
  schedule: TimetableScheduleConfig,
  dayIdx: number,
  periodRowIdx: number,
): boolean {
  if (!isTeachingRow(schedule, periodRowIdx)) return false;
  const day = getActiveDays(schedule)[dayIdx];
  if (!day) return false;
  return teachingPeriodIndex(schedule, periodRowIdx) <= day.periods;
}

export function teachingSlotsForSchedule(schedule: TimetableScheduleConfig) {
  const slots: { day: number; period: number }[] = [];
  const active = getActiveDays(schedule);
  active.forEach((dayEntry, dayIdx) => {
    schedule.periodRows.forEach((row, periodIdx) => {
      if (row.isBreak) return;
      const pNum = teachingPeriodIndex(schedule, periodIdx);
      if (pNum <= dayEntry.periods) slots.push({ day: dayIdx, period: periodIdx });
    });
  });
  return slots;
}

export function countTeachingSlotsPerWeek(schedule: TimetableScheduleConfig = DEFAULT_SCHEDULE): number {
  return teachingSlotsForSchedule(schedule).length;
}

export function countEmptySlotsForSchedule(
  grid: (import("@/lib/timetable-data").TimetableSlot | null)[][],
  schedule: TimetableScheduleConfig,
): number {
  let n = 0;
  for (let day = 0; day < grid.length; day++) {
    for (let period = 0; period < schedule.periodRows.length; period++) {
      if (!isSlotApplicable(schedule, day, period)) continue;
      if (!grid[day]?.[period]) n++;
    }
  }
  return n;
}

export function scheduleSummary(schedule: TimetableScheduleConfig): string {
  const active = getActiveDays(schedule);
  const slots = countTeachingSlotsPerWeek(schedule);
  const dayPart = active.map((d) => (d.periods < Math.max(...active.map((x) => x.periods)) ? `${d.name.slice(0, 3)}×${d.periods}` : d.name.slice(0, 3))).join(", ");
  return `${active.length} days · ${slots} periods/week · ${schedule.periodDurationMins} min · from ${schedule.startTime} (${dayPart})`;
}
