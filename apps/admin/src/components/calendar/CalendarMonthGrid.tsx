import { Button, Card, CardHeader, Pill } from "@lumenx/ui-admin";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { monthGridCells } from "@/lib/exam-calendar-utils";
import {
  CALENDAR_MONTH_LABELS,
  WEEKDAY_LABELS,
  eventsInMonth,
  formatTimeRange,
  todayIso,
  type CalendarViewItem,
} from "@/components/calendar/calendar-view-helpers";
import { CalendarHolidayRulesMenu } from "@/components/calendar/CalendarHolidayRulesMenu";
import type { CalendarHolidayRules } from "@/lib/calendar-holiday-rules";

type Props = {
  year: number;
  monthIndex: number;
  items: CalendarViewItem[];
  selectedDate: string | null;
  writesEnabled: boolean;
  holidayRules: CalendarHolidayRules;
  onHolidayNotify?: (message: string) => void;
  onChangeMonth: (year: number, monthIndex: number) => void;
  onSelectDate: (iso: string) => void;
  onAddForDate: (iso: string) => void;
  onEditItem: (id: string) => void;
};

export function CalendarMonthGrid({
  year,
  monthIndex,
  items,
  selectedDate,
  writesEnabled,
  holidayRules,
  onHolidayNotify,
  onChangeMonth,
  onSelectDate,
  onAddForDate,
  onEditItem,
}: Props) {
  const today = todayIso();
  const cells = monthGridCells(year, monthIndex);
  const monthItems = eventsInMonth(items, year, monthIndex);
  const byDate = new Map<string, CalendarViewItem[]>();
  for (const item of monthItems) {
    const list = byDate.get(item.date) ?? [];
    list.push(item);
    byDate.set(item.date, list);
  }

  const shiftMonth = (delta: number) => {
    const d = new Date(year, monthIndex + delta, 1);
    onChangeMonth(d.getFullYear(), d.getMonth());
  };

  const selectedItems = selectedDate ? byDate.get(selectedDate) ?? [] : [];

  return (
    <div className="space-y-3">
      <Card>
        <CardHeader
          title={`${CALENDAR_MONTH_LABELS[monthIndex]} ${year}`}
          hint={`${monthItems.length} entr${monthItems.length === 1 ? "y" : "ies"} · tap a day to add`}
          action={
            <div className="flex flex-wrap items-center justify-end gap-1.5">
              <CalendarHolidayRulesMenu
                rules={holidayRules}
                writesEnabled={writesEnabled}
                onNotify={onHolidayNotify}
              />
              <Button size="sm" variant="outline" onClick={() => shiftMonth(-1)} aria-label="Previous month">
                <ChevronLeft className="size-3.5" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const n = new Date();
                  onChangeMonth(n.getFullYear(), n.getMonth());
                }}
              >
                Today
              </Button>
              <Button size="sm" variant="outline" onClick={() => shiftMonth(1)} aria-label="Next month">
                <ChevronRight className="size-3.5" />
              </Button>
            </div>
          }
        />
        <div className="px-3 pb-4 sm:px-5">
          <div className="grid grid-cols-7 gap-1 mb-1">
            {WEEKDAY_LABELS.map((d) => (
              <div
                key={d}
                className="py-1 text-center text-[10px] font-mono uppercase tracking-wider text-muted-foreground"
              >
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((iso, idx) => {
              if (!iso) {
                return <div key={`pad-${idx}`} className="min-h-[4.5rem] rounded-md bg-muted/20" />;
              }
              const day = Number(iso.slice(8, 10));
              const dayItems = byDate.get(iso) ?? [];
              const isToday = iso === today;
              const isSelected = iso === selectedDate;
              return (
                <button
                  key={iso}
                  type="button"
                  onClick={() => onSelectDate(iso)}
                  className={`min-h-[4.5rem] rounded-md border p-1.5 text-left transition-colors ${
                    isSelected
                      ? "border-primary bg-primary/[0.08]"
                      : isToday
                        ? "border-primary/50 bg-primary/[0.04]"
                        : "border-border bg-background/50 hover:bg-surface-hover"
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span
                      className={`inline-flex size-6 items-center justify-center rounded-full text-[11px] font-semibold ${
                        isToday ? "bg-primary text-primary-foreground" : "text-foreground"
                      }`}
                    >
                      {day}
                    </span>
                    {dayItems.length > 0 ? (
                      <span className="text-[9px] font-mono text-muted-foreground">
                        {dayItems.length}
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-1 space-y-0.5">
                    {dayItems.slice(0, 2).map((item) => (
                      <div
                        key={item.id}
                        className={`truncate rounded px-1 py-0.5 text-[9px] font-medium leading-tight ${
                          item.kind === "holiday"
                            ? "bg-warning/15 text-warning"
                            : "bg-primary/10 text-primary"
                        }`}
                        title={item.title}
                      >
                        {item.title}
                      </div>
                    ))}
                    {dayItems.length > 2 ? (
                      <div className="text-[9px] text-muted-foreground">+{dayItems.length - 2}</div>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </Card>

      {selectedDate ? (
        <Card>
          <CardHeader
            title={new Date(selectedDate + "T12:00:00").toLocaleDateString("en-IN", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
            hint={
              writesEnabled
                ? "Select again or use Add on this date to create an entry"
                : "Read-only"
            }
            action={
              writesEnabled ? (
                <Button size="sm" variant="primary" onClick={() => onAddForDate(selectedDate)}>
                  Add on date
                </Button>
              ) : null
            }
          />
          <div className="space-y-2 px-4 pb-4 sm:px-5">
            {selectedItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No entries on this day.
                {writesEnabled ? " Use Add on date to create a holiday or event." : ""}
              </p>
            ) : (
              selectedItems.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-border px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="text-sm font-semibold">{item.title}</p>
                      <Pill tone={item.kind === "holiday" ? "warning" : "info"}>
                        {item.source === "rule"
                          ? "holiday"
                          : item.kind === "function"
                            ? "event"
                            : item.kind}
                      </Pill>
                    </div>
                    {formatTimeRange(item.time, item.endTime) ? (
                      <p className="mt-0.5 text-[11px] font-mono text-muted-foreground">
                        {formatTimeRange(item.time, item.endTime)}
                      </p>
                    ) : null}
                    {item.description ? (
                      <p className="mt-1 text-xs text-muted-foreground">{item.description}</p>
                    ) : null}
                  </div>
                  {writesEnabled && item.source !== "rule" ? (
                    <Button size="sm" variant="outline" onClick={() => onEditItem(item.id)}>
                      Edit
                    </Button>
                  ) : item.source === "rule" ? (
                    <p className="text-[10px] text-muted-foreground">From checklist</p>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </Card>
      ) : null}
    </div>
  );
}
