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
  const colCount = Math.max(days.length, 1);

  return (
    <section className="min-w-0 rounded-2xl border border-border bg-card p-4 shadow-soft sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2 text-xs font-medium text-muted-foreground">
          <CalendarDays className="size-3.5 shrink-0 text-primary" />
          Select day
        </div>
        <p className="min-w-0 truncate text-right text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{selected}</span>
          {selected === todayName ? " · Today" : ""}
          {countFor(selected) > 0 && (
            <span>
              {" "}
              · {countFor(selected)} period{countFor(selected) === 1 ? "" : "s"}
            </span>
          )}
        </p>
      </div>

      <div
        className="grid w-full gap-2.5 sm:gap-3"
        style={{ gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))` }}
        role="group"
        aria-label="Week days"
      >
        {days.map((d) => {
          const isSelected = selected === d;
          const isToday = d === todayName;
          const count = countFor(d);
          const short = d.slice(0, 3);

          return (
            <button
              key={d}
              type="button"
              onClick={() => onSelect(d)}
              aria-pressed={isSelected}
              aria-label={isToday ? `${d}, today` : d}
              className="group flex min-w-0 flex-col items-center gap-1.5 touch-manipulation"
            >
              <span
                className={cn(
                  "grid aspect-square w-full place-items-center rounded-full text-[11px] font-semibold tracking-wide motion-fast transition-[background-color,color,box-shadow,border-color,transform] sm:text-xs",
                  isSelected
                    ? "bg-primary text-white shadow-[0_8px_20px_-6px_color-mix(in_srgb,var(--primary)_50%,transparent)]"
                    : "border border-border/80 bg-muted/35 text-foreground hover:border-primary/40 hover:bg-primary/[0.07]",
                  isToday &&
                    !isSelected &&
                    "border-primary/50 bg-primary/[0.1] text-primary shadow-[0_0_0_3px_color-mix(in_srgb,var(--primary)_18%,transparent)]",
                )}
              >
                {short}
              </span>
              <span
                className={cn(
                  "max-w-full truncate text-center text-[9px] font-medium leading-none sm:text-[10px]",
                  isSelected
                    ? "text-primary"
                    : isToday
                      ? "text-primary/85"
                      : "text-muted-foreground",
                )}
              >
                {isToday ? "Today" : count > 0 ? `${count}p` : "—"}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
