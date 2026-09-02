import type { LucideIcon } from "lucide-react";
import { cn } from "@lumenx/ui";

export function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  tone = "default",
  iconColor,
  iconBackground,
  compact = false,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "success" | "warning" | "primary";
  iconColor?: string;
  iconBackground?: string;
  compact?: boolean;
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
        "rounded-2xl border text-foreground shadow-soft",
        "transition-[box-shadow,border-color,background-color] duration-200 motion-safe:hover:shadow-md",
        compact ? "p-2.5 sm:p-3" : "p-3 sm:p-4 md:p-5",
        "h-full min-h-0 min-w-0",
        "flex flex-col",
        toneCls,
      )}
    >
      <div className={cn("flex flex-1 min-h-0 items-start", compact ? "gap-2" : "gap-2 sm:gap-3")}>
        <div
          className={cn(
            "rounded-xl grid place-items-center shrink-0 self-start",
            compact ? "size-8" : "size-9 sm:size-10",
            iconCls,
          )}
          style={
            iconColor || iconBackground
              ? { color: iconColor, backgroundColor: iconBackground }
              : undefined
          }
        >
          <Icon className={compact ? "size-4" : "size-4 sm:size-5"} />
        </div>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-0.5">
          <p
            className={cn(
              "connect-stat-label line-clamp-1 break-words",
              compact ? "text-[10px]" : "sm:text-[11px]",
            )}
          >
            {label}
          </p>
          <p
            className={cn(
              "font-display font-semibold leading-none tracking-tight tabular-nums break-words [overflow-wrap:anywhere]",
              compact ? "text-lg sm:text-xl" : "text-base sm:text-lg md:text-xl lg:text-2xl",
            )}
          >
            {value}
          </p>
        </div>
      </div>

      {hint ? (
        <div className={cn("mt-auto shrink-0", compact ? "pt-1.5" : "pt-2 sm:pt-3")}>
          <p
            className={cn(
              "leading-snug text-muted-foreground line-clamp-1 break-words",
              compact ? "text-[10px]" : "text-[10px] sm:text-xs",
            )}
          >
            {hint}
          </p>
        </div>
      ) : null}
    </div>
  );
}
