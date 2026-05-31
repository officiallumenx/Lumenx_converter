import type { Goal } from "@/lib/types";
import { Target, CheckCircle2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export function GoalCard({ g }: { g: Goal }) {
  const pct = Math.min(100, Math.round((g.current / g.target) * 100));
  const done = pct >= 100;
  return (
    <div className="h-full min-h-0 min-w-0 rounded-2xl border border-border bg-card p-3 shadow-soft sm:p-4">
      <div className="flex items-start gap-2.5 sm:gap-3">
        <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary sm:size-10">
          {done ? (
            <CheckCircle2 className="size-4 sm:size-5" />
          ) : (
            <Target className="size-4 sm:size-5" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium leading-snug line-clamp-2 break-words">{g.title}</div>
          <div className="mt-0.5 text-[10px] leading-snug text-muted-foreground sm:text-[11px]">
            Due: {g.due}
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-xs">
            <span className="min-w-0 break-words text-muted-foreground">
              {g.current}
              {g.unit} of {g.target}
              {g.unit}
            </span>
            <span
              className={cn(
                "shrink-0 tabular-nums font-semibold",
                done ? "text-success" : "text-primary",
              )}
            >
              {pct}%
            </span>
          </div>
          <Progress value={pct} className="h-1.5 mt-1.5" />
        </div>
      </div>
    </div>
  );
}
