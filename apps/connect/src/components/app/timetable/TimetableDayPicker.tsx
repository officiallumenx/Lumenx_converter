import { cn } from "@lumenx/ui";
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
    <section className="min-w-0 rounded-2xl border border-border bg-card p-3 shadow-soft sm:p-4">
      <div className="mb-3 flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <CalendarDays className="size-3.5 text-primary shrink-0" />
        Select day
      </div>

      <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
        {days.map((d) => {
          const isSelected = selected === d;
          const isToday = d === todayName;
          const count = countFor(d);

          return (
            <button
              key={d}
              type="button"
              onClick={() => onSelect(d)}
              aria-pressed={isSelected}
              aria-label={isToday ? `${d}, today` : d}
              className={cn(
                "flex min-w-0 flex-col items-center justify-center rounded-xl px-0.5 py-2 sm:py-2.5 motion-fast transition-[background-color,color,box-shadow,transform] touch-manipulation",
                isSelected
                  ? "bg-primary text-white shadow-soft scale-[1.02]"
                  : "bg-white text-primary border border-primary/30 hover:border-primary/50 hover:bg-primary/[0.04] dark:bg-background dark:border-primary/25",
                isToday && !isSelected && "ring-2 ring-primary/20 ring-offset-1 ring-offset-card",
              )}
            >
              <span className="text-[11px] font-semibold leading-none sm:text-xs">{d.slice(0, 3)}</span>
              {isToday && (
                <span
                  className={cn(
                    "mt-0.5 text-[8px] font-medium leading-none sm:text-[9px]",
                    isSelected ? "text-white/90" : "text-primary/80",
                  )}
                >
                  Today
                </span>
              )}
              {!isToday && count > 0 && (
                <span
                  className={cn(
                    "mt-0.5 text-[8px] tabular-nums leading-none sm:text-[9px]",
                    isSelected ? "text-white/80" : "text-muted-foreground",
                  )}
                >
                  {count}p
                </span>
              )}
            </button>
          );
        })}
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">{selected}</span>
        {selected === todayName ? " · Today" : ""}
        {countFor(selected) > 0 && (
          <span>
            {" "}
            · {countFor(selected)} period{countFor(selected) === 1 ? "" : "s"}
          </span>
        )}
      </p>
    </section>
  );
}
