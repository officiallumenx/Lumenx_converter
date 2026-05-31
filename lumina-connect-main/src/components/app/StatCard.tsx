import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  tone = "default",
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "success" | "warning" | "primary";
}) {
  const toneCls = {
    default: "bg-card",
    success: "bg-success/10",
    warning: "bg-warning/10",
    primary: "bg-primary/10",
  }[tone];

  const iconCls = {
    default: "bg-muted text-foreground",
    success: "bg-success/15 text-success",
    warning: "bg-warning/20 text-warning-foreground",
    primary: "bg-primary/15 text-primary",
  }[tone];

  return (
    <div
      className={cn(
        "rounded-2xl border border-border shadow-soft",
        "transition-[box-shadow,border-color] duration-200 motion-safe:hover:border-primary/15 motion-safe:hover:shadow-md",
        "p-3 sm:p-4 md:p-5",
        "h-full min-h-0 min-w-0",
        "flex flex-col",
        toneCls,
      )}
    >
      <div className="flex flex-1 min-h-0 items-start gap-2 sm:gap-3">
        <div
          className={cn(
            "size-9 sm:size-10 rounded-xl grid place-items-center shrink-0 self-start",
            iconCls,
          )}
        >
          <Icon className="size-4 sm:size-5" />
        </div>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-0.5 sm:gap-1">
          <p className="text-[10px] font-medium uppercase leading-snug tracking-wide text-muted-foreground line-clamp-2 break-words sm:text-[11px]">
            {label}
          </p>
          <p className="font-display text-base font-semibold leading-none tracking-tight tabular-nums break-words [overflow-wrap:anywhere] sm:text-lg md:text-xl lg:text-2xl">
            {value}
          </p>
        </div>
      </div>

      <div className="mt-auto shrink-0 pt-2 sm:pt-3">
        <p className="min-h-[2.25rem] text-[10px] leading-snug text-muted-foreground line-clamp-2 break-words sm:min-h-[2.5rem] sm:text-xs">
          {hint ?? "\u00a0"}
        </p>
      </div>
    </div>
  );
}
