import { Badge, cn } from "@lumenx/ui";
import { BookOpen, Clock, User } from "lucide-react";
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
      <div className="rounded-2xl border border-dashed border-border bg-muted/10 p-10 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <ol className="relative min-w-0 space-y-3">
      {periods.map((p, i) => (
        <PeriodTimelineItem
          key={`${p.time}-${p.subject}-${i}`}
          period={p}
          index={i + 1}
          showPastMuted={showPastMuted}
        />
      ))}
    </ol>
  );
}

function PeriodTimelineItem({
  period,
  index,
  showPastMuted,
}: {
  period: PeriodRow;
  index: number;
  showPastMuted: boolean;
}) {
  const style = subjectStyle(period.subject);
  const { start, end } = splitPeriodTime(period.time);
  const isPast = period.state === "past" || (showPastMuted && period.state === "default");
  const isCurrent = period.state === "current";
  const isNext = period.state === "next";

  return (
    <li>
      <article
        className={cn(
          "relative min-w-0 overflow-hidden rounded-2xl border shadow-soft transition-colors",
          isCurrent && "border-primary bg-primary/[0.06] ring-1 ring-primary/25",
          isNext && !isCurrent && "border-primary/30 bg-primary/[0.03]",
          isPast && "border-border/70 bg-muted/15 opacity-80",
          !isCurrent && !isNext && !isPast && "border-border bg-card",
        )}
      >
        <div className={cn("absolute inset-y-0 left-0 w-1 bg-primary/80", isPast && "opacity-50")} />
        <div className="min-w-0 pl-4 pr-3 py-3 sm:pl-5 sm:pr-4 sm:py-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0 flex flex-1 gap-3">
              <span
                className={cn(
                  "grid size-8 shrink-0 place-items-center rounded-full text-xs font-bold tabular-nums sm:size-9",
                  isCurrent
                    ? "bg-primary text-white"
                    : "bg-primary/10 text-primary border border-primary/20",
                )}
              >
                {index}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold",
                      style.chip,
                    )}
                  >
                    <BookOpen className="size-3 shrink-0 opacity-80" />
                    {period.subject}
                  </span>
                  {isCurrent && (
                    <Badge className="h-5 border-0 bg-primary px-2 text-[10px] text-white">
                      Live
                    </Badge>
                  )}
                  {isNext && !isCurrent && (
                    <Badge
                      variant="outline"
                      className="h-5 border-primary/30 px-2 text-[10px] text-primary"
                    >
                      Next
                    </Badge>
                  )}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5 font-medium tabular-nums text-foreground">
                    <Clock className="size-3.5 shrink-0 text-primary" />
                    <span className="sm:hidden">
                      {start}
                      {end ? ` – ${end}` : ""}
                    </span>
                    <span className="hidden sm:inline">{period.time}</span>
                  </span>
                  {period.subtitle && (
                    <span className="inline-flex min-w-0 items-center gap-1.5 text-xs">
                      <User className="size-3.5 shrink-0 text-primary" />
                      <span className="truncate">{period.subtitle}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
            {period.badge && !isCurrent && !isNext && (
              <Badge variant="outline" className="h-6 shrink-0 px-2 text-[10px] text-primary border-primary/25">
                {period.badge}
              </Badge>
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
    const isNext = opts.isToday && opts.next?.time === p.time && opts.next?.subject === p.subject;
    const past = opts.isToday && !isCurrent && !isNext && isPeriodPast(p);

    return {
      time: p.time,
      subject: p.subject,
      subtitle: p.teacher !== "—" ? p.teacher : undefined,
      state: isCurrent ? "current" : isNext ? "next" : past ? "past" : "default",
    };
  });
}
