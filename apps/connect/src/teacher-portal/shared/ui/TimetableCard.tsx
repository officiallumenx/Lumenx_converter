import { Link } from "@tanstack/react-router";
import { cn } from "@lumenx/ui";
import type { TimetableSlot } from "@/lib/teacher/types";

export function TimetableCard({
  slot,
  highlighted,
  badge,
  showMarkLink = true,
  className,
}: {
  slot: TimetableSlot;
  highlighted?: boolean;
  badge?: string;
  showMarkLink?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 items-center gap-3 rounded-2xl border p-4 transition-colors sm:gap-4",
        highlighted
          ? "border-primary/40 bg-primary/5 shadow-soft"
          : "border-border bg-card shadow-soft",
        className,
      )}
    >
      <div className="w-[4.5rem] shrink-0 text-xs font-medium tabular-nums text-muted-foreground sm:w-24">
        {slot.time}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium">{slot.subject}</div>
        <div className="truncate text-xs text-muted-foreground">
          Class {slot.className}-{slot.section}
          {slot.room ? ` · Room ${slot.room}` : ""}
        </div>
      </div>
      {highlighted || badge ? (
        <div className="flex shrink-0 flex-col items-end gap-1">
          {badge && <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">{badge}</span>}
          {showMarkLink && highlighted && (
            <Link to="/attendance" className="rounded-lg bg-primary px-2.5 py-1 text-[10px] font-medium text-primary-foreground sm:text-xs">Mark</Link>
          )}
        </div>
      ) : (
        <div className="size-2 shrink-0 rounded-full bg-primary/60" />
      )}
    </div>
  );
}
