import {
  Trophy,
  Flame,
  Medal,
  Star,
  Sparkles,
  Target,
  Heart,
  Zap,
  Crown,
  Rocket,
} from "lucide-react";
import type { Achievement } from "@lumenx/types";
import { cn } from "@lumenx/ui";

const ICONS = {
  trophy: Trophy,
  flame: Flame,
  medal: Medal,
  star: Star,
  sparkles: Sparkles,
  target: Target,
  heart: Heart,
  zap: Zap,
  crown: Crown,
  rocket: Rocket,
};

const TIER: Record<Achievement["tier"], { ring: string; bg: string; label: string; text: string }> =
  {
    bronze: {
      ring: "ring-amber-700/40",
      bg: "from-amber-700/30 to-amber-500/20",
      label: "Bronze",
      text: "text-amber-700",
    },
    silver: {
      ring: "ring-slate-400/50",
      bg: "from-slate-400/30 to-slate-200/30",
      label: "Silver",
      text: "text-slate-500",
    },
    gold: {
      ring: "ring-yellow-500/50",
      bg: "from-yellow-500/40 to-amber-300/30",
      label: "Gold",
      text: "text-yellow-600",
    },
    platinum: {
      ring: "ring-primary/50",
      bg: "from-primary/40 to-primary-glow/30",
      label: "Platinum",
      text: "text-primary",
    },
  };

export function AchievementBadge({ a, compact = false }: { a: Achievement; compact?: boolean }) {
  const Icon = ICONS[a.icon];
  const t = TIER[a.tier];
  const locked = a.progress !== undefined;
  return (
    <div
      className={cn(
        "relative h-full min-h-0 min-w-0 overflow-hidden rounded-2xl border border-border bg-card p-3 shadow-soft transition-all hover:shadow-elevated sm:p-4",
        compact && "p-2.5 sm:p-3",
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 -top-8 h-24 bg-gradient-to-b opacity-50",
          t.bg,
        )}
      />
      <div className="relative flex items-start gap-2.5 sm:gap-3">
        <div
          className={cn(
            "grid size-10 shrink-0 place-items-center rounded-2xl ring-2 sm:size-12",
            t.ring,
            locked
              ? "bg-muted text-muted-foreground"
              : "bg-gradient-primary text-primary-foreground shadow-glow",
          )}
        >
          <Icon className="size-4 sm:size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <div className="min-w-0 max-w-full flex-1 text-sm font-medium leading-snug line-clamp-2 break-words">
              {a.title}
            </div>
            <span
              className={cn("shrink-0 text-[10px] font-semibold uppercase tracking-wide", t.text)}
            >
              {t.label}
            </span>
          </div>
          <div className="mt-0.5 text-xs leading-snug text-muted-foreground line-clamp-2 break-words">
            {a.description}
          </div>
          {locked ? (
            <div className="mt-2">
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-gradient-primary rounded-full transition-[width] duration-500"
                  style={{ width: `${a.progress}%` }}
                />
              </div>
              <div className="text-[10px] text-muted-foreground mt-1">{a.progress}% to unlock</div>
            </div>
          ) : (
            <div className="text-[10px] text-success font-medium mt-1.5">
              ✓ Unlocked {a.unlockedOn}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
