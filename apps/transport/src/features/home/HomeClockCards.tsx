import { CalendarDays, Clock } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { IconWell } from "@/components/ui/icon-well";
import { cn } from "@lumenx/ui";
import { MODULE_COLORS } from "@/theme/colors";

import { useLiveClock } from "./use-live-clock";

type HomeClockCardsProps = {
  variant?: "cards" | "inline";
  className?: string;
};

/** Isolated clock section so Home does not re-render every second. */
export function HomeClockCards({ variant = "cards", className }: HomeClockCardsProps) {
  const clock = useLiveClock();

  if (variant === "inline") {
    return (
      <div
        className={cn(
          "transport-home-hero__clock grid grid-cols-2 gap-2 rounded-2xl border p-2.5 sm:gap-3 sm:p-3",
          className,
        )}
      >
        <div className="flex min-w-0 items-center gap-2">
          <CalendarDays className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Date
            </p>
            <p className="truncate font-display text-xs font-semibold text-foreground sm:text-sm">
              {clock.dateLabel}
            </p>
          </div>
        </div>
        <div className="flex min-w-0 items-center gap-2 border-l border-border pl-2 sm:pl-3">
          <Clock className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Time
            </p>
            <p className="font-display text-xs font-semibold tabular-nums text-foreground sm:text-sm">
              {clock.timeLabel}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <section className={cn("grid w-full min-w-0 grid-cols-2 gap-2.5 sm:gap-3", className)}>
      <Card className="transport-home-stat-card min-w-0 overflow-hidden">
        <CardContent className="flex items-start gap-2.5 p-3.5 sm:gap-3 sm:p-4">
          <IconWell icon={CalendarDays} size="md" color={MODULE_COLORS.transport} />
          <div className="min-w-0 flex-1">
            <p className="transport-stat-label">Current date</p>
            <p className="mt-0.5 font-display text-sm font-semibold tracking-tight break-words text-foreground">
              {clock.dateLabel}
            </p>
            <p className="text-xs text-muted-foreground">{clock.dayLabel}</p>
          </div>
        </CardContent>
      </Card>
      <Card className="transport-home-stat-card min-w-0 overflow-hidden">
        <CardContent className="flex items-start gap-2.5 p-3.5 sm:gap-3 sm:p-4">
          <IconWell icon={Clock} size="md" color={MODULE_COLORS.transport} />
          <div className="min-w-0 flex-1">
            <p className="transport-stat-label">Current time</p>
            <p className="mt-0.5 font-display text-sm font-semibold tracking-tight tabular-nums text-foreground">
              {clock.timeLabel}
            </p>
            <p className="text-xs text-muted-foreground">Live</p>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
