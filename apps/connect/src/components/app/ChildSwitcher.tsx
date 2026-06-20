import { memo } from "react";
import { Check, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Avatar, AvatarFallback } from "@lumenx/ui";
import { useApp } from "@/lib/app-state";
import { children } from "@/lib/mock-data";
import { cn } from "@lumenx/ui";

const TREND_ICON = { up: TrendingUp, down: TrendingDown, flat: Minus } as const;

export const ChildSwitcher = memo(function ChildSwitcher() {
  const { activeChildId, setActiveChildId } = useApp();
  return (
    <div className="max-w-full min-w-0 rounded-2xl border border-border bg-card p-3 shadow-soft">
      <div className="flex items-center justify-between px-1 pb-2">
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
          Your children
        </div>
        <div className="text-[11px] text-muted-foreground">{children.length} linked</div>
      </div>
      <div className="-mx-1 flex min-w-0 gap-2 overflow-x-auto px-1 scrollbar-hide snap-x snap-mandatory">
        {children.map((c) => {
          const active = c.id === activeChildId;
          const Trend = TREND_ICON[c.trend];
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => setActiveChildId(c.id)}
              className={cn(
                "snap-start shrink-0 w-[200px] min-h-[44px] text-left rounded-xl p-3 border transition-all duration-200",
                "active:scale-[0.98]",
                active
                  ? "border-primary/40 bg-primary/5 shadow-glow"
                  : "border-border hover:border-primary/30 bg-card",
              )}
            >
              <div className="flex items-center gap-3">
                <Avatar
                  className={cn("size-10 ring-2", active ? "ring-primary/40" : "ring-transparent")}
                >
                  <AvatarFallback
                    className={cn(
                      "text-xs font-semibold",
                      c.accent === "primary" && "bg-primary/15 text-primary",
                      c.accent === "success" && "bg-success/15 text-success",
                      c.accent === "warning" && "bg-warning/15 text-warning-foreground",
                    )}
                  >
                    {c.initials}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1">
                    <div className="font-medium text-sm truncate">{c.name.split(" ")[0]}</div>
                    {active && <Check className="size-3.5 text-primary" />}
                  </div>
                  <div className="text-[11px] text-muted-foreground truncate">
                    {c.className} • {c.section}
                  </div>
                </div>
              </div>
              <div className="mt-2.5 flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground">
                  Att <span className="text-foreground font-medium">{c.attendance}%</span>
                </span>
                <span className="text-muted-foreground">
                  Avg <span className="text-foreground font-medium">{c.avgScore}%</span>
                </span>
                <span
                  className={cn(
                    "inline-flex items-center gap-0.5 font-medium",
                    c.trend === "up" && "text-success",
                    c.trend === "down" && "text-destructive",
                    c.trend === "flat" && "text-muted-foreground",
                  )}
                >
                  <Trend className="size-3" />
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
});
