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
  /** Display name for breaks (Lunch, Morning Break, …). */
  breakName?: string;
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

/** Ordered bell-schedule row used by the editor. */
export type BellScheduleItem = {
  id: string;
  kind: "period" | "break";
  label: string;
  start: string;
  end: string;
};

export type TimetableScheduleConfig = {
  startTime: string;
  periodDurationMins: number;
  lunchBreak: LunchBreakConfig;
  days: DayScheduleEntry[];
  periodRows: TimetablePeriodDef[];
  /** Custom bell schedule — when present, is the source of truth for periodRows. */
  bellItems?: BellScheduleItem[];
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
  /** When set, individual start/end times and named breaks take precedence. */
  bellItems?: BellScheduleItem[];
};

export function parseTime(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

export function formatTime(mins: number): string {
  const normalized = ((mins % (24 * 60)) + 24 * 60) % (24 * 60);
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function timesOverlap(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string,
): boolean {
  const as = parseTime(aStart);
  const ae = parseTime(aEnd);
  const bs = parseTime(bStart);
  const be = parseTime(bEnd);
  return as < be && bs < ae;
}

function newBellId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Build a uniform bell schedule from start time + duration + lunch. */
export function buildUniformBellItems(input: {
  startTime: string;
  periodDurationMins: number;
  periodsPerDay: number;
  lunchEnabled: boolean;
  lunchAfterPeriod: number;
  lunchDurationMins: number;
}): BellScheduleItem[] {
  const items: BellScheduleItem[] = [];
  let cursor = parseTime(input.startTime);
  let teachingNum = 0;

  for (let i = 1; i <= input.periodsPerDay; i++) {
    teachingNum = i;
    const start = formatTime(cursor);
    cursor += input.periodDurationMins;
    const end = formatTime(cursor);
    items.push({
      id: `P${i}`,
      kind: "period",
      label: `P${i}`,
      start,
      end,
    });

    if (input.lunchEnabled && i === input.lunchAfterPeriod) {
      const breakStart = formatTime(cursor);
      cursor += input.lunchDurationMins;
      items.push({
        id: "BRK-LUNCH",
        kind: "break",
        label: "Lunch",
        start: breakStart,
        end: formatTime(cursor),
      });
    }
  }

  void teachingNum;
  return items;
}

export function defaultScheduleInput(): ScheduleInput {
  const startTime = "08:00";
  const periodDurationMins = 60;
  const defaultPeriodsPerDay = 7;
  const lunchEnabled = true;
  const lunchAfterPeriod = 4;
  const lunchDurationMins = 45;
  const bellItems = buildUniformBellItems({
    startTime,
    periodDurationMins,
    periodsPerDay: defaultPeriodsPerDay,
    lunchEnabled,
    lunchAfterPeriod,
    lunchDurationMins,
  });

  return {
    startTime,
    periodDurationMins,
    defaultPeriodsPerDay,
    lunchEnabled,
    lunchAfterPeriod,
    lunchDurationMins,
    days: ALL_WEEKDAY_NAMES.slice(0, 6).map((name) => ({
      name,
      active: true,
      periods: defaultPeriodsPerDay,
    })),
    bellItems,
  };
}

export type ScheduleValidationIssue = {
  severity: "error" | "warning";
  message: string;
};

export function validateBellItems(items: BellScheduleItem[]): ScheduleValidationIssue[] {
  const issues: ScheduleValidationIssue[] = [];
  if (items.length === 0) {
    issues.push({ severity: "error", message: "Add at least one teaching period." });
    return issues;
  }

  const periods = items.filter((i) => i.kind === "period");
  if (periods.length === 0) {
    issues.push({ severity: "error", message: "Schedule needs at least one teaching period." });
  }

  for (let i = 0; i < items.length; i++) {
    const item = items[i]!;
    if (parseTime(item.end) <= parseTime(item.start)) {
      issues.push({
        severity: "error",
        message: `${item.label || item.id}: end time must be after start time.`,
      });
    }
    if (i > 0) {
      const prev = items[i - 1]!;
      if (parseTime(item.start) < parseTime(prev.end)) {
        issues.push({
          severity: "error",
          message: `${item.label || item.id} overlaps ${prev.label || prev.id}.`,
        });
      }
      if (parseTime(item.start) > parseTime(prev.end)) {
        issues.push({
          severity: "warning",
          message: `Gap between ${prev.label || prev.id} and ${item.label || item.id}.`,
        });
      }
    }
  }

  return issues;
}

export function periodRowsFromBellItems(items: BellScheduleItem[]): TimetablePeriodDef[] {
  let periodNum = 0;
  return items.map((item) => {
    if (item.kind === "break") {
      return {
        id: item.id,
        label: item.label || "Break",
        start: item.start,
        end: item.end,
        isBreak: true,
        breakName: item.label || "Break",
      };
    }
    periodNum += 1;
    const label = item.label || `P${periodNum}`;
    return {
      id: item.id || `P${periodNum}`,
      label: `${label} · ${item.start}`,
      start: item.start,
      end: item.end,
      isBreak: false,
    };
  });
}

function lunchConfigFromBellItems(items: BellScheduleItem[]): LunchBreakConfig {
  let teachingBefore = 0;
  for (const item of items) {
    if (item.kind === "period") teachingBefore += 1;
    if (item.kind === "break") {
      const isLunch = /lunch/i.test(item.label);
      if (isLunch || items.filter((i) => i.kind === "break").length === 1) {
        return {
          enabled: true,
          afterPeriod: Math.max(1, teachingBefore),
          durationMins: Math.max(5, parseTime(item.end) - parseTime(item.start)),
        };
      }
    }
  }
  return { enabled: false, afterPeriod: 4, durationMins: 45 };
}

export function buildScheduleConfig(input: ScheduleInput): TimetableScheduleConfig {
  const activeDays = input.days.filter((d) => d.active);
  const maxPeriods = Math.max(
    input.defaultPeriodsPerDay,
    ...activeDays.map((d) => d.periods),
    1,
  );

  let bellItems = input.bellItems?.length
    ? input.bellItems.map((item) => ({ ...item }))
    : buildUniformBellItems({
        startTime: input.startTime,
        periodDurationMins: input.periodDurationMins,
        periodsPerDay: maxPeriods,
        lunchEnabled: input.lunchEnabled,
        lunchAfterPeriod: input.lunchAfterPeriod,
        lunchDurationMins: input.lunchDurationMins,
      });

  // Ensure enough teaching periods for the busiest day.
  const teachingCount = bellItems.filter((i) => i.kind === "period").length;
  if (teachingCount < maxPeriods) {
    let cursor = parseTime(bellItems[bellItems.length - 1]?.end ?? input.startTime);
    for (let i = teachingCount + 1; i <= maxPeriods; i++) {
      const start = formatTime(cursor);
      cursor += input.periodDurationMins;
      bellItems.push({
        id: `P${i}`,
        kind: "period",
        label: `P${i}`,
        start,
        end: formatTime(cursor),
      });
    }
  }

  const periodRows = periodRowsFromBellItems(bellItems);
  const lunchBreak = input.bellItems?.length
    ? lunchConfigFromBellItems(bellItems)
    : {
        enabled: input.lunchEnabled,
        afterPeriod: input.lunchAfterPeriod,
        durationMins: input.lunchDurationMins,
      };

  return {
    startTime: input.startTime || bellItems[0]?.start || "08:00",
    periodDurationMins: input.periodDurationMins,
    lunchBreak,
    days: input.days,
    periodRows,
    bellItems,
  };
}

export const DEFAULT_SCHEDULE = buildScheduleConfig(defaultScheduleInput());

export function scheduleInputFromConfig(config: TimetableScheduleConfig): ScheduleInput {
  const active = config.days.filter((d) => d.active);
  const defaultPeriods = active[0]?.periods ?? 7;
  const bellItems =
    config.bellItems?.map((item) => ({ ...item })) ??
    config.periodRows.map((row, index) => ({
      id: row.id || `row-${index}`,
      kind: row.isBreak ? ("break" as const) : ("period" as const),
      label: row.isBreak ? row.breakName || row.label : row.id,
      start: row.start,
      end: row.end,
    }));

  return {
    startTime: config.startTime,
    periodDurationMins: config.periodDurationMins,
    defaultPeriodsPerDay: defaultPeriods,
    lunchEnabled: config.lunchBreak.enabled,
    lunchAfterPeriod: config.lunchBreak.afterPeriod,
    lunchDurationMins: config.lunchBreak.durationMins,
    days: config.days.map((d) => ({ ...d })),
    bellItems,
  };
}

export function rebuildBellItemsFromUniform(input: ScheduleInput): ScheduleInput {
  const bellItems = buildUniformBellItems({
    startTime: input.startTime,
    periodDurationMins: input.periodDurationMins,
    periodsPerDay: input.defaultPeriodsPerDay,
    lunchEnabled: input.lunchEnabled,
    lunchAfterPeriod: input.lunchAfterPeriod,
    lunchDurationMins: input.lunchDurationMins,
  });
  return {
    ...input,
    bellItems,
    days: input.days.map((d) =>
      d.active ? { ...d, periods: input.defaultPeriodsPerDay } : d,
    ),
  };
}

export function addBellPeriod(items: BellScheduleItem[], durationMins: number): BellScheduleItem[] {
  const last = items[items.length - 1];
  const start = last ? last.end : "08:00";
  const periodCount = items.filter((i) => i.kind === "period").length + 1;
  return [
    ...items,
    {
      id: newBellId("P"),
      kind: "period",
      label: `P${periodCount}`,
      start,
      end: formatTime(parseTime(start) + durationMins),
    },
  ];
}

export function addBellBreak(
  items: BellScheduleItem[],
  label = "Break",
  durationMins = 15,
): BellScheduleItem[] {
  const last = items[items.length - 1];
  const start = last ? last.end : "08:00";
  return [
    ...items,
    {
      id: newBellId("BRK"),
      kind: "break",
      label,
      start,
      end: formatTime(parseTime(start) + durationMins),
    },
  ];
}

export function updateBellItem(
  items: BellScheduleItem[],
  id: string,
  patch: Partial<BellScheduleItem>,
): BellScheduleItem[] {
  return items.map((item) => (item.id === id ? { ...item, ...patch } : item));
}

export function removeBellItem(items: BellScheduleItem[], id: string): BellScheduleItem[] {
  return items.filter((item) => item.id !== id);
}

export function moveBellItem(
  items: BellScheduleItem[],
  id: string,
  direction: -1 | 1,
): BellScheduleItem[] {
  const index = items.findIndex((item) => item.id === id);
  if (index < 0) return items;
  const nextIndex = index + direction;
  if (nextIndex < 0 || nextIndex >= items.length) return items;
  const next = [...items];
  const [row] = next.splice(index, 1);
  next.splice(nextIndex, 0, row!);
  return next;
}

/** Index of the primary lunch break row, or -1. */
export function lunchRowIndex(schedule: TimetableScheduleConfig): number {
  const lunchNamed = schedule.periodRows.findIndex(
    (row) =>
      row.isBreak &&
      (/lunch/i.test(row.breakName || row.label) || /lunch/i.test(row.id) || row.id === "BRK"),
  );
  if (lunchNamed >= 0) return lunchNamed;

  // Fall back to the middle-most break so before/after still split the day.
  const breaks = schedule.periodRows
    .map((row, index) => (row.isBreak ? index : -1))
    .filter((index) => index >= 0);
  if (breaks.length === 0) return -1;
  return breaks[Math.floor((breaks.length - 1) / 2)]!;
}

export function isBeforeLunch(schedule: TimetableScheduleConfig, periodRowIdx: number): boolean {
  const lunchIdx = lunchRowIndex(schedule);
  if (lunchIdx < 0) return true;
  if (schedule.periodRows[periodRowIdx]?.isBreak) return false;
  return periodRowIdx < lunchIdx;
}

export function isAfterLunch(schedule: TimetableScheduleConfig, periodRowIdx: number): boolean {
  const lunchIdx = lunchRowIndex(schedule);
  if (lunchIdx < 0) return false;
  if (schedule.periodRows[periodRowIdx]?.isBreak) return false;
  return periodRowIdx > lunchIdx;
}

export function matchesLunchPreference(
  schedule: TimetableScheduleConfig,
  periodRowIdx: number,
  preference: "any" | "before_lunch" | "after_lunch",
): boolean {
  if (preference === "any") return true;
  if (preference === "before_lunch") return isBeforeLunch(schedule, periodRowIdx);
  return isAfterLunch(schedule, periodRowIdx);
}

export function countSlotsMatchingPreference(
  schedule: TimetableScheduleConfig,
  preference: "any" | "before_lunch" | "after_lunch",
): number {
  return teachingSlotsForSchedule(schedule).filter((slot) =>
    matchesLunchPreference(schedule, slot.period, preference),
  ).length;
}

export function getActiveDays(schedule: TimetableScheduleConfig): DayScheduleEntry[] {
  return schedule.days.filter((d) => d.active);
}

export function emptyGridForSchedule(schedule: TimetableScheduleConfig = DEFAULT_SCHEDULE) {
  const active = getActiveDays(schedule);
  return active.map(() => schedule.periodRows.map(() => null));
}

export function teachingPeriodIndex(
  schedule: TimetableScheduleConfig,
  periodRowIdx: number,
): number {
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

export function countTeachingSlotsPerWeek(
  schedule: TimetableScheduleConfig = DEFAULT_SCHEDULE,
): number {
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
  const breaks = schedule.periodRows.filter((r) => r.isBreak);
  const dayPart = active
    .map((d) =>
      d.periods < Math.max(...active.map((x) => x.periods))
        ? `${d.name.slice(0, 3)}×${d.periods}`
        : d.name.slice(0, 3),
    )
    .join(", ");
  const breakPart =
    breaks.length > 0
      ? ` · ${breaks.map((b) => b.breakName || b.label).join(", ")}`
      : "";
  return `${active.length} days · ${slots} periods/week · from ${schedule.startTime}${breakPart} (${dayPart})`;
}
