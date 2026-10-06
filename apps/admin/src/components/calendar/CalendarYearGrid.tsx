import { Card, CardHeader, Pill } from "@lumenx/ui-admin";
import {
  CALENDAR_MONTH_SHORT,
  eventsInMonth,
  formatDayLabel,
  formatTimeRange,
  nextEventForMonth,
  todayIso,
  type CalendarViewItem,
} from "@/components/calendar/calendar-view-helpers";

type Props = {
  year: number;
  items: CalendarViewItem[];
  loadingPlaceholder?: boolean;
  onSelectMonth: (year: number, monthIndex: number) => void;
};

export function CalendarYearGrid({
  year,
  items,
  loadingPlaceholder = false,
  onSelectMonth,
}: Props) {
  const today = todayIso();
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  return (
    <Card>
      <CardHeader
        title={`${year} · Year view`}
        hint="Current month highlighted · next event shown on each month"
      />
      <div className="grid grid-cols-2 gap-2 px-4 pb-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 sm:px-5">
        {CALENDAR_MONTH_SHORT.map((label, monthIndex) => {
          const isCurrent = year === currentYear && monthIndex === currentMonth;
          const count = eventsInMonth(items, year, monthIndex).length;
          const next = nextEventForMonth(items, year, monthIndex, today);
          return (
            <button
              key={label}
              type="button"
              onClick={() => onSelectMonth(year, monthIndex)}
              className={`flex min-h-[7.5rem] flex-col rounded-lg border p-3 text-left transition-colors ${
                isCurrent
                  ? "border-primary bg-primary/[0.07] shadow-[inset_0_0_0_1px] shadow-primary/30"
                  : "border-border bg-background/40 hover:bg-surface-hover"
              }`}
            >
              <div className="flex items-center justify-between gap-1">
                <span
                  className={`text-[11px] font-semibold ${
                    isCurrent ? "text-primary" : "text-foreground"
                  }`}
                >
                  {label}
                </span>
                {isCurrent ? <Pill tone="info">Now</Pill> : null}
              </div>
              <div className="mt-1 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                {loadingPlaceholder ? "…" : count > 0 ? `${count} date${count === 1 ? "" : "s"}` : "No dates"}
              </div>
              <div className="mt-auto pt-2">
                {next ? (
                  <>
                    <p className="text-[10px] font-mono text-muted-foreground">
                      Next · {formatDayLabel(next.date)}
                      {formatTimeRange(next.time, next.endTime)
                        ? ` · ${formatTimeRange(next.time, next.endTime)}`
                        : ""}
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-xs font-medium leading-snug">
                      {next.title}
                    </p>
                    <p className="mt-0.5 text-[10px] capitalize text-muted-foreground">
                      {next.kind === "function" ? "event" : next.kind}
                    </p>
                  </>
                ) : (
                  <p className="text-[11px] text-muted-foreground">No upcoming entry</p>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </Card>
  );
}
