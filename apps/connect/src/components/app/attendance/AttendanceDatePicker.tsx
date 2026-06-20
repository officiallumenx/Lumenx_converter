import { useState } from "react";
import { CalendarDays } from "lucide-react";
import {
  Button,
  Calendar,
  Popover,
  PopoverContent,
  PopoverTrigger,
  cn,
} from "@lumenx/ui";
import { formatDisplayDate, parseIsoParts } from "@/lib/attendance/calendar";

type AttendanceDatePickerProps = {
  label: string;
  value: string;
  onChange: (iso: string) => void;
  min?: string;
  max?: string;
  placeholder?: string;
};

export function AttendanceDatePicker({
  label,
  value,
  onChange,
  min,
  max,
  placeholder = "Select date",
}: AttendanceDatePickerProps) {
  const [open, setOpen] = useState(false);
  const selected = value ? new Date(`${value}T12:00:00`) : undefined;
  const minDate = min ? new Date(`${min}T12:00:00`) : undefined;
  const maxDate = max ? new Date(`${max}T12:00:00`) : undefined;

  return (
    <div className="min-w-0 flex-1">
      <span className="text-xs font-medium text-muted-foreground mb-1 block">{label}</span>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className={cn(
              "h-10 w-full justify-start rounded-xl px-3 font-normal",
              !value && "text-muted-foreground",
            )}
          >
            <CalendarDays className="mr-2 size-4 shrink-0 text-primary" />
            {value ? formatDisplayDate(value) : placeholder}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto rounded-2xl p-0" align="start">
          <Calendar
            mode="single"
            selected={selected}
            onSelect={(date) => {
              if (!date) return;
              const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
              onChange(iso);
              setOpen(false);
            }}
            disabled={(date) => {
              if (minDate && date < minDate) return true;
              if (maxDate && date > maxDate) return true;
              return false;
            }}
            defaultMonth={selected}
            initialFocus
            className="rounded-2xl"
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
