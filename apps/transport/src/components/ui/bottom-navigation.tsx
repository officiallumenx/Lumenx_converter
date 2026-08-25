import type { LucideIcon } from "lucide-react";
import { cn } from "@lumenx/ui";

import { moduleNavIconStyle, type ModuleColor } from "@/theme/colors";

export interface BottomNavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  href?: string;
  badge?: number;
  moduleColor?: ModuleColor;
}

export interface BottomNavigationProps {
  items: BottomNavItem[];
  activeId: string;
  onSelect: (id: string) => void;
  className?: string;
}

/** Fixed mobile bottom nav — Connect-style, 4–5 large targets. */
export function BottomNavigation({ items, activeId, onSelect, className }: BottomNavigationProps) {
  return (
    <nav
      aria-label="Primary"
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur-md",
        className,
      )}
    >
      <div
        className="mx-auto grid max-w-[720px] gap-1 px-2 pt-1.5 pb-[max(0.5rem,var(--safe-area-bottom))]"
        style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
      >
        {items.map((item) => {
          const active = item.id === activeId;
          const Icon = item.icon;
          const badgeLabel =
            item.badge && item.badge > 0
              ? `${item.label}, ${item.badge > 9 ? "9+" : item.badge} notifications`
              : item.label;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              aria-label={badgeLabel}
              className={cn(
                "relative flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-1 text-xs font-medium",
                "transition-colors duration-150 ease-[var(--ease-standard)]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                "touch-manipulation",
                active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
              aria-current={active ? "page" : undefined}
            >
              <span
                className="relative flex size-9 items-center justify-center rounded-xl"
                style={
                  item.moduleColor
                    ? moduleNavIconStyle(item.moduleColor, active)
                    : undefined
                }
              >
                <Icon className="size-5" aria-hidden />
                {item.badge && item.badge > 0 ? (
                  <span
                    className="absolute -top-1 -right-1 inline-flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[0.625rem] font-bold leading-none text-destructive-foreground"
                    aria-hidden
                  >
                    {item.badge > 9 ? "9+" : item.badge}
                  </span>
                ) : null}
              </span>
              <span className="max-w-full truncate">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
