/**
 * Activity Hub — calendar types shared across workspace modules.
 */
export interface CalendarActivityMark {
  /** ISO date yyyy-mm-dd */
  date: string;
  count: number;
  highlight?: boolean;
}

export interface CalendarMonthCell {
  day: number;
  iso: string;
}
