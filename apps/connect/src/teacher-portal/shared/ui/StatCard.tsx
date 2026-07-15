import { Link } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import { cn } from "@lumenx/ui";

const VALUE_TONES = {
  default: "text-foreground",
  primary: "text-primary",
  alert: "text-primary",
} as const;

export function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  tone = "default",
  className,
  labelClassName = "teacher-stat-label",
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  hint?: string;
  tone?: keyof typeof VALUE_TONES;
  className?: string;
  labelClassName?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col rounded-xl border border-border bg-card p-2.5 shadow-soft sm:p-3",
        className,
      )}
    >
      <div className="mb-1 flex items-center gap-1.5">
        <div className="grid size-7 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-3.5" />
        </div>
        <span className={cn("truncate", labelClassName)}>{label}</span>
      </div>
      <div
        className={cn(
          "font-display text-lg font-semibold tabular-nums leading-none sm:text-xl",
          VALUE_TONES[tone],
        )}
      >
        {value}
      </div>
      {hint ? <p className="mt-1 truncate text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function QuickActionLink({
  icon: Icon,
  label,
  to,
  search,
  className = "teacher-quick-link",
}: {
  icon: LucideIcon;
  label: string;
  to: string;
  search?: Record<string, string>;
  className?: string;
}) {
  return (
    <Link to={to} search={search} className={className}>
      <div className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary">
        <Icon className="size-4" />
      </div>
      <span className="line-clamp-2 text-xs font-medium leading-tight text-foreground">{label}</span>
    </Link>
  );
}
