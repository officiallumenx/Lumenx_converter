import { useState } from "react";
import { CalendarDays } from "lucide-react";
import {
  Button,
  Calendar,
  Popover,
  PopoverContent,
  PopoverTrigger,
  cn,
  resolveCalendarMonthBounds,
} from "@lumenx/ui";
import {
  connectCalendarClassNames,
  connectCalendarRootClassName,
  connectDatePopoverClassName,
  connectDateTriggerClassName,
} from "@/lib/connect-calendar-theme";

type ConnectDatePickerProps = {
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

function formatDisplayDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function ConnectDatePicker({
  label,
  value,
  onChange,
  min,
  max,
  placeholder = "Select date",
  viewYear,
  viewMonth,
  hideLabel = false,
}: ConnectDatePickerProps) {
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
