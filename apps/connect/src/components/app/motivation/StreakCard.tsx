import { Flame } from "lucide-react";
import type { Streak } from "@/lib/types";
import { cn } from "@/lib/utils";

const TONE = {
  primary: "from-primary/20 to-primary/5 text-primary",
  success: "from-success/20 to-success/5 text-success",
  warning: "from-warning/30 to-warning/5 text-warning-foreground",
} as const;
const BAR = {
  primary: "bg-primary",
  success: "bg-success",
  warning: "bg-warning",
} as const;

export function StreakCard({ s }: { s: Streak }) {
  const pct = Math.min(100, Math.round((s.current / Math.max(s.best, 1)) * 100));
  return (
    <div className="relative h-full min-h-0 min-w-0 overflow-hidden rounded-2xl border border-border bg-card p-3 shadow-soft sm:p-4">
      <div
        className={cn(
          "absolute -top-10 -right-10 size-32 rounded-full bg-gradient-to-br blur-2xl opacity-60",
          TONE[s.tone],
        )}
      />
      <div className="relative">
        <div className="flex items-start gap-1.5 text-[10px] font-medium uppercase leading-snug tracking-wide text-muted-foreground sm:text-xs">
          <Flame
            className={cn("mt-0.5 size-3 shrink-0 sm:size-3.5", TONE[s.tone].split(" ").pop())}
          />
          <span className="min-w-0 break-words line-clamp-2">{s.label}</span>
        </div>
        <div className="mt-2 flex min-w-0 flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
          <div className="font-display text-xl font-bold tabular-nums sm:text-2xl md:text-3xl">
            {s.current}
          </div>
          <div className="min-w-0 text-[11px] text-muted-foreground sm:text-xs">{s.unit}</div>
        </div>
        <div className="mt-3 h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-[width] duration-700", BAR[s.tone])}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="mt-1.5 text-[10px] leading-snug text-muted-foreground break-words line-clamp-2 sm:text-[11px]">
          Best: {s.best} {s.unit}
        </div>
      </div>
    </div>
  );
}
