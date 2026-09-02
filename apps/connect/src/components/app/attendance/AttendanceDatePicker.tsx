import { useState, type ReactNode } from "react";
import { CalendarDays } from "lucide-react";
import { Button, Calendar, Popover, PopoverContent, PopoverTrigger, cn, resolveCalendarMonthBounds } from "@lumenx/ui";
import { formatDisplayDate, parseIsoParts } from "@/lib/attendance/calendar";
import {
  connectCalendarClassNames,
  connectCalendarRootClassName,
  connectDatePopoverClassName,
  connectDateTriggerClassName,
} from "@/lib/connect-calendar-theme";

type AttendanceDatePickerProps = {
  label: string;
  value: string;
  onChange: (iso: string) => void;
  min?: string;
  max?: string;
  placeholder?: string;
  viewYear?: number;
  viewMonth?: number;
  hideLabel?: boolean;
};

function dateAtNoon(iso: string) {
  return new Date(`${iso}T12:00:00`);
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function AttendanceDatePicker({
  label,
  value,
  onChange,
  min,
  max,
  placeholder = "Select date",
  viewYear,
  viewMonth,
  hideLabel = false,
}: AttendanceDatePickerProps) {
  const [open, setOpen] = useState(false);
  const selected = value ? dateAtNoon(value) : undefined;
  const minDate = min ? dateAtNoon(min) : undefined;
  const maxDate = max ? dateAtNoon(max) : undefined;
  const defaultMonth =
    selected ??
    (viewYear != null && viewMonth != null
      ? new Date(viewYear, viewMonth, 1)
      : new Date());
  const { startMonth, endMonth } = resolveCalendarMonthBounds(min, max);

  return (
    <div className="min-w-0 flex-1">
      {!hideLabel ? (
        <span className="text-xs font-medium text-muted-foreground mb-1 block">{label}</span>
      ) : null}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className={cn(
              connectDateTriggerClassName,
              !value && "text-muted-foreground",
            )}
          >
            <CalendarDays className="mr-1.5 size-4 shrink-0 text-primary sm:mr-2" />
            <span className="truncate">{value ? formatDisplayDate(value) : placeholder}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className={connectDatePopoverClassName} align="start">
          <Calendar
            mode="single"
            weekStartsOn={1}
            selected={selected}
            startMonth={startMonth}
            endMonth={endMonth}
            onSelect={(date) => {
              if (!date) return;
              const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
              onChange(iso);
              setOpen(false);
            }}
            disabled={(date) => {
              const day = startOfDay(date);
              if (minDate && day < startOfDay(minDate)) return true;
              if (maxDate && day > startOfDay(maxDate)) return true;
              return false;
            }}
            defaultMonth={defaultMonth}
            initialFocus
            className={connectCalendarRootClassName}
            classNames={connectCalendarClassNames}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

export function syncCalendarMonthFromIso(
  iso: string,
  setYear: (year: number) => void,
  setMonth: (month: number) => void,
) {
  const { year, month } = parseIsoParts(iso);
  setYear(year);
  setMonth(month);
}

type DateRangePickerRowProps = {
  startLabel: string;
  endLabel: string;
  startValue: string;
  endValue: string;
  onStartChange: (iso: string) => void;
  onEndChange: (iso: string) => void;
  startMin?: string;
  startMax?: string;
  endMin?: string;
  endMax?: string;
  startPlaceholder?: string;
  endPlaceholder?: string;
  viewYear?: number;
  viewMonth?: number;
  hint?: string;
  trailing?: ReactNode;
};

export function ConnectDatePicker(props: AttendanceDatePickerProps) {
  return <AttendanceDatePicker {...props} />;
}

/** Premium single-row start → end date pickers (attendance, leave, etc.). */
export function DateRangePickerRow({
  startLabel,
  endLabel,
  startValue,
  endValue,
  onStartChange,
  onEndChange,
  startMin,
  startMax,
  endMin,
  endMax,
  startPlaceholder = "Start",
  endPlaceholder = "End",
  viewYear,
  viewMonth,
  hint,
  trailing,
}: DateRangePickerRowProps) {
  return (
    <div className="min-w-0 space-y-1">
      <div className="flex min-w-0 flex-row items-end gap-2">
        <AttendanceDatePicker
          label={startLabel}
          value={startValue}
          min={startMin}
          max={startMax}
          placeholder={startPlaceholder}
          viewYear={viewYear}
          viewMonth={viewMonth}
          onChange={onStartChange}
        />
        <span
          className="flex h-10 shrink-0 items-center text-sm font-medium text-muted-foreground/60"
          aria-hidden
        >
          →
        </span>
        <AttendanceDatePicker
          label={endLabel}
          value={endValue}
          min={endMin}
          max={endMax}
          placeholder={endPlaceholder}
          viewYear={viewYear}
          viewMonth={viewMonth}
          onChange={onEndChange}
        />
        {trailing}
      </div>
      {hint ? <p className="text-xs text-muted-foreground px-0.5">{hint}</p> : null}
    </div>
  );
}
