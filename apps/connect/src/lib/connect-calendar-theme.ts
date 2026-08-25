import type { DayPickerProps } from "react-day-picker";

/** Shared blue + white styling for Connect popover calendars (react-day-picker). */
export const connectCalendarClassNames: NonNullable<DayPickerProps["classNames"]> = {
  today: "bg-primary/10 text-primary font-semibold rounded-md",
  // Keep horizontal padding so the month label does not overlap absolute prev/next arrows.
  month_caption:
    "flex h-(--cell-size) w-full items-center justify-center px-(--cell-size) font-display font-semibold text-foreground",
  weekday: "text-muted-foreground text-[0.65rem] font-medium uppercase tracking-wide",
  outside: "text-muted-foreground/35",
  disabled: "text-muted-foreground/30 opacity-40",
  range_middle: "bg-primary/10 rounded-none",
  range_start: "bg-primary/15 rounded-l-md",
  range_end: "bg-primary/15 rounded-r-md",
};

export const connectCalendarRootClassName = "rounded-2xl bg-card p-2";

export const connectDatePopoverClassName =
  "w-auto rounded-2xl border border-border bg-card p-0 shadow-soft";

export const connectDateTriggerClassName =
  "h-10 w-full min-w-0 justify-start rounded-xl border-border bg-card px-2.5 sm:px-3 font-normal text-left text-sm hover:bg-primary/[0.04] hover:border-primary/30";

/** Custom month-grid day cell base (leave, attendance grids). */
export const connectMonthDayBase =
  "aspect-square rounded-xl grid place-items-center text-sm font-medium border border-border bg-card text-foreground transition-colors";

export const connectMonthDaySelected =
  "bg-primary text-primary-foreground border-primary shadow-soft";

export const connectMonthDayToday = "ring-2 ring-primary/40 ring-offset-1 ring-offset-card";

export const connectMonthDayMuted =
  "bg-muted/20 text-muted-foreground/40 border-dashed border-border";

export const connectMonthDayMarked = "bg-primary/10 text-primary border-primary/30";
