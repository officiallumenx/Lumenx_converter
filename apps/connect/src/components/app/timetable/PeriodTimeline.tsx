import { Badge, cn } from "@lumenx/ui";
import { Clock, User } from "lucide-react";
import {
  isPeriodPast,
  splitPeriodTime,
  subjectStyle,
  type StudentPeriod,
} from "@/lib/student/timetable-utils";

export type PeriodRow = {
  time: string;
  subject: string;
  subtitle?: string;
  badge?: string;
  state?: "current" | "next" | "past" | "default";
};

export function PeriodTimeline({
  periods,
  emptyMessage = "No classes scheduled.",
  showPastMuted = false,
}: {
  periods: PeriodRow[];
  emptyMessage?: string;
  showPastMuted?: boolean;
}) {
  if (!periods.length) {
    return (
      <div className="rounded-2xl border border-dashed p-10 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <ol className="relative min-w-0 space-y-0">
      {periods.map((p, i) => (
        <PeriodTimelineItem
          key={`${p.time}-${p.subject}-${i}`}
          period={p}
          index={i + 1}
          isLast={i === periods.length - 1}
          showPastMuted={showPastMuted}
        />
      ))}
    </ol>
  );
}

function PeriodTimelineItem({
  period,
  index,
  isLast,
  showPastMuted,
}: {
  period: PeriodRow;
  index: number;
  isLast: boolean;
  showPastMuted: boolean;
}) {
  const style = subjectStyle(period.subject);
  const { start, end } = splitPeriodTime(period.time);
  const isPast = period.state === "past" || (showPastMuted && period.state === "default");
  const isCurrent = period.state === "current";
  const isNext = period.state === "next";

  return (
    <li className="relative flex min-w-0 gap-3 pb-4 sm:gap-4 sm:pb-5">
      {!isLast && (
        <span
          className={cn(
            "absolute left-[1.125rem] top-10 bottom-0 w-px sm:left-[1.375rem]",
            isPast ? "bg-border/60" : "bg-border",
          )}
          aria-hidden
        />
      )}

      <div className="relative z-[1] flex shrink-0 flex-col items-center pt-1">
        <span
          className={cn(
            "grid size-9 place-items-center rounded-full border-2 bg-card text-xs font-bold tabular-nums sm:size-10",
            isCurrent && "border-primary bg-primary text-primary-foreground",
            isNext && "border-primary/50 bg-primary/10 text-primary",
            !isCurrent && !isNext && "border-border text-muted-foreground",
          )}
        >
          {index}
        </span>
      </div>

      <article
        className={cn(
          "min-w-0 flex-1 overflow-hidden rounded-2xl border shadow-soft transition-colors",
          isCurrent && "border-primary/40 bg-primary/[0.06]",
          isNext && !isCurrent && "border-primary/20 bg-muted/40",
          isPast && "border-border/60 bg-muted/20 opacity-75",
          !isCurrent && !isNext && !isPast && "border-border bg-card",
        )}
      >
        <div className="flex min-w-0">
          <div className={cn("w-1 shrink-0 sm:w-1.5", style.stripe)} aria-hidden />
          <div className="min-w-0 flex-1 p-3 sm:p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <span
                  className={cn(
                    "inline-flex rounded-md px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
                    style.chip,
                  )}
                >
                  {period.subject}
                </span>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="inline-flex items-center gap-1.5 text-sm font-medium tabular-nums">
                    <Clock className="size-3.5 shrink-0 text-muted-foreground" />
                    <span className="sm:hidden">
                      {start}
                      {end ? ` – ${end}` : ""}
                    </span>
                    <span className="hidden sm:inline">{period.time}</span>
                  </span>
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                {isCurrent && (
                  <Badge className="h-6 border-0 bg-primary px-2 text-[10px] text-primary-foreground">
                    Live
                  </Badge>
                )}
                {isNext && !isCurrent && (
                  <Badge variant="outline" className="h-6 px-2 text-[10px]">
                    Next
                  </Badge>
                )}
                {period.badge && !isCurrent && !isNext && (
                  <Badge variant="outline" className="h-6 px-2 text-[10px]">
                    {period.badge}
                  </Badge>
                )}
              </div>
            </div>
            {period.subtitle && (
              <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                <User className="size-3.5 shrink-0" />
                <span className="truncate">{period.subtitle}</span>
              </div>
            )}
          </div>
        </div>
      </article>
    </li>
  );
}

export function buildStudentPeriodRows(
  periods: StudentPeriod[],
  opts: {
    isToday: boolean;
    current: StudentPeriod | null;
    next: StudentPeriod | null;
  },
): PeriodRow[] {
  return periods.map((p) => {
    const isCurrent =
      opts.isToday && opts.current?.time === p.time && opts.current?.subject === p.subject;
    const isNext =
      opts.isToday && opts.next?.time === p.time && opts.next?.subject === p.subject;
    const past = opts.isToday && !isCurrent && !isNext && isPeriodPast(p);

    return {
      time: p.time,
      subject: p.subject,
      subtitle: p.teacher !== "—" ? p.teacher : undefined,
      state: isCurrent ? "current" : isNext ? "next" : past ? "past" : "default",
    };
  });
}
