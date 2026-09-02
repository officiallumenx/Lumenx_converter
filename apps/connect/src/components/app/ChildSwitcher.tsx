import { memo } from "react";
import { Check, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Avatar, AvatarFallback } from "@lumenx/ui";
import { useApp } from "@/lib/app-state";
import { cn } from "@lumenx/ui";

const TREND_ICON = { up: TrendingUp, down: TrendingDown, flat: Minus } as const;

export const ChildSwitcher = memo(function ChildSwitcher() {
  const { activeChildId, setActiveChildId, linkedChildren } = useApp();

  return (
    <section className="min-w-0 rounded-xl border border-border/80 bg-card/80 p-3 shadow-soft backdrop-blur-sm">
      <div className="mb-2.5 flex items-center justify-between gap-2 px-0.5">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Your children
        </h2>
        <span className="text-xs text-muted-foreground/90">{linkedChildren.length} linked</span>
      </div>

      <div
        className="-mx-0.5 flex min-w-0 gap-2 overflow-x-auto px-0.5 pb-0.5 scrollbar-hide snap-x snap-mandatory"
        role="tablist"
        aria-label="Select child"
      >
        {linkedChildren.map((c) => {
          const active = c.id === activeChildId;
          const Trend = TREND_ICON[c.trend];

          return (
            <button
              key={c.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setActiveChildId(c.id)}
              className={cn(
                "parent-child-switcher-card snap-start w-[10.25rem] shrink-0 rounded-xl border px-3 py-2.5 text-left",
                active
                  ? "border-primary/45 bg-primary/[0.05] ring-1 ring-primary/15"
                  : "border-border/70 bg-background/60 hover:border-primary/20 hover:bg-muted/30",
              )}
            >
              <div className="flex items-center gap-2">
                <Avatar className={cn("size-9 shrink-0", active && "ring-1 ring-primary/35")}>
                  <AvatarFallback
                    className={cn(
                      "text-xs font-semibold",
                      c.accent === "primary" && "bg-primary/12 text-primary",
                      c.accent === "success" && "bg-success/12 text-success",
                      c.accent === "warning" && "bg-warning/12 text-warning-foreground",
                    )}
                  >
                    {c.initials}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1">
                    <span className="truncate text-sm font-semibold leading-tight">
                      {c.name.split(" ")[0]}
                    </span>
                    {active && <Check className="size-3.5 shrink-0 text-primary" aria-hidden />}
                  </div>
                  <p className="truncate text-xs leading-tight text-muted-foreground">
                    {c.className} · {c.section}
                  </p>
                </div>
              </div>

              <div className="mt-2 flex items-center justify-between border-t border-border/50 pt-2 text-xs">
                <span className="text-muted-foreground">
                  Att <span className="font-medium text-foreground">{c.attendance}%</span>
                </span>
                <span className="text-muted-foreground">
                  Avg <span className="font-medium text-foreground">{c.avgScore}%</span>
                </span>
                <span
                  className={cn(
                    "inline-flex items-center",
                    c.trend === "up" && "text-success",
                    c.trend === "down" && "text-destructive",
                    c.trend === "flat" && "text-muted-foreground",
                  )}
                  aria-hidden
                >
                  <Trend className="size-3" />
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
});
