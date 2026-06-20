import { cn } from "@lumenx/ui";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@lumenx/ui";
import { CalendarDays } from "lucide-react";

export function TimetableDayPicker({
  days,
  selected,
  onSelect,
  todayName,
  periodCounts,
}: {
  days: readonly string[];
  selected: string;
  onSelect: (day: string) => void;
  todayName: string;
  periodCounts?: Record<string, number>;
}) {
  const countFor = (d: string) => periodCounts?.[d] ?? 0;

  return (
    <div className="min-w-0 space-y-3">
      <div className="md:hidden">
        <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
          Select day
        </label>
        <Select value={selected} onValueChange={onSelect}>
          <SelectTrigger className="h-11 w-full rounded-xl">
            <span className="flex min-w-0 flex-1 items-center gap-2">
              <CalendarDays className="size-4 shrink-0 text-primary" />
              <SelectValue placeholder="Choose a day" />
            </span>
          </SelectTrigger>
          <SelectContent position="popper" className="z-[100]">
            {days.map((d) => (
              <SelectItem key={d} value={d}>
                {d}
                {d === todayName ? " · Today" : ""} — {countFor(d)} period
                {countFor(d) === 1 ? "" : "s"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="hidden min-w-0 gap-2 overflow-x-auto pb-1 scrollbar-hide md:flex lg:hidden">
        {days.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => onSelect(d)}
            className={cn(
              "shrink-0 rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap transition-all",
              selected === d
                ? "bg-primary text-primary-foreground shadow-glow"
                : "bg-muted text-muted-foreground hover:bg-accent",
              d === todayName && selected !== d && "ring-1 ring-primary/30",
            )}
          >
            {d.slice(0, 3)}
            {d === todayName && <span className="ml-1 text-[10px] opacity-90">· Today</span>}
          </button>
        ))}
      </div>

      <div className="hidden min-w-0 grid-cols-3 gap-2 lg:grid xl:grid-cols-6">
        {days.map((d) => {
          const count = countFor(d);
          const isSelected = selected === d;
          const isToday = d === todayName;
          return (
            <button
              key={d}
              type="button"
              onClick={() => onSelect(d)}
              className={cn(
                "rounded-xl border p-3 text-left transition-all",
                isSelected
                  ? "border-primary bg-primary/8 shadow-soft ring-1 ring-primary/20"
                  : "border-border bg-card hover:border-primary/30 hover:bg-muted/30",
                isToday && !isSelected && "ring-1 ring-primary/20",
              )}
            >
              <div className="flex items-center justify-between gap-1">
                <span className={cn("text-sm font-semibold", isSelected && "text-primary")}>
                  {d}
                </span>
                {isToday && (
                  <span className="rounded-md bg-primary/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-primary">
                    Today
                  </span>
                )}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {count} period{count === 1 ? "" : "s"}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
